import { cardClassName, SkeletonBlock } from "../common/cards";

export function MarketplaceCardSkeleton() {
  return (
    <div
      className={cardClassName("static", "flex flex-col justify-between")}
      aria-hidden="true"
    >
      <div className="space-y-3">
        <SkeletonBlock className="h-5 w-24" />
        <SkeletonBlock className="h-5 w-3/4" />
        <SkeletonBlock className="h-3 w-full" />
        <SkeletonBlock className="h-3 w-2/3" />
      </div>
      <SkeletonBlock className="mt-6 h-9 w-full rounded-lg" />
    </div>
  );
}
