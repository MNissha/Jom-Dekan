import { z } from "zod";

export const idParamSchema = z
  .object({ id: z.string().uuid("Invalid id.") })
  .strict();

export const statusSchema = z.object({ isActive: z.boolean() }).strict();

// ---- Universities ----
export const createUniversitySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters.")
      .max(200),
    country: z.string().trim().min(2).max(100).optional(),
  })
  .strict();
export const updateUniversitySchema = createUniversitySchema;

// ---- Faculties ----
export const createFacultySchema = z
  .object({
    universityId: z.string().uuid("universityId must be a valid id."),
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters.")
      .max(200),
  })
  .strict();
export const updateFacultySchema = z
  .object({ name: z.string().trim().min(2).max(200) })
  .strict();
export const listFacultiesQuerySchema = z
  .object({ universityId: z.string().uuid("universityId must be a valid id.") })
  .strict();

// ---- Programmes ----
const studyLevelEnum = z.enum(["DIPLOMA", "DEGREE", "MASTERS", "PHD"]);
export const createProgrammeSchema = z
  .object({
    facultyId: z.string().uuid("facultyId must be a valid id."),
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters.")
      .max(200),
    studyLevel: studyLevelEnum.optional(),
  })
  .strict();
export const updateProgrammeSchema = z
  .object({
    name: z.string().trim().min(2).max(200),
    studyLevel: studyLevelEnum.optional(),
  })
  .strict();
export const listProgrammesQuerySchema = z
  .object({ facultyId: z.string().uuid("facultyId must be a valid id.") })
  .strict();

// ---- Subjects ----
export const createSubjectSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(2, "Code must be at least 2 characters.")
      .max(20),
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters.")
      .max(200),
  })
  .strict();
export const updateSubjectSchema = z
  .object({ name: z.string().trim().min(2).max(200) })
  .strict();
export const listSubjectsQuerySchema = z
  .object({ programmeId: z.string().uuid("programmeId must be a valid id.").optional() })
  .strict();

// Deliberately looser than createSubjectSchema (no .toUpperCase() here —
// the service normalizes the code) since this is filled in by a student
// typing on the fly, not an admin filling out a form.
export const findOrCreateSubjectSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(2, "Code must be at least 2 characters.")
      .max(20),
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters.")
      .max(200),
    // Which intake/curriculum revision and semester this subject sits in
    // for this programme — same fields as linkProgrammeSubjectSchema,
    // since this call ends up creating the same programme_subjects row.
    curriculumYear: z.coerce.number().int().min(2000).max(2100).optional(),
    recommendedSemester: z.coerce.number().int().min(1).max(10).optional(),
  })
  .strict();

// ---- Taxonomy requests (student-facing "can't find it? request it") --
// Loose on purpose: this is a free-form "help us fill the gap" report,
// not a strict cascading form, so any subset of the fields may be
// present. The refine() below is the only hard rule — there must be
// *something* new being requested.
export const createTaxonomyRequestSchema = z
  .object({
    universityId: z.string().uuid().optional(),
    requestedUniversityName: z.string().trim().min(2).max(200).optional(),
    facultyId: z.string().uuid().optional(),
    requestedFacultyName: z.string().trim().min(2).max(200).optional(),
    programmeId: z.string().uuid().optional(),
    requestedProgrammeName: z.string().trim().min(2).max(200).optional(),
    requestedSubjectCode: z.string().trim().min(2).max(20).optional(),
    requestedSubjectName: z.string().trim().min(2).max(200).optional(),
    note: z.string().trim().max(1000).optional(),
  })
  .strict()
  .refine(
    (data) =>
      Boolean(
        data.requestedUniversityName ||
          data.requestedFacultyName ||
          data.requestedProgrammeName ||
          (data.requestedSubjectCode && data.requestedSubjectName),
      ),
    {
      message:
        "Provide at least one missing university, faculty, programme, or subject to request.",
    },
  );

// ---- Programme <-> Subject links ----
export const linkProgrammeSubjectSchema = z
  .object({
    subjectId: z.string().uuid("subjectId must be a valid id."),
    curriculumYear: z.coerce.number().int().min(2000).max(2100).optional(),
    recommendedYear: z.coerce.number().int().min(1).max(8).optional(),
    recommendedSemester: z.coerce.number().int().min(1).max(10).optional(),
  })
  .strict();
export const unlinkProgrammeSubjectParamsSchema = z
  .object({
    id: z.string().uuid("Invalid id."),
    subjectId: z.string().uuid("Invalid id."),
  })
  .strict();
