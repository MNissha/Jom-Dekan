import { pool } from "../config/config/db";

export type SupportRequestType = "SUPPORT" | "SUGGESTION";

export interface SupportRequestRow {
  id: string;
  user_id: string | null;
  type: SupportRequestType;
  subject: string;
  message: string;
  created_at: Date;
}

export const supportRequestModel = {
  async create(
    userId: string,
    data: { type: SupportRequestType; subject: string; message: string },
  ): Promise<SupportRequestRow> {
    const result = await pool.query<SupportRequestRow>(
      `INSERT INTO support_requests (user_id, type, subject, message)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, data.type, data.subject, data.message],
    );
    return result.rows[0];
  },

  async listAdmins(): Promise<{ id: string; email: string }[]> {
    const result = await pool.query<{ id: string; email: string }>(
      `SELECT id, email FROM users WHERE role = 'ADMIN' AND deleted_at IS NULL`,
    );
    return result.rows;
  },
};
