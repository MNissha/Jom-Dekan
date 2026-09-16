import { useState } from "react";
import { Bell, CheckCheck, LifeBuoy, Megaphone, Search, ShieldAlert, SlidersHorizontal, X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { useAdminUsersList } from "../../hooks/useAdminUsers";
import { useDebounce } from "../../hooks/useDebounce";
import { useModeration } from "../../hooks/useModeration";
import type { AdminUserListItem } from "../../types/adminUser";
import type { Notification } from "../../types/moderation";
import {
  adminNotificationCategory,
  adminNotificationDestination,
  notificationCategoryLabel,
  notificationMessage,
  notificationTitle,
} from "../../utils/adminNotification";

type NotificationFilter = "all" | "unread" | "reports" | "requests" | "support";
const PAGE_SIZE = 10;

export default function AdminNotifications() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSection =
    searchParams.get("section") === "announcement"
      ? "announcement"
      : "received";
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sendToAll, setSendToAll] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<AdminUserListItem[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const requestedFilter = searchParams.get("filter");
  const activeFilter: NotificationFilter = requestedFilter === "unread" || requestedFilter === "reports" || requestedFilter === "requests" || requestedFilter === "support" ? requestedFilter : "all";
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const debouncedSearch = useDebounce(search, 500);
  const isSearchPending = search !== debouncedSearch;
  const usersQuery = useAdminUsersList({
    search: debouncedSearch || undefined,
    page: 1,
    pageSize: 10,
  });
  const {
    notifications,
    isLoadingNotifications,
    sendAnnouncement,
    isSendingAnnouncement,
    markAsRead,
    markAllAsRead,
    isMarkingAllAsRead,
    queue,
  } = useModeration();

  const sortedNotifications = [...(notifications as Notification[])].sort(
    (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
  );
  const unreadCount = sortedNotifications.filter((notification) => !notification.read_at).length;
  const filteredNotifications = sortedNotifications.filter((notification) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "unread") return !notification.read_at;
    return adminNotificationCategory(notification.type) === activeFilter;
  });
  const visibleNotifications = filteredNotifications.slice(0, visibleCount);
  const matchingUsers = (usersQuery.data?.data ?? []).filter(
    (user) =>
      user.role === "USER" &&
      !selectedUsers.some((selected) => selected.id === user.id),
  );

  const submitAnnouncement = async (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    try {
      const result = await sendAnnouncement({
        title,
        message,
        sendToAll,
        userIds: sendToAll ? [] : selectedUsers.map((user) => user.id),
      });
      setTitle("");
      setMessage("");
      setSelectedUsers([]);
      setSearch("");
      setFeedback(`Announcement sent to ${result.recipientCount} user${result.recipientCount === 1 ? "" : "s"}.`);
    } catch (error) {
      const apiMessage = axios.isAxiosError(error)
        ? (error.response?.data as { error?: { message?: string } })?.error?.message
        : undefined;
      setFeedback(apiMessage ?? "Could not send the announcement.");
    }
  };

  const setNotificationFilter = (filter: NotificationFilter) => {
    setVisibleCount(PAGE_SIZE);
    setSearchParams({ section: "received", filter });
  };

  const openNotification = (notification: Notification) => {
    if (!notification.read_at) void markAsRead(notification.id).catch((error) => console.error("Failed to mark notification as read", error));
    const destination = adminNotificationDestination(notification, queue);
    if (destination) navigate(destination);
  };

  return (
    <div className="page-container page-container-standard">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-400">
          Admin communications
        </p>
        <h1 className="mt-grid-1 break-words text-2xl font-heading leading-tight tracking-tight text-content-primary sm:text-page-title">
          Notifications
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Send announcements and review notifications submitted by users.
        </p>
      </div>

      <nav
        className="mt-6 flex w-fit gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
        aria-label="Notification sections"
      >
        <button
          type="button"
          onClick={() => setSearchParams({ section: "received" })}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${activeSection === "received" ? "bg-primary-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
        >
          Received notifications
        </button>
        <button
          type="button"
          onClick={() => setSearchParams({ section: "announcement" })}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${activeSection === "announcement" ? "bg-primary-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
        >
          Send announcement
        </button>
      </nav>

      <div className="mt-4">
        {activeSection === "announcement" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-amber-50 p-2 text-amber-700">
              <Megaphone className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-semibold text-slate-900">Send an announcement</h2>
              <p className="mt-1 text-sm text-slate-500">
                Notify every user or choose specific recipients.
              </p>
            </div>
          </div>

          <form className="mt-5 space-y-4" onSubmit={submitAnnouncement}>
            <div className="flex gap-5 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={sendToAll}
                  onChange={() => setSendToAll(true)}
                />
                All users
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={!sendToAll}
                  onChange={() => setSendToAll(false)}
                />
                Specific users
              </label>
            </div>

            {!sendToAll && (
              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="user-search">
                  Search users by name or email
                </label>
                <div className="relative mt-1.5">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                  <input
                    id="user-search"
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm"
                    placeholder="Type a name or email"
                  />
                </div>
                {search.trim() && (
                  <div className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-slate-200">
                    {isSearchPending || usersQuery.isLoading ? (
                      <div className="space-y-2 p-3" role="status" aria-label="Searching users">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-10 animate-pulse rounded-lg bg-slate-100" />)}</div>
                    ) : matchingUsers.length ? (
                      matchingUsers.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => {
                            setSelectedUsers((current) => [...current, user]);
                            setSearch("");
                          }}
                          className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm last:border-0 hover:bg-slate-50"
                        >
                          <span className="block font-medium text-slate-800">{user.displayName}</span>
                          <span className="text-xs text-slate-500">{user.email}</span>
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-3 text-sm text-slate-500">
                        No matching users.
                      </p>
                    )}
                  </div>
                )}
                {selectedUsers.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedUsers.map((user) => (
                      <span key={user.id} className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-3 py-1 text-xs text-primary-700">
                        {user.displayName}
                        <button
                          type="button"
                          onClick={() => setSelectedUsers((current) => current.filter((item) => item.id !== user.id))}
                          aria-label={`Remove ${user.displayName}`}
                        >
                          <X className="h-3 w-3" aria-hidden="true" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <label className="block text-sm font-medium text-slate-700">
              Title
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                maxLength={120}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Message
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                required
                maxLength={2000}
                rows={5}
                className="mt-1.5 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            {feedback && <p className="text-sm text-slate-600" role="status">{feedback}</p>}
            <button
              type="submit"
              disabled={isSendingAnnouncement || (!sendToAll && selectedUsers.length === 0)}
              className="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSendingAnnouncement ? "Sending..." : "Send announcement"}
            </button>
          </form>
        </section>
        )}

        {activeSection === "received" && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 p-6">
            <div className="flex items-start gap-3">
            <span className="rounded-xl bg-red-50 p-2 text-red-700">
              <ShieldAlert className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-semibold text-slate-900">Received notifications</h2>
              <p className="mt-1 text-sm text-slate-500">
                Review reports, requests, support messages, and other admin updates.
              </p>
            </div>
            </div>
            {unreadCount > 0 && (
              <button type="button" disabled={isMarkingAllAsRead} onClick={() => void markAllAsRead().catch((error) => console.error("Failed to mark all notifications as read", error))} className="inline-flex items-center gap-2 rounded-lg border border-primary-200 bg-white px-3 py-2 text-sm font-semibold text-primary-700 transition hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50">
                <CheckCheck className="h-4 w-4" aria-hidden="true" />
                Mark all as read
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto border-b border-slate-100 px-4 py-3" aria-label="Filter notifications">
            {([
              ["all", "All"],
              ["unread", `Unread (${unreadCount})`],
              ["reports", "Reports"],
              ["requests", "Requests"],
              ["support", "Support"],
            ] as [NotificationFilter, string][]).map(([value, label]) => (
              <button key={value} type="button" onClick={() => setNotificationFilter(value)} aria-pressed={activeFilter === value} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${activeFilter === value ? "bg-primary-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-primary-50 hover:text-primary-700"}`}>
                {label}
              </button>
            ))}
          </div>
          {isLoadingNotifications ? (
            <p className="p-6 text-sm text-slate-500">Loading notifications...</p>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              {activeFilter === "support" ? <LifeBuoy className="mx-auto h-7 w-7 text-slate-300" aria-hidden="true" /> : activeFilter === "all" ? <Bell className="mx-auto h-7 w-7 text-slate-300" aria-hidden="true" /> : <SlidersHorizontal className="mx-auto h-7 w-7 text-slate-300" aria-hidden="true" />}
              <p className="mt-2 text-sm font-medium text-slate-600">{activeFilter === "unread" ? "You're all caught up" : activeFilter === "all" ? "No notifications received yet" : `No ${activeFilter} notifications`}</p>
              <p className="mt-1 text-xs">{activeFilter === "unread" ? "There are no unread admin notifications." : "New notifications will appear here."}</p>
            </div>
          ) : (
            <>
              <ul className="space-y-2 bg-slate-50/50 p-3 sm:p-4">
                {visibleNotifications.map((notification) => {
                  const isUnread = !notification.read_at;
                  return (
                    <li key={notification.id} className={`flex items-start gap-3 rounded-xl border p-4 transition motion-safe:duration-150 ${isUnread ? "border-primary-200 bg-primary-50/70 shadow-sm" : "border-slate-200 bg-white"}`}>
                      <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${isUnread ? "bg-primary-600 ring-4 ring-primary-100" : "bg-slate-200"}`} aria-hidden="true" />
                      <button type="button" onClick={() => openNotification(notification)} className="min-w-0 flex-1 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500" aria-label={`${notificationTitle(notification)}${isUnread ? ", unread" : ""}`}>
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-700 ring-1 ring-primary-100">{notificationCategoryLabel(notification.type)}</span>
                          {isUnread && <span className="rounded-full bg-primary-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Unread</span>}
                        </span>
                        <span className={`mt-2 block text-sm ${isUnread ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>{notificationTitle(notification)}</span>
                        <span className="mt-1 block text-sm leading-5 text-slate-600">{notificationMessage(notification)}</span>
                        <span className="mt-2 block text-xs text-slate-400">{new Date(notification.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</span>
                      </button>
                      {isUnread && <button type="button" onClick={() => void markAsRead(notification.id).catch((error) => console.error("Failed to mark notification as read", error))} className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">Mark as read</button>}
                    </li>
                  );
                })}
              </ul>
              {visibleCount < filteredNotifications.length && (
                <div className="border-t border-slate-100 p-4 text-center">
                  <button type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)} className="rounded-lg border border-primary-200 px-4 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">Load more</button>
                </div>
              )}
            </>
          )}
        </section>
        )}
      </div>
    </div>
  );
}
