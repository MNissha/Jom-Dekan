export type ReportTargetType = "resource" | "forum_post" | "forum_comment" | "opportunity" | "user";

export type ReportCategory =
  | "INAPPROPRIATE_CONTENT"
  | "COPYRIGHT_VIOLATION"
  | "PLAGIARISM"
  | "ACADEMIC_DISHONESTY"
  | "SPAM_OR_SCAM"
  | "HARASSMENT"
  | "MISINFORMATION"
  | "HATE_OR_ABUSIVE_CONTENT"
  | "PRIVACY_CONCERN"
  | "SCAM_OR_SUSPICIOUS_ACTIVITY"
  | "OTHER";

export const REPORT_CATEGORIES: ReportCategory[] = [
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
];

export const REPORT_CATEGORY_LABELS: Record<ReportCategory, string> = {
  INAPPROPRIATE_CONTENT: "Inappropriate content",
  COPYRIGHT_VIOLATION: "Illegal / copyright violation",
  PLAGIARISM: "Plagiarism",
  ACADEMIC_DISHONESTY: "Academic dishonesty / contract cheating",
  SPAM_OR_SCAM: "Spam or scam",
  HARASSMENT: "Harassment or bullying",
  MISINFORMATION: "Misinformation",
  HATE_OR_ABUSIVE_CONTENT: "Hate or abusive content",
  PRIVACY_CONCERN: "Personal information / privacy concern",
  SCAM_OR_SUSPICIOUS_ACTIVITY: "Scam or suspicious activity",
  OTHER: "Other",
};

export interface Report {
  id: string;
  entityType: ReportTargetType;
  entityId: string;
  reporterId: string | null;
  category: ReportCategory;
  description: string;
  status: "PENDING" | "RESOLVED_APPROVED" | "RESOLVED_REJECTED";
  createdAt: string;
}
