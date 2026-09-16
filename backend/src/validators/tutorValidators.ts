import { z } from "zod";

// Loose on purpose (no url() check) — a tutor might paste a bare
// "linkedin.com/in/..." without a scheme; normalized to a real URL by
// the frontend before it ever reaches here isn't guaranteed, so accept
// any non-empty string within a sane length instead of rejecting it.
const portfolioUrlSchema = z.string().trim().min(1).max(500);

export const resumeUploadIntentSchema = z
  .object({
    fileName: z.string().trim().min(1).max(255),
    contentType: z.string().trim().min(1),
    sizeBytes: z.coerce.number().int().positive(),
  })
  .strict();

export const applyTutorSchema = z
  .object({
    bio: z.string().trim().min(20, "Tell students a bit more about yourself (at least 20 characters).").max(2000),
    subjects: z.array(z.string().uuid()).min(1, "Select at least one subject you can tutor."),
    experience: z.string().trim().min(10, "Describe your relevant experience.").max(2000),
    hourlyRate: z.coerce.number().positive().max(9999.99).optional(),
    openToOtherUniversities: z.boolean().optional(),
    // A resume is required to apply — see resumeUploadIntentSchema for
    // the upload step this references (the file itself is uploaded
    // separately; only the resulting storage key/metadata land here).
    resumeStorageKey: z.string().trim().min(1, "Upload your resume/CV first."),
    resumeOriginalFilename: z.string().trim().min(1).max(255),
    resumeMimeType: z.string().trim().min(1),
    resumeSizeBytes: z.coerce.number().int().positive(),
    portfolioUrl: portfolioUrlSchema.optional(),
  })
  .strict();

// Same shape as applyTutorSchema, for the admin "grant a tag directly,
// no application behind it" path — resume/portfolio stay optional here
// since there's no upload step an admin is expected to walk through
// (they're vouching for someone in person/by other means, not reviewing
// a submitted application).
export const adminGrantTutorTagSchema = z
  .object({
    bio: z.string().trim().min(20, "Tell students a bit more about yourself (at least 20 characters).").max(2000),
    subjects: z.array(z.string().uuid()).min(1, "Select at least one subject you can tutor."),
    experience: z.string().trim().min(10, "Describe your relevant experience.").max(2000),
    hourlyRate: z.coerce.number().positive().max(9999.99).optional(),
    openToOtherUniversities: z.boolean().optional(),
    resumeStorageKey: z.string().trim().min(1).optional(),
    resumeOriginalFilename: z.string().trim().min(1).max(255).optional(),
    resumeMimeType: z.string().trim().min(1).optional(),
    resumeSizeBytes: z.coerce.number().int().positive().optional(),
    portfolioUrl: portfolioUrlSchema.optional(),
  })
  .strict();

export const updateTutorProfileSchema = z
  .object({
    bio: z.string().trim().min(20).max(2000).optional(),
    subjects: z.array(z.string().uuid()).min(1).optional(),
    hourlyRate: z.coerce.number().positive().max(9999.99).nullable().optional(),
    isActive: z.boolean().optional(),
    openToOtherUniversities: z.boolean().optional(),
    resumeStorageKey: z.string().trim().min(1).optional(),
    resumeOriginalFilename: z.string().trim().min(1).max(255).optional(),
    resumeMimeType: z.string().trim().min(1).optional(),
    resumeSizeBytes: z.coerce.number().int().positive().optional(),
    portfolioUrl: portfolioUrlSchema.optional(),
  })
  .strict();

export const tutorUserIdParamSchema = z.object({ userId: z.string().uuid("Invalid id.") }).strict();

export const requestBookingSchema = z
  .object({
    subjectId: z.string().uuid("Select a subject the tutor teaches."),
    requestedStartAt: z.coerce.date({ errorMap: () => ({ message: "A valid date/time is required." }) }),
    durationMinutes: z.coerce.number().int().min(15).max(240).default(60),
    message: z.string().trim().max(1000).optional(),
  })
  .strict();

export const bookingIdParamSchema = z.object({ id: z.string().uuid("Invalid id.") }).strict();

export const decideBookingSchema = z
  .object({ status: z.enum(["accepted", "declined"]) })
  .strict();

export const rescheduleBookingSchema = z
  .object({
    requestedStartAt: z.coerce.date({ errorMap: () => ({ message: "A valid date/time is required." }) }),
    durationMinutes: z.coerce.number().int().min(15).max(240).optional(),
  })
  .strict();

export const applicationIdParamSchema = z.object({ id: z.string().uuid("Invalid id.") }).strict();

export const decideApplicationSchema = z
  .object({
    action: z.enum(["approve", "reject"]),
    reason: z.string().trim().max(1000).optional(),
  })
  .strict();

export const listApplicationsQuerySchema = z
  .object({
    status: z.enum(["pending", "approved", "rejected"]).default("pending"),
  })
  .strict();
