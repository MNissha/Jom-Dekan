import { cardClassName, SkeletonBlock } from "../common/cards";

export function ForumPostSkeleton() {
  return (
    <div
      className={cardClassName("static", "flex items-center gap-4")}
      aria-hidden="true"
    >
      <SkeletonBlock className="h-[76px] w-[72px] shrink-0 rounded-2xl" />
      <div className="min-w-0 flex-1 space-y-2.5">
        <SkeletonBlock className="h-4 w-16 rounded-full" />
        <SkeletonBlock className="h-4 w-2/3" />
        <SkeletonBlock className="h-3 w-1/3" />
      </div>
      <SkeletonBlock className="hidden h-10 w-28 shrink-0 rounded-xl sm:block" />
    </div>
  );
}
