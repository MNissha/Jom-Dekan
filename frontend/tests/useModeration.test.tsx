import type { PropsWithChildren } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Notification } from "../src/types/moderation";
import { useModeration } from "../src/hooks/useModeration";

const markNotificationAsRead = vi.fn();
const markAllNotificationsAsRead = vi.fn();
const getNotifications = vi.fn();

vi.mock("../src/hooks/useAuth", () => ({
  useCurrentUser: () => ({ id: "admin-1", role: "ADMIN" }),
}));

vi.mock("../src/service/moderationService", () => ({
  moderationService: {
    getNotifications: (...args: unknown[]) => getNotifications(...args),
    getModerationQueue: () => Promise.resolve([]),
    markNotificationAsRead: (...args: unknown[]) => markNotificationAsRead(...args),
    markAllNotificationsAsRead: (...args: unknown[]) => markAllNotificationsAsRead(...args),
    sendAnnouncement: vi.fn(),
    handleModerationAction: vi.fn(),
  },
}));

const unread: Notification = {
  id: "notification-1",
  type: "REPORT_SUBMITTED",
  payload: { message: "New report" },
  read_at: null,
  created_at: "2026-09-16T04:00:00.000Z",
};

describe("useModeration optimistic updates", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    queryClient.setQueryData(["notifications"], [unread]);
    getNotifications.mockResolvedValue([unread]);
  });

  function wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  it("rolls back an individual optimistic read when the request fails", async () => {
    markNotificationAsRead.mockRejectedValue(new Error("Network error"));
    const { result } = renderHook(() => useModeration(), { wrapper });

    await act(async () => {
      await expect(result.current.markAsRead(unread.id)).rejects.toThrow("Network error");
    });

    expect(queryClient.getQueryData<Notification[]>(["notifications"])?.[0].read_at).toBeNull();
  });

  it("optimistically marks all notifications read and rolls back on failure", async () => {
    markAllNotificationsAsRead.mockRejectedValue(new Error("Network error"));
    const { result } = renderHook(() => useModeration(), { wrapper });

    await act(async () => {
      await expect(result.current.markAllAsRead()).rejects.toThrow("Network error");
    });

    await waitFor(() => expect(queryClient.getQueryData<Notification[]>(["notifications"])?.[0].read_at).toBeNull());
  });
});
