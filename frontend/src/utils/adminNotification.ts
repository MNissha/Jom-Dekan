import type { ModerationQueueItem, Notification } from "../types/moderation";
import { adminReportRoute } from "./adminReportRoute";
export { notificationMessage, notificationTitle, relativeNotificationTime } from "./notificationPresentation";

export type AdminNotificationCategory = "reports" | "requests" | "support" | "other";

const TAXONOMY_COMMUNITY_TYPES = [
  "TAXONOMY_REQUEST_SUBMITTED",
  "SUBJECT_COMMUNITY_SUBMITTED",
  "TAXONOMY_UNIVERSITY_COMMUNITY_SUBMITTED",
  "TAXONOMY_FACULTY_COMMUNITY_SUBMITTED",
  "TAXONOMY_PROGRAMME_COMMUNITY_SUBMITTED",
];

export function adminNotificationCategory(type: string): AdminNotificationCategory {
  if (type === "REPORT_SUBMITTED") return "reports";
  if (TAXONOMY_COMMUNITY_TYPES.includes(type)) {
    return "requests";
  }
  if (type === "SUPPORT_REQUEST_SUBMITTED" || type === "SUGGESTION_SUBMITTED") {
    return "support";
  }
  return "other";
}

export function adminNotificationDestination(
  notification: Notification,
  queue: ModerationQueueItem[] = [],
): string | null {
  if (notification.type === "REPORT_SUBMITTED") {
    return adminReportRoute(notification, queue);
  }
  if (TAXONOMY_COMMUNITY_TYPES.includes(notification.type)) {
    return "/admin?section=requests";
  }
  if (
    notification.type === "SUPPORT_REQUEST_SUBMITTED" ||
    notification.type === "SUGGESTION_SUBMITTED"
  ) {
    return "/admin/notifications?section=received&filter=support";
  }
  if (notification.type === "TUTOR_APPLICATION_SUBMITTED") {
    return "/admin/tutor-applications";
  }
  return null;
}

export function notificationCategoryLabel(type: string) {
  const category = adminNotificationCategory(type);
  if (category === "reports") return "Report";
  if (category === "requests") return "Request";
  if (category === "support") {
    return type === "SUGGESTION_SUBMITTED" ? "Suggestion" : "Support";
  }
  return "Update";
}
