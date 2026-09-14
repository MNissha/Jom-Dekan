import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, Search, User, UploadCloud, Settings, LogOut, ChevronDown } from "lucide-react";
import { useCurrentUser, useLogout } from "../../hooks/useAuth";
import { useMyProfile } from "../../hooks/useProfile";
import { useDemoLoading } from "../../hooks/useDemoLoading";
import { NotificationsPopover } from "../common/NotificationsPopover";
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
  { label: "My Profile", to: "/profile", icon: User, disabled: false },
  { label: "My Uploads", to: "/resources?mine=true", icon: UploadCloud, disabled: false },
  { label: "Settings", to: "/profile", icon: Settings, disabled: false },
];

export function DashboardHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const user = useCurrentUser();
  const { data: profile } = useMyProfile();
  const logout = useLogout();
  const isDemoLoading = useDemoLoading();
  const navigate = useNavigate();

  const [searchValue, setSearchValue] = useState("");
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

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = searchValue.trim();
    navigate(trimmed ? `/resources?search=${encodeURIComponent(trimmed)}` : "/resources");
  }

  const displayName = profile?.displayName || (user?.email ? user.email.split("@")[0] : "");

  return (
    // Flat white, not translucent/blurred — the shell's own layout (not
    // `position: sticky`) is what keeps this row fixed while `main`
    // scrolls beneath it, matching the reference's `position: relative`
    // header inside a fixed grid row.
    <header className="relative z-30 flex shrink-0 items-center gap-3 border-b border-[#E7E6F3] bg-white px-[18px] py-3 transition-colors motion-safe:duration-200 dark:border-[#2E2A54] dark:bg-[#1B1836]">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Toggle menu"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#ECEBF7] text-slate-500 transition motion-safe:duration-150 hover:scale-105 hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 active:scale-95 dark:border-[#332C63] dark:text-slate-300 dark:hover:bg-[#231E4A] dark:hover:text-white"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      <form onSubmit={handleSearchSubmit} className="min-w-0 flex-1">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search resources, subjects, tutors…"
            className="w-full rounded-full border border-[#ECEBF7] bg-[#F8F8FC] py-2.5 pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-500 transition motion-safe:duration-150 focus:border-primary-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 sm:max-w-md dark:border-[#332C63] dark:bg-[#231E4A] dark:text-slate-200 dark:placeholder:text-slate-400 dark:focus:bg-[#2A2455]"
          />
        </div>
      </form>

      <HeaderClock />

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
                {/* No programme/university field exists on the user record
                    yet — an honest placeholder instead of inventing one. */}
                <span className="max-w-[9rem] truncate text-xs text-slate-500 dark:text-slate-400">Programme not set</span>
              </span>
              <ChevronDown
                className={`hidden h-4 w-4 text-slate-500 transition motion-safe:duration-200 sm:inline dark:text-slate-400 ${isProfileOpen ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>

            {isProfileOpen && (
              <div
                role="menu"
                className={`absolute right-0 z-50 mt-2 w-60 origin-top-right rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg transition motion-safe:duration-150 dark:border-[#332C63] dark:bg-[#231E4A] ${
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
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-slate-600 transition motion-safe:duration-150 hover:bg-primary-50 hover:text-primary-700 dark:text-slate-300 dark:hover:bg-[#2A2455] dark:hover:text-primary-300"
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
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition motion-safe:duration-150 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:hover:bg-red-500/10"
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
