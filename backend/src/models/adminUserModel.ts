import { pool } from "../config/config/db";

export interface AdminUserListRow {
  id: string;
  email: string;
  display_name: string;
  role: string;
  status: string;
  suspended_until: Date | null;
  created_at: Date;
  post_count: string;
  comment_count: string;
  likes_received: string;
}

export interface AdminUserProfileRow {
  id: string;
  email: string;
  display_name: string;
  role: string;
  status: string;
  suspended_until: Date | null;
  created_at: Date;
}

export interface AdminUserResourceRow {
  id: string;
  title: string;
  status: string;
  created_at: Date;
}

export interface AdminUserForumActivityRow {
  type: "post" | "comment";
  id: string;
  post_id: string;
  title: string | null;
  body: string;
  created_at: Date;
}

export interface AdminUserApplicationRow {
  id: string;
  opportunity_id: string;
  opportunity_title: string;
  status: string;
  created_at: Date;
}

/**
 * Parameterized SQL only, no Express req/res — same rule as every other
 * model. Counts are computed with correlated subqueries rather than
 * JOINs, so a user with many posts/comments/votes doesn't fan out the
 * row set for the other counts (a JOIN across posts+comments+votes
 * would multiply rows and require DISTINCT-count gymnastics instead).
 */
export const adminUserModel = {
  async listWithStats(params: {
    search?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: AdminUserListRow[]; total: number }> {
    const values: unknown[] = [];
    let searchClause = "WHERE u.deleted_at IS NULL";
    if (params.search) {
      values.push(`%${params.search}%`);
      searchClause += ` AND (u.email ILIKE $${values.length} OR p.display_name ILIKE $${values.length})`;
    }

    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id
       ${searchClause}`,
      values,
    );

    const dataValues = [...values, params.limit, params.offset];
    const rowsResult = await pool.query<AdminUserListRow>(
      `SELECT
         u.id, u.email, u.role, u.status, u.suspended_until, u.created_at,
         COALESCE(p.display_name, u.email) AS display_name,
         (SELECT COUNT(*) FROM forum_posts fp WHERE fp.author_id = u.id AND fp.deleted_at IS NULL) AS post_count,
         (SELECT COUNT(*) FROM forum_comments fc WHERE fc.author_id = u.id AND fc.deleted_at IS NULL) AS comment_count,
         (
           (SELECT COUNT(*) FROM votes v
              JOIN forum_posts fp2 ON fp2.id = v.target_id AND v.target_type = 'forum_post'
              WHERE fp2.author_id = u.id AND v.value = 1)
           +
           (SELECT COUNT(*) FROM votes v
              JOIN forum_comments fc2 ON fc2.id = v.target_id AND v.target_type = 'forum_comment'
              WHERE fc2.author_id = u.id AND v.value = 1)
         ) AS likes_received
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id
       ${searchClause}
       ORDER BY u.created_at DESC
       LIMIT $${dataValues.length - 1} OFFSET $${dataValues.length}`,
      dataValues,
    );

    return { rows: rowsResult.rows, total: Number(countResult.rows[0].count) };
  },

  async getProfile(userId: string): Promise<AdminUserProfileRow | null> {
    const result = await pool.query<AdminUserProfileRow>(
      `SELECT u.id, u.email, u.role, u.status, u.suspended_until, u.created_at,
              COALESCE(p.display_name, u.email) AS display_name
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id
       WHERE u.id = $1`,
      [userId],
    );
    return result.rows[0] ?? null;
  },

  async listResourcesByOwner(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<{ rows: AdminUserResourceRow[]; total: number }> {
    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM resources WHERE owner_id = $1`,
      [userId],
    );
    const rowsResult = await pool.query<AdminUserResourceRow>(
      `SELECT id, title, status, created_at FROM resources
       WHERE owner_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );
    return { rows: rowsResult.rows, total: Number(countResult.rows[0].count) };
  },

  async listForumActivityByAuthor(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<{ rows: AdminUserForumActivityRow[]; total: number }> {
    // Posts and comments are unioned so the tab shows one
    // reverse-chronological activity feed rather than two separate
    // paginated lists the caller would have to interleave itself.
    const countResult = await pool.query<{ count: string }>(
      `SELECT
         (SELECT COUNT(*) FROM forum_posts WHERE author_id = $1 AND deleted_at IS NULL) +
         (SELECT COUNT(*) FROM forum_comments WHERE author_id = $1 AND deleted_at IS NULL) AS count`,
      [userId],
    );
    const rowsResult = await pool.query<AdminUserForumActivityRow>(
      `SELECT * FROM (
         SELECT 'post' AS type, id, id AS post_id, title, body, created_at
         FROM forum_posts WHERE author_id = $1 AND deleted_at IS NULL
         UNION ALL
         SELECT 'comment' AS type, id, post_id, NULL AS title, body, created_at
         FROM forum_comments WHERE author_id = $1 AND deleted_at IS NULL
       ) activity
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );
    return { rows: rowsResult.rows, total: Number(countResult.rows[0].count) };
  },

  async listApplicationsByApplicant(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<{ rows: AdminUserApplicationRow[]; total: number }> {
    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM opportunity_applications WHERE applicant_id = $1`,
      [userId],
    );
    const rowsResult = await pool.query<AdminUserApplicationRow>(
      `SELECT a.id, a.opportunity_id, o.title AS opportunity_title, a.status, a.created_at
       FROM opportunity_applications a
       JOIN opportunities o ON o.id = a.opportunity_id
       WHERE a.applicant_id = $1
       ORDER BY a.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );
    return { rows: rowsResult.rows, total: Number(countResult.rows[0].count) };
  },
};

export function toApiAdminUserListItem(row: AdminUserListRow) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    status: row.status,
    suspendedUntil: row.suspended_until,
    createdAt: row.created_at,
    postCount: Number(row.post_count),
    commentCount: Number(row.comment_count),
    likesReceived: Number(row.likes_received),
  };
}

export function toApiAdminUserProfile(row: AdminUserProfileRow) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    status: row.status,
    suspendedUntil: row.suspended_until,
    createdAt: row.created_at,
  };
}

export function toApiAdminUserResource(row: AdminUserResourceRow) {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function toApiAdminUserForumActivity(row: AdminUserForumActivityRow) {
  return {
    type: row.type,
    id: row.id,
    postId: row.post_id,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
  };
}

export function toApiAdminUserApplication(row: AdminUserApplicationRow) {
  return {
    id: row.id,
    opportunityId: row.opportunity_id,
    opportunityTitle: row.opportunity_title,
    status: row.status,
    createdAt: row.created_at,
  };
}
