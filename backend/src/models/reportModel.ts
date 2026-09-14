import { pool } from "../config/config/db";

export type ReportTargetType = "resource" | "forum_post" | "forum_comment" | "opportunity" | "user";
export type ReportCategory =
  | "INAPPROPRIATE_CONTENT"
  | "COPYRIGHT_VIOLATION"
  | "PLAGIARISM"
  | "ACADEMIC_DISHONESTY"
  | "SPAM_OR_SCAM"
  | "HARASSMENT"
  | "MISINFORMATION"
  | "HATE_OR_ABUSIVE_CONTENT"
  | "PRIVACY_CONCERN"
  | "SCAM_OR_SUSPICIOUS_ACTIVITY"
  | "OTHER";

export interface ReportRow {
  id: string;
  entity_type: string;
  entity_id: string;
  reporter_id: string | null;
  reason: string;
  category: ReportCategory;
  reporter_name: string;
  reporter_phone: string;
  reporter_email: string;
  status: "PENDING" | "RESOLVED_APPROVED" | "RESOLVED_REJECTED";
  created_at: Date;
  evidence_filename: string | null;
  evidence_mime_type: string | null;
  evidence_data: Buffer | null;
}

/**
 * Writes into the SAME `reports` table the admin-side moderation queue
 * (moderationModel.ts, a teammate's module) already reads from — this
 * file only ever INSERTs, it never touches getModerationQueue's read
 * path or the status/resolve flow, which stays theirs to build.
 */
export const reportModel = {
  async create(params: {
    entityType: ReportTargetType;
    entityId: string;
    reporterId: string;
    category: ReportCategory;
    reporterName: string;
    reporterPhone: string;
    reporterEmail: string;
    description: string;
    parentId?: string;
    evidence?: { filename: string; mimeType: string; data: Buffer };
  }): Promise<ReportRow> {
    const result = await pool.query<ReportRow>(
      `INSERT INTO reports
         (entity_type, entity_id, reporter_id, reason, category, reporter_name, reporter_phone, reporter_email,
          evidence_filename, evidence_mime_type, evidence_data, parent_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        params.entityType,
        params.entityId,
        params.reporterId,
        params.description,
        params.category,
        params.reporterName,
        params.reporterPhone,
        params.reporterEmail,
        params.evidence?.filename ?? null,
        params.evidence?.mimeType ?? null,
        params.evidence?.data ?? null,
        params.parentId ?? null,
      ],
    );
    return result.rows[0];
  },

  async getEvidence(reportId: string) {
    const result = await pool.query<{
      evidence_filename: string | null;
      evidence_mime_type: string | null;
      evidence_data: Buffer | null;
    }>(
      `SELECT evidence_filename, evidence_mime_type, evidence_data
       FROM reports WHERE id = $1`,
      [reportId],
    );
    return result.rows[0] ?? null;
  },

  async listAdmins(): Promise<{ id: string; email: string }[]> {
    const result = await pool.query<{ id: string; email: string }>(
      `SELECT id, email FROM users WHERE role = 'ADMIN' AND deleted_at IS NULL`,
    );
    return result.rows;
  },

  /**
   * One notification row per admin, in the same `notifications` table
   * the existing bell/notifications endpoints already read — no new
   * table needed. When the admin-side "respond to reporter" feature is
   * built later, the natural mirror of this is inserting into this same
   * table addressed to the report's reporter_id.
   */
  async notifyAdmins(
    adminIds: string[],
    payload: { reportId: string; entityType: string; entityId: string; category: ReportCategory; listingType?: string },
  ): Promise<void> {
    if (adminIds.length === 0) return;
    await pool.query(
      `INSERT INTO notifications (user_id, type, payload)
       SELECT unnest($1::uuid[]), 'REPORT_SUBMITTED', $2::jsonb`,
      [
        adminIds,
        JSON.stringify({
          message: `New report: ${payload.category.replace(/_/g, " ").toLowerCase()} on a ${payload.entityType.replace("_", " ")}`,
          ...payload,
        }),
      ],
    );
  },
};

export function toApiReport(row: ReportRow) {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    reporterId: row.reporter_id,
    category: row.category,
    description: row.reason,
    status: row.status,
    createdAt: row.created_at,
  };
}
