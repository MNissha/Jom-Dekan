import { pool } from "../config/config/db";

export type OpportunityApplicationStatus = "pending" | "accepted" | "declined";

export interface OpportunityApplicationFile {
  filename: string;
  mimeType: string;
  data: Buffer;
}

export interface OpportunityApplicationWithContext {
  id: string;
  opportunity_id: string;
  applicant_id: string;
  cover_message: string;
  status: OpportunityApplicationStatus;
  created_at: Date;
  opportunity_owner_id: string;
  opportunity_title: string;
  applicant_email: string;
  applicant_name: string | null;
  has_cv: boolean;
  cv_url: string | null;
  has_portfolio: boolean;
  portfolio_url: string | null;
}

export class OpportunityModel {
  /**
   * Flips any listing whose stated application deadline has passed to
   * 'closed' — the same status an admin uses to close a listing by
   * hand. Called lazily at the top of the read paths students/owners
   * hit, mirroring userModel.reactivateExpiredSuspensions(); no cron
   * needed.
   */
  static async archiveExpired(): Promise<void> {
    await pool.query(
      `UPDATE opportunities SET status = 'closed'
       WHERE status = 'active' AND application_deadline IS NOT NULL AND application_deadline < CURRENT_DATE`,
    );
  }

  /**
   * `userId` is optional since this list is public — anonymous callers
   * just get `my_application_status: null` for every listing.
   */
  static async getAllActive(userId?: string | null) {
    await OpportunityModel.archiveExpired();
    const query = `
            SELECT o.*, up.display_name as owner_name, s.code as subject_code, s.name as subject_name,
                   my_app.status AS my_application_status
            FROM opportunities o
            LEFT JOIN user_profiles up ON o.owner_id = up.user_id
            LEFT JOIN subjects s ON o.subject_id = s.id
            LEFT JOIN opportunity_applications my_app
              ON my_app.opportunity_id = o.id AND my_app.applicant_id = $1
            WHERE o.status = 'active'
            ORDER BY o.created_at DESC
        `;

    const result = await pool.query(query, [userId ?? null]);
    return result.rows;
  }

  static async getAllForOwner(ownerId: string) {
    await OpportunityModel.archiveExpired();
    const query = `
            SELECT o.*, up.display_name as owner_name, s.code as subject_code, s.name as subject_name
            FROM opportunities o
            LEFT JOIN user_profiles up ON o.owner_id = up.user_id
            LEFT JOIN subjects s ON o.subject_id = s.id
            WHERE o.owner_id = $1
            ORDER BY o.created_at DESC
        `;
    const result = await pool.query(query, [ownerId]);
    return result.rows;
  }

  static async create(
    ownerId: string,
    data: {
      title: string;
      description: string;
      subjectId?: string;
      listingType: string;
      mode: string;
      applicationDeadline?: string | null;
    },
  ) {
    const query = `
            INSERT INTO opportunities (owner_id, title, description, subject_id, listing_type, mode, status, application_deadline)
            VALUES ($1, $2, $3, $4, $5, $6, 'active', $7)
            RETURNING *
        `;
    const values = [
      ownerId,
      data.title,
      data.description,
      data.subjectId || null,
      data.listingType,
      data.mode,
      data.applicationDeadline || null,
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async createApplication(
    opportunityId: string,
    applicantId: string,
    coverMessage: string,
    files: {
      cv?: OpportunityApplicationFile;
      cvUrl?: string;
      portfolio?: OpportunityApplicationFile;
      portfolioUrl?: string;
    },
  ) {
    // RETURNING deliberately excludes cv_data/portfolio_data — echoing a
    // multi-MB upload back as a JSON byte array bloats the response
    // enough to blow past the frontend's request timeout for real-sized
    // files. Callers that need the file content use getApplicationFile.
    const query = `
            INSERT INTO opportunity_applications (
              opportunity_id, applicant_id, cover_message, status,
              cv_filename, cv_mime_type, cv_data, cv_url,
              portfolio_filename, portfolio_mime_type, portfolio_data, portfolio_url
            )
            VALUES ($1, $2, $3, 'pending', $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id, opportunity_id, applicant_id, cover_message, status, created_at,
                      cv_filename, cv_mime_type, cv_url,
                      portfolio_filename, portfolio_mime_type, portfolio_url
        `;
    const values = [
      opportunityId,
      applicantId,
      coverMessage,
      files.cv?.filename ?? null,
      files.cv?.mimeType ?? null,
      files.cv?.data ?? null,
      files.cvUrl ?? null,
      files.portfolio?.filename ?? null,
      files.portfolio?.mimeType ?? null,
      files.portfolio?.data ?? null,
      files.portfolioUrl ?? null,
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findApplicationById(
    id: string,
  ): Promise<OpportunityApplicationWithContext | null> {
    const query = `
      SELECT a.id, a.opportunity_id, a.applicant_id, a.cover_message, a.status, a.created_at,
             o.owner_id AS opportunity_owner_id, o.title AS opportunity_title,
             u.email AS applicant_email, up.display_name AS applicant_name,
             (a.cv_data IS NOT NULL) AS has_cv, a.cv_url,
             (a.portfolio_data IS NOT NULL) AS has_portfolio, a.portfolio_url
      FROM opportunity_applications a
      JOIN opportunities o ON o.id = a.opportunity_id
      JOIN users u ON u.id = a.applicant_id
      LEFT JOIN user_profiles up ON up.user_id = a.applicant_id
      WHERE a.id = $1
    `;
    const result = await pool.query<OpportunityApplicationWithContext>(query, [id]);
    return result.rows[0] ?? null;
  }

  static async getApplicationsForOpportunity(
    opportunityId: string,
  ): Promise<OpportunityApplicationWithContext[]> {
    const query = `
      SELECT a.id, a.opportunity_id, a.applicant_id, a.cover_message, a.status, a.created_at,
             o.owner_id AS opportunity_owner_id, o.title AS opportunity_title,
             u.email AS applicant_email, up.display_name AS applicant_name,
             (a.cv_data IS NOT NULL) AS has_cv, a.cv_url,
             (a.portfolio_data IS NOT NULL) AS has_portfolio, a.portfolio_url
      FROM opportunity_applications a
      JOIN opportunities o ON o.id = a.opportunity_id
      JOIN users u ON u.id = a.applicant_id
      LEFT JOIN user_profiles up ON up.user_id = a.applicant_id
      WHERE a.opportunity_id = $1
      ORDER BY a.created_at DESC
    `;
    const result = await pool.query<OpportunityApplicationWithContext>(query, [opportunityId]);
    return result.rows;
  }

  static async updateApplicationStatus(id: string, status: "accepted" | "declined") {
    // Same reasoning as createApplication — never echo cv_data/portfolio_data back.
    const result = await pool.query(
      `UPDATE opportunity_applications SET status = $2 WHERE id = $1
       RETURNING id, opportunity_id, applicant_id, cover_message, status, created_at,
                 cv_filename, cv_mime_type, cv_url,
                 portfolio_filename, portfolio_mime_type, portfolio_url`,
      [id, status],
    );
    return result.rows[0] ?? null;
  }

  static async getApplicationFile(
    applicationId: string,
    kind: "cv" | "portfolio",
  ): Promise<OpportunityApplicationFile | null> {
    const column = kind === "cv" ? "cv" : "portfolio";
    const result = await pool.query<{
      filename: string | null;
      mime_type: string | null;
      data: Buffer | null;
    }>(
      `SELECT ${column}_filename AS filename, ${column}_mime_type AS mime_type, ${column}_data AS data
       FROM opportunity_applications WHERE id = $1`,
      [applicationId],
    );
    const row = result.rows[0];
    if (!row || !row.data || !row.mime_type || !row.filename) return null;
    return { filename: row.filename, mimeType: row.mime_type, data: row.data };
  }

  static async notifyUser(
    userId: string,
    type: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await pool.query(
      `INSERT INTO notifications (user_id, type, payload) VALUES ($1, $2, $3::jsonb)`,
      [userId, type, JSON.stringify(payload)],
    );
  }

  static async getAllForAdmin() {
    const query = `
            SELECT o.*, up.display_name as owner_name, s.code as subject_code, s.name as subject_name
            FROM opportunities o
            LEFT JOIN user_profiles up ON o.owner_id = up.user_id
            LEFT JOIN subjects s ON o.subject_id = s.id
            ORDER BY o.created_at DESC
        `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async updateStatus(id: string, status: string) {
    const query = `
            UPDATE opportunities SET status = $1 WHERE id = $2
            RETURNING *
        `;
    const result = await pool.query(query, [status, id]);
    return result.rows[0];
  }

  static async update(id: string, data: { title: string; description: string; mode: string }) {
    const result = await pool.query(
      `UPDATE opportunities SET title = $2, description = $3, mode = $4, updated_at = now()
       WHERE id = $1 RETURNING *`,
      [id, data.title, data.description, data.mode],
    );
    return result.rows[0] ?? null;
  }

  static async remove(id: string) {
    const result = await pool.query<{ id: string }>(`DELETE FROM opportunities WHERE id = $1 RETURNING id`, [id]);
    return Boolean(result.rows[0]);
  }

  static async findById(id: string) {
    const result = await pool.query(`SELECT * FROM opportunities WHERE id = $1`, [id]);
    return result.rows[0] ?? null;
  }
}
