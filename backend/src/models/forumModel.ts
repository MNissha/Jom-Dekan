import { pool } from "../config/config/db";

export interface ForumPostRow {
  id: string;
  author_id: string;
  title: string;
  body: string;
  deleted_at: Date | null;
  solved_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface ForumPostListRow extends ForumPostRow {
  vote_score: string;
  my_vote: number;
  comment_count: string;
}

export interface ForumCommentRow {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface ForumCommentListRow extends ForumCommentRow {
  vote_score: string;
  my_vote: number;
}

export type VoteTargetType = "forum_post" | "forum_comment";

export interface VoteRow {
  id: string;
  user_id: string;
  target_type: VoteTargetType;
  target_id: string;
  value: number;
  created_at: Date;
  updated_at: Date;
}

export interface ListPostsFilters {
  authorId?: string;
  unanswered?: boolean;
  solved?: boolean;
  currentUserId: string;
  sortBy: "newest" | "oldest" | "top";
  limit: number;
  offset: number;
}

const POST_SORT_BY_SQL: Record<"newest" | "oldest" | "top", string> = {
  newest: "p.created_at DESC",
  oldest: "p.created_at ASC",
  top: "vote_score DESC, p.created_at DESC",
};

/**
 * Parameterized SQL only, no Express req/res — same rule as
 * resourceModel/favoriteModel. vote_score/my_vote/comment_count are
 * computed per row via correlated subqueries against votes/
 * forum_comments, the same enrichment style resourceModel.list() uses
 * (there, a LATERAL join; here, scalar subqueries since these are
 * single aggregate values rather than a joined row).
 */
export const forumModel = {
  posts: {
    async create(
      authorId: string,
      input: { title: string; body: string },
    ): Promise<ForumPostRow> {
      const result = await pool.query<ForumPostRow>(
        `INSERT INTO forum_posts (author_id, title, body)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [authorId, input.title, input.body],
      );
      return result.rows[0];
    },

    async findById(id: string): Promise<ForumPostRow | null> {
      const result = await pool.query<ForumPostRow>(
        `SELECT * FROM forum_posts WHERE id = $1`,
        [id],
      );
      return result.rows[0] ?? null;
    },

    async findByIdWithVotes(
      id: string,
      currentUserId: string,
    ): Promise<ForumPostListRow | null> {
      const result = await pool.query<ForumPostListRow>(
        `SELECT p.*,
                (SELECT COUNT(*) FROM votes WHERE target_type = 'forum_post' AND target_id = p.id AND value = 1) AS vote_score,
                COALESCE((SELECT value FROM votes WHERE target_type = 'forum_post' AND target_id = p.id AND user_id = $2), 0) AS my_vote,
                (SELECT COUNT(*) FROM forum_comments WHERE post_id = p.id AND deleted_at IS NULL) AS comment_count
         FROM forum_posts p
         WHERE p.id = $1`,
        [id, currentUserId],
      );
      return result.rows[0] ?? null;
    },

    async update(
      id: string,
      input: { title: string; body: string },
    ): Promise<ForumPostRow | null> {
      const result = await pool.query<ForumPostRow>(
        `UPDATE forum_posts SET title = $2, body = $3 WHERE id = $1 RETURNING *`,
        [id, input.title, input.body],
      );
      return result.rows[0] ?? null;
    },

    async setSolved(id: string, solved: boolean): Promise<ForumPostRow | null> {
      const result = await pool.query<ForumPostRow>(
        `UPDATE forum_posts SET solved_at = ${solved ? "now()" : "NULL"} WHERE id = $1 RETURNING *`,
        [id],
      );
      return result.rows[0] ?? null;
    },

    async softDelete(id: string): Promise<boolean> {
      const result = await pool.query(
        `UPDATE forum_posts SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL`,
        [id],
      );
      return (result.rowCount ?? 0) > 0;
    },

    async list(
      filters: ListPostsFilters,
    ): Promise<{ rows: ForumPostListRow[]; total: number }> {
      const conditions: string[] = ["p.deleted_at IS NULL"];
      const values: unknown[] = [];

      function addCondition(sql: string, value: unknown) {
        values.push(value);
        conditions.push(sql.replace("?", `$${values.length}`));
      }

      if (filters.authorId) addCondition("p.author_id = ?", filters.authorId);
      if (filters.unanswered) {
        conditions.push(
          "NOT EXISTS (SELECT 1 FROM forum_comments c WHERE c.post_id = p.id AND c.deleted_at IS NULL)",
        );
      }
      if (filters.solved === true) conditions.push("p.solved_at IS NOT NULL");
      if (filters.solved === false) conditions.push("p.solved_at IS NULL");

      const whereClause = `WHERE ${conditions.join(" AND ")}`;

      const countResult = await pool.query<{ count: string }>(
        `SELECT COUNT(*) FROM forum_posts p ${whereClause}`,
        values,
      );

      const myVoteParamIndex = values.length + 1;
      const dataValues = [
        ...values,
        filters.currentUserId,
        filters.limit,
        filters.offset,
      ];
      const rowsResult = await pool.query<ForumPostListRow>(
        `SELECT p.*,
                (SELECT COUNT(*) FROM votes WHERE target_type = 'forum_post' AND target_id = p.id AND value = 1) AS vote_score,
                COALESCE((SELECT value FROM votes WHERE target_type = 'forum_post' AND target_id = p.id AND user_id = $${myVoteParamIndex}), 0) AS my_vote,
                (SELECT COUNT(*) FROM forum_comments WHERE post_id = p.id AND deleted_at IS NULL) AS comment_count
         FROM forum_posts p
         ${whereClause}
         ORDER BY ${POST_SORT_BY_SQL[filters.sortBy]}
         LIMIT $${myVoteParamIndex + 1} OFFSET $${myVoteParamIndex + 2}`,
        dataValues,
      );

      return {
        rows: rowsResult.rows,
        total: Number(countResult.rows[0].count),
      };
    },
  },

  comments: {
    async create(
      postId: string,
      authorId: string,
      body: string,
    ): Promise<ForumCommentRow> {
      const result = await pool.query<ForumCommentRow>(
        `INSERT INTO forum_comments (post_id, author_id, body)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [postId, authorId, body],
      );
      return result.rows[0];
    },

    async findById(id: string): Promise<ForumCommentRow | null> {
      const result = await pool.query<ForumCommentRow>(
        `SELECT * FROM forum_comments WHERE id = $1`,
        [id],
      );
      return result.rows[0] ?? null;
    },

    async update(id: string, body: string): Promise<ForumCommentRow | null> {
      const result = await pool.query<ForumCommentRow>(
        `UPDATE forum_comments SET body = $2 WHERE id = $1 RETURNING *`,
        [id, body],
      );
      return result.rows[0] ?? null;
    },

    async softDelete(id: string): Promise<boolean> {
      const result = await pool.query(
        `UPDATE forum_comments SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL`,
        [id],
      );
      return (result.rowCount ?? 0) > 0;
    },

    async listByPost(
      postId: string,
      currentUserId: string,
    ): Promise<ForumCommentListRow[]> {
      const result = await pool.query<ForumCommentListRow>(
        `SELECT c.*,
                (SELECT COUNT(*) FROM votes WHERE target_type = 'forum_comment' AND target_id = c.id AND value = 1) AS vote_score,
                COALESCE((SELECT value FROM votes WHERE target_type = 'forum_comment' AND target_id = c.id AND user_id = $2), 0) AS my_vote
         FROM forum_comments c
         WHERE c.post_id = $1 AND c.deleted_at IS NULL AND c.moderation_status = 'visible'
         ORDER BY c.created_at ASC`,
        [postId, currentUserId],
      );
      return result.rows;
    },
  },

  votes: {
    async upsert(
      userId: string,
      targetType: VoteTargetType,
      targetId: string,
      value: 1 | -1,
    ): Promise<VoteRow> {
      const result = await pool.query<VoteRow>(
        `INSERT INTO votes (user_id, target_type, target_id, value)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, target_type, target_id)
         DO UPDATE SET value = EXCLUDED.value, updated_at = now()
         RETURNING *`,
        [userId, targetType, targetId, value],
      );
      return result.rows[0];
    },

    async remove(
      userId: string,
      targetType: VoteTargetType,
      targetId: string,
    ): Promise<boolean> {
      const result = await pool.query(
        `DELETE FROM votes WHERE user_id = $1 AND target_type = $2 AND target_id = $3`,
        [userId, targetType, targetId],
      );
      return (result.rowCount ?? 0) > 0;
    },
  },
};

export function toApiForumPost(row: ForumPostRow) {
  return {
    id: row.id,
    authorId: row.author_id,
    title: row.title,
    body: row.body,
    solvedAt: row.solved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toApiForumPostListItem(row: ForumPostListRow) {
  return {
    ...toApiForumPost(row),
    voteScore: Number(row.vote_score),
    myVote: Number(row.my_vote),
    commentCount: Number(row.comment_count),
  };
}

export function toApiForumComment(row: ForumCommentRow) {
  return {
    id: row.id,
    postId: row.post_id,
    authorId: row.author_id,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toApiForumCommentListItem(row: ForumCommentListRow) {
  return {
    ...toApiForumComment(row),
    voteScore: Number(row.vote_score),
    myVote: Number(row.my_vote),
  };
}
