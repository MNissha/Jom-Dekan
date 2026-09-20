import { Link } from "react-router-dom";
import { UploadCloud, MessageSquare, Reply, Heart, type LucideIcon } from "lucide-react";
import { useMyActivity } from "../../hooks/useProfile";
import type { ActivityItem, ActivityType } from "../../types/profile";

// Same 4-color palette already used for the dashboard's summary cards —
// keeps each activity type visually distinct instead of one flat purple.
const ACTIVITY_STYLE: Record<ActivityType, { icon: LucideIcon; iconClass: string; hoverClass: string; textHoverClass: string }> = {
  RESOURCE_UPLOADED: {
    icon: UploadCloud,
    iconClass: "bg-[#EFEEFB] text-[#4338CA]",
    hoverClass: "hover:bg-[#EFEEFB]/60 dark:hover:bg-primary-400/10",
    textHoverClass: "group-hover:text-[#4338CA] dark:group-hover:text-primary-300",
  },
  RESOURCE_FAVORITED: {
    icon: Heart,
    iconClass: "bg-[#FDF3DA] text-[#8A6A00]",
    hoverClass: "hover:bg-[#FDF3DA]/60 dark:hover:bg-amber-400/10",
    textHoverClass: "group-hover:text-[#8A6A00] dark:group-hover:text-amber-300",
  },
  FORUM_POST_CREATED: {
    icon: MessageSquare,
    iconClass: "bg-[#E4F1FB] text-[#1D5E8A]",
    hoverClass: "hover:bg-[#E4F1FB]/60 dark:hover:bg-blue-400/10",
    textHoverClass: "group-hover:text-[#1D5E8A] dark:group-hover:text-blue-300",
  },
  FORUM_COMMENT_CREATED: {
    icon: Reply,
    iconClass: "bg-[#EAF3EA] text-[#2A6B3F]",
    hoverClass: "hover:bg-[#EAF3EA]/60 dark:hover:bg-emerald-400/10",
    textHoverClass: "group-hover:text-[#2A6B3F] dark:group-hover:text-emerald-300",
  },
};

function activityHref(item: ActivityItem): string {
  return item.type === "FORUM_POST_CREATED" || item.type === "FORUM_COMMENT_CREATED"
    ? `/forum/${item.targetId}`
    : `/resources/${item.targetId}`;
}

function activityLabel(item: ActivityItem): string {
  switch (item.type) {
    case "RESOURCE_UPLOADED":
      return `You uploaded "${item.title}"`;
    case "FORUM_POST_CREATED":
      return `You posted "${item.title}"`;
    case "FORUM_COMMENT_CREATED":
      return `You replied on "${item.title}"`;
    case "RESOURCE_FAVORITED":
      return `You favorited "${item.title}"`;
  }
}

export function RecentActivity({ forceLoading = false }: { forceLoading?: boolean }) {
  const { data, isLoading } = useMyActivity();
  const recent = data ?? [];
  const showSkeleton = forceLoading || isLoading;

  return (
    <div className="rounded-[22px] border border-[#ECEBF7] bg-white p-5 shadow-sm" aria-busy={showSkeleton}>
      <h2 className="font-semibold text-slate-800">Recent activity</h2>

      {showSkeleton ? (
        <div className="mt-4 flex flex-col gap-3" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-4 w-full animate-pulse rounded bg-slate-100" />
          ))}
        </div>
      ) : recent.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          Nothing new yet — activity on your posts, favorites, and uploads will show up here.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-1.5">
          {recent.map((item, i) => {
            const style = ACTIVITY_STYLE[item.type];
            const Icon = style.icon;
            return (
              <li
                key={`${item.type}-${item.id}`}
                style={{ animationDelay: `${i * 60}ms` }}
                className="motion-safe:animate-[fadeIn_350ms_ease-out_both]"
              >
                <Link
                  to={activityHref(item)}
                  className={`group flex items-start gap-3 rounded-xl p-2.5 transition motion-safe:duration-150 hover:translate-x-0.5 hover:shadow-sm ${style.hoverClass}`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition motion-safe:duration-150 group-hover:scale-105 ${style.iconClass}`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className={`truncate text-sm font-medium text-slate-800 transition motion-safe:duration-150 ${style.textHoverClass}`}>
                      {activityLabel(item)}
                    </p>
                    <span className="text-xs text-slate-400">
                      {new Date(item.createdAt).toLocaleString([], {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
