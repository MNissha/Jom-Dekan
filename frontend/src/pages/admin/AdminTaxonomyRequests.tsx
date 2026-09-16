import { useState } from "react";
import axios from "axios";
import { AdminPageShell } from "../../layouts/AdminPageShell";
import { StatusBanner } from "../../components/common/StatusBanner";
import {
  usePendingTaxonomyRequests,
  useReviewTaxonomyRequest,
} from "../../hooks/useTaxonomy";
import type { TaxonomyRequest } from "../../types/taxonomy";

function extractErrorMessage(error: unknown): string | null {
  if (!axios.isAxiosError(error)) return null;
  return (
    (error.response?.data as { error?: { message?: string } })?.error
      ?.message ?? null
  );
}

function summarize(req: TaxonomyRequest): string {
  return (
    [
      req.requestedUniversityName && `University: "${req.requestedUniversityName}"`,
      req.requestedFacultyName && `Faculty: "${req.requestedFacultyName}"`,
      req.requestedProgrammeName && `Programme: "${req.requestedProgrammeName}"`,
      req.requestedSubjectName &&
        `Subject: "${req.requestedSubjectCode ? `${req.requestedSubjectCode} - ` : ""}${req.requestedSubjectName}"`,
    ]
      .filter(Boolean)
      .join(", ") || "No details provided."
  );
}

export default function AdminTaxonomyRequests({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const { data: requests, isLoading, isError } = usePendingTaxonomyRequests();
  const review = useReviewTaxonomyRequest();
  const [banner, setBanner] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [actingOnId, setActingOnId] = useState<string | null>(null);

  const decide = (id: string, decision: "APPROVED" | "REJECTED") => {
    setActingOnId(id);
    review.mutate(
      { id, decision },
      {
        onSuccess: () => {
          setBanner({
            type: "success",
            message:
              decision === "APPROVED"
                ? "Request approved. The student has been notified."
                : "Request rejected. The student has been notified.",
          });
        },
        onError: (err) =>
          setBanner({
            type: "error",
            message: extractErrorMessage(err) ?? "Could not review this request.",
          }),
        onSettled: () => setActingOnId(null),
      },
    );
  };

  return (
    <AdminPageShell embedded={embedded}>
      <h1 className="break-words text-2xl font-heading leading-tight tracking-tight text-content-primary sm:text-page-title">
        Taxonomy requests
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Review students' requests for missing universities, faculties,
        programmes, or subjects. Approving or rejecting notifies the student.
      </p>

      {banner && (
        <StatusBanner
          type={banner.type}
          message={banner.message}
          onDismiss={() => setBanner(null)}
        />
      )}

      <div className="card-base admin-table-container mt-6 overflow-x-auto">
        {isLoading ? (
          <p className="p-4 text-sm text-slate-500">Loading…</p>
        ) : isError ? (
          <p className="p-4 text-sm text-red-600">
            Could not load taxonomy requests.
          </p>
        ) : requests && requests.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-2">Requested</th>
                <th className="px-4 py-2">Note</th>
                <th className="px-4 py-2">Submitted</th>
                <th className="px-4 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => {
                const isActing = actingOnId === req.id && review.isPending;
                return (
                  <tr key={req.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 text-slate-700">
                      {summarize(req)}
                    </td>
                    <td className="px-4 py-2 text-slate-500">
                      {req.note ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-slate-500">
                      {new Date(req.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => decide(req.id, "APPROVED")}
                        disabled={isActing}
                        className="mr-3 text-sm font-medium text-green-700 hover:underline disabled:opacity-60"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => decide(req.id, "REJECTED")}
                        disabled={isActing}
                        className="text-sm font-medium text-red-700 hover:underline disabled:opacity-60"
                      >
                        Discard
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="p-4 text-sm text-slate-500">
            No pending taxonomy requests.
          </p>
        )}
      </div>
    </AdminPageShell>
  );
}
