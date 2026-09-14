import { useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Ban, CheckCircle2, Trash2, X } from "lucide-react";
import { AdminPageShell } from "../../layouts/AdminPageShell";
import {
  useAdminUsersList,
  useDisableUser,
  useEnableUser,
  useDeleteUser,
} from "../../hooks/useAdminUsers";
import { useCurrentUser } from "../../hooks/useAuth";
import { useDebounce } from "../../hooks/useDebounce";
import type { AdminUserListItem } from "../../types/adminUser";

const PAGE_SIZE = 20;

const DURATION_OPTIONS = [
  { value: "1h", label: "1 hour", ms: 60 * 60 * 1000 },
  { value: "24h", label: "24 hours", ms: 24 * 60 * 60 * 1000 },
  { value: "7d", label: "7 days", ms: 7 * 24 * 60 * 60 * 1000 },
  { value: "30d", label: "30 days", ms: 30 * 24 * 60 * 60 * 1000 },
] as const;
type DurationValue = (typeof DURATION_OPTIONS)[number]["value"] | "indefinite" | "custom";

function StatusBadge({ user }: { user: AdminUserListItem }) {
  if (user.status === "SUSPENDED") {
    return (
      <span className="inline-flex flex-col items-start gap-0.5">
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
          Disabled
        </span>
        {user.suspendedUntil && (
          <span className="text-[11px] text-stone-400">
            Until {new Date(user.suspendedUntil).toLocaleString()}
          </span>
        )}
      </span>
    );
  }
  if (user.status === "DEACTIVATED") {
    return <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-700">Deleted</span>;
  }
  if (user.status !== "ACTIVE") {
    return <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-bold text-stone-600">{user.status}</span>;
  }
  return <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">Active</span>;
}

// Shared confirm modal for both "disable" (with an optional auto-expiry
// timer) and "delete" (soft-delete) — same reason-required shape, so one
// component with a `mode` switch beats two near-identical dialogs.
function AccountActionModal({
  user,
  mode,
  onClose,
}: {
  user: AdminUserListItem;
  mode: "disable" | "delete";
  onClose: () => void;
}) {
  const disableUser = useDisableUser();
  const deleteUser = useDeleteUser();
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState<DurationValue>("indefinite");
  const [customUntil, setCustomUntil] = useState("");

  const isDisable = mode === "disable";
  const pending = isDisable ? disableUser.isPending : deleteUser.isPending;
  const error = isDisable ? disableUser.error : deleteUser.error;
  const serverError =
    error && axios.isAxiosError(error)
      ? (error.response?.data as { error?: { message?: string } })?.error?.message
      : null;

  const customUntilValid = duration !== "custom" || (customUntil && new Date(customUntil).getTime() > Date.now());
  const ready = reason.trim().length >= 5 && customUntilValid;

  function resolveUntil(): string | undefined {
    if (duration === "indefinite") return undefined;
    if (duration === "custom") return new Date(customUntil).toISOString();
    const opt = DURATION_OPTIONS.find((o) => o.value === duration);
    return opt ? new Date(Date.now() + opt.ms).toISOString() : undefined;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready) return;
    if (isDisable) {
      disableUser.mutate(
        { userId: user.id, until: resolveUntil(), reason: reason.trim() },
        { onSuccess: onClose },
      );
    } else {
      deleteUser.mutate({ userId: user.id, reason: reason.trim() }, { onSuccess: onClose });
    }
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isDisable ? "Disable account" : "Delete account"}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="w-full max-w-[480px] overflow-hidden rounded-[24px] bg-white shadow-2xl">
        <div
          className="flex items-start justify-between gap-4 p-[22px] text-white"
          style={{
            background: isDisable
              ? "radial-gradient(120% 160% at 88% 8%, #D97706 0%, #78350F 55%, #451A03 100%)"
              : "radial-gradient(120% 160% at 88% 8%, #DC2626 0%, #7F1D1D 55%, #450A0A 100%)",
          }}
        >
          <div className="min-w-0">
            <span className="inline-block rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold tracking-wide text-white">
              {isDisable ? "DISABLE ACCOUNT" : "DELETE ACCOUNT"}
            </span>
            <h2 className="mt-2 text-lg font-extrabold">{user.displayName}</h2>
            <p className="mt-1 text-sm font-medium text-white/80">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-[22px]">
          {serverError && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {serverError}
            </div>
          )}

          {!isDisable && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              This deactivates the account and revokes every active session. Their content stays intact, and an
              admin can still open this profile directly, but it drops out of this list.
            </p>
          )}

          {isDisable && (
            <fieldset className="flex flex-col gap-2">
              <legend className="text-xs font-bold uppercase tracking-wide text-stone-500">Duration</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(
                  [
                    { value: "indefinite" as const, label: "Indefinite" },
                    ...DURATION_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
                    { value: "custom" as const, label: "Custom…" },
                  ]
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={duration === opt.value}
                    onClick={() => setDuration(opt.value)}
                    className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${
                      duration === opt.value
                        ? "border-amber-400 bg-amber-50 text-amber-800"
                        : "border-stone-200 text-stone-600 hover:border-amber-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {duration === "custom" && (
                <input
                  type="datetime-local"
                  value={customUntil}
                  onChange={(e) => setCustomUntil(e.target.value)}
                  min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                  className="mt-1 h-11 rounded-xl border border-stone-300 px-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              )}
              <p className="text-xs text-stone-400">
                {duration === "indefinite"
                  ? "Stays disabled until an admin manually re-enables it."
                  : "Automatically re-enabled once this time passes (next time the account is touched)."}
              </p>
            </fieldset>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-stone-500">
              Reason<span className="text-red-500"> *</span>
              <span className="ml-1 font-normal normal-case text-stone-400">— recorded in the audit log and emailed to the user</span>
            </span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this account being acted on? (min. 5 characters)"
              rows={3}
              className="resize-y rounded-xl border border-stone-300 p-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </label>

          <div className="flex flex-wrap justify-end gap-3 border-t border-stone-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-stone-200 px-5 py-2.5 text-sm font-bold text-stone-700 hover:border-stone-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!ready || pending}
              className={`rounded-xl px-5 py-2.5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                isDisable ? "bg-amber-600 hover:bg-amber-700" : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {pending ? "Saving…" : isDisable ? "Disable account" : "Delete account"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

export function AdminUsers({
  embedded = false,
  onSelectUser,
}: {
  embedded?: boolean;
  onSelectUser?: (userId: string) => void;
}) {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const search = useDebounce(searchInput, 300);
  const [actionTarget, setActionTarget] = useState<{ user: AdminUserListItem; mode: "disable" | "delete" } | null>(null);

  const { data, isLoading, isError } = useAdminUsersList({
    search: search || undefined,
    page,
    pageSize: PAGE_SIZE,
  });
  const enableUser = useEnableUser();

  const users = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function openRow(userId: string) {
    onSelectUser ? onSelectUser(userId) : navigate(`/admin/users/${userId}`);
  }

  return (
    <AdminPageShell embedded={embedded}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-stone-800 mb-6">Users</h1>

        <input
          type="search"
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            setPage(1);
          }}
          placeholder="Search by name or email…"
          className="mb-4 w-full max-w-sm rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />

        <div className="bg-white rounded-xl shadow border overflow-hidden">
          {isLoading ? (
            <p className="p-6 text-center text-stone-500">Loading…</p>
          ) : isError ? (
            <p className="p-6 text-center text-red-600">
              Could not load users.
            </p>
          ) : users.length === 0 ? (
            <p className="p-6 text-center text-stone-500">No users found.</p>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-100 border-b text-stone-700 text-sm">
                  <th className="p-4">Username</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Posts</th>
                  <th className="p-4">Comments</th>
                  <th className="p-4">Likes achieved</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = currentUser?.id === u.id;
                  return (
                    <tr
                      key={u.id}
                      onClick={() => openRow(u.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openRow(u.id);
                        }
                      }}
                      className="border-b hover:bg-stone-50 text-sm cursor-pointer"
                    >
                      <td className="p-4 font-medium text-stone-800">
                        {u.displayName}
                      </td>
                      <td className="p-4 text-stone-600">{u.email}</td>
                      <td className="p-4 text-stone-600">{u.role}</td>
                      <td className="p-4">
                        <StatusBadge user={u} />
                      </td>
                      <td className="p-4 text-stone-600">{u.postCount}</td>
                      <td className="p-4 text-stone-600">{u.commentCount}</td>
                      <td className="p-4 text-stone-600">{u.likesReceived}</td>
                      <td className="p-4">
                        {isSelf ? (
                          <span className="text-xs text-stone-400">You</span>
                        ) : u.status === "DEACTIVATED" ? (
                          <span className="text-xs text-stone-400">—</span>
                        ) : (
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            {u.status === "SUSPENDED" ? (
                              <button
                                type="button"
                                title="Re-enable this account"
                                disabled={enableUser.isPending}
                                onClick={() => enableUser.mutate(u.id)}
                                className="flex items-center gap-1.5 rounded-full border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                Enable
                              </button>
                            ) : (
                              <button
                                type="button"
                                title="Disable this account"
                                onClick={() => setActionTarget({ user: u, mode: "disable" })}
                                className="flex items-center gap-1.5 rounded-full border border-amber-200 px-3 py-1.5 text-xs font-bold text-amber-700 transition hover:bg-amber-50"
                              >
                                <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                                Disable
                              </button>
                            )}
                            <button
                              type="button"
                              title="Delete this account"
                              onClick={() => setActionTarget({ user: u, mode: "delete" })}
                              className="flex items-center gap-1.5 rounded-full border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {total > 0 && (
          <div className="mt-4 flex items-center justify-between text-sm text-stone-500">
            <span>
              Page {page} of {totalPages} ({total} user{total === 1 ? "" : "s"})
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-full bg-stone-100 px-4 py-1.5 font-medium text-stone-600 hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-full bg-stone-100 px-4 py-1.5 font-medium text-stone-600 hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {actionTarget && (
        <AccountActionModal
          user={actionTarget.user}
          mode={actionTarget.mode}
          onClose={() => setActionTarget(null)}
        />
      )}
    </AdminPageShell>
  );
}

export default AdminUsers;
