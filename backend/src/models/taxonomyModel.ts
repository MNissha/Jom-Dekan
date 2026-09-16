import { pool } from "../config/config/db";

export interface UniversityRow {
  id: string;
  name: string;
  slug: string;
  country: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
export interface FacultyRow {
  id: string;
  university_id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
export interface ProgrammeRow {
  id: string;
  faculty_id: string;
  name: string;
  slug: string;
  study_level: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
export interface SubjectRow {
  id: string;
  // NULL means "legacy / catalogue-wide" — created before subjects were
  // scoped per university, or an admin-created subject not tied to one.
  // Never treated as equal to another NULL for uniqueness purposes (see
  // migration 041's partial unique indexes).
  university_id: string | null;
  code: string | null;
  name: string;
  is_active: boolean;
  source: "ADMIN" | "COMMUNITY";
  verification_status: "COMMUNITY_SUBMITTED" | "ADMIN_VERIFIED";
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Parameterized SQL only, no Express req/res — same rule as userModel.
 * "Archive" (setActive false) hides a row from new use without touching
 * anything that already references it. Hard `delete()` is also available
 * on each entity below for when an admin wants it gone entirely — the
 * service layer checks for dependents first and returns a friendly error
 * instead of letting the FK constraint reject it.
 */
export const taxonomyModel = {
  universities: {
    async list(): Promise<UniversityRow[]> {
      const result = await pool.query<UniversityRow>(
        `SELECT * FROM universities ORDER BY is_active DESC, name ASC`,
      );
      return result.rows;
    },
    async findById(id: string): Promise<UniversityRow | null> {
      const result = await pool.query<UniversityRow>(
        `SELECT * FROM universities WHERE id = $1`,
        [id],
      );
      return result.rows[0] ?? null;
    },
    async findBySlug(slug: string): Promise<UniversityRow | null> {
      const result = await pool.query<UniversityRow>(
        `SELECT * FROM universities WHERE slug = $1`,
        [slug],
      );
      return result.rows[0] ?? null;
    },
    async create(params: {
      name: string;
      slug: string;
      country: string;
    }): Promise<UniversityRow> {
      const result = await pool.query<UniversityRow>(
        `INSERT INTO universities (name, slug, country) VALUES ($1, $2, $3) RETURNING *`,
        [params.name, params.slug, params.country],
      );
      return result.rows[0];
    },
    async update(
      id: string,
      params: { name: string; slug: string; country: string },
    ): Promise<UniversityRow | null> {
      const result = await pool.query<UniversityRow>(
        `UPDATE universities SET name = $2, slug = $3, country = $4 WHERE id = $1 RETURNING *`,
        [id, params.name, params.slug, params.country],
      );
      return result.rows[0] ?? null;
    },
    async setActive(
      id: string,
      isActive: boolean,
    ): Promise<UniversityRow | null> {
      const result = await pool.query<UniversityRow>(
        `UPDATE universities SET is_active = $2 WHERE id = $1 RETURNING *`,
        [id, isActive],
      );
      return result.rows[0] ?? null;
    },
    async countFaculties(id: string): Promise<number> {
      const result = await pool.query<{ count: string }>(
        `SELECT COUNT(*) FROM faculties WHERE university_id = $1`,
        [id],
      );
      return Number(result.rows[0].count);
    },
    async delete(id: string): Promise<boolean> {
      const result = await pool.query(
        `DELETE FROM universities WHERE id = $1`,
        [id],
      );
      return (result.rowCount ?? 0) > 0;
    },
  },

  faculties: {
    async findById(id: string): Promise<FacultyRow | null> {
      const result = await pool.query<FacultyRow>(
        `SELECT * FROM faculties WHERE id = $1`,
        [id],
      );
      return result.rows[0] ?? null;
    },
    async listByUniversity(universityId: string): Promise<FacultyRow[]> {
      const result = await pool.query<FacultyRow>(
        `SELECT * FROM faculties WHERE university_id = $1 ORDER BY is_active DESC, name ASC`,
        [universityId],
      );
      return result.rows;
    },
    async findBySlug(
      universityId: string,
      slug: string,
    ): Promise<FacultyRow | null> {
      const result = await pool.query<FacultyRow>(
        `SELECT * FROM faculties WHERE university_id = $1 AND slug = $2`,
        [universityId, slug],
      );
      return result.rows[0] ?? null;
    },
    async create(params: {
      universityId: string;
      name: string;
      slug: string;
    }): Promise<FacultyRow> {
      const result = await pool.query<FacultyRow>(
        `INSERT INTO faculties (university_id, name, slug) VALUES ($1, $2, $3) RETURNING *`,
        [params.universityId, params.name, params.slug],
      );
      return result.rows[0];
    },
    async update(
      id: string,
      params: { name: string; slug: string },
    ): Promise<FacultyRow | null> {
      const result = await pool.query<FacultyRow>(
        `UPDATE faculties SET name = $2, slug = $3 WHERE id = $1 RETURNING *`,
        [id, params.name, params.slug],
      );
      return result.rows[0] ?? null;
    },
    async setActive(id: string, isActive: boolean): Promise<FacultyRow | null> {
      const result = await pool.query<FacultyRow>(
        `UPDATE faculties SET is_active = $2 WHERE id = $1 RETURNING *`,
        [id, isActive],
      );
      return result.rows[0] ?? null;
    },
    async countProgrammes(id: string): Promise<number> {
      const result = await pool.query<{ count: string }>(
        `SELECT COUNT(*) FROM programmes WHERE faculty_id = $1`,
        [id],
      );
      return Number(result.rows[0].count);
    },
    async delete(id: string): Promise<boolean> {
      const result = await pool.query(`DELETE FROM faculties WHERE id = $1`, [
        id,
      ]);
      return (result.rowCount ?? 0) > 0;
    },
  },

  programmes: {
    async findById(id: string): Promise<ProgrammeRow | null> {
      const result = await pool.query<ProgrammeRow>(
        `SELECT * FROM programmes WHERE id = $1`,
        [id],
      );
      return result.rows[0] ?? null;
    },
    async listByFaculty(facultyId: string): Promise<ProgrammeRow[]> {
      const result = await pool.query<ProgrammeRow>(
        `SELECT * FROM programmes WHERE faculty_id = $1 ORDER BY is_active DESC, name ASC`,
        [facultyId],
      );
      return result.rows;
    },
    async findBySlug(
      facultyId: string,
      slug: string,
    ): Promise<ProgrammeRow | null> {
      const result = await pool.query<ProgrammeRow>(
        `SELECT * FROM programmes WHERE faculty_id = $1 AND slug = $2`,
        [facultyId, slug],
      );
      return result.rows[0] ?? null;
    },
    async create(params: {
      facultyId: string;
      name: string;
      slug: string;
      studyLevel: string | null;
    }): Promise<ProgrammeRow> {
      const result = await pool.query<ProgrammeRow>(
        `INSERT INTO programmes (faculty_id, name, slug, study_level) VALUES ($1, $2, $3, $4) RETURNING *`,
        [params.facultyId, params.name, params.slug, params.studyLevel],
      );
      return result.rows[0];
    },
    async update(
      id: string,
      params: { name: string; slug: string; studyLevel: string | null },
    ): Promise<ProgrammeRow | null> {
      const result = await pool.query<ProgrammeRow>(
        `UPDATE programmes SET name = $2, slug = $3, study_level = $4 WHERE id = $1 RETURNING *`,
        [id, params.name, params.slug, params.studyLevel],
      );
      return result.rows[0] ?? null;
    },
    async setActive(
      id: string,
      isActive: boolean,
    ): Promise<ProgrammeRow | null> {
      const result = await pool.query<ProgrammeRow>(
        `UPDATE programmes SET is_active = $2 WHERE id = $1 RETURNING *`,
        [id, isActive],
      );
      return result.rows[0] ?? null;
    },
    async countDependents(id: string): Promise<number> {
      const result = await pool.query<{ count: string }>(
        `SELECT
           (SELECT COUNT(*) FROM programme_subjects WHERE programme_id = $1) +
           (SELECT COUNT(*) FROM resources WHERE programme_id = $1) AS count`,
        [id],
      );
      return Number(result.rows[0].count);
    },
    async delete(id: string): Promise<boolean> {
      const result = await pool.query(`DELETE FROM programmes WHERE id = $1`, [
        id,
      ]);
      return (result.rowCount ?? 0) > 0;
    },
  },

  subjects: {
    async findById(id: string): Promise<SubjectRow | null> {
      const result = await pool.query<SubjectRow>(
        `SELECT * FROM subjects WHERE id = $1`,
        [id],
      );
      return result.rows[0] ?? null;
    },
    // `code` is stored already normalized (see normalizeSubjectCode), so
    // this is a plain equality lookup, not a case-insensitive search.
    // Scoped to a university (or explicitly NULL/"legacy") to match the
    // per-university uniqueness in migration 041 — a NULL universityId
    // here intentionally only matches other NULL-university rows, never
    // "any university", so it can't accidentally merge two different
    // universities' CSC577 into one.
    async findByCode(
      code: string,
      universityId: string | null,
    ): Promise<SubjectRow | null> {
      const result = await pool.query<SubjectRow>(
        universityId
          ? `SELECT * FROM subjects WHERE code = $1 AND university_id = $2`
          : `SELECT * FROM subjects WHERE code = $1 AND university_id IS NULL`,
        universityId ? [code, universityId] : [code],
      );
      return result.rows[0] ?? null;
    },
    // Fallback lookup for the optional-code case: same university, same
    // normalized (trimmed, case-insensitive) name.
    async findByNormalizedName(
      name: string,
      universityId: string,
    ): Promise<SubjectRow | null> {
      const result = await pool.query<SubjectRow>(
        `SELECT * FROM subjects
         WHERE code IS NULL AND university_id = $1 AND lower(btrim(name)) = lower(btrim($2))`,
        [universityId, name],
      );
      return result.rows[0] ?? null;
    },
    async list(filters?: {
      universityId?: string;
      search?: string;
    }): Promise<SubjectRow[]> {
      const conditions: string[] = [];
      const values: unknown[] = [];
      if (filters?.universityId) {
        values.push(filters.universityId);
        conditions.push(`university_id = $${values.length}`);
      }
      if (filters?.search) {
        values.push(`%${filters.search.replace(/[\\%_]/g, "\\$&")}%`);
        conditions.push(
          `(code ILIKE $${values.length} ESCAPE '\\' OR name ILIKE $${values.length} ESCAPE '\\')`,
        );
      }
      const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
      const result = await pool.query<SubjectRow>(
        `SELECT * FROM subjects ${whereClause} ORDER BY is_active DESC, name ASC`,
        values,
      );
      return result.rows;
    },
    async listByProgramme(programmeId: string): Promise<SubjectRow[]> {
      const result = await pool.query<SubjectRow>(
        `SELECT DISTINCT s.* FROM subjects s
         JOIN programme_subjects ps ON ps.subject_id = s.id
         WHERE ps.programme_id = $1
         ORDER BY s.is_active DESC, s.name ASC`,
        [programmeId],
      );
      return result.rows;
    },
    async create(params: {
      code?: string | null;
      name: string;
      universityId?: string | null;
      source?: "ADMIN" | "COMMUNITY";
      verificationStatus?: "COMMUNITY_SUBMITTED" | "ADMIN_VERIFIED";
      createdBy?: string | null;
    }): Promise<SubjectRow> {
      const result = await pool.query<SubjectRow>(
        `INSERT INTO subjects (code, name, university_id, source, verification_status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          params.code ?? null,
          params.name,
          params.universityId ?? null,
          params.source ?? "ADMIN",
          params.verificationStatus ?? "ADMIN_VERIFIED",
          params.createdBy ?? null,
        ],
      );
      return result.rows[0];
    },
    async update(
      id: string,
      params: { name: string },
    ): Promise<SubjectRow | null> {
      const result = await pool.query<SubjectRow>(
        `UPDATE subjects SET name = $2 WHERE id = $1 RETURNING *`,
        [id, params.name],
      );
      return result.rows[0] ?? null;
    },
    async setActive(id: string, isActive: boolean): Promise<SubjectRow | null> {
      const result = await pool.query<SubjectRow>(
        `UPDATE subjects SET is_active = $2 WHERE id = $1 RETURNING *`,
        [id, isActive],
      );
      return result.rows[0] ?? null;
    },
    async countDependents(id: string): Promise<number> {
      const result = await pool.query<{ count: string }>(
        `SELECT
           (SELECT COUNT(*) FROM programme_subjects WHERE subject_id = $1) +
           (SELECT COUNT(*) FROM resources WHERE subject_id = $1) AS count`,
        [id],
      );
      return Number(result.rows[0].count);
    },
    async delete(id: string): Promise<boolean> {
      const result = await pool.query(`DELETE FROM subjects WHERE id = $1`, [
        id,
      ]);
      return (result.rowCount ?? 0) > 0;
    },
  },

  programmeSubjects: {
    // curriculum_year is part of the table's primary key (so it can't be
    // NULL); default to the current year when the caller doesn't care to
    // track separate curriculum revisions.
    async link(params: {
      programmeId: string;
      subjectId: string;
      curriculumYear?: number;
      recommendedYear?: number;
      recommendedSemester?: number;
    }): Promise<boolean> {
      const result = await pool.query(
        `INSERT INTO programme_subjects
           (programme_id, subject_id, curriculum_year, recommended_year, recommended_semester)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (programme_id, subject_id, curriculum_year) DO NOTHING`,
        [
          params.programmeId,
          params.subjectId,
          params.curriculumYear ?? new Date().getFullYear(),
          params.recommendedYear ?? null,
          params.recommendedSemester ?? null,
        ],
      );
      return (result.rowCount ?? 0) > 0;
    },
    async unlink(programmeId: string, subjectId: string): Promise<boolean> {
      const result = await pool.query(
        `DELETE FROM programme_subjects WHERE programme_id = $1 AND subject_id = $2`,
        [programmeId, subjectId],
      );
      return (result.rowCount ?? 0) > 0;
    },
  },
};

// Row -> API shape mapping, same purpose as toSafeUser in userModel.ts.
export function toApiUniversity(row: UniversityRow) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    country: row.country,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
export function toApiFaculty(row: FacultyRow) {
  return {
    id: row.id,
    universityId: row.university_id,
    name: row.name,
    slug: row.slug,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
export function toApiProgramme(row: ProgrammeRow) {
  return {
    id: row.id,
    facultyId: row.faculty_id,
    name: row.name,
    slug: row.slug,
    studyLevel: row.study_level,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
export function toApiSubject(row: SubjectRow) {
  return {
    id: row.id,
    universityId: row.university_id,
    code: row.code,
    name: row.name,
    isActive: row.is_active,
    source: row.source,
    verificationStatus: row.verification_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
