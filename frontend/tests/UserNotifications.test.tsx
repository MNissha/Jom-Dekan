import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Notifications from "../src/pages/Notifications";
import type { Notification } from "../src/types/moderation";

const markAsRead = vi.fn(() => Promise.resolve());
const markAllAsRead = vi.fn(() => Promise.resolve({ updatedCount: 2 }));
const notifications: Notification[] = [
  { id: "report", type: "REPORT_REVIEWED", payload: { title: "Action Taken on Your Report", message: "A violation was confirmed.", response: "The content was removed." }, read_at: null, created_at: "2026-09-16T05:00:00.000Z" },
  { id: "application", type: "OPPORTUNITY_APPLICATION_ACCEPTED", payload: { title: "Application accepted", message: "Your application was accepted.", opportunityId: "listing-1", listingType: "TUTORING" }, read_at: null, created_at: "2026-09-16T04:00:00.000Z" },
  { id: "welcome", type: "ACCOUNT_CREATED", payload: { title: "Welcome", message: "Your account is ready." }, read_at: "2026-09-16T04:00:00.000Z", created_at: "2026-09-16T03:00:00.000Z" },
];

vi.mock("../src/hooks/useModeration", () => ({
  useModeration: () => ({ notifications, isLoadingNotifications: false, markAsRead, markAllAsRead, isMarkingAllAsRead: false }),
}));

vi.mock("../src/hooks/useMinimumLoading", () => ({ useMinimumLoading: () => false }));

describe("user Notifications page", () => {
  beforeEach(() => vi.clearAllMocks());

  it("preserves card styling while clearly distinguishing unread and admin responses", () => {
    render(<MemoryRouter><Notifications /></MemoryRouter>);
    const reportRow = screen.getByText("Action Taken on Your Report").closest("li");
    expect(reportRow).toHaveClass("border-[#CFC9F5]");
    expect(within(reportRow!).getByText("Unread")).toBeInTheDocument();
    expect(within(reportRow!).getByText("Report update")).toBeInTheDocument();
    expect(screen.getByText("Admin response:")).toBeInTheDocument();
    expect(screen.getByText("The content was removed.")).toBeInTheDocument();
  });

  it("filters unread and category-specific notifications", () => {
    render(<MemoryRouter><Notifications /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Unread (2)" }));
    expect(screen.queryByText("Welcome")).not.toBeInTheDocument();
    expect(screen.getByText("Application accepted")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reports" }));
    expect(screen.getByText("Action Taken on Your Report")).toBeInTheDocument();
    expect(screen.queryByText("Application accepted")).not.toBeInTheDocument();
  });

  it("supports individual and mark-all actions without marking on page open", () => {
    render(<MemoryRouter><Notifications /></MemoryRouter>);
    expect(markAsRead).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole("button", { name: "Mark as read" })[0]);
    expect(markAsRead).toHaveBeenCalledWith("report");
    fireEvent.click(screen.getByRole("button", { name: "Mark all as read" }));
    expect(markAllAsRead).toHaveBeenCalledTimes(1);
  });
});
