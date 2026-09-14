import type { ModerationQueueItem, Notification } from "../types/moderation";

/** Returns the moderation category for a report notification, never a popup URL. */
export function adminReportRoute(
  notification: Notification,
  queue: ModerationQueueItem[] = [],
) {
  const entityType = notification.payload.entityType;
  if (entityType === "resource") return "/admin/moderation?section=resources";
  if (entityType === "forum_comment") {
    return "/admin/moderation?section=discussions&discussion=comments";
  }
  if (entityType === "forum_post") {
    return "/admin/moderation?section=discussions&discussion=threads";
  }
  if (entityType === "opportunity") {
    const reportId = notification.payload.reportId;
    const queuedReport = typeof reportId === "string"
      ? queue.find((item) => item.id === reportId)
      : undefined;
    const listingType = notification.payload.listingType ?? queuedReport?.listing_type;
    return listingType === "TUTORING"
      ? "/admin/moderation?section=tutoring"
      : "/admin/moderation?section=freelance";
  }
  return "/admin/moderation";
}
