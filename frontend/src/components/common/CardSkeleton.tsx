import { cardClassName, SkeletonBlock } from "./cards";

export function CardSkeleton() {
  return (
    <div className={cardClassName("static", "flex flex-col overflow-hidden p-0")} role="status" aria-label="Loading content">
      <SkeletonBlock className="aspect-video w-full rounded-none" />
      <div className="flex flex-col gap-grid-3 p-grid-5">
        <SkeletonBlock className="h-4 w-3/4" />
        <SkeletonBlock className="h-3 w-full" />
        <SkeletonBlock className="h-3 w-1/3" />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
