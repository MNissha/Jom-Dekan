import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminPageShell } from "../../layouts/AdminPageShell";
import { useAdminUsersList } from "../../hooks/useAdminUsers";
import { useDebounce } from "../../hooks/useDebounce";

const PAGE_SIZE = 20;

export function AdminUsers({
  embedded = false,
  onSelectUser,
}: {
  embedded?: boolean;
  onSelectUser?: (userId: string) => void;
}) {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const search = useDebounce(searchInput, 300);

  const { data, isLoading, isError } = useAdminUsersList({
    search: search || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const users = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

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
                  <th className="p-4">Posts</th>
                  <th className="p-4">Comments</th>
                  <th className="p-4">Likes achieved</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() =>
                      onSelectUser
                        ? onSelectUser(u.id)
                        : navigate(`/admin/users/${u.id}`)
                    }
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelectUser
                          ? onSelectUser(u.id)
                          : navigate(`/admin/users/${u.id}`);
                      }
                    }}
                    className="border-b hover:bg-stone-50 text-sm cursor-pointer"
                  >
                    <td className="p-4 font-medium text-stone-800">
                      {u.displayName}
                    </td>
                    <td className="p-4 text-stone-600">{u.email}</td>
                    <td className="p-4 text-stone-600">{u.role}</td>
                    <td className="p-4 text-stone-600">{u.postCount}</td>
                    <td className="p-4 text-stone-600">{u.commentCount}</td>
                    <td className="p-4 text-stone-600">{u.likesReceived}</td>
                  </tr>
                ))}
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
    </AdminPageShell>
  );
}

export default AdminUsers;
