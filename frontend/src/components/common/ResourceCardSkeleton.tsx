import { cardClassName, SkeletonBlock } from "./cards";

export function ResourceCardSkeleton() {
  return (
    <div
      className={cardClassName("resource", "flex flex-col overflow-hidden p-0")}
      aria-hidden="true"
    >
      <SkeletonBlock className="aspect-video w-full rounded-none" />
      <div className="flex flex-col gap-grid-3 p-grid-5">
        <div className="flex items-start justify-between gap-2">
          <SkeletonBlock className="h-4 w-2/3" />
          <SkeletonBlock className="h-4 w-12 shrink-0 rounded-full" />
        </div>
        <SkeletonBlock className="h-3 w-full" />
        <SkeletonBlock className="h-3 w-1/3" />
      </div>
    </div>
  );
}
