import { cardClassName, SkeletonBlock } from "../common/cards";

export function AdminSectionSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-8" role="status" aria-label="Loading admin page">
      <SkeletonBlock className="h-36 rounded-feature" />
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => <SkeletonBlock key={index} className="h-24 rounded-card" />)}
      </div>
      <SkeletonBlock className="h-11 w-full max-w-md rounded-control" />
      <div className={cardClassName("admin-table", "p-grid-5")}>
        <SkeletonBlock className="mb-grid-4 h-5 w-2/5" />
        <div className="space-y-grid-3">{Array.from({ length: 5 }).map((_, index) => <SkeletonBlock key={index} className="h-14 rounded-control" />)}</div>
      </div>
      <span className="sr-only">Loading admin content...</span>
    </div>
  );
}
