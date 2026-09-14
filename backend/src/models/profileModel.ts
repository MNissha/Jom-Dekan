import { pool } from '../config/config/db';

export interface ProfileRow {
  user_id: string;
  email: string;
  role: 'USER' | 'ADMIN';
  email_verified_at: Date | null;
  terms_accepted_at: Date | null;
  display_name: string;
  photo_path: string | null;
  phone: string | null;
  academic_role: 'STUDENT' | 'TUTOR';
  university_id: string | null;
  university_name: string | null;
  field_of_study: string | null;
  study_level: string | null;
  current_year: number | null;
  current_semester: number | null;
  created_at: Date;
}

export interface ProfileStats {
  resource_count: number;
  forum_post_count: number;
  forum_comment_count: number;
  tutor_listing_count: number;
  freelance_listing_count: number;
  favorite_count: number;
}

export type ActivityType =
  | 'RESOURCE_UPLOADED'
  | 'FORUM_POST_CREATED'
  | 'FORUM_COMMENT_CREATED'
  | 'RESOURCE_FAVORITED';

export interface ActivityRow {
  id: string;
  type: ActivityType;
  title: string;
  // The id to actually navigate to — same as `id` for uploads/posts, but
  // different for comments (the parent post, since a comment has no page
  // of its own) and favorites (the favorited resource, not the favorite
  // row itself).
  target_id: string;
  created_at: Date;
}

const PROFILE_SELECT = `
  SELECT
    u.id AS user_id, u.email, u.role, u.email_verified_at, u.terms_accepted_at,
    p.display_name, p.photo_path, p.phone, p.academic_role,
    p.university_id, uni.name AS university_name,
    p.field_of_study, p.study_level, p.current_year, p.current_semester, u.created_at
  FROM users u
  JOIN user_profiles p ON p.user_id = u.id
  LEFT JOIN universities uni ON uni.id = p.university_id
  WHERE u.id = $1 AND u.deleted_at IS NULL
`;

/**
 * Parameterized SQL only, no Express req/res — same rule as userModel.
 * Profile-facing reads/writes live here rather than on userModel, which
 * stays scoped to the auth flow (register/login/session concerns).
 */
export const profileModel = {
  async findByUserId(userId: string): Promise<ProfileRow | null> {
    const result = await pool.query<ProfileRow>(PROFILE_SELECT, [userId]);
    return result.rows[0] ?? null;
  },

  async update(
    userId: string,
    fields: Partial<{
      displayName: string;
      phone: string;
      academicRole: 'STUDENT' | 'TUTOR';
      universityId: string;
      fieldOfStudy: string;
      currentYear: number;
      currentSemester: number;
    }>,
  ): Promise<ProfileRow | null> {
    const columns: Record<string, string> = {
      displayName: 'display_name',
      phone: 'phone',
      academicRole: 'academic_role',
      universityId: 'university_id',
      fieldOfStudy: 'field_of_study',
      currentYear: 'current_year',
      currentSemester: 'current_semester',
    };

    const setClauses: string[] = [];
    const values: unknown[] = [userId];

    for (const [key, column] of Object.entries(columns)) {
      const value = fields[key as keyof typeof fields];
      if (value !== undefined) {
        values.push(value);
        setClauses.push(`${column} = $${values.length}`);
      }
    }

    if (setClauses.length === 0) {
      return this.findByUserId(userId);
    }

    await pool.query(`UPDATE user_profiles SET ${setClauses.join(', ')} WHERE user_id = $1`, values);
    return this.findByUserId(userId);
  },

  /**
   * The user's own recent actions — real rows from the tables that
   * already track them (resources, forum_posts, forum_comments,
   * favorites), not a separate activity/notifications log that nothing
   * currently writes to for a user's own actions.
   */
  async getRecentActivity(userId: string, limit: number): Promise<ActivityRow[]> {
    const result = await pool.query<ActivityRow>(
      `(SELECT id, 'RESOURCE_UPLOADED' AS type, title, id AS target_id, created_at
        FROM resources
        WHERE owner_id = $1)
       UNION ALL
       (SELECT id, 'FORUM_POST_CREATED' AS type, title, id AS target_id, created_at
        FROM forum_posts
        WHERE author_id = $1 AND deleted_at IS NULL)
       UNION ALL
       (SELECT c.id, 'FORUM_COMMENT_CREATED' AS type, p.title, p.id AS target_id, c.created_at
        FROM forum_comments c
        JOIN forum_posts p ON p.id = c.post_id
        WHERE c.author_id = $1 AND c.deleted_at IS NULL)
       UNION ALL
       (SELECT f.id, 'RESOURCE_FAVORITED' AS type, r.title, r.id AS target_id, f.created_at
        FROM favorites f
        JOIN resources r ON r.id = f.target_id
        WHERE f.user_id = $1 AND f.target_type = 'resource')
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit],
    );
    return result.rows;
  },

  async getStats(userId: string): Promise<ProfileStats> {
    const result = await pool.query<ProfileStats>(
      `SELECT
         (SELECT COUNT(*) FROM resources WHERE owner_id = $1)::int AS resource_count,
         (SELECT COUNT(*) FROM forum_posts WHERE author_id = $1 AND deleted_at IS NULL)::int AS forum_post_count,
         (SELECT COUNT(*) FROM forum_comments WHERE author_id = $1 AND deleted_at IS NULL)::int AS forum_comment_count,
         (SELECT COUNT(*) FROM opportunities WHERE owner_id = $1 AND listing_type = 'TUTORING')::int AS tutor_listing_count,
         (SELECT COUNT(*) FROM opportunities WHERE owner_id = $1 AND listing_type != 'TUTORING')::int AS freelance_listing_count,
         (SELECT COUNT(*) FROM favorites WHERE user_id = $1)::int AS favorite_count`,
      [userId],
    );
    return result.rows[0];
  },
};

export function toApiProfile(row: ProfileRow) {
  return {
    id: row.user_id,
    email: row.email,
    role: row.role,
    emailVerified: row.email_verified_at !== null,
    termsAcceptedAt: row.terms_accepted_at,
    displayName: row.display_name,
    photoPath: row.photo_path,
    phone: row.phone,
    academicRole: row.academic_role,
    university: row.university_id ? { id: row.university_id, name: row.university_name } : null,
    fieldOfStudy: row.field_of_study,
    studyLevel: row.study_level,
    currentYear: row.current_year,
    currentSemester: row.current_semester,
    createdAt: row.created_at,
  };
}

// The public-facing view of a profile (any other signed-in user viewing
// someone via a clickable username) — same row as toApiProfile, but
// deliberately omits contact/account fields (email, phone, verification
// status) that only the owner (or an admin, via adminUserModel) should see.
export function toApiPublicProfile(row: ProfileRow) {
  return {
    id: row.user_id,
    displayName: row.display_name,
    photoPath: row.photo_path,
    academicRole: row.academic_role,
    university: row.university_id ? { id: row.university_id, name: row.university_name } : null,
    fieldOfStudy: row.field_of_study,
    studyLevel: row.study_level,
    createdAt: row.created_at,
  };
}

export function toApiActivity(row: ActivityRow) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    targetId: row.target_id,
    createdAt: row.created_at,
  };
}

export function toApiStats(stats: ProfileStats) {
  return {
    resourceCount: stats.resource_count,
    forumPostCount: stats.forum_post_count,
    forumCommentCount: stats.forum_comment_count,
    tutorListingCount: stats.tutor_listing_count,
    freelanceListingCount: stats.freelance_listing_count,
    favoriteCount: stats.favorite_count,
  };
}
