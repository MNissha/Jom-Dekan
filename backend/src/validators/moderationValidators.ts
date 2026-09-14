import { z } from "zod";

export const moderationDecisions = [
  "CONTENT_REMOVAL",
  "POLICY_WARNING",
  "CONTENT_RESTRICTION",
  "ACCOUNT_WARNING",
  "LISTING_SUSPENSION",
  "NO_VIOLATION_FOUND",
  "INSUFFICIENT_EVIDENCE",
  "CONTENT_WITHIN_GUIDELINES",
  "REPORT_NOT_APPLICABLE",
  "DUPLICATE_REPORT",
] as const;

export const moderationActionSchema = z.object({
  action: z.enum(["approve", "reject", "quarantine"]),
  reason: z
    .string()
    .min(5, "A mandatory audit reason of at least 5 characters is required."),
  moderationDecision: z.enum(moderationDecisions).optional(),
  responseTitle: z.string().trim().min(1).max(160).optional(),
  notificationTitle: z.string().trim().min(1).max(160).optional(),
  notificationMessage: z.string().trim().min(1).max(2000).optional(),
  emailSubject: z.string().trim().min(1).max(200).optional(),
  emailBody: z.string().trim().min(1).max(10000).optional(),
  moderationNotes: z.string().trim().max(2000).optional(),
});

export const sendAnnouncementSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    message: z.string().trim().min(1).max(2000),
    sendToAll: z.boolean(),
    userIds: z.array(z.string().uuid()).max(100).default([]),
  })
  .refine((data) => data.sendToAll || data.userIds.length > 0, {
    message: "Select at least one user.",
    path: ["userIds"],
  });
