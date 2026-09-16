import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardHeader } from "../components/dashboard/DashboardHeader";
import { DashboardSidebar } from "../components/dashboard/DashboardSidebar";
import { Footer } from "../components/common/Footer";
import { IdleTimeoutGuard } from "../components/common/IdleTimeoutGuard";
import { moderationService } from "../service/moderationService";
import type { Notification } from "../types/moderation";
import { useCurrentUser } from "../hooks/useAuth";
import { useDemoLoading } from "../hooks/useDemoLoading";
import { AdminSectionSkeleton } from "../components/admin/AdminSectionSkeleton";

const DESKTOP_BREAKPOINT = "(min-width: 1024px)";

// Fixed application shell for every authenticated page (Dashboard,
// Resources, Forum, Favorites, Marketplace, Profile, ...). Header and
// sidebar stay mounted and stationary; only the <main> panel scrolls.
// This is the single place that owns that scrolling model — pages must
// not add their own `overflow`/height rules to reproduce it.
//
// `h-dvh-with-fallback` (App.css) sets `height: 100vh` then `100dvh` in
// one rule so the shell tracks the real visible viewport on mobile
// (instead of the address-bar-inflated one) wherever dvh is supported,
// falling back to 100vh otherwise — see App.css for why this can't be
// two separate Tailwind utility classes. `overflow-hidden` on this root,
// combined with never letting any row inside it exceed the space it was
// given, is what stops a document-level scrollbar from appearing — the
// shell itself never has to grow taller than the viewport.
export function DashboardLayout({ children }: { children: ReactNode }) {
  const [isMobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const { pathname } = location;
  const currentUser = useCurrentUser();
  const adminSection = new URLSearchParams(location.search).get("section") ?? "";
  const adminDiscussionSection = new URLSearchParams(location.search).get("discussion") ?? "";
  const adminPageLoading = useDemoLoading(600, `${pathname}:${adminSection}:${adminDiscussionSection}`);
  const isAdminPage = pathname.startsWith("/admin") || (pathname === "/dashboard" && currentUser?.role === "ADMIN");
  const queryClient = useQueryClient();
  const mainRef = useRef<HTMLElement>(null);
  const processedNotificationIds = useRef(new Set<string>());

  // Notification links carry the unread notification ID in router state.
  // This effect runs after the destination has rendered, so updating badges
  // and sending the read receipt cannot hold up the route transition.
  useEffect(() => {
    const notificationId = (location.state as { notificationIdToMarkRead?: unknown } | null)
      ?.notificationIdToMarkRead;
    if (
      typeof notificationId !== "string" ||
      processedNotificationIds.current.has(notificationId)
    ) return;

    processedNotificationIds.current.add(notificationId);
    const previousNotifications = queryClient.getQueryData<Notification[]>(["notifications"]);
    queryClient.setQueryData<Notification[]>(["notifications"], (current = []) =>
      current.map((notification) =>
        notification.id === notificationId
          ? { ...notification, read_at: notification.read_at ?? new Date().toISOString() }
          : notification,
      ),
    );

    // Call the API directly instead of using a mutation hook in the app shell.
    // This avoids mutation-state rerenders while the destination is mounting.
    void moderationService.markNotificationAsRead(notificationId).catch((error: unknown) => {
      if (previousNotifications) {
        queryClient.setQueryData(["notifications"], previousNotifications);
      }
      console.error("Failed to mark notification as read", error);
    });
  }, [location.key, location.state, queryClient]);

  // Scroll the actual content panel back to its top on navigation
  // (never `window.scrollTo` — the window/document isn't the scroll
  // container here, `main` is).
  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [pathname]);

  // One menu button drives two different things depending on viewport:
  // on desktop/tablet it collapses the sidebar to an icon rail; below
  // `lg` (where the sidebar is hidden entirely) it opens the slide-out
  // drawer instead. Checked at click time rather than tracked with a
  // resize listener — simpler, and correct because Tailwind's `lg:`
  // classes already handle which sidebar variant is even visible.
  function handleMenuClick() {
    if (window.matchMedia(DESKTOP_BREAKPOINT).matches) {
      setSidebarCollapsed((v) => !v);
    } else {
      setMobileDrawerOpen(true);
    }
  }

  return (
    <div className="h-dvh-with-fallback flex w-full flex-col overflow-hidden bg-surface-page text-content-primary transition-colors motion-safe:duration-standard">
      <IdleTimeoutGuard />
      <DashboardHeader onMenuClick={handleMenuClick} />

      {/* `min-h-0` overrides Flexbox's default `min-height: auto` on this
          row. Without it, the row (and therefore the shell above it)
          would grow to fit whatever height `main`'s content wants,
          re-introducing the document-level scrollbar this shell exists
          to prevent. */}
      <div className="flex min-h-0 flex-1">
        <DashboardSidebar
          isOpen={isMobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          collapsed={isSidebarCollapsed}
        />

        {/* Right column: main content scrolls, footer doesn't. Footer
            sits in its own `shrink-0` row here rather than inside
            `<main>`, so it stays visible below the content instead of
            scrolling away with it — it starts after the sidebar (this
            column begins to the sidebar's right) and never underlaps it. */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <main
            ref={mainRef}
            className="min-h-0 min-w-0 flex-1 overflow-y-auto [scrollbar-color:#4338CA_transparent] [scrollbar-width:thin]"
          >
            {isAdminPage && adminPageLoading ? <AdminSectionSkeleton /> : (
              <div key={`${pathname}:${adminSection}:${adminDiscussionSection}`} className="page-stage min-h-full">
                {children}
              </div>
            )}
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}
