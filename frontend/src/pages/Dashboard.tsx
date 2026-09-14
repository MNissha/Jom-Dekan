import { Link } from "react-router-dom";
import { BookOpen, Heart, MessageSquare, Bell } from "lucide-react";
import { useCurrentUser } from "../hooks/useAuth";
import { useMyProfile } from "../hooks/useProfile";
import { useResources } from "../hooks/useResources";
import { useFavorites } from "../hooks/useFavorites";
import { usePosts } from "../hooks/useForum";
import { useModeration } from "../hooks/useModeration";
import { useDemoLoading } from "../hooks/useDemoLoading";
import type { Notification } from "../types/moderation";
import { SummaryCard } from "../components/dashboard/SummaryCard";
import { RecommendedResources } from "../components/dashboard/RecommendedResources";
import { QuickActions } from "../components/dashboard/QuickActions";
import { RecentActivity } from "../components/dashboard/RecentActivity";
import { AdminAnalyticsPanel } from "./admin/AdminAnalytics";

export default function Dashboard() {
  const user = useCurrentUser();
  const { data: profile } = useMyProfile();
  // Simulated ~2s reveal for this frontend demo, kept separate from the
  // real react-query isLoading flags below (OR'd in, never replacing them).
  const isDemoLoading = useDemoLoading();

  const myResources = useResources({ mine: true, page: 1, pageSize: 1 });
  const favorites = useFavorites({ page: 1, pageSize: 1 });
  const myPosts = usePosts({ mine: true, page: 1, pageSize: 1 });
  const { notifications, isLoadingNotifications } = useModeration();
  const unreadCount = notifications.filter(
    (n: Notification) => !n.read_at,
  ).length;

  const firstName = profile?.displayName ? profile.displayName.trim().split(/\s+/)[0] : "";
  const greeting =
    new Date().getHours() < 12
      ? "Good morning"
      : new Date().getHours() < 18
        ? "Good afternoon"
        : "Good evening";

  if (user?.role === "ADMIN") {
    return (
      <div className="mx-auto max-w-[1440px] px-[18px] pt-[22px] pb-[28px]">
        <AdminAnalyticsPanel />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] px-[18px] pt-[22px] pb-[28px]">
      {/* Hero/greeting card — reference token: radial gradient, 26px
          radius, 30px padding, white text. No fabricated "semester/week"
          badge here — the backend has no academic-term data, so unlike
          the reference's sample badge, this only shows real info. */}
      <div
        className="relative overflow-hidden rounded-[26px] p-6 sm:p-[30px]"
        style={{
          background:
            "radial-gradient(120% 140% at 88% 12%, #4A3FD1 0%, #2E2372 48%, #231C57 100%)",
        }}
        aria-busy={isDemoLoading}
      >
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            {isDemoLoading || !user ? (
              <div
                className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-white/20 sm:h-12 sm:w-12"
                aria-hidden="true"
              />
            ) : (
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F5C21A] text-base font-semibold text-[#231C57] shadow-sm ring-2 ring-white/20 transition motion-safe:duration-150 hover:-translate-y-0.5 hover:shadow-md sm:h-12 sm:w-12 sm:text-lg"
                aria-hidden="true"
              >
                {user.email[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              {isDemoLoading ? (
                <>
                  <span className="sr-only">Loading your dashboard…</span>
                  <div className="h-6 w-40 animate-pulse rounded bg-white/20 sm:h-7 sm:w-56" />
                  <div className="mt-2 h-4 w-56 animate-pulse rounded bg-white/10 sm:w-72" />
                </>
              ) : (
                <div className="motion-safe:animate-[fadeIn_400ms_ease-out]">
                  <h1 className="truncate text-xl font-bold text-white sm:text-2xl">
                    {greeting}
                    {firstName ? `, ${firstName}` : ""}!
                  </h1>
                  <p className="mt-1 text-sm text-[#C6C2EC]">
                    Here&apos;s what&apos;s happening with your studies today.
                  </p>
                </div>
              )}
            </div>
          </div>

          {!isDemoLoading && user && (
            <div
              className="flex flex-wrap items-center gap-3 motion-safe:animate-[fadeIn_400ms_ease-out]"
              style={{ animationDelay: "80ms" }}
            >
              <Link
                to="/resources"
                className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-[#231C57] transition motion-safe:duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                Explore resources
              </Link>
              <Link
                to="/marketplace?type=TUTORING"
                className="rounded-full border border-white/30 px-4 py-2.5 text-sm font-semibold text-white transition motion-safe:duration-150 hover:-translate-y-0.5 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                Book a tutor
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(212px,1fr))] gap-4">
        {/* Tint rotation (purple/amber/blue/green) matches the
            reference's per-card icon-container coloring — the four
            metrics themselves are this app's own real ones, not the
            reference's sample categories. */}
        <SummaryCard
          icon={BookOpen}
          label="My resources"
          value={myResources.data?.meta.total ?? 0}
          isLoading={isDemoLoading || myResources.isLoading}
          iconClass="bg-[#EFEEFB] text-[#4338CA]"
          revealDelayMs={0}
        />
        <SummaryCard
          icon={Heart}
          label="Favorites"
          value={favorites.data?.meta.total ?? 0}
          isLoading={isDemoLoading || favorites.isLoading}
          iconClass="bg-[#FDF3DA] text-[#8A6A00]"
          revealDelayMs={60}
        />
        <SummaryCard
          icon={MessageSquare}
          label="Forum posts"
          value={myPosts.data?.meta.total ?? 0}
          isLoading={isDemoLoading || myPosts.isLoading}
          iconClass="bg-[#E4F1FB] text-[#1D5E8A]"
          revealDelayMs={120}
        />
        <SummaryCard
          icon={Bell}
          label="Unread notifications"
          value={unreadCount}
          isLoading={isDemoLoading || isLoadingNotifications}
          iconClass="bg-[#EAF3EA] text-[#2A6B3F]"
          revealDelayMs={180}
        />
      </div>

      <>
        <div className="mt-6 flex flex-col gap-6">
          <RecommendedResources forceLoading={isDemoLoading} />
          <RecentActivity forceLoading={isDemoLoading} />
        </div>

        <div className="mt-6">
          <QuickActions forceLoading={isDemoLoading} />
        </div>
      </>
    </div>
  );
}
