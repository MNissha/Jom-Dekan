import { useState } from "react";
import { Bell, Megaphone, Search, ShieldAlert, X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { useAdminUsersList } from "../../hooks/useAdminUsers";
import { useDebounce } from "../../hooks/useDebounce";
import { useModeration } from "../../hooks/useModeration";
import type { AdminUserListItem } from "../../types/adminUser";
import type { Notification } from "../../types/moderation";

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
  const debouncedSearch = useDebounce(search, 300);
  const usersQuery = useAdminUsersList({
    search: debouncedSearch || undefined,
    page: 1,
    pageSize: 10,
  });
  const {
    notifications,
    isLoadingNotifications,
    markAsRead,
    sendAnnouncement,
    isSendingAnnouncement,
  } = useModeration();

  const reportNotifications = (notifications as Notification[]).filter(
    (notification) => notification.type === "REPORT_SUBMITTED",
  );
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

  const openReport = async (notification: Notification) => {
    if (!notification.read_at) await markAsRead(notification.id);
    const reportId = notification.payload.reportId;
    navigate(
      typeof reportId === "string"
        ? `/admin/moderation?report=${encodeURIComponent(reportId)}`
        : "/admin/moderation",
    );
  };

  return (
    <div className="mx-auto max-w-6xl px-[18px] py-[22px]">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
          Admin communications
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
          Notifications
        </h1>
        <p className="mt-1 text-sm text-slate-500">
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
                    {matchingUsers.length ? (
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
                        {usersQuery.isLoading ? "Searching..." : "No matching users."}
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
          <div className="flex items-start gap-3 border-b border-slate-100 p-6">
            <span className="rounded-xl bg-red-50 p-2 text-red-700">
              <ShieldAlert className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-semibold text-slate-900">Reports received</h2>
              <p className="mt-1 text-sm text-slate-500">
                Select a report notification to open moderation.
              </p>
            </div>
          </div>
          {isLoadingNotifications ? (
            <p className="p-6 text-sm text-slate-500">Loading notifications...</p>
          ) : reportNotifications.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Bell className="mx-auto h-7 w-7 text-slate-300" aria-hidden="true" />
              <p className="mt-2 text-sm">No report notifications received.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {reportNotifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => void openReport(notification)}
                    className="flex w-full items-start gap-3 p-4 text-left hover:bg-slate-50"
                  >
                    <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${notification.read_at ? "bg-slate-200" : "bg-red-500"}`} />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-800">
                        {notification.payload.message ?? "A new report was submitted"}
                      </span>
                      <span className="mt-1 block text-xs text-slate-400">
                        {new Date(notification.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        )}
      </div>
    </div>
  );
}
