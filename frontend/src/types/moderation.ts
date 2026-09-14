export interface Notification {
  id: string;
  type: string;
  payload: { message?: string; [key: string]: unknown };
  read_at: string | null;
  created_at: string;
}

export type ModerationEntityType = "resource" | "report";

export interface ModerationQueueItem {
  id: string;
  entity_type: ModerationEntityType;
  entity_id: string;
  details: string;
  moderation_status: string;
  created_at: string;
  target_type: "resource" | "forum_post" | "forum_comment" | "opportunity" | "user";
  category: string | null;
  reporter_name: string | null;
  reporter_phone: string | null;
  reporter_email: string | null;
  target_title: string | null;
  target_description: string | null;
  listing_type: string | null;
  has_evidence: boolean;
  parent_id: string | null;
  parent_title: string | null;
  parent_description: string | null;
  target_owner_id: string | null;
}

export type ModerationDecision =
  | "CONTENT_REMOVAL"
  | "POLICY_WARNING"
  | "CONTENT_RESTRICTION"
  | "ACCOUNT_WARNING"
  | "LISTING_SUSPENSION"
  | "NO_VIOLATION_FOUND"
  | "INSUFFICIENT_EVIDENCE"
  | "CONTENT_WITHIN_GUIDELINES"
  | "REPORT_NOT_APPLICABLE"
  | "DUPLICATE_REPORT";

export interface ReportResolutionPayload {
  moderationDecision: ModerationDecision;
  responseTitle: string;
  notificationTitle: string;
  notificationMessage: string;
  emailSubject: string;
  emailBody: string;
  moderationNotes?: string;
}
