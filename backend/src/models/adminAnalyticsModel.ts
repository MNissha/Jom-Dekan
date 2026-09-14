import { pool } from "../config/config/db";

export interface AnalyticsCount {
  label: string;
  value: number;
}

export interface AnalyticsTrendPoint {
  month: string;
  users: number;
  resources: number;
  forumPosts: number;
  applications: number;
}

export interface AdminAnalytics {
  totals: {
    users: number;
    activeUsers: number;
    resources: number;
    forumPosts: number;
    forumComments: number;
    opportunities: number;
    applications: number;
    pendingModeration: number;
  };
  userRoles: AnalyticsCount[];
  resourceStatuses: AnalyticsCount[];
  opportunityStatuses: AnalyticsCount[];
  applicationStatuses: AnalyticsCount[];
  monthlyTrend: AnalyticsTrendPoint[];
}

type CountRow = { label: string; value: string };
type TotalRow = AdminAnalytics["totals"];
type TrendRow = Omit<AnalyticsTrendPoint, "users" | "resources" | "forumPosts" | "applications"> & {
  users: string;
  resources: string;
  forumPosts: string;
  applications: string;
};

function counts(rows: CountRow[]): AnalyticsCount[] {
  return rows.map((row) => ({ label: row.label, value: Number(row.value) }));
}

export const adminAnalyticsModel = {
  async getOverview(): Promise<AdminAnalytics> {
    const [totals, roles, resources, opportunities, applications, trend] =
      await Promise.all([
        pool.query<TotalRow>(`SELECT
          COUNT(*)::int AS users,
          COUNT(*) FILTER (WHERE status = 'ACTIVE' AND deleted_at IS NULL)::int AS "activeUsers",
          (SELECT COUNT(*)::int FROM resources) AS resources,
          (SELECT COUNT(*)::int FROM forum_posts WHERE deleted_at IS NULL) AS "forumPosts",
          (SELECT COUNT(*)::int FROM forum_comments WHERE deleted_at IS NULL) AS "forumComments",
          (SELECT COUNT(*)::int FROM opportunities) AS opportunities,
          (SELECT COUNT(*)::int FROM opportunity_applications) AS applications,
          (SELECT COUNT(*)::int FROM resources WHERE moderation_status = 'pending_moderation')
            + (SELECT COUNT(*)::int FROM reports WHERE UPPER(status) = 'PENDING') AS "pendingModeration"
        FROM users
        WHERE deleted_at IS NULL`),
        pool.query<CountRow>(`SELECT role AS label, COUNT(*)::int AS value
          FROM users WHERE deleted_at IS NULL GROUP BY role ORDER BY role`),
        pool.query<CountRow>(`SELECT status AS label, COUNT(*)::int AS value
          FROM resources GROUP BY status ORDER BY status`),
        pool.query<CountRow>(`SELECT status AS label, COUNT(*)::int AS value
          FROM opportunities GROUP BY status ORDER BY status`),
        pool.query<CountRow>(`SELECT status AS label, COUNT(*)::int AS value
          FROM opportunity_applications GROUP BY status ORDER BY status`),
        pool.query<TrendRow>(`WITH months AS (
            SELECT date_trunc('month', now()) - (interval '1 month' * series) AS month
            FROM generate_series(5, 0, -1) AS series
          )
          SELECT to_char(m.month, 'YYYY-MM') AS month,
            (SELECT COUNT(*)::int FROM users u WHERE u.deleted_at IS NULL
              AND u.created_at >= m.month AND u.created_at < m.month + interval '1 month') AS users,
            (SELECT COUNT(*)::int FROM resources r
              WHERE r.created_at >= m.month AND r.created_at < m.month + interval '1 month') AS resources,
            (SELECT COUNT(*)::int FROM forum_posts p WHERE p.deleted_at IS NULL
              AND p.created_at >= m.month AND p.created_at < m.month + interval '1 month') AS "forumPosts",
            (SELECT COUNT(*)::int FROM opportunity_applications a
              WHERE a.created_at >= m.month AND a.created_at < m.month + interval '1 month') AS applications
          FROM months m ORDER BY m.month`),
      ]);

    return {
      totals: totals.rows[0],
      userRoles: counts(roles.rows),
      resourceStatuses: counts(resources.rows),
      opportunityStatuses: counts(opportunities.rows),
      applicationStatuses: counts(applications.rows),
      monthlyTrend: trend.rows.map((row) => ({
        month: row.month,
        users: Number(row.users),
        resources: Number(row.resources),
        forumPosts: Number(row.forumPosts),
        applications: Number(row.applications),
      })),
    };
  },
};
