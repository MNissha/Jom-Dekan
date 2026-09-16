import { describe, expect, it } from "vitest";
import type { Notification } from "../src/types/moderation";
import { relativeNotificationTime, userNotificationDestination, userNotificationPresentation } from "../src/utils/notificationPresentation";

function item(type: string, payload: Notification["payload"] = {}): Notification {
  return { id: "notification-1", type, payload, read_at: null, created_at: "2026-09-16T04:00:00.000Z" };
}

describe("user notification presentation", () => {
  it.each([
    ["ANNOUNCEMENT", "announcements", "Announcement"],
    ["REPORT_REVIEWED", "reports", "Report update"],
    ["OPPORTUNITY_APPLICATION_ACCEPTED", "marketplace", "Application"],
    ["FORUM_REPLY", "community", "Community"],
    ["RESOURCE_APPROVED", "resources", "Resource update"],
    ["ACCOUNT_CREATED", "account", "Welcome"],
    ["TAXONOMY_REQUEST_APPROVED", "requests", "Request update"],
  ])("maps %s consistently", (type, category, label) => {
    expect(userNotificationPresentation(type)).toMatchObject({ category, label });
  });

  it("routes notifications using payload context", () => {
    expect(userNotificationDestination(item("OPPORTUNITY_APPLICATION_ACCEPTED", { opportunityId: "listing 1", listingType: "TUTORING" }))).toBe("/marketplace?listing=listing%201&type=TUTORING");
    expect(userNotificationDestination(item("FORUM_REPLY", { postId: "post-1" }))).toBe("/forum/post-1");
    expect(userNotificationDestination(item("RESOURCE_APPROVED", { resourceId: "resource-1" }))).toBe("/resources/resource-1");
    expect(userNotificationDestination(item("UNKNOWN_EVENT"))).toBeNull();
  });

  it("uses friendly relative times", () => {
    const now = new Date("2026-09-17T04:00:00.000Z").getTime();
    expect(relativeNotificationTime("2026-09-16T04:00:00.000Z", now)).toBe("Yesterday");
  });
});
