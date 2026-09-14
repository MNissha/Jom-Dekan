import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Edit3, Plus, Search, Trash2, UserCheck, UserRound, UserX, X, type LucideIcon } from "lucide-react";
import { AdminPageShell } from "../../layouts/AdminPageShell";
import { useAdminUserMutations, useAdminUsersList } from "../../hooks/useAdminUsers";
import { useDebounce } from "../../hooks/useDebounce";
import type { AdminUserListItem, CreateAdminUserInput, UpdateAdminUserInput } from "../../types/adminUser";

const PAGE_SIZE = 20;
const emptyForm: CreateAdminUserInput = { displayName: "", email: "", password: "", role: "USER" };

function errorMessage(error: unknown) {
  return axios.isAxiosError(error)
    ? (error.response?.data as { error?: { message?: string } })?.error?.message ?? "The request could not be completed."
    : "The request could not be completed.";
}

export function AdminUsers({ embedded = false, onSelectUser }: { embedded?: boolean; onSelectUser?: (userId: string) => void }) {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<AdminUserListItem | null>(null);
  const [form, setForm] = useState<CreateAdminUserInput>(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState<AdminUserListItem | null>(null);
  const [feedback, setFeedback] = useState<{ error: boolean; text: string } | null>(null);
  const search = useDebounce(searchInput, 500);
  const isSearchPending = searchInput !== search;
  const query = useAdminUsersList({ search: search || undefined, page, pageSize: PAGE_SIZE });
  const { createUser, updateUser, updateStatus, removeUser } = useAdminUserMutations();
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

  async function toggleStatus(user: AdminUserListItem) {
    try {
      const status = user.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
      await updateStatus.mutateAsync({ id: user.id, status });
      setFeedback({ error: false, text: status === "ACTIVE" ? `${user.displayName} was reactivated.` : `${user.displayName} was suspended and signed out.` });
    } catch (error) { setFeedback({ error: true, text: errorMessage(error) }); }
  }

  async function deleteUser() {
    if (!confirmDelete) return;
    try { await removeUser.mutateAsync(confirmDelete.id); setFeedback({ error: false, text: `${confirmDelete.displayName} was removed.` }); }
    catch (error) { setFeedback({ error: true, text: errorMessage(error) }); }
    finally { setConfirmDelete(null); }
  }

  return <AdminPageShell embedded={embedded}>
    <div className="mx-auto max-w-6xl px-4 py-8 motion-safe:animate-[fadeIn_220ms_ease-out]">
      <header className="relative overflow-hidden rounded-[26px] bg-gradient-to-r from-[#332475] via-[#4338CA] to-[#6558DD] p-6 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-amber-300/20 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#DDD8FF]">Admin directory</p><h1 className="mt-1 text-3xl font-bold">User management</h1><p className="mt-1 text-sm text-[#D5D0F7]">Create accounts, update access and manage user status.</p></div>
          <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-[#F5C21A] px-4 py-2.5 text-sm font-bold text-[#231C57] shadow-md transition hover:-translate-y-0.5 hover:bg-amber-300"><Plus className="h-4 w-4" />Add new user</button>
        </div>
      </header>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {summaries.map(({ label, value, icon: Icon, color }) => <div key={label} className="flex items-center gap-3 rounded-2xl border border-[#E8E5F7] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><span className={`rounded-xl p-2.5 ${color}`}><Icon className="h-5 w-5" /></span><div><p className="text-xs font-semibold text-slate-500">{label}</p><p className="text-2xl font-bold text-slate-900">{value}</p></div></div>)}
      </div>

      {feedback && <p role="status" className={`mt-4 rounded-xl border px-4 py-3 text-sm font-semibold ${feedback.error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{feedback.text}</p>}
      <div className="relative mt-5 max-w-md"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type="search" value={searchInput} onChange={(event) => { setSearchInput(event.target.value); setPage(1); }} placeholder="Search by name or email…" className="w-full rounded-xl border border-[#DDD9F1] bg-white py-2.5 pl-10 pr-3 text-sm shadow-sm outline-none focus:border-[#6558DD] focus:ring-4 focus:ring-indigo-100" /></div>

      <div className="mt-4 overflow-x-auto rounded-[22px] border border-[#E8E5F7] bg-white shadow-sm">
        {query.isLoading || isSearchPending ? <div className="space-y-3 p-5" role="status" aria-label="Searching users">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-14 animate-pulse rounded-xl bg-slate-100" />)}</div>
          : query.isError ? <p className="p-8 text-center text-red-600">Could not load users.</p>
          : !users.length ? <p className="p-8 text-center text-slate-500">No users found.</p>
          : <table className="w-full min-w-[900px] text-left"><thead><tr className="border-b bg-[#F8F7FD] text-xs uppercase tracking-wide text-slate-500"><th className="p-4">User</th><th className="p-4">Access</th><th className="p-4">Status</th><th className="p-4">Activity</th><th className="p-4 text-right">Management</th></tr></thead><tbody className="divide-y divide-[#F0EEF8]">{users.map((user, index) => <tr key={user.id} className="group transition hover:bg-[#FAF9FF] motion-safe:animate-[notificationRise_260ms_ease-out_both]" style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}>
            <td className="p-4"><button type="button" onClick={() => openProfile(user.id)} className="text-left"><span className="block font-bold text-slate-800 group-hover:text-[#4338CA]">{user.displayName}</span><span className="text-xs text-slate-500">{user.email}</span></button></td>
            <td className="p-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${user.role === "ADMIN" ? "bg-violet-100 text-violet-700" : "bg-blue-50 text-blue-700"}`}>{user.role}</span></td>
            <td className="p-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${user.status === "SUSPENDED" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}><i className={`h-1.5 w-1.5 rounded-full ${user.status === "SUSPENDED" ? "bg-red-500" : "bg-emerald-500"}`} />{user.status}</span></td>
            <td className="p-4 text-xs text-slate-500"><button type="button" onClick={() => openProfile(user.id)} className="rounded-lg px-2 py-1 text-left transition hover:bg-indigo-50 hover:text-[#4338CA]" title="View all user activity"><b>{user.postCount}</b> posts · <b>{user.commentCount}</b> comments · <b>{user.likesReceived}</b> likes<span className="mt-1 block font-bold text-[#4338CA]">View activity →</span></button></td>
            <td className="p-4"><div className="flex justify-end gap-2"><Action title="Edit user" onClick={() => openEdit(user)} className="border-indigo-100 text-indigo-600 hover:bg-indigo-50"><Edit3 /></Action><Action title={user.status === "SUSPENDED" ? "Reactivate user" : "Suspend user"} onClick={() => void toggleStatus(user)} className={user.status === "SUSPENDED" ? "border-emerald-100 text-emerald-600 hover:bg-emerald-50" : "border-amber-100 text-amber-600 hover:bg-amber-50"}>{user.status === "SUSPENDED" ? <UserCheck /> : <UserX />}</Action><Action title="Delete user" onClick={() => setConfirmDelete(user)} className="border-red-100 text-red-600 hover:bg-red-50"><Trash2 /></Action></div></td>
          </tr>)}</tbody></table>}
      </div>
      {total > 0 && <div className="mt-4 flex items-center justify-between text-sm text-slate-500"><span>Page {page} of {totalPages} ({total} users)</span><div className="flex gap-2"><button onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1} className="rounded-xl border bg-white px-4 py-2 font-semibold disabled:opacity-40">Previous</button><button onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page >= totalPages} className="rounded-xl bg-[#4338CA] px-4 py-2 font-semibold text-white disabled:opacity-40">Next</button></div></div>}
    </div>

    {modal && <UserForm mode={modal} form={form} setForm={setForm} saving={createUser.isPending || updateUser.isPending} close={() => setModal(null)} submit={submit} />}
    {confirmDelete && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4" role="alertdialog" aria-modal="true"><div className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-2xl motion-safe:animate-[modalRise_200ms_ease-out]"><span className="inline-flex rounded-2xl bg-red-50 p-3 text-red-600"><Trash2 className="h-6 w-6" /></span><h2 className="mt-4 text-xl font-bold">Remove this user?</h2><p className="mt-2 text-sm leading-6 text-slate-600"><b>{confirmDelete.displayName}</b> will lose access immediately. Related records remain preserved for auditing.</p><div className="mt-6 flex justify-end gap-3"><button onClick={() => setConfirmDelete(null)} className="rounded-xl border px-4 py-2.5 text-sm font-bold">Cancel</button><button disabled={removeUser.isPending} onClick={() => void deleteUser()} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{removeUser.isPending ? "Removing…" : "Remove user"}</button></div></div></div>}
  </AdminPageShell>;
}

function Action({ title, onClick, className, children }: { title: string; onClick: () => void; className: string; children: React.ReactElement<{ className?: string }> }) {
  return <button type="button" title={title} aria-label={title} onClick={onClick} className={`rounded-lg border p-2 transition hover:-translate-y-0.5 ${className}`}>{children}</button>;
}

function UserForm({ mode, form, setForm, saving, close, submit }: { mode: "create" | "edit"; form: CreateAdminUserInput; setForm: (form: CreateAdminUserInput) => void; saving: boolean; close: () => void; submit: (event: React.FormEvent) => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true"><form onSubmit={submit} className="w-full max-w-lg overflow-hidden rounded-[26px] bg-white shadow-2xl motion-safe:animate-[modalRise_220ms_ease-out]"><div className="flex items-center justify-between bg-gradient-to-r from-[#332475] to-[#4B3CC4] p-5 text-white"><div><p className="text-xs font-bold uppercase tracking-widest text-[#D6D0FF]">User administration</p><h2 className="mt-1 text-xl font-bold">{mode === "create" ? "Add new user" : "Edit user"}</h2></div><button type="button" onClick={close} className="rounded-xl border border-white/20 p-2 hover:bg-white/10"><X className="h-5 w-5" /></button></div><div className="space-y-4 p-6"><Field label="Display name"><input required minLength={2} maxLength={120} value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} /></Field><Field label="Email"><input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>{mode === "create" && <Field label="Temporary password"><input required type="password" minLength={8} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /><small>At least 8 characters. Share it securely.</small></Field>}<Field label="System role"><select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as CreateAdminUserInput["role"] })}><option value="USER">User</option><option value="ADMIN">Admin</option></select></Field></div><div className="flex justify-end gap-3 border-t p-5"><button type="button" onClick={close} className="rounded-xl border px-5 py-2.5 text-sm font-bold">Cancel</button><button disabled={saving} className="rounded-xl bg-[#4338CA] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "Saving…" : mode === "create" ? "Create user" : "Save changes"}</button></div></form></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-semibold text-slate-700">{label}<span className="mt-1.5 block [&>input]:w-full [&>input]:rounded-xl [&>input]:border [&>input]:px-3 [&>input]:py-2.5 [&>select]:w-full [&>select]:rounded-xl [&>select]:border [&>select]:bg-white [&>select]:px-3 [&>select]:py-2.5 [&>small]:mt-1 [&>small]:block [&>small]:font-normal [&>small]:text-slate-400">{children}</span></label>;
}

export default AdminUsers;
