import { useMemo, useState } from "react";
import axios from "axios";
import { X } from "lucide-react";
import { AdminPageShell } from "../../layouts/AdminPageShell";
import { useAdminOpportunities } from "../../hooks/useAdminOpportunities";
import { UserLink } from "../../components/common/UserLink";
import type { Opportunity, OpportunityStatus } from "../../types/opportunity";

export function AdminOpportunities({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const { opportunities, isLoading, updateStatus } = useAdminOpportunities();
  const [detailId, setDetailId] = useState<string | null>(null);

  // Active listings first, closed ones sink to the bottom — admins care
  // most about what's currently live. Array.prototype.sort is stable, so
  // within each group listings keep the created_at DESC order the API
  // already returns them in.
  const sortedOpportunities = useMemo(
    () =>
      [...opportunities].sort(
        (a: Opportunity, b: Opportunity) =>
          (a.status === "closed" ? 1 : 0) - (b.status === "closed" ? 1 : 0),
      ),
    [opportunities],
  );

  const detailOpp = sortedOpportunities.find((o: Opportunity) => o.id === detailId) ?? null;

  const handleToggleStatus = async (opp: Opportunity) => {
    const nextStatus: OpportunityStatus =
      opp.status === "active" ? "closed" : "active";
    try {
      await updateStatus({ id: opp.id, status: nextStatus });
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? (err.response?.data as { error?: { message?: string } })?.error
            ?.message
        : undefined;
      alert(message || "Failed to update listing");
    }
  };

  if (isLoading) {
    return (
      <AdminPageShell embedded={embedded}>
        <div className="p-8 text-center text-stone-500">
          Loading listings...
        </div>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell embedded={embedded}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-stone-800 mb-6">
          Freelance Listings
        </h1>
        <div className="bg-white rounded-xl shadow border overflow-hidden">
          {sortedOpportunities.length === 0 ? (
            <p className="p-6 text-stone-500 text-center">
              No listings have been posted yet.
            </p>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-100 border-b text-stone-700 text-sm">
                  <th className="p-4">Title</th>
                  <th className="p-4">Owner</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedOpportunities.map((opp: Opportunity) => (
                  <tr
                    key={opp.id}
                    className="border-b hover:bg-stone-50 text-sm"
                  >
                    <td className="p-4 font-medium text-stone-800">
                      <button
                        type="button"
                        onClick={() => setDetailId(opp.id)}
                        className="text-left hover:text-primary-700 hover:underline"
                      >
                        {opp.title}
                      </button>
                    </td>
                    <td className="p-4 text-stone-600">
                      {opp.owner_name ? (
                        <UserLink
                          userId={opp.owner_id}
                          name={opp.owner_name}
                          className="text-stone-600 hover:text-primary-700 hover:underline"
                        />
                      ) : (
                        "Unknown"
                      )}
                    </td>
                    <td className="p-4 text-stone-600">
                      {opp.listing_type} ({opp.mode})
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold uppercase ${
                          opp.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-stone-200 text-stone-600"
                        }`}
                      >
                        {opp.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleToggleStatus(opp)}
                        className={`px-3 py-1 rounded text-xs text-white ${
                          opp.status === "active"
                            ? "bg-red-600 hover:bg-red-700"
                            : "bg-green-600 hover:bg-green-700"
                        }`}
                      >
                        {opp.status === "active" ? "Close" : "Reopen"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Listing detail — opened from the title. Shown here rather than
          linking out to the public marketplace because closed listings
          (the ones admins most often need to inspect) don't appear
          there at all. */}
      {detailOpp && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Listing details"
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-8"
        >
          <div className="w-full max-w-[560px] overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b p-5">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold text-stone-800">
                  {detailOpp.title}
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  {detailOpp.owner_name ? (
                    <UserLink
                      userId={detailOpp.owner_id}
                      name={detailOpp.owner_name}
                      className="font-semibold text-stone-600 hover:text-primary-700 hover:underline"
                    />
                  ) : (
                    "Unknown owner"
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailId(null)}
                aria-label="Close"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-stone-500 hover:bg-stone-50"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto p-5">
              <div className="flex flex-wrap gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-stone-400">
                    Type
                  </p>
                  <p className="text-sm font-semibold text-stone-700">
                    {detailOpp.listing_type} ({detailOpp.mode})
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-stone-400">
                    Status
                  </p>
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-xs font-semibold uppercase ${
                      detailOpp.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-stone-200 text-stone-600"
                    }`}
                  >
                    {detailOpp.status}
                  </span>
                </div>
                {detailOpp.subject_name && (
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-stone-400">
                      Subject
                    </p>
                    <p className="text-sm font-semibold text-stone-700">
                      {detailOpp.subject_name}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-stone-400">
                    Posted
                  </p>
                  <p className="text-sm font-semibold text-stone-700">
                    {new Date(detailOpp.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-stone-400">
                  Description
                </p>
                <p className="mt-1.5 whitespace-pre-line text-sm text-stone-600">
                  {detailOpp.description}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t p-5">
              <button
                type="button"
                onClick={() => setDetailId(null)}
                className="rounded-xl border px-4 py-2 text-sm font-bold text-stone-700 hover:bg-stone-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleToggleStatus(detailOpp)}
                className={`rounded-xl px-4 py-2 text-sm font-bold text-white ${
                  detailOpp.status === "active"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {detailOpp.status === "active" ? "Close listing" : "Reopen listing"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminPageShell>
  );
}

export default AdminOpportunities;
