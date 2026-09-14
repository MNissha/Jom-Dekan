import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { DashboardHeader } from "../components/dashboard/DashboardHeader";
import { DashboardSidebar } from "../components/dashboard/DashboardSidebar";
import { Footer } from "../components/common/Footer";
import { IdleTimeoutGuard } from "../components/common/IdleTimeoutGuard";

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
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);

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
    <div className="h-dvh-with-fallback flex w-full flex-col overflow-hidden bg-[#F6F6FB] transition-colors motion-safe:duration-200 dark:bg-[#15132B]">
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
            {children}
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}
