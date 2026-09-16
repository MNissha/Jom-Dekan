import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Heart, Search, MessageSquare, Briefcase, GraduationCap, type LucideIcon } from "lucide-react";
import {
  useFavorites,
  useFavoritedForumPosts,
  useFavoritedOpportunities,
  useRemoveFavorite,
} from "../hooks/useFavorites";
import { EmptyState } from "../components/common/EmptyState";
import { ResourceCardSkeleton } from "../components/common/ResourceCardSkeleton";
import type { FavoriteTargetType } from "../types/favorite";
import { useMinimumLoading } from "../hooks/useMinimumLoading";

type TabKey = "resources" | "discussions" | "tutors" | "opportunities";
const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: "resources", label: "Resources", icon: FileText },
  { key: "discussions", label: "Discussions", icon: MessageSquare },
  { key: "tutors", label: "Tutors", icon: GraduationCap },
  { key: "opportunities", label: "Opportunities", icon: Briefcase },
];

function SavedItemCard({
  icon: Icon,
  title,
  subtitle,
  excerpt,
  savedAt,
  viewHref,
  targetType,
  targetId,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string | null;
  excerpt?: string | null;
  savedAt: string;
  viewHref: string;
  targetType: FavoriteTargetType;
  targetId: string;
}) {
  const removeFavorite = useRemoveFavorite();

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-[#ECEBF7] bg-white shadow-sm transition motion-safe:duration-150 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md">
      <Link to={viewHref} className="flex aspect-video w-full items-center justify-center bg-slate-100 transition hover:bg-primary-50" aria-label={`View ${title}`}>
        <Icon className="h-10 w-10 text-slate-300" aria-hidden="true" />
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <Link to={viewHref} className="text-left font-semibold text-slate-800 transition motion-safe:duration-150 hover:text-primary-700">
          {title}
        </Link>
        {subtitle && <p className="mt-0.5 text-xs font-semibold text-primary-600">{subtitle}</p>}
        {excerpt && <p className="mt-2 line-clamp-2 text-sm text-slate-500">{excerpt}</p>}
        <p className="mt-2 text-xs text-slate-400">Saved {new Date(savedAt).toLocaleDateString()}</p>
        <div className="mt-3 flex items-center gap-2">
          <Link
            to={viewHref}
            className="rounded-full bg-primary-600 px-4 py-1.5 text-xs font-bold text-white transition motion-safe:duration-150 hover:-translate-y-0.5 hover:bg-primary-700"
          >
            View
          </Link>
          <button
            type="button"
            onClick={() => removeFavorite.mutate({ targetType, targetId })}
            disabled={removeFavorite.isPending}
            className="flex items-center gap-1 rounded-full bg-slate-100 px-4 py-1.5 text-xs font-bold text-slate-700 transition motion-safe:duration-150 hover:bg-slate-200 disabled:opacity-60"
          >
            <Heart className="h-3.5 w-3.5 fill-current text-red-500" aria-hidden="true" />
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

function CardGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <ResourceCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default function Favorites() {
  const [activeTab, setActiveTab] = useState<TabKey>("resources");
  const [search, setSearch] = useState("");

  const resourcesQuery = useFavorites({ enabled: activeTab === "resources" });
  const discussionsQuery = useFavoritedForumPosts({ enabled: activeTab === "discussions" });
  const opportunitiesQuery = useFavoritedOpportunities({
    enabled: activeTab === "tutors" || activeTab === "opportunities",
  });

  const q = search.trim().toLowerCase();

  const allResources = useMemo(() => resourcesQuery.data?.data ?? [], [resourcesQuery.data]);
  const allDiscussions = useMemo(() => discussionsQuery.data?.data ?? [], [discussionsQuery.data]);
  const allTutors = useMemo(
    () => (opportunitiesQuery.data?.data ?? []).filter((f) => f.opportunity.listing_type === "TUTORING"),
    [opportunitiesQuery.data],
  );
  const allOpportunities = useMemo(
    () => (opportunitiesQuery.data?.data ?? []).filter((f) => f.opportunity.listing_type !== "TUTORING"),
    [opportunitiesQuery.data],
  );

  const resources = useMemo(
    () => allResources.filter((f) => !q || f.resource.title.toLowerCase().includes(q)),
    [allResources, q],
  );
  const discussions = useMemo(
    () => allDiscussions.filter((f) => !q || f.post.title.toLowerCase().includes(q)),
    [allDiscussions, q],
  );
  const tutors = useMemo(
    () => allTutors.filter((f) => !q || f.opportunity.title.toLowerCase().includes(q)),
    [allTutors, q],
  );
  const opportunities = useMemo(
    () => allOpportunities.filter((f) => !q || f.opportunity.title.toLowerCase().includes(q)),
    [allOpportunities, q],
  );

  const activeQuery = {
    resources: resourcesQuery,
    discussions: discussionsQuery,
    tutors: opportunitiesQuery,
    opportunities: opportunitiesQuery,
  }[activeTab];
  const activeList = { resources, discussions, tutors, opportunities }[activeTab];
  const showSkeleton = useMinimumLoading(activeQuery.isLoading, 600);
  // Unfiltered count for this tab — decides "nothing saved" vs "no
  // matches for this search", independent of what's currently typed.
  const unfilteredCount = { resources: allResources, discussions: allDiscussions, tutors: allTutors, opportunities: allOpportunities }[
    activeTab
  ].length;

  return (
    <div className="page-container page-container-standard">
      <h1 className="break-words text-2xl font-heading leading-tight tracking-tight text-content-primary sm:text-page-title">Saved Items</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Resources, discussions, tutors, and opportunities you've saved for later.
      </p>

      <div className="mt-6 flex flex-wrap gap-2 border-b border-slate-200">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            aria-pressed={activeTab === key}
            className={`nav-item flex min-h-control items-center gap-1.5 border-b-2 px-3 text-sm font-bold ${
              activeTab === key
                ? "border-primary-600 text-primary-700"
                : "border-transparent text-slate-500 hover:text-primary-600"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your favorites…"
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      <div className="mt-6 motion-safe:animate-[fadeIn_200ms_ease-out]" key={activeTab}>
        {showSkeleton ? (
          <CardGridSkeleton />
        ) : activeQuery.isError ? (
          <EmptyState
            icon={Heart}
            title="Could not load favorites"
            description="Something went wrong while fetching your favorites. Please try again."
          />
        ) : unfilteredCount === 0 ? (
          <EmptyState
            icon={Heart}
            title="Nothing saved here yet"
            description={
              activeTab === "resources"
                ? "Save resources you want to come back to later, and they'll show up here."
                : activeTab === "discussions"
                  ? "Save discussion threads you want to revisit, and they'll show up here."
                  : activeTab === "tutors"
                    ? "Save tutor listings you're interested in, and they'll show up here."
                    : "Save freelance opportunities you're interested in, and they'll show up here."
            }
            primaryAction={{
              label:
                activeTab === "resources"
                  ? "Explore resources"
                  : activeTab === "discussions"
                    ? "Browse discussions"
                    : "Browse marketplace",
              to: activeTab === "resources" ? "/resources" : activeTab === "discussions" ? "/forum" : "/marketplace",
            }}
          />
        ) : activeList.length === 0 ? (
          <EmptyState icon={Search} title="No matching favorites" description="Try a different search term." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeTab === "resources" &&
              resources.map((f) => (
                <SavedItemCard
                  key={f.favoriteId}
                  icon={FileText}
                  title={f.resource.title}
                  excerpt={f.resource.description}
                  savedAt={f.favoritedAt}
                  viewHref={`/resources/${f.resource.id}`}
                  targetType="resource"
                  targetId={f.resource.id}
                />
              ))}
            {activeTab === "discussions" &&
              discussions.map((f) => (
                <SavedItemCard
                  key={f.favoriteId}
                  icon={MessageSquare}
                  title={f.post.title}
                  excerpt={f.post.body}
                  savedAt={f.favoritedAt}
                  viewHref={`/forum/${f.post.id}`}
                  targetType="forum_post"
                  targetId={f.post.id}
                />
              ))}
            {activeTab === "tutors" &&
              tutors.map((f) => (
                <SavedItemCard
                  key={f.favoriteId}
                  icon={GraduationCap}
                  title={f.opportunity.title}
                  subtitle={f.opportunity.subject_name ?? undefined}
                  excerpt={f.opportunity.description}
                  savedAt={f.favoritedAt}
                  viewHref={`/marketplace?type=TUTORING&listing=${f.opportunity.id}`}
                  targetType="opportunity"
                  targetId={f.opportunity.id}
                />
              ))}
            {activeTab === "opportunities" &&
              opportunities.map((f) => (
                <SavedItemCard
                  key={f.favoriteId}
                  icon={Briefcase}
                  title={f.opportunity.title}
                  subtitle={f.opportunity.subject_name ?? undefined}
                  excerpt={f.opportunity.description}
                  savedAt={f.favoritedAt}
                  viewHref={`/marketplace?type=FREELANCE&listing=${f.opportunity.id}`}
                  targetType="opportunity"
                  targetId={f.opportunity.id}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
