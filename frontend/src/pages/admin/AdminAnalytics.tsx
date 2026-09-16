import { Download, MessageSquare, ShieldAlert, Users } from "lucide-react";
import * as XLSX from "xlsx";
import { Link } from "react-router-dom";
import { AdminLayout } from "../../layouts/AdminLayout";
import { useAdminAnalytics } from "../../hooks/useAdminAnalytics";
import type {
  AdminAnalytics as AdminAnalyticsData,
  AnalyticsCount,
} from "../../types/adminAnalytics";
import { cardClassName } from "../../components/common/cards";

const chartColors = ["#0f766e", "#f59e0b", "#2563eb", "#e11d48", "#64748b"];

function labelFor(value: string) {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char: string) => char.toUpperCase());
}

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
  to,
}: {
  label: string;
  value: number;
  note: string;
  icon: typeof Users;
  to: string;
}) {
  return (
    <Link
      to={to}
      className={cardClassName("interactive", "block")}
      aria-label={`Open ${label} management`}
    >
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <Icon className="h-5 w-5 text-teal-700" aria-hidden="true" />
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
        {value.toLocaleString()}
      </p>
      <p className="mt-1 text-xs text-slate-400">{note}</p>
    </Link>
  );
}

function DonutChart({ items }: { items: AnalyticsCount[] }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  let cursor = 0;
  const stops = items.map((item, index) => {
    const start = total ? (cursor / total) * 360 : 0;
    cursor += item.value;
    const end = total ? (cursor / total) * 360 : 0;
    return `${chartColors[index % chartColors.length]} ${start}deg ${end}deg`;
  });

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div
        className="relative h-40 w-40 shrink-0 rounded-full"
        style={{
          background: total ? `conic-gradient(${stops.join(", ")})` : "#e2e8f0",
        }}
        aria-label={`User roles: ${items.map((item) => `${labelFor(item.label)} ${item.value}`).join(", ")}`}
        role="img"
      >
        <div className="absolute inset-7 flex flex-col items-center justify-center rounded-full bg-white">
          <span className="text-2xl font-semibold text-slate-900">{total}</span>
          <span className="text-xs text-slate-400">users</span>
        </div>
      </div>
      <div className="space-y-3 text-sm">
        {items.map((item, index) => (
          <div key={item.label} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor: chartColors[index % chartColors.length],
              }}
            />
            <span className="text-slate-600">{labelFor(item.label)}</span>
            <span className="font-semibold text-slate-900">
              {item.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBars({
  items,
  color,
}: {
  items: AnalyticsCount[];
  color: string;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">No data yet.</p>
      ) : (
        items.map((item) => (
          <div key={item.label}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-slate-600">{labelFor(item.label)}</span>
              <span className="font-semibold text-slate-800">
                {item.value.toLocaleString()}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full"
                style={{
                  width: `${(item.value / max) * 100}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function ActivityChart({
  points,
}: {
  points: AdminAnalyticsData["monthlyTrend"];
}) {
  const max = Math.max(
    ...points.flatMap((point) => [
      point.users,
      point.resources,
      point.forumPosts,
      point.applications,
    ]),
    1,
  );
  const width = 640;
  const height = 220;
  const x = (index: number) => (index / Math.max(points.length - 1, 1)) * width;
  const y = (value: number) => height - (value / max) * (height - 24) - 12;
  const series = [
    { key: "users", label: "Users", color: "#0f766e" },
    { key: "resources", label: "Resources", color: "#f59e0b" },
    { key: "forumPosts", label: "Forum posts", color: "#2563eb" },
    { key: "applications", label: "Applications", color: "#e11d48" },
  ] as const;

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-4 text-xs text-slate-500">
        {series.map((item) => (
          <span key={item.key} className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </span>
        ))}
      </div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height + 32}`}
          className="min-w-[560px] w-full"
          role="img"
          aria-label="Six month activity trend"
        >
          {[0, 1, 2, 3].map((line) => (
            <line
              key={line}
              x1="0"
              x2={width}
              y1={y((max / 3) * line)}
              y2={y((max / 3) * line)}
              stroke="#e2e8f0"
              strokeDasharray="3 5"
            />
          ))}
          {series.map((item) => (
            <polyline
              key={item.key}
              fill="none"
              stroke={item.color}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points
                .map((point, index) => `${x(index)},${y(point[item.key])}`)
                .join(" ")}
            />
          ))}
          {points.map((point, index) => (
            <text
              key={point.month}
              x={x(index)}
              y={height + 20}
              textAnchor="middle"
              className="fill-slate-400 text-[10px]"
            >
              {point.month.slice(5)}
            </text>
          ))}
        </svg>
      </div>
    </>
  );
}

export function AdminAnalyticsPanel() {
  const { data, isLoading, isError, refetch } = useAdminAnalytics();

  const downloadExcel = () => {
    if (!data) return;
    const summary = [
      ["JomDekan Admin Analytics", ""],
      ["Generated", new Date().toISOString()],
      [],
      ["Metric", "Value"],
      ["Total users", data.totals.users],
      ["Active users", data.totals.activeUsers],
      ["Resources", data.totals.resources],
      ["Forum posts", data.totals.forumPosts],
      ["Forum comments", data.totals.forumComments],
      ["Marketplace listings", data.totals.opportunities],
      ["Applications", data.totals.applications],
      ["Pending moderation", data.totals.pendingModeration],
    ];
    const monthly = data.monthlyTrend.map((point) => ({
      Month: point.month,
      Users: point.users,
      Resources: point.resources,
      "Forum posts": point.forumPosts,
      Applications: point.applications,
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet(summary),
      "Summary",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(monthly),
      "Monthly activity",
    );
    XLSX.writeFile(
      workbook,
      `jomdekan-admin-analytics-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  };

  if (isLoading)
    return (
      <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
        Loading analytics…
      </p>
    );
  if (isError || !data)
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        <p>Could not load analytics.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-3 font-medium underline"
        >
          Try again
        </button>
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-400">
            Admin overview
          </p>
          <h1 className="mt-grid-1 break-words text-2xl font-heading leading-tight tracking-tight text-content-primary sm:text-page-title">
            Analytics
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            A live snapshot of platform health and participation.
          </p>
        </div>
        <button
          type="button"
          onClick={downloadExcel}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-700"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Download Excel
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total users"
          value={data.totals.users}
          note={`${data.totals.activeUsers.toLocaleString()} active accounts`}
          icon={Users}
          to="/admin/users"
        />
        <MetricCard
          label="Resources"
          value={data.totals.resources}
          note="Uploaded academic materials"
          icon={MessageSquare}
          to="/resources"
        />
        <MetricCard
          label="Freelance activity"
          value={data.totals.applications}
          note={`${data.totals.opportunities.toLocaleString()} listings`}
          icon={Users}
          to="/admin/opportunities"
        />
        <MetricCard
          label="Needs attention"
          value={data.totals.pendingModeration}
          note="Items in moderation queue"
          icon={ShieldAlert}
          to="/admin/moderation"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.35fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="font-semibold text-slate-900">User composition</h2>
            <p className="mt-1 text-sm text-slate-500">
              Registered accounts by role.
            </p>
          </div>
          <DonutChart items={data.userRoles} />
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="font-semibold text-slate-900">Six-month activity</h2>
            <p className="mt-1 text-sm text-slate-500">
              New records created each month.
            </p>
          </div>
          <ActivityChart points={data.monthlyTrend} />
        </section>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-5 font-semibold text-slate-900">Resources</h2>
          <StatusBars items={data.resourceStatuses} color="#f59e0b" />
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-5 font-semibold text-slate-900">
            Freelance listings
          </h2>
          <StatusBars items={data.opportunityStatuses} color="#0f766e" />
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-5 font-semibold text-slate-900">Applications</h2>
          <StatusBars items={data.applicationStatuses} color="#e11d48" />
        </section>
      </div>
    </div>
  );
}

export default function AdminAnalytics() {
  return (
    <AdminLayout>
      <AdminAnalyticsPanel />
    </AdminLayout>
  );
}
