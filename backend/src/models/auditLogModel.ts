import { pool } from '../config/config/db';

export interface AuditLogEntry {
  id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  actor_display_name: string | null;
  actor_role: 'USER' | 'ADMIN' | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  request_id: string | null;
  ip_address: string | null;
  created_at: string;
}

/**
 * Append-only. No update/delete function is exported on purpose —
 * audit history must never be silently rewritten. (Enforced again at
 * the DB layer by a trigger — see migration 029.)
 */
export const auditLogModel = {
  async record(params: {
    actorUserId?: string | null;
    actorRole?: 'USER' | 'ADMIN' | null;
    action: string;
    targetType?: string;
    targetId?: string;
    reason?: string;
    metadata?: Record<string, unknown>;
    requestId?: string;
    ipAddress?: string;
  }): Promise<void> {
    await pool.query(
      `INSERT INTO audit_logs (actor_user_id, actor_role, action, target_type, target_id, reason, metadata, request_id, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        params.actorUserId ?? null,
        params.actorRole ?? null,
        params.action,
        params.targetType ?? null,
        params.targetId ?? null,
        params.reason ?? null,
        JSON.stringify(params.metadata ?? {}),
        params.requestId ?? null,
        params.ipAddress ?? null,
      ],
    );
  },

  async list(params: {
    actorRole: 'USER' | 'ADMIN';
    page: number;
    pageSize: number;
    action?: string;
    search?: string;
  }): Promise<{ rows: AuditLogEntry[]; total: number }> {
    const conditions = ['al.actor_role = $1'];
    const values: unknown[] = [params.actorRole];

    if (params.action) {
      values.push(params.action);
      conditions.push(`al.action = $${values.length}`);
    }
    if (params.search) {
      values.push(`%${params.search}%`);
      const idx = values.length;
      conditions.push(
        `(u.email ILIKE $${idx} OR up.display_name ILIKE $${idx} OR al.action ILIKE $${idx} OR al.reason ILIKE $${idx})`,
      );
    }
    const where = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.actor_user_id
       LEFT JOIN user_profiles up ON up.user_id = al.actor_user_id
       ${where}`,
      values,
    );

    const limit = params.pageSize;
    const offset = (params.page - 1) * params.pageSize;
    values.push(limit, offset);

    const rowsResult = await pool.query(
      `SELECT al.id, al.actor_user_id, u.email AS actor_email, up.display_name AS actor_display_name,
              al.actor_role, al.action, al.target_type, al.target_id, al.reason, al.metadata,
              al.request_id, al.ip_address, al.created_at
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.actor_user_id
       LEFT JOIN user_profiles up ON up.user_id = al.actor_user_id
       ${where}
       ORDER BY al.created_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    );

    return { rows: rowsResult.rows, total: countResult.rows[0].total as number };
  },
};
