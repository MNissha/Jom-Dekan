import { pool } from '../config/config/db';

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED' | 'RESTRICTED' | 'DEACTIVATED';
  auth_provider: 'PASSWORD' | 'GOOGLE';
  email_verified_at: Date | null;
  terms_accepted_at: Date | null;
  deleted_at: Date | null;
  failed_login_attempts: number;
  lockout_until: Date | null;
  suspended_until: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Parameterized SQL only. This module must never depend on Express
 * req/res — it is a pure data-access layer callable from services and
 * from scripts (e.g. createAdmin.ts) alike.
 */
export const userModel = {
  async findByEmail(email: string): Promise<UserRow | null> {
    const result = await pool.query<UserRow>(
      `SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL`,
      [email.trim().toLowerCase()],
    );
    return result.rows[0] ?? null;
  },

  async findById(id: string): Promise<UserRow | null> {
    const result = await pool.query<UserRow>(
      `SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    return result.rows[0] ?? null;
  },

  async create(params: {
    email: string;
    passwordHash: string;
    displayName: string;
    academicRole: 'STUDENT' | 'TUTOR';
    universityId: string;
    fieldOfStudy: string;
    currentYear: number;
    currentSemester: number;
  }): Promise<UserRow> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userResult = await client.query<UserRow>(
        `INSERT INTO users (email, password_hash, terms_accepted_at)
         VALUES ($1, $2, now())
         RETURNING *`,
        [params.email.trim().toLowerCase(), params.passwordHash],
      );
      const user = userResult.rows[0];

      await client.query(
        `INSERT INTO user_profiles (user_id, display_name, academic_role, university_id, field_of_study, current_year, current_semester)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          user.id,
          params.displayName,
          params.academicRole,
          params.universityId,
          params.fieldOfStudy,
          params.currentYear,
          params.currentSemester,
        ],
      );

      await client.query('COMMIT');
      return user;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async markEmailVerified(id: string): Promise<void> {
    await pool.query(`UPDATE users SET email_verified_at = now() WHERE id = $1`, [id]);
  },

  /**
   * Resets email_verified_at to NULL — the new address hasn't been
   * confirmed yet. The caller (profileService) is responsible for
   * sending a fresh verification email via authService.sendVerificationEmail,
   * reusing the exact same token/email flow issued at registration.
   */
  async updateEmail(id: string, email: string): Promise<UserRow> {
    const result = await pool.query<UserRow>(
      `UPDATE users SET email = $2, email_verified_at = NULL WHERE id = $1 RETURNING *`,
      [id, email.trim().toLowerCase()],
    );
    return result.rows[0];
  },

  async setRole(id: string, role: 'USER' | 'ADMIN'): Promise<UserRow | null> {
    const result = await pool.query<UserRow>(
      `UPDATE users SET role = $2 WHERE id = $1 RETURNING *`,
      [id, role],
    );
    return result.rows[0] ?? null;
  },

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await pool.query(`UPDATE users SET password_hash = $2 WHERE id = $1`, [id, passwordHash]);
  },

  /** Atomically records one more failed login attempt and returns the new count. */
  async incrementFailedLoginAttempts(id: string): Promise<number> {
    const result = await pool.query<{ failed_login_attempts: number }>(
      `UPDATE users SET failed_login_attempts = failed_login_attempts + 1 WHERE id = $1 RETURNING failed_login_attempts`,
      [id],
    );
    return result.rows[0].failed_login_attempts;
  },

  async setLockout(id: string, lockoutUntil: Date): Promise<void> {
    await pool.query(`UPDATE users SET lockout_until = $2 WHERE id = $1`, [id, lockoutUntil]);
  },

  /** Called on successful login, or lazily when a past lockout has expired. */
  async resetLoginAttempts(id: string): Promise<void> {
    await pool.query(`UPDATE users SET failed_login_attempts = 0, lockout_until = NULL WHERE id = $1`, [id]);
  },

  /** Admin-initiated disable — indefinite when `until` is null, otherwise lazily lifted by reactivateExpiredSuspensions(). */
  async suspend(id: string, until: Date | null): Promise<UserRow | null> {
    const result = await pool.query<UserRow>(
      `UPDATE users SET status = 'SUSPENDED', suspended_until = $2
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [id, until],
    );
    return result.rows[0] ?? null;
  },

  /** Admin-initiated re-enable, or the lazy reactivation path's single-row equivalent. */
  async reactivate(id: string): Promise<UserRow | null> {
    const result = await pool.query<UserRow>(
      `UPDATE users SET status = 'ACTIVE', suspended_until = NULL
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [id],
    );
    return result.rows[0] ?? null;
  },

  /**
   * Same lazy-expiry pattern as the lockout_until check in
   * authService.login — rather than a cron job this codebase doesn't
   * have, a disable-until timestamp is swept back to ACTIVE the next
   * time it's touched by a login/refresh attempt or the admin user
   * list/profile endpoints.
   */
  async reactivateExpiredSuspensions(): Promise<void> {
    await pool.query(
      `UPDATE users SET status = 'ACTIVE', suspended_until = NULL
       WHERE status = 'SUSPENDED' AND suspended_until IS NOT NULL AND suspended_until <= now()`,
    );
  },

  /** Soft delete — same convention as resources/forum_posts/forum_comments. */
  async softDelete(id: string): Promise<UserRow | null> {
    const result = await pool.query<UserRow>(
      `UPDATE users SET deleted_at = now(), status = 'DEACTIVATED'
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [id],
    );
    return result.rows[0] ?? null;
  },
};

export function toSafeUser(row: UserRow): {
  id: string;
  email: string;
  role: string;
  emailVerified: boolean;
  createdAt: Date;
} {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    emailVerified: row.email_verified_at !== null,
    createdAt: row.created_at,
  };
}
