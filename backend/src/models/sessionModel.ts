import { pool } from '../config/config/db';

export interface SessionRow {
  id: string;
  user_id: string;
  refresh_token_hash: string;
  user_agent: string | null;
  ip_address: string | null;
  expires_at: Date;
  revoked_at: Date | null;
  replaced_by_id: string | null;
  created_at: Date;
}

export const sessionModel = {
  /**
   * `id` is required (not DB-generated) because the caller signs the
   * refresh JWT's `sid` claim with this same id *before* the row exists
   * — refresh() later rejects the token unless session.id === payload.sid,
   * so the two must be the exact same value, not two independently
   * generated UUIDs.
   */
  async create(params: {
    id: string;
    userId: string;
    refreshTokenHash: string;
    userAgent?: string;
    ipAddress?: string;
    expiresAt: Date;
  }): Promise<SessionRow> {
    const result = await pool.query<SessionRow>(
      `INSERT INTO user_sessions (id, user_id, refresh_token_hash, user_agent, ip_address, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [params.id, params.userId, params.refreshTokenHash, params.userAgent ?? null, params.ipAddress ?? null, params.expiresAt],
    );
    return result.rows[0];
  },

  async findByTokenHash(tokenHash: string): Promise<SessionRow | null> {
    const result = await pool.query<SessionRow>(
      `SELECT * FROM user_sessions WHERE refresh_token_hash = $1`,
      [tokenHash],
    );
    return result.rows[0] ?? null;
  },

  async findById(id: string): Promise<SessionRow | null> {
    const result = await pool.query<SessionRow>(`SELECT * FROM user_sessions WHERE id = $1`, [id]);
    return result.rows[0] ?? null;
  },

  /** Rotation: revoke the old session and point it at its replacement. */
  async revokeAndReplace(oldSessionId: string, newSessionId: string): Promise<void> {
    await pool.query(
      `UPDATE user_sessions SET revoked_at = now(), replaced_by_id = $2 WHERE id = $1`,
      [oldSessionId, newSessionId],
    );
  },

  async revoke(id: string): Promise<void> {
    await pool.query(`UPDATE user_sessions SET revoked_at = now() WHERE id = $1`, [id]);
  },

  async revokeAllForUser(userId: string): Promise<void> {
    await pool.query(
      `UPDATE user_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId],
    );
  },
};
