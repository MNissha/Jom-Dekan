import { useState } from "react";
import { ArrowLeft, BookOpen, Briefcase, MessageSquare, MessagesSquare, Users } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { AdminPageShell } from "../../layouts/AdminPageShell";
import { useAdminUserForumActivity, useAdminUserOpportunities, useAdminUserProfile, useAdminUserResources } from "../../hooks/useAdminUsers";

const PAGE_SIZE = 20;
type Tab = "resources" | "threads" | "comments" | "tutoring" | "freelance";

export function AdminUserDetail({ embedded = false, userId, onBack }: { embedded?: boolean; userId?: string; onBack?: () => void }) {
  const routeParams = useParams<{ id: string }>();
  const id = userId ?? routeParams.id;
  const [tab, setTab] = useState<Tab>("resources");
  const [page, setPage] = useState(1);
  const profile = useAdminUserProfile(id);
  const resources = useAdminUserResources(id, { page, pageSize: PAGE_SIZE });
  const threads = useAdminUserForumActivity(id, { page, pageSize: PAGE_SIZE, type: "post" });
  const comments = useAdminUserForumActivity(id, { page, pageSize: PAGE_SIZE, type: "comment" });
  const tutoring = useAdminUserOpportunities(id, "TUTORING", { page, pageSize: PAGE_SIZE });
  const freelance = useAdminUserOpportunities(id, "PROJECT_MENTORSHIP", { page, pageSize: PAGE_SIZE });
  const active = { resources, threads, comments, tutoring, freelance }[tab];
  const total = active.data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const tabs = [
    { key: "resources" as Tab, label: "Resources", icon: BookOpen },
    { key: "threads" as Tab, label: "Threads", icon: MessagesSquare },
    { key: "comments" as Tab, label: "Comments", icon: MessageSquare },
    { key: "tutoring" as Tab, label: "Tutoring", icon: Users },
    { key: "freelance" as Tab, label: "Freelance", icon: Briefcase },
  ];

  return <AdminPageShell embedded={embedded}>
    <div className="page-container page-container-standard py-grid-8 motion-safe:animate-panel-enter">
      {onBack ? <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-[#4338CA] hover:underline"><ArrowLeft className="h-4 w-4" />Back to users</button> : <Link to="/admin/users" className="inline-flex items-center gap-2 text-sm font-semibold text-[#4338CA] hover:underline"><ArrowLeft className="h-4 w-4" />Back to users</Link>}

      {profile.isLoading ? <div className="mt-5 h-32 animate-pulse rounded-[24px] bg-slate-200" /> : profile.data && <header className="relative mt-5 overflow-hidden rounded-[26px] bg-gradient-to-r from-[#332475] to-[#5B4DD2] p-6 text-white shadow-lg"><div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-[#F5C21A]/20 blur-2xl" /><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#D8D3FA]">User activity</p><h1 className="mt-1 text-3xl font-bold">{profile.data.displayName}</h1><p className="mt-1 text-sm text-[#D8D3FA]">{profile.data.email}</p></div><Link to={`/users/${profile.data.id}`} className="shrink-0 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-sm font-bold text-white hover:bg-white/20">View public profile</Link></div><div className="mt-4 flex gap-2"><span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">{profile.data.role}</span><span className={`rounded-full px-3 py-1 text-xs font-bold ${profile.data.status === "SUSPENDED" ? "bg-red-400/25 text-red-100" : "bg-emerald-400/25 text-emerald-100"}`}>{profile.data.status}</span></div></header>}

      <nav className="mt-5 flex flex-wrap gap-1 rounded-card border border-border bg-surface-card p-1.5 shadow-card" aria-label="User activity categories">{tabs.map(({ key, label, icon: Icon }) => <button key={key} onClick={() => { setTab(key); setPage(1); }} aria-pressed={tab === key} className="nav-item inline-flex min-h-control items-center gap-2 px-4 text-sm font-bold"><Icon className="h-4 w-4" />{label}</button>)}</nav>

      <section key={tab} className="mt-4 overflow-hidden rounded-[22px] border border-[#E8E5F7] bg-white shadow-sm motion-safe:animate-[fadeIn_180ms_ease-out]">
        <div className="border-b bg-[#F8F7FD] px-5 py-4"><h2 className="font-bold text-slate-800">{tabs.find((item) => item.key === tab)?.label} submitted by this user</h2><p className="mt-0.5 text-xs text-slate-500">Select an item to inspect it directly.</p></div>
        {active.isLoading ? <div className="space-y-3 p-5">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}</div> : active.isError ? <p className="p-8 text-center text-red-600">Could not load this activity.</p> : !active.data?.data.length ? <p className="p-8 text-center text-slate-500">No {tabs.find((item) => item.key === tab)?.label.toLowerCase()} submitted yet.</p> : <ul className="divide-y divide-[#F0EEF8]">
          {tab === "resources" && resources.data?.data.map((item) => <ActivityItem key={item.id} to={`/resources/${item.id}`} title={item.title} meta={`${item.status} · ${new Date(item.createdAt).toLocaleDateString()}`} />)}
          {tab === "threads" && threads.data?.data.map((item) => <ActivityItem key={item.id} to={`/forum/${item.postId}`} title={item.title ?? "Discussion thread"} description={item.body} meta={new Date(item.createdAt).toLocaleDateString()} />)}
          {tab === "comments" && comments.data?.data.map((item) => <ActivityItem key={item.id} to={`/forum/${item.postId}`} title="Comment" description={item.body} meta={new Date(item.createdAt).toLocaleDateString()} />)}
          {tab === "tutoring" && tutoring.data?.data.map((item) => <ActivityItem key={item.id} to={`/marketplace?type=TUTORING&listing=${item.id}`} title={item.title} meta={`${item.status} · ${new Date(item.createdAt).toLocaleDateString()}`} />)}
          {tab === "freelance" && freelance.data?.data.map((item) => <ActivityItem key={item.id} to={`/marketplace?type=FREELANCE&listing=${item.id}`} title={item.title} meta={`${item.status} · ${new Date(item.createdAt).toLocaleDateString()}`} />)}
        </ul>}
      </section>
      {total > 0 && <div className="mt-4 flex items-center justify-between text-sm text-slate-500"><span>Page {page} of {totalPages} · {total} items</span><div className="flex gap-2"><button onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1} className="rounded-xl border bg-white px-4 py-2 font-bold disabled:opacity-40">Previous</button><button onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page >= totalPages} className="rounded-xl bg-[#4338CA] px-4 py-2 font-bold text-white disabled:opacity-40">Next</button></div></div>}
    </div>
  </AdminPageShell>;
}

function ActivityItem({ to, title, description, meta }: { to: string; title: string; description?: string; meta: string }) {
  return <li className="p-5 transition hover:bg-[#FAF9FF]"><Link to={to} className="group block"><span className="font-bold text-slate-800 group-hover:text-[#4338CA] group-hover:underline">{title}</span>{description && <span className="mt-1 block line-clamp-2 text-sm leading-6 text-slate-600">{description}</span>}<span className="mt-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">{meta}</span></Link></li>;
}

export default AdminUserDetail;
