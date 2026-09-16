import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, User, UploadCloud, Settings, LogOut, ChevronDown } from "lucide-react";
import { useCurrentUser, useLogout } from "../../hooks/useAuth";
import { useMyProfile } from "../../hooks/useProfile";
import { useDemoLoading } from "../../hooks/useDemoLoading";
import { NotificationsPopover } from "../common/NotificationsPopover";
import { MessagesHeaderLink } from "../common/MessagesHeaderLink";
import { HeaderClock } from "../common/HeaderClock";
import { ThemeToggle } from "../common/ThemeToggle";

function initialFrom(email: string) {
  return email[0]?.toUpperCase() ?? "?";
}

// Real link ("My Uploads" reuses the existing Resources page's own
// mine=true filter — no separate uploads page/endpoint exists) mixed
// with still-pending items (disabled, "Soon" badge) until a real
// profile/settings backend exists.
const MENU_ITEMS = [
  { label: "My Profile", to: "/profile?section=personal", icon: User, disabled: false },
  { label: "My Uploads", to: "/resources?mine=true", icon: UploadCloud, disabled: false },
  { label: "Settings", to: "/profile", icon: Settings, disabled: false },
];

export function DashboardHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const user = useCurrentUser();
  const { data: profile } = useMyProfile();
  const logout = useLogout();
  const isDemoLoading = useDemoLoading();

  const [isProfileOpen, setProfileOpen] = useState(false);
  const [isMenuEntered, setMenuEntered] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setProfileOpen(false);
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

  const isAdmin = user?.role === "ADMIN";
  const displayName = isAdmin
    ? "JomDekan Admin"
    : profile?.displayName || (user?.email ? user.email.split("@")[0] : "");

  return (
    // Flat white, not translucent/blurred — the shell's own layout (not
    // `position: sticky`) is what keeps this row fixed while `main`
    // scrolls beneath it, matching the reference's `position: relative`
    // header inside a fixed grid row.
    <header className="relative z-30 flex min-w-0 shrink-0 items-center gap-grid-3 border-b border-border bg-surface-card px-gutter-mobile py-grid-3 transition-colors motion-safe:duration-standard sm:px-gutter-tablet lg:px-gutter-desktop">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Toggle menu"
        className="nav-item flex h-10 w-10 shrink-0 items-center justify-center border border-border focus-visible:outline-none"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      <div className="min-w-0 flex-1">
        {/* empty */}
      </div>

      <HeaderClock />

      <div className="hidden sm:block">
        <MessagesHeaderLink />
      </div>

      <div className="hidden sm:block">
        <NotificationsPopover />
      </div>

      <ThemeToggle />

      <div ref={menuRef} className="relative shrink-0">
        {isDemoLoading ? (
          <div className="h-10 w-10 animate-pulse rounded-full bg-slate-200 sm:w-40" aria-hidden="true" />
        ) : (
          <>
            <button
              type="button"
              onClick={() => setProfileOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={isProfileOpen}
              className="group flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition motion-safe:duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 sm:pr-3 dark:hover:bg-[#231E4A]"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#4338CA] to-[#6D63E8] text-sm font-semibold text-white ring-2 ring-transparent transition motion-safe:duration-150 group-hover:scale-105 group-hover:ring-primary-200">
                {user ? initialFrom(user.email) : "?"}
              </span>
              <span className="hidden min-w-0 flex-col items-start leading-tight sm:flex">
                <span className="max-w-[9rem] truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{displayName}</span>
                <span className="max-w-[9rem] truncate text-xs text-slate-500 dark:text-slate-400">
                  {isAdmin ? "Administrator" : profile?.fieldOfStudy || "Programme not set"}
                </span>
              </span>
              <ChevronDown
                className={`hidden h-4 w-4 text-slate-500 transition motion-safe:duration-200 sm:inline dark:text-slate-400 ${isProfileOpen ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>

            {isProfileOpen && (
              <div
                role="menu"
                className={`menu-surface absolute right-0 z-50 mt-2 w-60 origin-top-right p-1.5 transition motion-safe:duration-fast ${
                  isMenuEntered ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-1 scale-95"
                }`}
              >
                <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                  Signed in as
                  <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{user?.email}</p>
                </div>
                <div className="my-1 border-t border-slate-100 dark:border-[#332C63]" />
                {MENU_ITEMS.map(({ label, to, icon: Icon }) => (
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
                ))}
                <div className="my-1 border-t border-slate-100 dark:border-[#332C63]" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setProfileOpen(false);
                    logout.mutate();
                  }}
                  className="menu-item flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 focus-visible:outline-none dark:hover:bg-red-500/10"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Log out
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </header>
  );
}
