import { pool } from "../config/config/db";

/**
 * Fans out into the existing per-user `notifications` table (Migration
 * 004) — the same one reportModel.notifyAdmins() already writes into and
 * ModerationModel.getNotificationsForUser()/markNotificationRead() already
 * read, so no new table or admin inbox screen is needed for these to show
 * up. One row per admin, since notifications are per-user, not broadcast.
 */
export const notificationModel = {
  async notifyUser(
    userId: string,
    type: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await pool.query(
      `INSERT INTO notifications (user_id, type, payload) VALUES ($1, $2, $3::jsonb)`,
      [userId, type, JSON.stringify(payload)],
    );
  },

  async listAdminIds(): Promise<string[]> {
    const result = await pool.query<{ id: string }>(
      `SELECT id FROM users WHERE role = 'ADMIN' AND deleted_at IS NULL`,
    );
    return result.rows.map((r) => r.id);
  },

  async notifyAdmins(
    type: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const adminIds = await notificationModel.listAdminIds();
    if (adminIds.length === 0) return;
    await pool.query(
      `INSERT INTO notifications (user_id, type, payload)
       SELECT unnest($1::uuid[]), $2, $3::jsonb`,
      [adminIds, type, JSON.stringify(payload)],
    );
  },
};
