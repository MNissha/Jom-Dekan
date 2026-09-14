import axios from "axios";
import { AdminPageShell } from "../../layouts/AdminPageShell";
import { useAdminOpportunities } from "../../hooks/useAdminOpportunities";
import type { Opportunity, OpportunityStatus } from "../../types/opportunity";

export function AdminOpportunities({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const { opportunities, isLoading, updateStatus } = useAdminOpportunities();

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
          {opportunities.length === 0 ? (
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
                {opportunities.map((opp: Opportunity) => (
                  <tr
                    key={opp.id}
                    className="border-b hover:bg-stone-50 text-sm"
                  >
                    <td className="p-4 font-medium text-stone-800">
                      {opp.title}
                    </td>
                    <td className="p-4 text-stone-600">
                      {opp.owner_name || "Unknown"}
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
    </AdminPageShell>
  );
}

export default AdminOpportunities;
