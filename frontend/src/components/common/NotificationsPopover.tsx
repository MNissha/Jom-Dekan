import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Megaphone, ShieldCheck } from "lucide-react";
import { useModeration } from "../../hooks/useModeration";
import { useCurrentUser } from "../../hooks/useAuth";
import type { Notification } from "../../types/moderation";
import { adminReportRoute } from "../../utils/adminReportRoute";

const RECENT_NOTIFICATION_LIMIT = 3;

function popoverStyle(type: string) {
  if (type === "ANNOUNCEMENT") {
    return { icon: Megaphone, iconClass: "bg-amber-50 text-amber-700", label: "Announcement" };
  }
  if (type === "REPORT_REVIEWED") {
    return { icon: ShieldCheck, iconClass: "bg-emerald-50 text-emerald-700", label: "Report update" };
  }
  return { icon: Bell, iconClass: "bg-[#EFEEFB] text-[#4338CA]", label: "Update" };
}

function fallbackTitle(type: string) {
  return type
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function NotificationsPopover() {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const { notifications, isLoadingNotifications, markAsRead, queue } = useModeration();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n: Notification) => !n.read_at).length;
  const recentNotifications = [...(notifications as Notification[])]
    .sort(
      (left, right) =>
        new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
    )
    .slice(0, RECENT_NOTIFICATION_LIMIT);

  const handleMarkRead = async (id: string) => {
    try {
      await markAsRead(id);
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const openNotification = (notification: Notification) => {
    const navigationState = notification.read_at
      ? undefined
      : { notificationIdToMarkRead: notification.id };
    if (user?.role !== "ADMIN") {
      setIsOpen(false);
      navigate("/notifications", { state: navigationState });
      return;
    }
    if (
      notification.type === "REPORT_SUBMITTED"
    ) {
      setIsOpen(false);
      navigate(adminReportRoute(notification, queue), { state: navigationState });
      return;
    }
    if (!notification.read_at) void handleMarkRead(notification.id);
  };

  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Notifications"
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#ECEBF7] text-slate-500 transition motion-safe:duration-150 hover:scale-105 hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 active:scale-95 dark:border-[#332C63] dark:text-slate-300 dark:hover:bg-[#231E4A] dark:hover:text-white"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E8543F] px-1 text-[10px] font-bold text-white shadow-sm" aria-label={`${unreadCount} unread notifications`}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div role="menu" className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-[#ECEBF7] bg-white shadow-xl motion-safe:animate-[fadeIn_150ms_ease-out] dark:border-[#332C63] dark:bg-[#1B1836]">
          <div className="flex items-center justify-between border-b border-[#F1F0FA] bg-[#F8F8FD] px-4 py-3 text-sm font-bold text-slate-700 dark:border-[#332C63] dark:bg-[#231E4A] dark:text-slate-200">
            <span>Notifications</span>
            <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">{unreadCount} unread</span>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-[#F4F3FB] dark:divide-[#2E2A54]">
            {isLoadingNotifications ? (
              <p className="p-4 text-center text-xs text-slate-400 dark:text-slate-500">Loading…</p>
            ) : notifications.length === 0 ? (
              <p className="p-4 text-center text-xs text-slate-400 dark:text-slate-500">No notifications yet.</p>
            ) : (
              recentNotifications.map((notification) => {
                const style = popoverStyle(notification.type);
                const Icon = style.icon;
                const title =
                  typeof notification.payload?.title === "string" &&
                  notification.payload.title.trim()
                    ? notification.payload.title
                    : fallbackTitle(notification.type);
                const description =
                  typeof notification.payload?.message === "string"
                    ? notification.payload.message
                    : "You have a new JomDekan update.";

                return (
                  <div
                    key={notification.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openNotification(notification)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") openNotification(notification);
                    }}
                    className={`group flex cursor-pointer items-start gap-3 px-4 py-3 transition motion-safe:duration-150 hover:bg-[#F8F8FD] dark:hover:bg-[#231E4A] ${notification.read_at ? "text-slate-500 dark:text-slate-400" : "bg-primary-50/40 text-slate-800 dark:bg-primary-400/10 dark:text-slate-100"}`}
                  >
                    <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition group-hover:scale-110 ${style.iconClass}`}>
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{style.label}</span>
                      <p className={`truncate text-xs ${notification.read_at ? "font-semibold" : "font-bold text-slate-900 dark:text-white"}`}>{title}</p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-slate-500 dark:text-slate-400">{description}</p>
                      <span className="mt-1 block text-[10px] text-slate-400 dark:text-slate-500">
                        {new Date(notification.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                    </div>
                    {!notification.read_at && (
                      <button type="button" onClick={(event) => { event.stopPropagation(); void handleMarkRead(notification.id); }} className="shrink-0 text-[10px] font-semibold text-primary-600 hover:underline dark:text-primary-400">Mark read</button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <Link
            to={user?.role === "ADMIN" ? "/admin/notifications?section=received" : "/notifications"}
            onClick={() => setIsOpen(false)}
            className="block border-t border-[#F1F0FA] px-4 py-2.5 text-center text-xs font-semibold text-primary-600 hover:bg-primary-50 dark:border-[#332C63] dark:text-primary-400 dark:hover:bg-[#231E4A]"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}

export default NotificationsPopover;
