import { pool } from "../config/config/db";

export interface TaxonomyRequestRow {
  id: string;
  requested_by: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  university_id: string | null;
  requested_university_name: string | null;
  faculty_id: string | null;
  requested_faculty_name: string | null;
  programme_id: string | null;
  requested_programme_name: string | null;
  requested_subject_code: string | null;
  requested_subject_name: string | null;
  subject_id: string | null;
  note: string | null;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Parameterized SQL only — same rule as every other model in this app.
 */
export const taxonomyRequestModel = {
  async create(params: {
    requestedBy: string;
    universityId?: string | null;
    requestedUniversityName?: string | null;
    facultyId?: string | null;
    requestedFacultyName?: string | null;
    programmeId?: string | null;
    requestedProgrammeName?: string | null;
    requestedSubjectCode?: string | null;
    requestedSubjectName?: string | null;
    subjectId?: string | null;
    note?: string | null;
  }): Promise<TaxonomyRequestRow> {
    const result = await pool.query<TaxonomyRequestRow>(
      `INSERT INTO taxonomy_requests
         (requested_by, university_id, requested_university_name, faculty_id,
          requested_faculty_name, programme_id, requested_programme_name,
          requested_subject_code, requested_subject_name, subject_id, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        params.requestedBy,
        params.universityId ?? null,
        params.requestedUniversityName ?? null,
        params.facultyId ?? null,
        params.requestedFacultyName ?? null,
        params.programmeId ?? null,
        params.requestedProgrammeName ?? null,
        params.requestedSubjectCode ?? null,
        params.requestedSubjectName ?? null,
        params.subjectId ?? null,
        params.note ?? null,
      ],
    );
    return result.rows[0];
  },

  async listByRequester(userId: string): Promise<TaxonomyRequestRow[]> {
    const result = await pool.query<TaxonomyRequestRow>(
      `SELECT * FROM taxonomy_requests WHERE requested_by = $1 ORDER BY created_at DESC`,
      [userId],
    );
    return result.rows;
  },

  async listPending(): Promise<TaxonomyRequestRow[]> {
    const result = await pool.query<TaxonomyRequestRow>(
      `SELECT * FROM taxonomy_requests WHERE status = 'PENDING' ORDER BY created_at ASC`,
    );
    return result.rows;
  },

  async findById(id: string): Promise<TaxonomyRequestRow | null> {
    const result = await pool.query<TaxonomyRequestRow>(
      `SELECT * FROM taxonomy_requests WHERE id = $1`,
      [id],
    );
    return result.rows[0] ?? null;
  },

  // Only transitions a row that is still PENDING — a second admin
  // reviewing an already-decided request gets no row back rather than
  // silently overwriting the first decision. On approval the caller may
  // also pass the university/faculty/programme ids it just resolved
  // (existing or newly created) so the row reflects what was actually
  // stood up, not just the free-typed names the student submitted.
  async review(
    id: string,
    params: {
      status: "APPROVED" | "REJECTED";
      reviewedBy: string;
      universityId?: string | null;
      facultyId?: string | null;
      programmeId?: string | null;
    },
  ): Promise<TaxonomyRequestRow | null> {
    const result = await pool.query<TaxonomyRequestRow>(
      `UPDATE taxonomy_requests
         SET status = $2, reviewed_by = $3, reviewed_at = now(),
             university_id = COALESCE($4, university_id),
             faculty_id = COALESCE($5, faculty_id),
             programme_id = COALESCE($6, programme_id)
       WHERE id = $1 AND status = 'PENDING'
       RETURNING *`,
      [
        id,
        params.status,
        params.reviewedBy,
        params.universityId ?? null,
        params.facultyId ?? null,
        params.programmeId ?? null,
      ],
    );
    return result.rows[0] ?? null;
  },
};

export function toApiTaxonomyRequest(row: TaxonomyRequestRow) {
  return {
    id: row.id,
    status: row.status,
    universityId: row.university_id,
    requestedUniversityName: row.requested_university_name,
    facultyId: row.faculty_id,
    requestedFacultyName: row.requested_faculty_name,
    programmeId: row.programme_id,
    requestedProgrammeName: row.requested_programme_name,
    requestedSubjectCode: row.requested_subject_code,
    requestedSubjectName: row.requested_subject_name,
    subjectId: row.subject_id,
    note: row.note,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
