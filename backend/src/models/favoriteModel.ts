import { pool } from "../config/config/db";
import { toApiResourceListItem, type ResourceListRow } from "./resourceModel";
import { toApiForumPostListItem, type ForumPostListRow } from "./forumModel";

export type FavoriteTargetType = "resource" | "forum_post" | "opportunity";

export interface FavoriteRow {
  id: string;
  user_id: string;
  target_type: FavoriteTargetType;
  target_id: string;
  created_at: Date;
}

interface ListParams {
  userId: string;
  limit: number;
  offset: number;
}

/**
 * Parameterized SQL only, no Express req/res — same rule as
 * resourceModel/taxonomyModel. Uniqueness is enforced by the
 * favorites_user_target_key DB constraint (migration 014), not checked
 * here — create() is allowed to throw a Postgres 23505 error, which the
 * service layer catches.
 *
 * Each target type gets its own list query rather than one generic join,
 * because each joins a differently-shaped table (resources, forum_posts
 * with vote/comment subqueries, opportunities) — there's no single shape
 * that fits all three.
 */
export const favoriteModel = {
  async create(
    userId: string,
    targetType: FavoriteTargetType,
    targetId: string,
  ): Promise<FavoriteRow> {
    const result = await pool.query<FavoriteRow>(
      `INSERT INTO favorites (user_id, target_type, target_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, targetType, targetId],
    );
    return result.rows[0];
  },

  async findByUserAndTarget(
    userId: string,
    targetType: FavoriteTargetType,
    targetId: string,
  ): Promise<FavoriteRow | null> {
    const result = await pool.query<FavoriteRow>(
      `SELECT * FROM favorites WHERE user_id = $1 AND target_type = $2 AND target_id = $3`,
      [userId, targetType, targetId],
    );
    return result.rows[0] ?? null;
  },

  async remove(
    userId: string,
    targetType: FavoriteTargetType,
    targetId: string,
  ): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM favorites WHERE user_id = $1 AND target_type = $2 AND target_id = $3`,
      [userId, targetType, targetId],
    );
    return (result.rowCount ?? 0) > 0;
  },

  /**
   * Best-effort cleanup for the one target type that's ever really
   * deleted (resources) — replaces the cascade the old resource_id FK
   * gave for free, now that target_id carries no FK of its own.
   */
  async removeAllForTarget(
    targetType: FavoriteTargetType,
    targetId: string,
  ): Promise<void> {
    await pool.query(
      `DELETE FROM favorites WHERE target_type = $1 AND target_id = $2`,
      [targetType, targetId],
    );
  },

  async countByTarget(targetType: FavoriteTargetType, targetId: string): Promise<number> {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM favorites WHERE target_type = $1 AND target_id = $2`,
      [targetType, targetId],
    );
    return Number(result.rows[0].count);
  },

  async listResources(
    params: ListParams,
  ): Promise<{ rows: (ResourceListRow & { favorite_id: string; favorited_at: Date })[]; total: number }> {
    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*)
       FROM favorites f
       JOIN resources r ON r.id = f.target_id
       WHERE f.user_id = $1
         AND f.target_type = 'resource'
         AND r.status = 'READY'
         AND r.moderation_status = 'approved'`,
      [params.userId],
    );

    const rowsResult = await pool.query<
      ResourceListRow & { favorite_id: string; favorited_at: Date }
    >(
      `SELECT f.id AS favorite_id, f.created_at AS favorited_at, r.*,
              rf.id AS ready_file_id, rf.detected_mime_type AS ready_file_mime_type,
              up.display_name AS owner_name
       FROM favorites f
       JOIN resources r ON r.id = f.target_id
       LEFT JOIN LATERAL (
         SELECT id, detected_mime_type FROM resource_files
         WHERE resource_id = r.id AND status = 'READY'
         ORDER BY created_at ASC
         LIMIT 1
       ) rf ON true
       LEFT JOIN user_profiles up ON up.user_id = r.owner_id
       WHERE f.user_id = $1
         AND f.target_type = 'resource'
         AND r.status = 'READY'
         AND r.moderation_status = 'approved'
       ORDER BY f.created_at DESC
       LIMIT $2 OFFSET $3`,
      [params.userId, params.limit, params.offset],
    );

    return { rows: rowsResult.rows, total: Number(countResult.rows[0].count) };
  },

  async listForumPosts(
    params: ListParams,
  ): Promise<{ rows: (ForumPostListRow & { favorite_id: string; favorited_at: Date })[]; total: number }> {
    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM favorites f
       JOIN forum_posts p ON p.id = f.target_id
       WHERE f.user_id = $1 AND f.target_type = 'forum_post' AND p.deleted_at IS NULL`,
      [params.userId],
    );

    const rowsResult = await pool.query<
      ForumPostListRow & { favorite_id: string; favorited_at: Date }
    >(
      `SELECT f.id AS favorite_id, f.created_at AS favorited_at, p.*,
              COALESCE((SELECT SUM(value) FROM votes WHERE target_type = 'forum_post' AND target_id = p.id), 0) AS vote_score,
              COALESCE((SELECT value FROM votes WHERE target_type = 'forum_post' AND target_id = p.id AND user_id = $1), 0) AS my_vote,
              (SELECT COUNT(*) FROM forum_comments WHERE post_id = p.id AND deleted_at IS NULL) AS comment_count
       FROM favorites f
       JOIN forum_posts p ON p.id = f.target_id
       WHERE f.user_id = $1 AND f.target_type = 'forum_post' AND p.deleted_at IS NULL
       ORDER BY f.created_at DESC
       LIMIT $2 OFFSET $3`,
      [params.userId, params.limit, params.offset],
    );

    return { rows: rowsResult.rows, total: Number(countResult.rows[0].count) };
  },

  async listOpportunities(
    params: ListParams,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<{ rows: any[]; total: number }> {
    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*)
       FROM favorites f
       JOIN opportunities o ON o.id = f.target_id
       WHERE f.user_id = $1
         AND f.target_type = 'opportunity'
         AND o.status = 'active'`,
      [params.userId],
    );

    const rowsResult = await pool.query(
      `SELECT f.id AS favorite_id, f.created_at AS favorited_at, o.*,
              up.display_name AS owner_name, s.code AS subject_code, s.name AS subject_name
       FROM favorites f
       JOIN opportunities o ON o.id = f.target_id
       LEFT JOIN user_profiles up ON up.user_id = o.owner_id
       LEFT JOIN subjects s ON s.id = o.subject_id
       WHERE f.user_id = $1
         AND f.target_type = 'opportunity'
         AND o.status = 'active'
       ORDER BY f.created_at DESC
       LIMIT $2 OFFSET $3`,
      [params.userId, params.limit, params.offset],
    );

    return { rows: rowsResult.rows, total: Number(countResult.rows[0].count) };
  },
};

export function toApiFavorite(row: FavoriteRow) {
  return {
    id: row.id,
    userId: row.user_id,
    targetType: row.target_type,
    targetId: row.target_id,
    createdAt: row.created_at,
  };
}

export function toApiFavoriteResourceItem(
  row: ResourceListRow & { favorite_id: string; favorited_at: Date },
) {
  return {
    favoriteId: row.favorite_id,
    favoritedAt: row.favorited_at,
    resource: toApiResourceListItem(row),
  };
}

export function toApiFavoriteForumPostItem(
  row: ForumPostListRow & { favorite_id: string; favorited_at: Date },
) {
  return {
    favoriteId: row.favorite_id,
    favoritedAt: row.favorited_at,
    post: toApiForumPostListItem(row),
  };
}

// Opportunity rows are passed through close to raw (snake_case), matching
// how OpportunityModel/opportunityController already hand them to the
// frontend elsewhere — there's no toApiOpportunity mapper to reuse here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toApiFavoriteOpportunityItem(row: any) {
  const { favorite_id, favorited_at, ...opportunity } = row;
  return {
    favoriteId: favorite_id,
    favoritedAt: favorited_at,
    opportunity,
  };
}
