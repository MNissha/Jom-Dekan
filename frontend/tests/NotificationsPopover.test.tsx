import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationsPopover } from "../src/components/common/NotificationsPopover";
import type { Notification } from "../src/types/moderation";

const markAsRead = vi.fn(() => Promise.resolve());
const markAllAsRead = vi.fn(() => Promise.resolve({ updatedCount: 2 }));
let notifications: Notification[] = [];
let role = "ADMIN";

vi.mock("../src/hooks/useAuth", () => ({
  useCurrentUser: () => ({ id: "user-1", role }),
}));

vi.mock("../src/hooks/useModeration", () => ({
  useModeration: () => ({
    notifications,
    isLoadingNotifications: false,
    markAsRead,
    markAllAsRead,
    isMarkingAllAsRead: false,
    queue: [],
  }),
}));

function Location() {
  return <output data-testid="location">{useLocation().pathname}{useLocation().search}</output>;
}

function item(id: string, type: string, minutes: number, read = false): Notification {
  return {
    id,
    type,
    payload: { title: `Notification ${id}`, message: `Message ${id}`, entityType: "resource" },
    read_at: read ? "2026-09-16T04:10:00.000Z" : null,
    created_at: `2026-09-16T04:${String(minutes).padStart(2, "0")}:00.000Z`,
  };
}

describe("NotificationsPopover", () => {
  beforeEach(() => {
    markAsRead.mockClear();
    markAllAsRead.mockClear();
    role = "ADMIN";
    notifications = [item("1", "REPORT_SUBMITTED", 9), item("2", "SUPPORT_REQUEST_SUBMITTED", 8), item("3", "TAXONOMY_REQUEST_SUBMITTED", 7, true), item("4", "SUGGESTION_SUBMITTED", 6, true), item("5", "UNKNOWN", 5, true), item("6", "UNKNOWN", 4, true)];
  });

  it("shows the unread badge and only the five newest notifications", () => {
    render(<MemoryRouter><NotificationsPopover /></MemoryRouter>);
    expect(screen.getByLabelText("2 unread notifications")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Notifications"));
    expect(screen.getByText("Notification 1")).toBeInTheDocument();
    expect(screen.queryByText("Notification 6")).not.toBeInTheDocument();
    expect(screen.getAllByText("Unread")).toHaveLength(2);
  });

  it("marks one item without triggering row navigation", () => {
    render(<MemoryRouter initialEntries={["/dashboard"]}><NotificationsPopover /><Location /></MemoryRouter>);
    fireEvent.click(screen.getByLabelText("Notifications"));
    fireEvent.click(screen.getAllByText("Mark read")[0]);
    expect(markAsRead).toHaveBeenCalledWith("1");
    expect(screen.getByTestId("location")).toHaveTextContent("/dashboard");
  });

  it("marks all unread notifications through one action", () => {
    render(<MemoryRouter><NotificationsPopover /></MemoryRouter>);
    fireEvent.click(screen.getByLabelText("Notifications"));
    fireEvent.click(screen.getByText("Mark all read"));
    expect(markAllAsRead).toHaveBeenCalledTimes(1);
  });

  it("marks a report read and navigates to its moderation destination", () => {
    render(<MemoryRouter initialEntries={["/dashboard"]}><NotificationsPopover /><Location /></MemoryRouter>);
    fireEvent.click(screen.getByLabelText("Notifications"));
    fireEvent.click(screen.getByLabelText("Notification 1, unread"));
    expect(markAsRead).toHaveBeenCalledWith("1");
    expect(screen.getByTestId("location")).toHaveTextContent("/admin/moderation?section=resources");
  });

  it("alerts users when unread notifications exist beyond the five newest", () => {
    role = "USER";
    notifications = [item("1", "ANNOUNCEMENT", 9, true), item("2", "ANNOUNCEMENT", 8, true), item("3", "ANNOUNCEMENT", 7, true), item("4", "ANNOUNCEMENT", 6, true), item("5", "ANNOUNCEMENT", 5, true), item("6", "REPORT_REVIEWED", 4)];
    render(<MemoryRouter><NotificationsPopover /></MemoryRouter>);
    fireEvent.click(screen.getByLabelText("Notifications"));
    expect(screen.getByText("1 more unread notification")).toHaveAttribute("href", "/notifications?filter=unread");
  });
});
