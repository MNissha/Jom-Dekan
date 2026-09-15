import { Link } from "react-router-dom";
import { useResources } from "../../hooks/useResources";
import { FavoriteButton } from "../common/FavoriteButton";
import { fileTypeBadge } from "../../utils/fileTypeBadge";
import { RESOURCE_CATEGORY_LABELS } from "../../types/resource";

// Matches the exact row shape rendered below (icon badge + two text
// lines in a bordered row) — the shared ResourceCardSkeleton is for the
// full thumbnail grid cards on the Resources/Favorites pages, a
// different shape, so it can't be reused here without a layout shift
// on reveal.
function RecommendedResourceRowSkeleton() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[#ECEBF7] p-3 motion-safe:animate-pulse" aria-hidden="true">
      <div className="h-9 w-9 shrink-0 rounded-lg bg-slate-200" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-3.5 w-3/4 rounded bg-slate-200" />
        <div className="h-3 w-1/3 rounded bg-slate-100" />
      </div>
    </div>
  );
}

export function RecommendedResources({ forceLoading = false }: { forceLoading?: boolean }) {
  const { data, isLoading, isError } = useResources({
    sortBy: "newest",
    page: 1,
    pageSize: 4,
  });
  const resources = data?.data ?? [];
  const showSkeleton = forceLoading || isLoading;

  return (
    <div className="rounded-[22px] border border-[#ECEBF7] bg-white p-5 shadow-sm" aria-busy={showSkeleton}>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-800">Recommended resources</h2>
        <Link to="/resources" className="text-sm font-medium text-primary-700 transition motion-safe:duration-150 hover:text-primary-800">
          View all →
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {showSkeleton ? (
          <>
            <RecommendedResourceRowSkeleton />
            <RecommendedResourceRowSkeleton />
            <RecommendedResourceRowSkeleton />
            <RecommendedResourceRowSkeleton />
          </>
        ) : isError ? (
          <p className="col-span-full text-sm text-red-600">Could not load resources.</p>
        ) : resources.length === 0 ? (
          <p className="col-span-full text-sm text-slate-500">
            No resources yet — be the first to upload one.
          </p>
        ) : (
          resources.map((r, i) => {
            const badge = fileTypeBadge(r);
            // This icon-square is too small (36px) for a suffixed badge
            // like "MULTI-FILE · 3 files" — show just the type here, with
            // the full text kept for assistive tech via aria-label.
            const compactLabel = badge.label.split(" · ")[0];
            return (
              <Link
                key={r.id}
                to={`/resources/${r.id}`}
                style={{ animationDelay: `${i * 60}ms` }}
                className="group flex items-start gap-3 rounded-xl border border-[#ECEBF7] p-3 transition motion-safe:duration-150 motion-safe:animate-[fadeIn_350ms_ease-out_both] hover:-translate-y-0.5 hover:border-primary-200 hover:bg-primary-50/60 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg break-words px-0.5 text-center text-[9px] font-extrabold leading-tight tracking-wide transition motion-safe:duration-150 group-hover:scale-105 ${badge.className}`}
                  aria-label={`File type: ${badge.label}`}
                >
                  {compactLabel}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800 transition motion-safe:duration-150 group-hover:text-primary-700">
                    {r.title}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                      {RESOURCE_CATEGORY_LABELS[r.category]}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <FavoriteButton targetType="resource" targetId={r.id} />
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
