import { describe, expect, it } from "vitest";
import type { Notification } from "../src/types/moderation";
import {
  adminNotificationCategory,
  adminNotificationDestination,
  notificationCategoryLabel,
  notificationMessage,
  notificationTitle,
  relativeNotificationTime,
} from "../src/utils/adminNotification";

function notification(type: string, payload: Notification["payload"] = {}): Notification {
  return { id: "notification-1", type, payload, read_at: null, created_at: "2026-09-16T04:00:00.000Z" };
}

describe("admin notification helpers", () => {
  it.each([
    ["REPORT_SUBMITTED", "reports"],
    ["TAXONOMY_REQUEST_SUBMITTED", "requests"],
    ["SUBJECT_COMMUNITY_SUBMITTED", "requests"],
    ["SUPPORT_REQUEST_SUBMITTED", "support"],
    ["SUGGESTION_SUBMITTED", "support"],
    ["UNKNOWN", "other"],
  ])("categorizes %s as %s", (type, category) => {
    expect(adminNotificationCategory(type)).toBe(category);
  });

  it("routes reports, requests, and support notifications", () => {
    expect(adminNotificationDestination(notification("REPORT_SUBMITTED", { entityType: "resource" }))).toBe("/admin/moderation?section=resources");
    expect(adminNotificationDestination(notification("TAXONOMY_REQUEST_SUBMITTED"))).toBe("/admin?section=requests");
    expect(adminNotificationDestination(notification("SUPPORT_REQUEST_SUBMITTED"))).toBe("/admin/notifications?section=received&filter=support");
    expect(adminNotificationDestination(notification("UNKNOWN"))).toBeNull();
  });

  it("creates accessible display content without exposing raw enum text", () => {
    const item = notification("SUPPORT_REQUEST_SUBMITTED", { title: "Help needed", message: "Cannot open a file" });
    expect(notificationTitle(item)).toBe("Help needed");
    expect(notificationMessage(item)).toBe("Cannot open a file");
    expect(notificationCategoryLabel(item.type)).toBe("Support");
  });

  it("formats recent times", () => {
    const now = new Date("2026-09-16T04:05:00.000Z").getTime();
    expect(relativeNotificationTime("2026-09-16T04:00:00.000Z", now)).toBe("5 minutes ago");
  });
});
