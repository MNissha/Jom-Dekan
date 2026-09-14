import { useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  MessageSquare,
  Users,
  Briefcase,
  Heart,
  Bell,
  ShieldCheck,
  UserCog,
  LifeBuoy,
  LogOut,
  X,
  GraduationCap,
  ScrollText,
} from "lucide-react";
import { useCurrentUser, useLogout } from "../../hooks/useAuth";
import { useModeration } from "../../hooks/useModeration";
import type { Notification } from "../../types/moderation";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/resources", label: "Academic Resources", icon: BookOpen },
  { to: "/forum", label: "Discussions", icon: MessageSquare },
  { to: "/marketplace?type=TUTORING", label: "Tutoring", icon: Users },
  { to: "/marketplace", label: "Freelance Opportunities", icon: Briefcase },
  { to: "/favorites", label: "Favourites", icon: Heart },
];

const adminToolLinks = [
  { to: "/admin/users", label: "Users", icon: Users },
  {
    to: "/admin/tutoring",
    label: "Tutoring",
    icon: GraduationCap,
  },
  {
    to: "/admin/opportunities",
    label: "Freelance Listings",
    icon: Briefcase,
  },
  {
    to: "/admin/moderation",
    label: "Moderation",
    icon: ShieldCheck,
  },
  { to: "/admin/notifications", label: "Notifications", icon: Bell },
  { to: "/admin/logs", label: "Logs", icon: ScrollText },
];

// Reference sidebar: active row = translucent white fill + inset gold bar
// on the left edge; inactive rows go translucent-white on hover.
const rowClass = (isActive: boolean, collapsed: boolean) =>
  `flex items-center gap-3 rounded-xl py-2.5 text-[14.5px] font-semibold transition motion-safe:duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
    collapsed ? "justify-center px-0" : "px-3"
  } ${
    isActive
      ? "bg-white/[.14] text-white shadow-[inset_3px_0_0_#F5C21A]"
      : "text-[#ADA7DC] hover:translate-x-0.5 hover:bg-white/[.12] hover:text-white"
  }`;

interface DashboardSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed?: boolean;
}

function NavRows({
  onClose,
  collapsed,
  items,
}: {
  onClose: () => void;
  collapsed: boolean;
  items: typeof links;
}) {
  const location = useLocation();
  const onMarketplace = location.pathname === "/marketplace";
  const marketplaceType = new URLSearchParams(location.search).get("type");
  const dashboardSection = new URLSearchParams(location.search).get("section");

  return (
    <>
      {items.map(({ to, label, icon: Icon, end }) => {
        // "Tutoring" and "Freelance Opportunities" both route to
        // /marketplace, distinguished only by a ?type= query string that
        // NavLink's own isActive match ignores (it only compares
        // pathname), so both would otherwise light up together. Mirror
        // Marketplace.tsx's own type === "TUTORING" check instead.
        const [toPath, toQuery] = to.split("?");
        const marketplaceActive =
          toPath === "/marketplace"
            ? onMarketplace &&
              (toQuery === "type=TUTORING"
                ? marketplaceType === "TUTORING"
                : marketplaceType !== "TUTORING")
            : null;
        const dashboardActive =
          to === "/dashboard"
            ? location.pathname === "/dashboard" && !dashboardSection
            : null;

        return (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            title={collapsed ? label : undefined}
            className={
              dashboardActive !== null
                ? rowClass(dashboardActive, collapsed)
                : marketplaceActive !== null
                  ? rowClass(marketplaceActive, collapsed)
                  : ({ isActive }) => rowClass(isActive, collapsed)
            }
          >
            <Icon
              className="h-[19px] w-[19px] shrink-0 transition motion-safe:duration-150"
              aria-hidden="true"
            />
            {!collapsed && label}
          </NavLink>
        );
      })}
    </>
  );
}

function AdminToolNavRows({
  collapsed,
  onClose,
}: {
  collapsed: boolean;
  onClose: () => void;
}) {
  const location = useLocation();
  const { notifications } = useModeration();
  const unreadCount = (notifications as Notification[]).filter(
    (notification) => !notification.read_at,
  ).length;
  return (
    <>
      {adminToolLinks.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onClose}
          title={collapsed ? label : undefined}
          className={`relative ${rowClass(
            location.pathname === to || location.pathname.startsWith(`${to}/`),
            collapsed,
          )}`}
        >
          <Icon className="h-[19px] w-[19px] shrink-0" aria-hidden="true" />
          {!collapsed && <span className="flex-1">{label}</span>}
          {to === "/admin/notifications" && unreadCount > 0 && (
            <span className={collapsed ? "absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-[#231C57]" : "flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-[#231C57]"}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </NavLink>
      ))}
    </>
  );
}

// A real nav destination (/notifications) rather than a dropdown — it
// highlights when active like every other item, reuses the exact same
// real useModeration() data the header bell shows, so nothing here is
// fabricated.
function NotificationsNavLink({
  collapsed,
  onClose,
}: {
  collapsed: boolean;
  onClose: () => void;
}) {
  const { notifications } = useModeration();
  const unreadCount = notifications.filter(
    (n: Notification) => !n.read_at,
  ).length;

  return (
    <NavLink
      to="/notifications"
      onClick={onClose}
      title={collapsed ? "Notifications" : undefined}
      className={({ isActive }) => `relative ${rowClass(isActive, collapsed)}`}
    >
      <Bell className="h-[19px] w-[19px] shrink-0" aria-hidden="true" />
      {!collapsed && <span className="flex-1 text-left">Notifications</span>}
      {unreadCount > 0 &&
        (collapsed ? (
          <span
            className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-400"
            aria-hidden="true"
          />
        ) : (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[11px] font-bold text-[#231C57]">
            {unreadCount}
          </span>
        ))}
    </NavLink>
  );
}

export function DashboardSidebar({
  isOpen,
  onClose,
  collapsed = false,
}: DashboardSidebarProps) {
  const user = useCurrentUser();
  const logout = useLogout();
  const location = useLocation();
  const isAdmin = user?.role === "ADMIN";

  // Prevent the page behind the drawer from scrolling while it's open.
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const isProfileActive = location.pathname === "/profile";
  const isHelpActive = location.pathname === "/help";

  return (
    <>
      {/* Desktop sidebar — lives inside DashboardLayout's fixed app shell,
          in the row below the header. That row has a real, constrained
          height (not document scroll), so `h-full` + `shrink-0` pins the
          sidebar to exactly that height without ever scrolling itself;
          only its inner nav list scrolls if it doesn't fit. Width toggles
          between the reference's expanded (264px) and collapsed/icon-only
          (84px) states via the header's menu button. */}
      <aside
        className={`hidden h-full shrink-0 flex-col overflow-hidden bg-gradient-to-b from-[#2A2166] to-[#211A52] transition-[width] motion-safe:duration-200 lg:flex ${
          collapsed ? "w-[84px]" : "w-64"
        }`}
      >
        <div
          className={`flex items-center gap-3 py-[22px] ${collapsed ? "justify-center px-2" : "px-5"}`}
        >
          <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl bg-[#F5C21A] text-[#231C57]">
            <GraduationCap className="h-5 w-5" aria-hidden="true" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-[19px] font-extrabold tracking-tight text-white">
                JomDekan
              </span>
              <span className="text-[11px] font-semibold tracking-wider text-[#A6A0D8]">
                {isAdmin ? "ADMIN PORTAL" : "STUDENT PORTAL"}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          <nav
            className={`flex flex-col gap-1 py-3 text-sm ${collapsed ? "px-2" : "px-3"}`}
          >
            <NavRows
              onClose={onClose}
              collapsed={collapsed}
              items={
                isAdmin ? links.filter((l) => l.to === "/dashboard") : links
              }
            />
            {isAdmin && (
              <AdminToolNavRows collapsed={collapsed} onClose={onClose} />
            )}
            {!isAdmin && (
              <>
                <NotificationsNavLink collapsed={collapsed} onClose={onClose} />
                <NavLink
                  to="/profile"
                  onClick={onClose}
                  title={collapsed ? "Profile & Settings" : undefined}
                  className={rowClass(isProfileActive, collapsed)}
                >
                  <UserCog
                    className="h-[19px] w-[19px] shrink-0"
                    aria-hidden="true"
                  />
                  {!collapsed && "Profile & Settings"}
                </NavLink>
                <NavLink
                  to="/help"
                  onClick={onClose}
                  title={collapsed ? "Help & Support" : undefined}
                  className={rowClass(isHelpActive, collapsed)}
                >
                  <LifeBuoy
                    className="h-[19px] w-[19px] shrink-0"
                    aria-hidden="true"
                  />
                  {!collapsed && "Help & Support"}
                </NavLink>
              </>
            )}
            {isAdmin && (
              <NavLink
                to="/admin"
                end
                onClick={onClose}
                title={collapsed ? "Admin panel" : undefined}
                className={({ isActive }) =>
                  `mt-2 flex items-center gap-3 rounded-xl border-t border-white/10 py-2.5 pt-4 text-[14.5px] font-semibold transition motion-safe:duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                    collapsed ? "justify-center px-0" : "px-3"
                  } ${isActive ? "text-amber-400" : "text-[#ADA7DC] hover:text-white"}`
                }
              >
                <LayoutDashboard
                  className="h-[19px] w-[19px] shrink-0"
                  aria-hidden="true"
                />
                {!collapsed && "Admin panel"}
              </NavLink>
            )}
          </nav>
        </div>

        {/* Logout — a plain bottom nav row per the reference, not a
            profile card (the header now owns the account identity/avatar
            block). */}
        <div
          className={`border-t border-white/10 py-3 ${collapsed ? "px-2" : "px-3"}`}
        >
          <button
            type="button"
            onClick={() => {
              onClose();
              logout.mutate();
            }}
            title={collapsed ? "Log out" : undefined}
            className={`flex w-full items-center gap-3 rounded-xl py-2.5 text-[14.5px] font-semibold text-[#ADA7DC] transition motion-safe:duration-150 hover:bg-[rgba(245,194,26,.16)] hover:text-[#F5C21A] ${
              collapsed ? "justify-center px-0" : "px-3"
            }`}
          >
            <LogOut className="h-[19px] w-[19px] shrink-0" aria-hidden="true" />
            {!collapsed && "Logout"}
          </button>
        </div>
      </aside>

      {/* Mobile drawer — always full-width/full-nav regardless of the
          desktop collapse state. */}
      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 motion-safe:transition-opacity motion-safe:duration-200"
          />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-gradient-to-b from-[#2A2166] to-[#211A52] shadow-xl motion-safe:transition-transform motion-safe:duration-200">
            <div className="flex items-center justify-between border-b border-white/10 py-3 pl-4 pr-2">
              <div className="flex items-center gap-2 text-white">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F5C21A] text-[#231C57]">
                  <GraduationCap className="h-4 w-4" aria-hidden="true" />
                </div>
                <span className="font-semibold">JomDekan</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="rounded-lg p-1.5 text-[#ADA7DC] hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <nav className="flex flex-col gap-1 p-3 text-sm">
                <NavRows
                  onClose={onClose}
                  collapsed={false}
                  items={
                    isAdmin ? links.filter((l) => l.to === "/dashboard") : links
                  }
                />
                {isAdmin && (
                  <AdminToolNavRows collapsed={false} onClose={onClose} />
                )}
                {!isAdmin && (
                  <>
                    <NotificationsNavLink collapsed={false} onClose={onClose} />
                    <NavLink
                      to="/profile"
                      onClick={onClose}
                      className={rowClass(isProfileActive, false)}
                    >
                      <UserCog
                        className="h-[19px] w-[19px] shrink-0"
                        aria-hidden="true"
                      />
                      Profile & Settings
                    </NavLink>
                    <NavLink
                      to="/help"
                      onClick={onClose}
                      className={rowClass(isHelpActive, false)}
                    >
                      <LifeBuoy
                        className="h-[19px] w-[19px] shrink-0"
                        aria-hidden="true"
                      />
                      Help & Support
                    </NavLink>
                  </>
                )}
                {isAdmin && (
                  <NavLink
                    to="/admin"
                    end
                    onClick={onClose}
                    className={({ isActive }) =>
                      `mt-2 flex items-center gap-3 rounded-xl border-t border-white/10 px-3 py-2.5 pt-4 text-[14.5px] font-semibold transition motion-safe:duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                        isActive
                          ? "text-amber-400"
                          : "text-[#ADA7DC] hover:text-white"
                      }`
                    }
                  >
                    Admin panel
                  </NavLink>
                )}
              </nav>
            </div>
            <div className="border-t border-white/10 px-3 py-3">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  logout.mutate();
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14.5px] font-semibold text-[#ADA7DC] transition motion-safe:duration-150 hover:bg-[rgba(245,194,26,.16)] hover:text-[#F5C21A]"
              >
                <LogOut
                  className="h-[19px] w-[19px] shrink-0"
                  aria-hidden="true"
                />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
