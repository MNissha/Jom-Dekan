import { z } from "zod";

export const createOpportunitySchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters long.")
    .max(255),
  description: z
    .string()
    .min(20, "Description must be at least 20 characters long.")
    .max(5000),
  subjectId: z.string().uuid().optional(),
  listingType: z.enum(["TUTORING", "STUDY_GROUP", "PROJECT_MENTORSHIP"]),
  mode: z.enum(["ONLINE", "PHYSICAL", "HYBRID"]),
  applicationDeadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Application deadline must use YYYY-MM-DD format.")
    .optional(),
}).superRefine((value, ctx) => {
  const phone = value.description.match(/^Contact:\s*([^\s]+)/m)?.[1];
  if (phone && !/^\d+$/.test(phone)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["description"], message: "Contact number must contain numbers only." });
  }

  if (value.listingType === "TUTORING") {
    const rate = value.description.match(/^Rate:\s*RM\s*([^/\s]+)/m)?.[1];
    const year = value.description.match(/^Year\/Level:\s*(\S+)/m)?.[1];
    if (!rate || !/^\d+(\.\d{1,2})?$/.test(rate) || Number(rate) <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["description"], message: "Tutoring rate must be a number above 0." });
    }
    if (!year || !/^\d+$/.test(year) || Number(year) <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["description"], message: "Tutoring year must be a positive whole number." });
    }
  }

  if (value.listingType === "PROJECT_MENTORSHIP" && /^Budget:/m.test(value.description)) {
    const budget = value.description.match(/^Budget:\s*RM\s*(\S+)/m)?.[1];
    const closes = value.description.match(/^Applications close:\s*(\S+)/m)?.[1];
    if (!budget || !/^\d+(\.\d{1,2})?$/.test(budget) || Number(budget) <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["description"], message: "Budget must be a number above 0." });
    }
    if (!closes || !/^\d{4}-\d{2}-\d{2}$/.test(closes) || Number.isNaN(Date.parse(`${closes}T00:00:00Z`))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["description"], message: "Application closing date must use YYYY-MM-DD format." });
    }
  }
});

export const applyOpportunitySchema = z.object({
  coverMessage: z
    .string()
    .min(10, "Cover message must be at least 10 characters long.")
    .max(2000),
  cvUrl: z.string().trim().url("Enter a valid CV link.").max(500).optional().or(z.literal("")),
  portfolioUrl: z.string().trim().url("Enter a valid portfolio link.").max(500).optional().or(z.literal("")),
});

export const updateOpportunityStatusSchema = z.object({
  status: z.enum(["active", "closed"]),
});

export const applicationStatusSchema = z.object({
  status: z.enum(["accepted", "declined"]),
}).strict();

export const applicationIdParamSchema = z.object({ applicationId: z.string().uuid("Invalid application id.") }).strict();

export const applicationFileParamSchema = z.object({
  applicationId: z.string().uuid("Invalid application id."),
  kind: z.enum(["cv", "portfolio"]),
}).strict();

export const adminCreateOpportunitySchema = z.object({
  title: z.string().trim().min(5).max(255),
  description: z.string().trim().min(20).max(5000),
  mode: z.enum(["ONLINE", "PHYSICAL", "HYBRID"]),
  listingType: z.enum(["TUTORING", "STUDY_GROUP", "PROJECT_MENTORSHIP"]),
}).strict();

export const adminUpdateOpportunitySchema = z.object({
  title: z.string().trim().min(5).max(255),
  description: z.string().trim().min(20).max(5000),
  mode: z.enum(["ONLINE", "PHYSICAL", "HYBRID"]),
}).strict();

export const opportunityIdParamSchema = z.object({ id: z.string().uuid("Invalid listing id.") }).strict();
