import { z } from "zod";

export const createSupportRequestSchema = z
  .object({
    type: z.enum(["SUPPORT", "SUGGESTION"]),
    subject: z
      .string()
      .trim()
      .min(3, "Subject must be at least 3 characters long.")
      .max(200)
      .optional(),
    message: z
      .string()
      .trim()
      .min(10, "Please provide at least 10 characters.")
      .max(3000),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.type === "SUPPORT" && !value.subject) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["subject"],
        message: "Subject is required for support requests.",
      });
    }
  });
