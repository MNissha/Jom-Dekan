import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Search, ShieldCheck, UserRound, Copy, Check, ExternalLink, type LucideIcon } from "lucide-react";
import { AdminPageShell } from "../../layouts/AdminPageShell";
import { useUserAuditLogs, useAdminAuditLogs } from "../../hooks/useAuditLogs";
import { useDebounce } from "../../hooks/useDebounce";
import type { AuditLogEntry } from "../../types/auditLog";

const PAGE_SIZE = 25;

type LogTab = "user" | "admin";
const tabs: { key: LogTab; label: string; icon: LucideIcon; description: string }[] = [
  { key: "user", label: "User activity", icon: UserRound, description: "Accounts, uploads, comments, reports filed by users." },
  { key: "admin", label: "Admin actions", icon: ShieldCheck, description: "Moderation, suspensions, deletions and other admin actions." },
];

function formatAction(action: string): string {
  return action
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function ActorCell({ entry }: { entry: AuditLogEntry }) {
  if (!entry.actor_user_id) {
    return <span className="text-slate-400">System</span>;
  }
  return (
    <div>
      <span className="block font-semibold text-slate-800">
        {entry.actor_display_name || entry.actor_email || "Unknown user"}
      </span>
      {entry.actor_display_name && entry.actor_email && (
        <span className="text-xs text-slate-500">{entry.actor_email}</span>
      )}
    </div>
  );
}

// What each target_type actually points at, and which DB table's `id`
// column it is — shown on hover so an admin chasing a log entry knows
// where to go look without having to guess from the raw UUID.
const TARGET_TYPE_INFO: Record<string, string> = {
  user: "A user account — id is users.id.",
  resource: "An uploaded academic resource — id is resources.id.",
  resource_file: "A file attached to a resource — id is resource_files.id.",
  resource_comment: "A comment on a resource — id is resource_comments.id.",
  forum_post: "A discussion/forum post — id is forum_posts.id.",
  forum_comment: "A comment on a forum post — id is forum_comments.id.",
  opportunity: "A marketplace/tutoring listing — id is opportunities.id.",
  report: "A user-submitted report — id is reports.id.",
  university: "A university taxonomy entry — id is universities.id.",
  faculty: "A faculty taxonomy entry — id is faculties.id.",
  programme: "A programme taxonomy entry — id is programmes.id.",
  subject: "A subject taxonomy entry — id is subjects.id.",
  taxonomy_request: "A user's request for missing taxonomy data — id is taxonomy_requests.id.",
  notification: "A notification/announcement — id is notifications.id.",
};

// Only target types with an actual addressable page get a link — the
// rest (files, comments, taxonomy rows, reports) have no standalone
// route to send an admin to, so they're id-only.
function targetHref(targetType: string, targetId: string): string | null {
  switch (targetType) {
    case "user":
      return `/admin/users/${targetId}`;
    case "resource":
      return `/resources/${targetId}`;
    case "forum_post":
      return `/forum/${targetId}`;
    default:
      return null;
  }
}

function CopyIdButton({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title="Copy full id"
      aria-label="Copy full id"
      onClick={async (event) => {
        event.preventDefault();
        event.stopPropagation();
        try {
          await navigator.clipboard.writeText(id);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard API can be unavailable (e.g. insecure context) —
          // the id is already shown in full, so this is just a
          // convenience, not the only way to get it.
        }
      }}
      className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

function TargetCell({ entry }: { entry: AuditLogEntry }) {
  if (!entry.target_type) return <span className="text-slate-400">—</span>;
  const info = TARGET_TYPE_INFO[entry.target_type] ?? `Target type: ${entry.target_type}.`;
  const href = entry.target_id ? targetHref(entry.target_type, entry.target_id) : null;
  return (
    <div className="text-xs">
      <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600" title={info}>
        {entry.target_type}
      </span>
      {entry.target_id && (
        <div className="mt-1 flex items-center gap-1">
          {href ? (
            <Link
              to={href}
              target="_blank"
              rel="noopener noreferrer"
              title={`${info} Open in a new tab.`}
              className="flex items-center gap-1 break-all font-mono text-indigo-600 hover:underline"
            >
              {entry.target_id}
              <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
            </Link>
          ) : (
            <span className="break-all font-mono text-slate-400" title={info}>
              {entry.target_id}
            </span>
          )}
          <CopyIdButton id={entry.target_id} />
        </div>
      )}
    </div>
  );
}

function LogTable({ tab, page, setPage, search }: { tab: LogTab; page: number; setPage: (page: number) => void; search: string }) {
  const params = { page, pageSize: PAGE_SIZE, search: search || undefined };
  const userQuery = useUserAuditLogs(params, tab === "user");
  const adminQuery = useAdminAuditLogs(params, tab === "admin");
  const query = tab === "user" ? userQuery : adminQuery;

  const entries = query.data?.data ?? [];
  const total = query.data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <div className="mt-4 overflow-x-auto rounded-[22px] border border-[#E8E5F7] bg-white shadow-sm">
        {query.isLoading ? (
          <div className="space-y-3 p-5" role="status" aria-label="Loading logs">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-12 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : query.isError ? (
          <p className="p-8 text-center text-red-600">Could not load logs.</p>
        ) : !entries.length ? (
          <p className="p-8 text-center text-slate-500">No log entries found.</p>
        ) : (
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="border-b bg-[#F8F7FD] text-xs uppercase tracking-wide text-slate-500">
                <th className="p-4">Timestamp</th>
                <th className="p-4">{tab === "user" ? "User" : "Admin"}</th>
                <th className="p-4">Action</th>
                <th className="p-4">Target</th>
                <th className="p-4">Reason / details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EEF8]">
              {entries.map((entry) => (
                <tr key={entry.id} className="transition hover:bg-[#FAF9FF]">
                  <td className="p-4 whitespace-nowrap text-xs text-slate-500">
                    {new Date(entry.created_at).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <ActorCell entry={entry} />
                  </td>
                  <td className="p-4">
                    <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                      {formatAction(entry.action)}
                    </span>
                  </td>
                  <td className="max-w-[220px] p-4">
                    <TargetCell entry={entry} />
                  </td>
                  <td className="max-w-xs p-4 text-xs text-slate-600">
                    {entry.reason || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {total > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
          <span>
            Page {page} of {totalPages} ({total} entries)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="rounded-xl border bg-white px-4 py-2 font-semibold disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="rounded-xl bg-[#4338CA] px-4 py-2 font-semibold text-white disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function AdminLogs({ embedded = false }: { embedded?: boolean }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("section");
  const [tab, setTab] = useState<LogTab>(requested === "admin" ? "admin" : "user");
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 500);

  function selectTab(next: LogTab) {
    setTab(next);
    setPage(1);
    setSearchParams({ section: next });
  }

  return (
    <AdminPageShell embedded={embedded}>
      <div className="mx-auto max-w-6xl px-4 py-8 motion-safe:animate-[fadeIn_220ms_ease-out]">
        <header className="relative overflow-hidden rounded-[26px] bg-gradient-to-r from-[#332475] via-[#4338CA] to-[#6558DD] p-6 text-white shadow-lg">
          <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-amber-300/20 blur-2xl" />
          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-[.2em] text-[#DDD8FF]">Admin portal</p>
            <h1 className="mt-1 text-3xl font-bold">Activity logs</h1>
            <p className="mt-1 text-sm text-[#D5D0F7]">
              A permanent, read-only record of what happened on JomDekan — entries can never be edited, deleted or
              archived.
            </p>
          </div>
        </header>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <nav className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm" aria-label="Log type">
            {tabs.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => selectTab(item.key)}
                title={item.description}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  tab === item.key ? "bg-[#4338CA] text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <item.icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </button>
            ))}
          </nav>
          <div className="relative max-w-xs flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value);
                setPage(1);
              }}
              placeholder="Search by name, email or action…"
              className="w-full rounded-xl border border-[#DDD9F1] bg-white py-2.5 pl-10 pr-3 text-sm shadow-sm outline-none focus:border-[#6558DD] focus:ring-4 focus:ring-indigo-100"
            />
          </div>
        </div>

        <p className="mt-2 text-xs text-slate-400">{tabs.find((t) => t.key === tab)?.description}</p>

        <LogTable tab={tab} page={page} setPage={setPage} search={search} />
      </div>
    </AdminPageShell>
  );
}

export default AdminLogs;
