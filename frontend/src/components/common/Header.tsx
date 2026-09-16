import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  GraduationCap,
  ChevronDown,
  User,
  UserCog,
  Settings,
  BellRing,
  LogOut,
} from "lucide-react";
import { useCurrentUser, useLogout } from "../../hooks/useAuth";
import { useDemoLoading } from "../../hooks/useDemoLoading";
import { NotificationsPopover } from "./NotificationsPopover";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `relative rounded px-1 py-1 text-sm font-medium transition-colors motion-safe:duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:rounded-full after:bg-amber-400 after:transition-all after:content-[''] motion-safe:after:duration-200 ${
    isActive
      ? "text-primary-700 after:w-full"
      : "text-slate-700 after:w-0 hover:text-primary-700 hover:after:w-full"
  }`;

// "View Profile"/"Settings" link to the real (frontend-only, mostly
// placeholder) /profile page; the rest stay disabled until there's an
// actual endpoint behind them. Kept visible (not hidden) so the menu
// shape is final.
const PROFILE_MENU_ITEMS = [
  { label: "View Profile", icon: User, to: "/profile" },
  { label: "Edit Profile", icon: UserCog, to: null },
  { label: "Settings", icon: Settings, to: "/profile" },
  { label: "Notification Preferences", icon: BellRing, to: null },
];

function initialFrom(email: string) {
  return email[0]?.toUpperCase() ?? "?";
}

export function Header() {
  const user = useCurrentUser();
  const logout = useLogout();
  const isDemoLoading = useDemoLoading();
  const [isProfileOpen, setProfileOpen] = useState(false);
  const [isMenuEntered, setMenuEntered] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Two-state mount so the menu transitions from its closed position/opacity
  // instead of just appearing — plain Tailwind transition classes, no
  // keyframes needed.
  useEffect(() => {
    if (!isProfileOpen) {
      setMenuEntered(false);
      return;
    }
    const frame = requestAnimationFrame(() => setMenuEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [isProfileOpen]);

  useEffect(() => {
    if (!isProfileOpen) return;
    function handlePointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setProfileOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isProfileOpen]);

  const displayName = user?.email ? user.email.split("@")[0] : "";

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-border bg-surface-card/95 backdrop-blur-[8px]">
      <div className="mx-auto flex w-full max-w-dashboard min-w-0 items-center justify-between gap-grid-3 px-gutter-mobile py-grid-3 sm:px-gutter-tablet lg:px-gutter-desktop">
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2 font-semibold text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
        >
          <GraduationCap className="h-6 w-6" aria-hidden="true" />
          <span className="hidden sm:inline">JomDekan</span>
        </Link>

        <nav className="flex items-center gap-3 text-sm sm:gap-5">
          {user ? (
            <>
              {user.role === "ADMIN" && (
                <NavLink to="/dashboard" className={navLinkClass}>
                  Admin dashboard
                </NavLink>
              )}
              {user.role !== "ADMIN" && (
                <NavLink to="/marketplace" className={navLinkClass}>
                  Marketplace
                </NavLink>
              )}
              <NavLink to="/dashboard" className={navLinkClass}>
                Dashboard
              </NavLink>
              <NotificationsPopover />

              <div ref={menuRef} className="relative">
                {isDemoLoading ? (
                  <div
                    className="h-9 w-9 animate-pulse rounded-full bg-slate-200 sm:w-32"
                    aria-hidden="true"
                  />
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setProfileOpen((v) => !v)}
                      aria-haspopup="menu"
                      aria-expanded={isProfileOpen}
                      className="group flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition motion-safe:duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 sm:pr-3"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-900 text-sm font-semibold text-amber-400 ring-2 ring-transparent transition motion-safe:duration-150 group-hover:ring-primary-200">
                        {initialFrom(user.email)}
                      </span>
                      <span className="hidden max-w-[8rem] truncate text-sm font-medium text-slate-700 sm:inline">
                        {displayName}
                      </span>
                      <ChevronDown
                        className={`hidden h-4 w-4 text-slate-400 transition motion-safe:duration-200 sm:inline ${isProfileOpen ? "rotate-180" : ""}`}
                        aria-hidden="true"
                      />
                    </button>

                    {isProfileOpen && (
                      <div
                        role="menu"
                        className={`menu-surface absolute right-0 z-50 mt-2 w-56 origin-top-right p-1.5 transition motion-safe:duration-fast ${
                          isMenuEntered
                            ? "opacity-100 translate-y-0 scale-100"
                            : "opacity-0 -translate-y-1 scale-95"
                        }`}
                      >
                        <div className="px-3 py-2 text-xs text-slate-400">
                          Signed in as
                          <p className="truncate text-sm font-medium text-slate-700">
                            {user.email}
                          </p>
                        </div>
                        <div className="my-1 border-t border-slate-100" />
                        {PROFILE_MENU_ITEMS.map(({ label, icon: Icon, to }) =>
                          to ? (
                            <Link
                              key={label}
                              to={to}
                              role="menuitem"
                              onClick={() => setProfileOpen(false)}
                              className="menu-item flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-content-secondary"
                            >
                              <Icon className="h-4 w-4" aria-hidden="true" />
                              {label}
                            </Link>
                          ) : (
                            <button
                              key={label}
                              type="button"
                              disabled
                              title="Coming soon"
                              role="menuitem"
                              className="menu-item flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-content-muted"
                            >
                              <Icon className="h-4 w-4" aria-hidden="true" />
                              {label}
                              <span className="ml-auto rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
                                Soon
                              </span>
                            </button>
                          ),
                        )}
                        <div className="my-1 border-t border-slate-100" />
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setProfileOpen(false);
                            logout.mutate();
                          }}
                          className="menu-item flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 focus-visible:outline-none dark:hover:bg-red-950/40"
                        >
                          <LogOut className="h-4 w-4" aria-hidden="true" />
                          Log out
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <NavLink to="/how-it-works" className={navLinkClass}>
                How it works
              </NavLink>
              <NavLink to="/login" className={navLinkClass}>
                Log in
              </NavLink>
              <NavLink
                to="/register"
                className="rounded-full bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition motion-safe:duration-150 hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 sm:px-4"
              >
                Register
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
