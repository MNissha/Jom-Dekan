import { useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Ban, CheckCircle2, Edit3, Plus, Search, Trash2, UserCheck, UserRound, UserX, X, type LucideIcon } from "lucide-react";
import { AdminPageShell } from "../../layouts/AdminPageShell";
import {
  useAdminUserMutations,
  useAdminUsersList,
  useDisableUser,
  useEnableUser,
  useDeleteUser,
} from "../../hooks/useAdminUsers";
import { useCurrentUser } from "../../hooks/useAuth";
import { useDebounce } from "../../hooks/useDebounce";
import type { AdminUserListItem, CreateAdminUserInput, UpdateAdminUserInput } from "../../types/adminUser";

const PAGE_SIZE = 20;
const emptyForm: CreateAdminUserInput = { displayName: "", email: "", password: "", role: "USER" };

function errorMessage(error: unknown) {
  return axios.isAxiosError(error)
    ? (error.response?.data as { error?: { message?: string } })?.error?.message ?? "The request could not be completed."
    : "The request could not be completed.";
}

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
      className="overlay-root"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="dialog-surface max-w-[480px]">
        <div
          className="dialog-header flex items-start justify-between gap-4 p-[22px] text-white"
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

        <form onSubmit={handleSubmit} className="dialog-body flex flex-col gap-4 p-[22px]">
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

export function AdminUsers({ embedded = false, onSelectUser }: { embedded?: boolean; onSelectUser?: (userId: string) => void }) {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [actionTarget, setActionTarget] = useState<{ user: AdminUserListItem; mode: "disable" | "delete" } | null>(null);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<AdminUserListItem | null>(null);
  const [form, setForm] = useState<CreateAdminUserInput>(emptyForm);
  const [feedback, setFeedback] = useState<{ error: boolean; text: string } | null>(null);
  const search = useDebounce(searchInput, 500);
  const isSearchPending = searchInput !== search;
  const query = useAdminUsersList({ search: search || undefined, page, pageSize: PAGE_SIZE });
  const { createUser, updateUser } = useAdminUserMutations();
  const enableUser = useEnableUser();
  const users = query.data?.data ?? [];
  const total = query.data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeCount = users.filter((user) => user.status === "ACTIVE").length;
  const suspendedCount = users.filter((user) => user.status === "SUSPENDED").length;
  const summaries: Array<{ label: string; value: number; icon: LucideIcon; color: string }> = [
    { label: "Total users", value: total, icon: UserRound, color: "bg-indigo-50 text-indigo-600" },
    { label: "Active on this page", value: activeCount, icon: UserCheck, color: "bg-emerald-50 text-emerald-600" },
    { label: "Suspended on this page", value: suspendedCount, icon: UserX, color: "bg-red-50 text-red-600" },
  ];

  function openCreate() { setSelected(null); setForm(emptyForm); setFeedback(null); setModal("create"); }
  function openEdit(user: AdminUserListItem) {
    setSelected(user); setForm({ displayName: user.displayName, email: user.email, password: "", role: user.role }); setFeedback(null); setModal("edit");
  }
  function openProfile(id: string) { onSelectUser ? onSelectUser(id) : navigate(`/admin/users/${id}`); }

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setFeedback(null);
    try {
      if (modal === "create") await createUser.mutateAsync(form);
      else if (selected) {
        const input: UpdateAdminUserInput = { displayName: form.displayName, email: form.email, role: form.role };
        await updateUser.mutateAsync({ id: selected.id, input });
      }
      setModal(null); setFeedback({ error: false, text: modal === "create" ? "User created successfully." : "User details updated." });
    } catch (error) { setFeedback({ error: true, text: errorMessage(error) }); }
  }

  return <AdminPageShell embedded={embedded}>
    <div className="page-container page-container-standard py-grid-8 motion-safe:animate-panel-enter">
      <header className="relative overflow-hidden rounded-[26px] bg-gradient-to-r from-[#332475] via-[#4338CA] to-[#6558DD] p-6 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-amber-300/20 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0"><p className="text-overline uppercase text-[#DDD8FF]">Admin directory</p><h1 className="mt-grid-1 break-words text-2xl font-heading leading-tight sm:text-page-title">User management</h1><p className="mt-grid-1 max-w-2xl break-words text-body-sm text-[#D5D0F7]">Create accounts, update access and manage user status.</p></div>
          <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-[#F5C21A] px-4 py-2.5 text-sm font-bold text-[#231C57] shadow-md transition hover:-translate-y-0.5 hover:bg-amber-300"><Plus className="h-4 w-4" />Add new user</button>
        </div>
      </header>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {summaries.map(({ label, value, icon: Icon, color }) => <div key={label} className="card-base card-static card-admin-summary flex items-center gap-3"><span className={`rounded-xl p-2.5 ${color}`}><Icon className="h-5 w-5" /></span><div><p className="text-caption text-content-muted">{label}</p><p className="text-2xl font-heading text-content-primary">{value}</p></div></div>)}
      </div>

      {feedback && <p role="status" className={`mt-4 rounded-xl border px-4 py-3 text-sm font-semibold ${feedback.error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{feedback.text}</p>}
      <div className="relative mt-5 max-w-md"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type="search" value={searchInput} onChange={(event) => { setSearchInput(event.target.value); setPage(1); }} placeholder="Search by name or email…" className="w-full rounded-xl border border-[#DDD9F1] bg-white py-2.5 pl-10 pr-3 text-sm shadow-sm outline-none focus:border-[#6558DD] focus:ring-4 focus:ring-indigo-100" /></div>

      <div className="card-base admin-table-container mt-4 overflow-x-auto">
        {query.isLoading || isSearchPending ? <div className="space-y-3 p-5" role="status" aria-label="Searching users">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-14 animate-pulse rounded-xl bg-slate-100" />)}</div>
          : query.isError ? <p className="p-8 text-center text-red-600">Could not load users.</p>
          : !users.length ? <p className="p-8 text-center text-slate-500">No users found.</p>
          : <table className="w-full min-w-[900px] text-left"><thead><tr className="border-b bg-[#F8F7FD] text-xs uppercase tracking-wide text-slate-500"><th className="p-4">User</th><th className="p-4">Access</th><th className="p-4">Status</th><th className="p-4">Activity</th><th className="p-4 text-right">Management</th></tr></thead><tbody className="divide-y divide-[#F0EEF8]">{users.map((user, index) => {
            const isSelf = currentUser?.id === user.id;
            return <tr key={user.id} className="group transition hover:bg-[#FAF9FF] motion-safe:animate-[notificationRise_260ms_ease-out_both]" style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}>
              <td className="p-4"><button type="button" onClick={() => openProfile(user.id)} className="text-left"><span className="block font-bold text-slate-800 group-hover:text-[#4338CA]">{user.displayName}</span><span className="text-xs text-slate-500">{user.email}</span></button></td>
              <td className="p-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${user.role === "ADMIN" ? "bg-violet-100 text-violet-700" : "bg-blue-50 text-blue-700"}`}>{user.role}</span></td>
              <td className="p-4"><StatusBadge user={user} /></td>
              <td className="p-4 text-xs text-slate-500"><button type="button" onClick={() => openProfile(user.id)} className="rounded-lg px-2 py-1 text-left transition hover:bg-indigo-50 hover:text-[#4338CA]" title="View all user activity"><b>{user.postCount}</b> posts · <b>{user.commentCount}</b> comments · <b>{user.likesReceived}</b> likes<span className="mt-1 block font-bold text-[#4338CA]">View activity →</span></button></td>
              <td className="p-4">
                <div className="flex justify-end gap-2">
                  <Action title="Edit user" onClick={() => openEdit(user)} className="border-indigo-100 text-indigo-600 hover:bg-indigo-50"><Edit3 /></Action>
                  {isSelf ? (
                    <span className="self-center text-xs text-stone-400">You</span>
                  ) : user.status === "DEACTIVATED" ? (
                    <span className="self-center text-xs text-stone-400">—</span>
                  ) : (
                    <>
                      {user.status === "SUSPENDED" ? (
                        <Action title="Re-enable this account" onClick={() => enableUser.mutate(user.id)} disabled={enableUser.isPending} className="border-emerald-100 text-emerald-600 hover:bg-emerald-50"><CheckCircle2 /></Action>
                      ) : (
                        <Action title="Disable this account" onClick={() => setActionTarget({ user, mode: "disable" })} className="border-amber-100 text-amber-600 hover:bg-amber-50"><Ban /></Action>
                      )}
                      <Action title="Delete this account" onClick={() => setActionTarget({ user, mode: "delete" })} className="border-red-100 text-red-600 hover:bg-red-50"><Trash2 /></Action>
                    </>
                  )}
                </div>
              </td>
            </tr>;
          })}</tbody></table>}
      </div>
      {total > 0 && <div className="mt-4 flex items-center justify-between text-sm text-slate-500"><span>Page {page} of {totalPages} ({total} users)</span><div className="flex gap-2"><button onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1} className="rounded-xl border bg-white px-4 py-2 font-semibold disabled:opacity-40">Previous</button><button onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page >= totalPages} className="rounded-xl bg-[#4338CA] px-4 py-2 font-semibold text-white disabled:opacity-40">Next</button></div></div>}
    </div>

    {modal && <UserForm mode={modal} form={form} setForm={setForm} saving={createUser.isPending || updateUser.isPending} close={() => setModal(null)} submit={submit} />}
    {actionTarget && (
      <AccountActionModal
        user={actionTarget.user}
        mode={actionTarget.mode}
        onClose={() => setActionTarget(null)}
      />
    )}
  </AdminPageShell>;
}

function Action({ title, onClick, className, disabled, children }: { title: string; onClick: () => void; className: string; disabled?: boolean; children: React.ReactElement<{ className?: string }> }) {
  return <button type="button" title={title} aria-label={title} onClick={onClick} disabled={disabled} className={`rounded-lg border p-2 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}>{children}</button>;
}

function UserForm({ mode, form, setForm, saving, close, submit }: { mode: "create" | "edit"; form: CreateAdminUserInput; setForm: (form: CreateAdminUserInput) => void; saving: boolean; close: () => void; submit: (event: React.FormEvent) => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true"><form onSubmit={submit} className="w-full max-w-lg overflow-hidden rounded-[26px] bg-white shadow-2xl motion-safe:animate-[modalRise_220ms_ease-out]"><div className="flex items-center justify-between bg-gradient-to-r from-[#332475] to-[#4B3CC4] p-5 text-white"><div><p className="text-xs font-bold uppercase tracking-widest text-[#D6D0FF]">User administration</p><h2 className="mt-1 text-xl font-bold">{mode === "create" ? "Add new user" : "Edit user"}</h2></div><button type="button" onClick={close} className="rounded-xl border border-white/20 p-2 hover:bg-white/10"><X className="h-5 w-5" /></button></div><div className="space-y-4 p-6"><Field label="Display name"><input required minLength={2} maxLength={120} value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} /></Field><Field label="Email"><input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>{mode === "create" && <Field label="Temporary password"><input required type="password" minLength={8} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /><small>At least 8 characters. Share it securely.</small></Field>}<Field label="System role"><select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as CreateAdminUserInput["role"] })}><option value="USER">User</option><option value="ADMIN">Admin</option></select></Field></div><div className="flex justify-end gap-3 border-t p-5"><button type="button" onClick={close} className="rounded-xl border px-5 py-2.5 text-sm font-bold">Cancel</button><button disabled={saving} className="rounded-xl bg-[#4338CA] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "Saving…" : mode === "create" ? "Create user" : "Save changes"}</button></div></form></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-semibold text-slate-700">{label}<span className="mt-1.5 block [&>input]:w-full [&>input]:rounded-xl [&>input]:border [&>input]:px-3 [&>input]:py-2.5 [&>select]:w-full [&>select]:rounded-xl [&>select]:border [&>select]:bg-white [&>select]:px-3 [&>select]:py-2.5 [&>small]:mt-1 [&>small]:block [&>small]:font-normal [&>small]:text-slate-400">{children}</span></label>;
}

export default AdminUsers;
