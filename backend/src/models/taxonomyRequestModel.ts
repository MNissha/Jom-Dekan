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
  note: string | null;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Parameterized SQL only — same rule as every other model in this app.
 * No approve/reject/list-all-pending here on purpose: this migration
 * only ships the student-facing submission path, not the admin review
 * screen (see Migration 023's header comment).
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
    note?: string | null;
  }): Promise<TaxonomyRequestRow> {
    const result = await pool.query<TaxonomyRequestRow>(
      `INSERT INTO taxonomy_requests
         (requested_by, university_id, requested_university_name, faculty_id,
          requested_faculty_name, programme_id, requested_programme_name,
          requested_subject_code, requested_subject_name, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
