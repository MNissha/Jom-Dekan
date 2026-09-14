import { z } from "zod";

export const REPORT_TARGET_TYPES = ["resource", "forum_post", "forum_comment", "opportunity", "user"] as const;

export const REPORT_CATEGORIES = [
  "INAPPROPRIATE_CONTENT",
  "COPYRIGHT_VIOLATION",
  "PLAGIARISM",
  "ACADEMIC_DISHONESTY",
  "SPAM_OR_SCAM",
  "HARASSMENT",
  "MISINFORMATION",
  "HATE_OR_ABUSIVE_CONTENT",
  "PRIVACY_CONCERN",
  "SCAM_OR_SUSPICIOUS_ACTIVITY",
  "OTHER",
] as const;

export const createReportSchema = z
  .object({
    targetType: z.enum(REPORT_TARGET_TYPES, {
      errorMap: () => ({ message: "Invalid report target type." }),
    }),
    targetId: z.string().uuid("Invalid id."),
    parentId: z.string().uuid("Invalid discussion id.").optional(),
    category: z.enum(REPORT_CATEGORIES, {
      errorMap: () => ({ message: "Choose a report category." }),
    }),
    reporterName: z.string().trim().min(2, "Enter your name.").max(120),
    reporterPhone: z.string().trim().min(5, "Enter a contact phone number.").max(30),
    reporterEmail: z.string().trim().email("Enter a valid email address.").max(255),
    description: z.string().trim().max(2000),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.targetType === "forum_comment" && !data.parentId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["parentId"], message: "Discussion id is required." });
    }
    if (data.targetType !== "forum_comment" && data.description.length < 20) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["description"], message: "Describe the issue in at least 20 characters." });
    }
  });
