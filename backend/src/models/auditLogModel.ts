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
              al.actor_role, al.action, al.target_type, al.target_id, al.reason,
              al.metadata, al.request_id, al.ip_address, al.created_at
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.actor_user_id
       LEFT JOIN user_profiles up ON up.user_id = al.actor_user_id
       ${where}
       ORDER BY al.created_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    );

    const rows = rowsResult.rows as AuditLogEntry[];
    await fillMissingReasons(rows);

    return { rows, total: countResult.rows[0].total as number };
  },
};

/**
 * Entries recorded before a given action started passing `reason` have
 * no way to get one now — audit_logs is append-only (see the class doc
 * comment; the DB itself rejects UPDATE/DELETE on it). But most of the
 * *target* rows a log entry points at are NOT append-only, so as long as
 * that row hasn't since been hard-deleted, its current data is enough to
 * reconstruct a reasonable "what was this about" for display — without
 * ever touching the stored audit_logs row itself.
 *
 * Mutates `rows` in place, filling `reason` only where it was null.
 * Batched one query per distinct target_type present on the page (not
 * one query per row), so a 25-row page costs at most a handful of
 * extra round trips.
 */
// USER_LOGIN's own action badge already says everything there is to say
// ("who logged in" is the actor column, not this target) — filling it
// with "Account: their-own-email." would just repeat the actor for no
// new information, so it stays exempt even though every other 'user'-
// targeted action below does get backfilled.
const NO_FALLBACK_ACTIONS = new Set(['USER_LOGIN']);

async function fillMissingReasons(rows: AuditLogEntry[]): Promise<void> {
  const idsByType = new Map<string, Set<string>>();
  for (const row of rows) {
    if (row.reason || !row.target_type || !row.target_id) continue;
    if (NO_FALLBACK_ACTIONS.has(row.action)) continue;
    if (!idsByType.has(row.target_type)) idsByType.set(row.target_type, new Set());
    idsByType.get(row.target_type)!.add(row.target_id);
  }
  if (idsByType.size === 0) return;

  const lookups = await Promise.all(
    Array.from(idsByType.entries()).map(async ([type, idSet]) => {
      const ids = Array.from(idSet);
      const reasons = await lookupFallbackReasons(type, ids);
      return [type, reasons] as const;
    }),
  );
  const reasonsByType = new Map(lookups);

  for (const row of rows) {
    if (row.reason || !row.target_type || !row.target_id) continue;
    if (NO_FALLBACK_ACTIONS.has(row.action)) continue;
    const reason = reasonsByType.get(row.target_type)?.get(row.target_id);
    if (reason) row.reason = reason;
  }
}

async function lookupFallbackReasons(targetType: string, ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const set = (id: string, text: string) => map.set(id, text);
  const truncate = (text: string, max = 100) =>
    text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;

  switch (targetType) {
    case 'user': {
      const r = await pool.query(`SELECT id, email FROM users WHERE id = ANY($1)`, [ids]);
      for (const row of r.rows) set(row.id, `Account: ${row.email}.`);
      break;
    }
    case 'resource': {
      const r = await pool.query(`SELECT id, title FROM resources WHERE id = ANY($1)`, [ids]);
      for (const row of r.rows) set(row.id, `Resource "${row.title}".`);
      break;
    }
    case 'resource_file': {
      const r = await pool.query(
        `SELECT rf.id, rf.original_filename, r.title AS resource_title
         FROM resource_files rf JOIN resources r ON r.id = rf.resource_id
         WHERE rf.id = ANY($1)`,
        [ids],
      );
      for (const row of r.rows) set(row.id, `File "${row.original_filename}" on resource "${row.resource_title}".`);
      break;
    }
    case 'resource_comment': {
      const r = await pool.query(`SELECT id, body FROM resource_comments WHERE id = ANY($1)`, [ids]);
      for (const row of r.rows) set(row.id, `Comment: "${truncate(row.body)}"`);
      break;
    }
    case 'forum_post': {
      const r = await pool.query(`SELECT id, title FROM forum_posts WHERE id = ANY($1)`, [ids]);
      for (const row of r.rows) set(row.id, `Thread "${row.title}".`);
      break;
    }
    case 'forum_comment': {
      const r = await pool.query(
        `SELECT fc.id, fc.body, fp.title AS post_title
         FROM forum_comments fc JOIN forum_posts fp ON fp.id = fc.post_id
         WHERE fc.id = ANY($1)`,
        [ids],
      );
      for (const row of r.rows) set(row.id, `Comment on "${row.post_title}": "${truncate(row.body)}"`);
      break;
    }
    case 'opportunity': {
      const r = await pool.query(`SELECT id, title, listing_type FROM opportunities WHERE id = ANY($1)`, [ids]);
      for (const row of r.rows) set(row.id, `Listing "${row.title}" (${row.listing_type}).`);
      break;
    }
    case 'opportunity_application': {
      const r = await pool.query(
        `SELECT oa.id, oa.status, o.title AS opportunity_title
         FROM opportunity_applications oa JOIN opportunities o ON o.id = oa.opportunity_id
         WHERE oa.id = ANY($1)`,
        [ids],
      );
      for (const row of r.rows) set(row.id, `Application (${row.status}) for "${row.opportunity_title}".`);
      break;
    }
    case 'report': {
      const r = await pool.query(`SELECT id, entity_type, reason FROM reports WHERE id = ANY($1)`, [ids]);
      for (const row of r.rows) set(row.id, `Report on ${row.entity_type}: "${truncate(row.reason)}"`);
      break;
    }
    case 'university': {
      const r = await pool.query(`SELECT id, name FROM universities WHERE id = ANY($1)`, [ids]);
      for (const row of r.rows) set(row.id, `University "${row.name}".`);
      break;
    }
    case 'faculty': {
      const r = await pool.query(`SELECT id, name FROM faculties WHERE id = ANY($1)`, [ids]);
      for (const row of r.rows) set(row.id, `Faculty "${row.name}".`);
      break;
    }
    case 'programme': {
      const r = await pool.query(`SELECT id, name FROM programmes WHERE id = ANY($1)`, [ids]);
      for (const row of r.rows) set(row.id, `Programme "${row.name}".`);
      break;
    }
    case 'subject': {
      const r = await pool.query(`SELECT id, code, name FROM subjects WHERE id = ANY($1)`, [ids]);
      for (const row of r.rows) set(row.id, `Subject "${row.code ? `${row.code} - ` : ''}${row.name}".`);
      break;
    }
    case 'taxonomy_request': {
      const r = await pool.query(
        `SELECT id, requested_university_name, requested_faculty_name, requested_programme_name,
                requested_subject_code, requested_subject_name
         FROM taxonomy_requests WHERE id = ANY($1)`,
        [ids],
      );
      for (const row of r.rows) {
        const parts = [
          row.requested_university_name && `university "${row.requested_university_name}"`,
          row.requested_faculty_name && `faculty "${row.requested_faculty_name}"`,
          row.requested_programme_name && `programme "${row.requested_programme_name}"`,
          row.requested_subject_name &&
            `subject "${row.requested_subject_code ? `${row.requested_subject_code} - ` : ''}${row.requested_subject_name}"`,
        ].filter(Boolean);
        if (parts.length) set(row.id, `Requested ${parts.join(', ')}.`);
      }
      break;
    }
    case 'tutor_application': {
      const r = await pool.query(
        `SELECT ta.id, ta.status, u.email
         FROM tutor_applications ta JOIN users u ON u.id = ta.user_id
         WHERE ta.id = ANY($1)`,
        [ids],
      );
      for (const row of r.rows) set(row.id, `Application (${row.status}) from ${row.email}.`);
      break;
    }
    case 'tutor_profile': {
      const r = await pool.query(
        `SELECT tp.user_id AS id, u.email
         FROM tutor_profiles tp JOIN users u ON u.id = tp.user_id
         WHERE tp.user_id = ANY($1)`,
        [ids],
      );
      for (const row of r.rows) set(row.id, `Tutor profile: ${row.email}.`);
      break;
    }
    default:
      break;
  }
  return map;
}
