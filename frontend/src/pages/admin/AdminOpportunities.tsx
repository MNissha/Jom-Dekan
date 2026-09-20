import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { ArrowLeft, Briefcase, CheckCircle2, Edit3, Eye, Plus, Search, Trash2, X, XCircle, type LucideIcon } from "lucide-react";
import { AdminPageShell } from "../../layouts/AdminPageShell";
import { useAdminOpportunities } from "../../hooks/useAdminOpportunities";
import { useDebounce } from "../../hooks/useDebounce";
import { UserLink } from "../../components/common/UserLink";
import type { Opportunity, OpportunityMode, OpportunityStatus } from "../../types/opportunity";

type Form = { title: string; description: string; mode: OpportunityMode };
type ManagementCategory = "tutoring" | "freelance";
const emptyForm: Form = { title: "", description: "", mode: "ONLINE" };
const messageOf = (error: unknown) => axios.isAxiosError(error) ? (error.response?.data as { error?: { message?: string } })?.error?.message ?? "The request failed." : "The request failed.";

export function AdminOpportunities({ embedded = false, category = "freelance" }: { embedded?: boolean; category?: ManagementCategory }) {
  const { opportunities, isLoading, isError, updateStatus, createOpportunity, updateOpportunity, deleteOpportunity } = useAdminOpportunities();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const isSearchPending = search !== debouncedSearch;
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<Opportunity | null>(null);
  const [inspectTarget, setInspectTarget] = useState<Opportunity | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Opportunity | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [feedback, setFeedback] = useState<{ error: boolean; text: string } | null>(null);
  const categoryItems = useMemo(() => opportunities.filter((item: Opportunity) => category === "tutoring" ? item.listing_type === "TUTORING" : item.listing_type !== "TUTORING"), [opportunities, category]);
  const filtered = useMemo(() => categoryItems.filter((item: Opportunity) => `${item.title} ${item.owner_name ?? ""}`.toLowerCase().includes(debouncedSearch.toLowerCase())), [categoryItems, debouncedSearch]);
  const active = categoryItems.filter((item: Opportunity) => item.status === "active").length;
  const pageLabel = category === "tutoring" ? "Tutoring Management" : "Freelance Listings";

  function openCreate() { setSelected(null); setForm(emptyForm); setFeedback(null); setModal("create"); }
  function openEdit(item: Opportunity) { setSelected(item); setForm({ title: item.title, description: item.description, mode: item.mode }); setFeedback(null); setModal("edit"); }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    try {
      if (modal === "create") await createOpportunity.mutateAsync({ ...form, listingType: category === "tutoring" ? "TUTORING" : "PROJECT_MENTORSHIP" });
      else if (selected) await updateOpportunity.mutateAsync({ id: selected.id, input: form });
      setModal(null);
      setFeedback({ error: false, text: modal === "create" ? `${pageLabel} entry created.` : "Listing updated." });
    } catch (error) { setFeedback({ error: true, text: messageOf(error) }); }
  }
  async function toggle(item: Opportunity) {
    const status: OpportunityStatus = item.status === "active" ? "closed" : "active";
    try { await updateStatus({ id: item.id, status }); setFeedback({ error: false, text: `${item.title} is now ${status}.` }); }
    catch (error) { setFeedback({ error: true, text: messageOf(error) }); }
  }
  async function remove() {
    if (!removeTarget) return;
    try { await deleteOpportunity.mutateAsync(removeTarget.id); setFeedback({ error: false, text: `${removeTarget.title} was deleted.` }); }
    catch (error) { setFeedback({ error: true, text: messageOf(error) }); }
    finally { setRemoveTarget(null); }
  }

  return <AdminPageShell embedded={embedded}>
    <div className="page-container page-container-standard py-grid-8 motion-safe:animate-panel-enter">
      <header className="relative overflow-hidden rounded-[26px] bg-gradient-to-r from-[#332475] via-[#4338CA] to-[#6558DD] p-6 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-amber-300/20 blur-2xl" />
        <div className="relative flex min-w-0 flex-wrap items-center justify-between gap-grid-4"><div className="min-w-0"><p className="text-overline uppercase text-[#DDD8FF]">Marketplace administration</p><h1 className="mt-grid-1 break-words text-2xl font-heading leading-tight sm:text-page-title">{pageLabel}</h1><p className="mt-grid-1 max-w-2xl break-words text-body-sm text-[#D5D0F7]">Create, inspect and manage {category === "tutoring" ? "tutoring services" : "freelance opportunities"}.</p></div><button onClick={openCreate} className="inline-flex min-h-control items-center gap-grid-2 rounded-control bg-[#F5C21A] px-grid-4 text-label text-[#231C57] shadow-md transition hover:-translate-y-0.5 hover:bg-amber-300"><Plus className="h-4 w-4" />Add new {category === "tutoring" ? "tutor" : "listing"}</button></div>
      </header>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">{([{ label: "Total listings", value: categoryItems.length, icon: Briefcase, color: "bg-indigo-50 text-indigo-600" }, { label: "Active", value: active, icon: CheckCircle2, color: "bg-emerald-50 text-emerald-600" }, { label: "Closed", value: categoryItems.length - active, icon: XCircle, color: "bg-red-50 text-red-600" }] as Array<{ label: string; value: number; icon: LucideIcon; color: string }>).map(({ label, value, icon: Icon, color }) => <div key={label} className="card-base card-static card-admin-summary flex items-center gap-3"><span className={`rounded-xl p-2.5 ${color}`}><Icon className="h-5 w-5" /></span><div><p className="text-xs font-semibold text-slate-500">{label}</p><p className="text-2xl font-bold">{value}</p></div></div>)}</div>
      {feedback && <p className={`mt-4 rounded-xl border px-4 py-3 text-sm font-semibold ${feedback.error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{feedback.text}</p>}
      <div className="relative mt-5 max-w-md"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title or owner..." className="w-full rounded-xl border border-[#DDD9F1] bg-white py-2.5 pl-10 pr-3 text-sm shadow-sm outline-none focus:border-[#6558DD] focus:ring-4 focus:ring-indigo-100" /></div>
      <div className="mt-4 overflow-hidden rounded-[22px] border border-[#E8E5F7] bg-white shadow-sm">
        {isLoading || isSearchPending ? <ListSkeleton /> : isError ? <p className="p-8 text-center text-red-600">Could not load listings.</p> : !filtered.length ? <p className="p-8 text-center text-slate-500">No {category} listings found.</p> : <><div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1fr)_100px_220px] gap-4 border-b bg-[#F8F7FD] px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500 md:grid"><span>Listing</span><span>Owner</span><span>Status</span><span className="text-right">Management</span></div><div className="divide-y divide-[#F0EEF8]">{filtered.map((item: Opportunity, index: number) => <div key={item.id} className="grid gap-3 px-5 py-4 transition hover:bg-[#FAF9FF] dark:hover:bg-[#30295D] md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_100px_220px] md:items-center motion-safe:animate-[notificationRise_260ms_ease-out_both]" style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}><div className="min-w-0"><b className="block truncate text-slate-800">{item.title}</b><span className="mt-1 inline-flex rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-700">{item.mode}</span></div><span className="truncate text-sm font-medium text-slate-600">{item.owner_name ? <UserLink userId={item.owner_id} name={item.owner_name} className="text-slate-600 hover:text-[#4338CA] hover:underline" /> : "Unknown"}</span><span className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold uppercase ${item.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{item.status}</span><div className="flex flex-wrap items-center gap-2 md:justify-end"><button onClick={() => setInspectTarget(item)} title="Inspect listing" className="rounded-lg border border-blue-100 p-2 text-blue-600 hover:bg-blue-50"><Eye className="h-4 w-4" /></button><button onClick={() => openEdit(item)} title="Edit listing" className="rounded-lg border border-indigo-100 p-2 text-indigo-600 hover:bg-indigo-50"><Edit3 className="h-4 w-4" /></button><button onClick={() => void toggle(item)} className={`rounded-lg border px-3 py-2 text-xs font-bold ${item.status === "active" ? "border-amber-100 text-amber-700 hover:bg-amber-50" : "border-emerald-100 text-emerald-700 hover:bg-emerald-50"}`}>{item.status === "active" ? "Close" : "Reopen"}</button><button onClick={() => setRemoveTarget(item)} title="Delete listing" className="rounded-lg border border-red-100 p-2 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></div></div>)}</div></>}
      </div>
    </div>
    {inspectTarget && <InspectModal item={inspectTarget} close={() => setInspectTarget(null)} />}
    {modal && <ListingForm category={category} mode={modal} form={form} setForm={setForm} saving={createOpportunity.isPending || updateOpportunity.isPending} close={() => setModal(null)} save={save} />}
    {removeTarget && createPortal(<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4" role="alertdialog" aria-modal="true"><div className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-2xl"><Trash2 className="h-7 w-7 text-red-600" /><h2 className="mt-4 text-xl font-bold">Delete this listing?</h2><p className="mt-2 text-sm leading-6 text-slate-600"><b>{removeTarget.title}</b> and its applications will be permanently removed.</p><div className="mt-6 flex justify-end gap-3"><button onClick={() => setRemoveTarget(null)} className="rounded-xl border px-4 py-2.5 text-sm font-bold">Cancel</button><button disabled={deleteOpportunity.isPending} onClick={() => void remove()} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{deleteOpportunity.isPending ? "Deleting..." : "Delete listing"}</button></div></div></div>, document.body)}
  </AdminPageShell>;
}

function ListSkeleton() { return <div className="space-y-3 p-5" role="status" aria-label="Searching listings">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-14 animate-pulse rounded-xl bg-slate-100" />)}<span className="sr-only">Waiting for search input...</span></div>; }

function InspectModal({ item, close }: { item: Opportunity; close: () => void }) {
  return createPortal(<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true"><div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[26px] bg-white shadow-2xl motion-safe:animate-[modalRise_220ms_ease-out] dark:bg-[#1B1836] dark:text-slate-100"><div className="bg-gradient-to-r from-[#332475] to-[#4B3CC4] p-5 text-white"><p className="text-xs font-bold uppercase tracking-widest text-[#D6D0FF]">Listing inspection</p><h2 className="mt-1 text-2xl font-bold">{item.title}</h2></div><div className="overflow-y-auto p-6"><div className="grid gap-3 sm:grid-cols-3"><Detail label="Owner" value={item.owner_name ? <UserLink userId={item.owner_id} name={item.owner_name} className="hover:text-[#4338CA] hover:underline dark:hover:text-primary-300" /> : "Unknown"} /><Detail label="Mode" value={item.mode} /><Detail label="Status" value={item.status.toUpperCase()} /></div><section className="mt-5 rounded-2xl border border-[#E8E5F7] bg-[#FAF9FF] p-5 dark:border-[#3B3564] dark:bg-[#231E4A]"><h3 className="text-xs font-bold uppercase tracking-wide text-[#4338CA] dark:text-primary-300">Full listing information</h3><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 dark:text-slate-200">{item.description}</p></section><p className="mt-4 text-xs text-slate-500 dark:text-slate-400">Created {new Date(item.created_at).toLocaleString()}</p></div><div className="border-t p-5 dark:border-[#332C63]"><button onClick={close} className="inline-flex items-center gap-2 rounded-xl border border-[#DDD9F1] px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-[#F8F7FD] dark:border-[#494174] dark:text-slate-200 dark:hover:bg-white/5"><ArrowLeft className="h-4 w-4" />Back</button></div></div></div>, document.body);
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) { return <div className="rounded-2xl border border-[#E8E5F7] p-4 dark:border-[#3B3564] dark:bg-[#231E4A]"><p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-400">{label}</p><p className="mt-1 break-words text-sm font-semibold text-slate-800 dark:text-slate-100">{value}</p></div>; }

function ListingForm({ category, mode, form, setForm, saving, close, save }: { category: ManagementCategory; mode: "create" | "edit"; form: Form; setForm: (form: Form) => void; saving: boolean; close: () => void; save: (event: React.FormEvent) => void }) {
  return createPortal(<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true"><form onSubmit={save} className="w-full max-w-xl overflow-hidden rounded-[26px] bg-white shadow-2xl dark:bg-[#1B1836] dark:text-slate-100"><div className="flex items-center justify-between bg-gradient-to-r from-[#332475] to-[#4B3CC4] p-5 text-white"><div><p className="text-xs font-bold uppercase tracking-widest text-[#D6D0FF]">Listing administration</p><h2 className="mt-1 text-xl font-bold">{mode === "create" ? `Add ${category} listing` : "Edit listing"}</h2></div><button type="button" onClick={close} className="rounded-xl border border-white/20 p-2 hover:bg-white/10"><X className="h-5 w-5" /></button></div><div className="space-y-4 p-6"><label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Title<input required minLength={5} maxLength={255} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 outline-none focus:border-[#4338CA] focus:ring-4 focus:ring-indigo-100 dark:border-[#494174] dark:bg-[#231E4A] dark:text-slate-100 dark:focus:ring-primary-400/20" /></label><label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Description<textarea required minLength={20} maxLength={5000} rows={7} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-1.5 w-full resize-y rounded-xl border px-3 py-2.5 outline-none focus:border-[#4338CA] focus:ring-4 focus:ring-indigo-100 dark:border-[#494174] dark:bg-[#231E4A] dark:text-slate-100 dark:focus:ring-primary-400/20" /></label><label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Mode<select value={form.mode} onChange={(event) => setForm({ ...form, mode: event.target.value as OpportunityMode })} className="mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 dark:border-[#494174] dark:bg-[#231E4A] dark:text-slate-100"><option value="ONLINE">Online</option><option value="PHYSICAL">Physical</option><option value="HYBRID">Hybrid</option></select></label></div><div className="flex justify-end gap-3 border-t p-5 dark:border-[#332C63]"><button type="button" onClick={close} className="rounded-xl border px-5 py-2.5 text-sm font-bold dark:border-[#494174] dark:text-slate-200 dark:hover:bg-white/5">Cancel</button><button disabled={saving} className="rounded-xl bg-[#4338CA] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "Saving..." : mode === "create" ? "Create listing" : "Save changes"}</button></div></form></div>, document.body);
}

export default AdminOpportunities;
