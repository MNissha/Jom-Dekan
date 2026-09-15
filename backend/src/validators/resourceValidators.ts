import { z } from "zod";
import { ALLOWED_MIME_TYPES } from "../utils/fileSniffer";
import { env } from "../config/config/env";

export const RESOURCE_CATEGORIES = [
  "PAST_PAPER",
  "NOTES",
  "SLIDES",
  "ARTICLE",
  "EXCEL",
  "EXERCISES",
] as const;

const categorySchema = z.enum(RESOURCE_CATEGORIES, {
  errorMap: () => ({ message: "Choose a category." }),
});

export const fileIdParamSchema = z
  .object({ fileId: z.string().uuid("Invalid id.") })
  .strict();

export const createUploadIntentSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, "Title must be at least 2 characters.")
      .max(200),
    description: z.string().trim().max(2000).optional(),
    category: categorySchema,
    universityId: z.string().uuid().optional(),
    facultyId: z.string().uuid().optional(),
    programmeId: z.string().uuid().optional(),
    subjectId: z.string().uuid().optional(),
    // Present when this is the 2nd+ file of a multi-file upload — attaches
    // this file to an already-created resource instead of creating a new
    // one. resourceService verifies ownership and ignores the taxonomy/
    // subject fields above in that case (they only apply to a new resource).
    resourceId: z.string().uuid().optional(),
    // Set instead of subjectId when the uploader is naming a subject
    // that isn't in the catalogue yet — resourceService resolves these
    // to a subjectId via taxonomyService.subjects.findOrCreateForProgramme
    // before the resource row is created, so the whole upload (including
    // standing up the subject) happens as one request.
    subjectCode: z.string().trim().min(2).max(20).optional(),
    subjectName: z.string().trim().min(2).max(200).optional(),
    // Only meaningful alongside subjectCode — which intake/curriculum
    // revision and semester this new subject belongs to for this
    // programme (see programme_subjects). Ignored when reusing an
    // existing subjectId, since that link already exists.
    subjectCurriculumYear: z.coerce.number().int().min(2000).max(2100).optional(),
    subjectSemester: z.coerce.number().int().min(1).max(10).optional(),
    fileName: z.string().trim().min(1).max(255),
    contentType: z.enum(ALLOWED_MIME_TYPES, {
      errorMap: () => ({
        message: "Unsupported file type. Allowed: PDF, JPEG, PNG, DOCX, XLSX, PPTX.",
      }),
    }),
    sizeBytes: z
      .number()
      .int()
      .positive()
      .max(env.resources.maxFileSizeBytes, "File is too large."),
  })
  .strict()
  .refine((data) => !(data.subjectId && data.subjectCode), {
    message: "Provide either subjectId or subjectCode, not both.",
    path: ["subjectCode"],
  })
  .refine((data) => !data.subjectCode || Boolean(data.subjectName), {
    message: "subjectName is required when adding a new subject by code.",
    path: ["subjectName"],
  })
  .refine((data) => !data.subjectCode || Boolean(data.programmeId), {
    message: "Select a programme before adding a new subject.",
    path: ["programmeId"],
  });

// A file-less resource has no bytes to carry the content, so unlike the
// upload-intent path above (where description is optional — the file
// itself is the content), description is required here and held to a
// real minimum length so this can't be used to post an empty listing.
export const createTextResourceSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, "Title must be at least 2 characters.")
      .max(200),
    description: z
      .string()
      .trim()
      .min(20, "Write at least 20 characters of content.")
      .max(2000),
    category: categorySchema,
    universityId: z.string().uuid().optional(),
    facultyId: z.string().uuid().optional(),
    programmeId: z.string().uuid().optional(),
    subjectId: z.string().uuid().optional(),
  })
  .strict();

export const updateResourceSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, "Title must be at least 2 characters.")
      .max(200),
    description: z.string().trim().max(2000).optional(),
    universityId: z.string().uuid().optional(),
    facultyId: z.string().uuid().optional(),
    programmeId: z.string().uuid().optional(),
    subjectId: z.string().uuid().optional(),
  })
  .strict();

// Not reusing taxonomy's boolean `isActive` — resources have a third
// terminal state (FAILED) that archive/restore never touches.
export const resourceStatusActionSchema = z
  .object({ action: z.enum(["ARCHIVE", "RESTORE"]) })
  .strict();

export const listResourcesQuerySchema = z
  .object({
    // Not z.coerce.boolean(): that's JS `Boolean(str)`, and the string
    // "false" is truthy — mine=false would silently coerce to true.
    mine: z
      .enum(["true", "false"])
      .optional()
      .transform((v) => v === "true"),
    universityId: z.string().uuid().optional(),
    facultyId: z.string().uuid().optional(),
    programmeId: z.string().uuid().optional(),
    subjectId: z.string().uuid().optional(),
    category: categorySchema.optional(),
    q: z.string().trim().min(1).max(200).optional(),
    // Allow-listed enum, not a raw column/direction string, so this can
    // only ever map to a fixed, hardcoded SQL fragment in the model.
    sortBy: z.enum(["newest", "oldest", "title"]).optional().default("newest"),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict();
