import { z } from "zod";

export const applyTutorSchema = z
  .object({
    bio: z.string().trim().min(20, "Tell students a bit more about yourself (at least 20 characters).").max(2000),
    subjects: z.array(z.string().uuid()).min(1, "Select at least one subject you can tutor."),
    experience: z.string().trim().min(10, "Describe your relevant experience.").max(2000),
    hourlyRate: z.coerce.number().positive().max(9999.99).optional(),
  })
  .strict();

export const updateTutorProfileSchema = z
  .object({
    bio: z.string().trim().min(20).max(2000).optional(),
    subjects: z.array(z.string().uuid()).min(1).optional(),
    hourlyRate: z.coerce.number().positive().max(9999.99).nullable().optional(),
    isActive: z.boolean().optional(),
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
