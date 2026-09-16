import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminNotifications from "../src/pages/admin/AdminNotifications";
import type { Notification } from "../src/types/moderation";

const markAsRead = vi.fn(() => Promise.resolve());
const markAllAsRead = vi.fn(() => Promise.resolve({ updatedCount: 1 }));
const notifications: Notification[] = [
  { id: "unread-report", type: "REPORT_SUBMITTED", payload: { title: "Unread report", message: "A report needs review", entityType: "resource" }, read_at: null, created_at: "2026-09-16T05:00:00.000Z" },
  { id: "read-support", type: "SUPPORT_REQUEST_SUBMITTED", payload: { title: "Read support", message: "A support request" }, read_at: "2026-09-16T05:00:00.000Z", created_at: "2026-09-16T04:00:00.000Z" },
];

vi.mock("../src/hooks/useAdminUsers", () => ({
  useAdminUsersList: () => ({ data: { data: [] }, isLoading: false }),
}));

vi.mock("../src/hooks/useDebounce", () => ({ useDebounce: (value: string) => value }));

vi.mock("../src/hooks/useModeration", () => ({
  useModeration: () => ({
    notifications,
    isLoadingNotifications: false,
    sendAnnouncement: vi.fn(),
    isSendingAnnouncement: false,
    markAsRead,
    markAllAsRead,
    isMarkingAllAsRead: false,
    queue: [],
  }),
}));

describe("AdminNotifications", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows all types and clearly styles unread notifications", () => {
    render(<MemoryRouter initialEntries={["/admin/notifications?section=received"]}><AdminNotifications /></MemoryRouter>);
    expect(screen.getByText("Unread report")).toBeInTheDocument();
    expect(screen.getByText("Read support")).toBeInTheDocument();
    const unreadRow = screen.getByText("Unread report").closest("li");
    expect(unreadRow).toHaveClass("bg-primary-50/70");
    expect(within(unreadRow!).getByText("Unread")).toBeInTheDocument();
  });

  it("filters to unread and support notifications", () => {
    render(<MemoryRouter initialEntries={["/admin/notifications?section=received"]}><AdminNotifications /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Unread (1)" }));
    expect(screen.getByText("Unread report")).toBeInTheDocument();
    expect(screen.queryByText("Read support")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Support" }));
    expect(screen.getByText("Read support")).toBeInTheDocument();
    expect(screen.queryByText("Unread report")).not.toBeInTheDocument();
  });

  it("supports individual and bulk mark-as-read actions", () => {
    render(<MemoryRouter initialEntries={["/admin/notifications?section=received"]}><AdminNotifications /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Mark as read" }));
    expect(markAsRead).toHaveBeenCalledWith("unread-report");
    fireEvent.click(screen.getByRole("button", { name: "Mark all as read" }));
    expect(markAllAsRead).toHaveBeenCalledTimes(1);
  });
});
