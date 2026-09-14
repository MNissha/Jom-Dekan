import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AdminPageShell } from "../../layouts/AdminPageShell";
import {
  useAdminUserProfile,
  useAdminUserResources,
  useAdminUserForumActivity,
  useAdminUserApplications,
} from "../../hooks/useAdminUsers";

const PAGE_SIZE = 20;
type Tab = "resources" | "forum" | "applications";

export function AdminUserDetail({
  embedded = false,
  userId,
  onBack,
}: {
  embedded?: boolean;
  userId?: string;
  onBack?: () => void;
}) {
  const routeParams = useParams<{ id: string }>();
  const id = userId ?? routeParams.id;
  const [tab, setTab] = useState<Tab>("resources");
  const [page, setPage] = useState(1);

  const { data: profile, isLoading: profileLoading } = useAdminUserProfile(id);
  const resources = useAdminUserResources(id, { page, pageSize: PAGE_SIZE });
  const forum = useAdminUserForumActivity(id, { page, pageSize: PAGE_SIZE });
  const applications = useAdminUserApplications(id, {
    page,
    pageSize: PAGE_SIZE,
  });

  const active =
    tab === "resources" ? resources : tab === "forum" ? forum : applications;
  const total = active.data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleTabChange = (nextTab: Tab) => {
    setTab(nextTab);
    setPage(1);
  };

  if (profileLoading) {
    return (
      <AdminPageShell embedded={embedded}>
        <div className="p-8 text-center text-stone-500">Loading…</div>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell embedded={embedded}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-primary-600 hover:underline"
          >
            ← Back to users
          </button>
        ) : (
          <Link
            to="/admin/users"
            className="text-sm text-primary-600 hover:underline"
          >
            ← Back to users
          </Link>
        )}

        {profile && (
          <div className="mt-3 mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-stone-800">
                {profile.displayName}
              </h1>
              <p className="text-sm text-stone-500">{profile.email}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-stone-400">
                {profile.role} · {profile.status}
              </p>
            </div>
            <Link
              to={`/users/${profile.id}`}
              className="shrink-0 rounded-full border border-primary-600 px-4 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-50"
            >
              View profile
            </Link>
          </div>
        )}

        <div className="mb-4 flex gap-2 border-b border-stone-200">
          {[
            { key: "resources" as Tab, label: "Resources" },
            { key: "forum" as Tab, label: "Forum" },
            { key: "applications" as Tab, label: "Marketplace applications" },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => handleTabChange(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                tab === t.key
                  ? "border-primary-600 text-primary-700"
                  : "border-transparent text-stone-500 hover:text-stone-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow border overflow-hidden">
          {active.isLoading ? (
            <p className="p-6 text-center text-stone-500">Loading…</p>
          ) : active.isError ? (
            <p className="p-6 text-center text-red-600">Could not load data.</p>
          ) : tab === "resources" ? (
            resources.data?.data.length ? (
              <ul className="divide-y">
                {resources.data.data.map((r) => (
                  <li key={r.id} className="p-4 hover:bg-stone-50">
                    <Link
                      to={`/resources/${r.id}`}
                      className="font-medium text-stone-800 hover:text-primary-700"
                    >
                      {r.title}
                    </Link>
                    <p className="mt-1 text-xs text-stone-400">
                      {r.status} · {new Date(r.createdAt).toLocaleDateString()}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-6 text-center text-stone-500">
                No resources uploaded yet.
              </p>
            )
          ) : tab === "forum" ? (
            forum.data?.data.length ? (
              <ul className="divide-y">
                {forum.data.data.map((item) => (
                  <li
                    key={`${item.type}-${item.id}`}
                    className="p-4 hover:bg-stone-50"
                  >
                    <Link
                      to={`/forum/${item.postId}`}
                      className="font-medium text-stone-800 hover:text-primary-700"
                    >
                      {item.type === "post" ? item.title : "Comment"}
                    </Link>
                    <p className="mt-1 line-clamp-2 text-sm text-stone-600">
                      {item.body}
                    </p>
                    <p className="mt-1 text-xs text-stone-400">
                      {item.type === "post" ? "Post" : "Comment"} ·{" "}
                      {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-6 text-center text-stone-500">
                No forum activity yet.
              </p>
            )
          ) : applications.data?.data.length ? (
            <ul className="divide-y">
              {applications.data.data.map((a) => (
                <li key={a.id} className="p-4 hover:bg-stone-50">
                  <Link
                    to="/marketplace"
                    className="font-medium text-stone-800 hover:text-primary-700"
                  >
                    {a.opportunityTitle}
                  </Link>
                  <p className="mt-1 text-xs text-stone-400">
                    {a.status} · {new Date(a.createdAt).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-6 text-center text-stone-500">
              No marketplace applications yet.
            </p>
          )}
        </div>

        {total > 0 && (
          <div className="mt-4 flex items-center justify-between text-sm text-stone-500">
            <span>
              Page {page} of {totalPages} ({total} item{total === 1 ? "" : "s"})
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
    </AdminPageShell>
  );
}

export default AdminUserDetail;
