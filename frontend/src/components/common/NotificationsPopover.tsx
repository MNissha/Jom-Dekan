import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, CheckCheck, LifeBuoy, Lightbulb, Megaphone, PartyPopper, ShieldCheck } from "lucide-react";
import { useModeration } from "../../hooks/useModeration";
import { useCurrentUser } from "../../hooks/useAuth";
import type { Notification } from "../../types/moderation";
import { adminNotificationDestination, notificationCategoryLabel, notificationMessage, notificationTitle, relativeNotificationTime } from "../../utils/adminNotification";
import { userNotificationDestination, userNotificationPresentation } from "../../utils/notificationPresentation";

const RECENT_NOTIFICATION_LIMIT = 5;

function popoverStyle(type: string) {
  if (type === "ACCOUNT_CREATED") return { icon: PartyPopper, iconClass: "bg-primary-50 text-primary-700" };
  if (type === "ANNOUNCEMENT") return { icon: Megaphone, iconClass: "bg-amber-50 text-amber-700" };
  if (type === "REPORT_REVIEWED" || type === "REPORT_SUBMITTED") return { icon: ShieldCheck, iconClass: "bg-emerald-50 text-emerald-700" };
  if (type === "SUPPORT_REQUEST_SUBMITTED") return { icon: LifeBuoy, iconClass: "bg-sky-50 text-sky-700" };
  if (type === "SUGGESTION_SUBMITTED") return { icon: Lightbulb, iconClass: "bg-amber-50 text-amber-700" };
  return { icon: Bell, iconClass: "bg-[#EFEEFB] text-[#4338CA]" };
}

export function NotificationsPopover() {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const { notifications, isLoadingNotifications, markAsRead, markAllAsRead, isMarkingAllAsRead, queue } = useModeration();
  const [isOpen, setIsOpen] = useState(false);
  const [routingMessage, setRoutingMessage] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sortedNotifications = [...(notifications as Notification[])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const unreadCount = sortedNotifications.filter((notification) => !notification.read_at).length;
  const recentNotifications = sortedNotifications.slice(0, RECENT_NOTIFICATION_LIMIT);
  const hiddenUnreadCount = sortedNotifications.slice(RECENT_NOTIFICATION_LIMIT).filter((notification) => !notification.read_at).length;

  const handleMarkRead = (id: string) => {
    void markAsRead(id).catch((error) => console.error("Failed to mark notification as read", error));
  };

  const openNotification = (notification: Notification) => {
    if (!notification.read_at) handleMarkRead(notification.id);
    const destination = user?.role === "ADMIN" ? adminNotificationDestination(notification, queue) : userNotificationDestination(notification);
    if (destination) {
      setIsOpen(false);
      navigate(destination);
    } else {
      setRoutingMessage("This update has no linked page, but it has been marked as read.");
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
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
      <button type="button" onClick={() => setIsOpen((value) => !value)} aria-haspopup="menu" aria-expanded={isOpen} aria-label="Notifications" className="nav-item relative flex h-10 w-10 items-center justify-center border border-border focus-visible:outline-none">
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#C14634] px-1 text-[10px] font-bold text-white shadow-sm" aria-label={`${unreadCount} unread notifications`}>{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>

      {isOpen && (
        <div role="menu" aria-label="Recent notifications" className="menu-surface fixed inset-x-3 top-16 z-50 motion-safe:animate-panel-enter sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-96">
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-surface-muted px-4 py-3">
            <div><p className="text-sm font-bold text-slate-700 dark:text-slate-200">Notifications</p><p className="text-[11px] text-slate-500 dark:text-slate-400">{unreadCount} unread</p></div>
            {unreadCount > 0 && <button type="button" disabled={isMarkingAllAsRead} onClick={() => void markAllAsRead().catch((error) => console.error("Failed to mark all notifications as read", error))} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-primary-600 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50 dark:text-primary-400 dark:hover:bg-[#30295D]"><CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />Mark all read</button>}
          </div>
          {routingMessage && <p role="status" className="border-b border-primary-100 bg-primary-50 px-4 py-2 text-xs text-primary-800">{routingMessage}</p>}

          <div className="max-h-[min(26rem,70vh)] divide-y divide-[#F4F3FB] overflow-y-auto dark:divide-[#2E2A54]">
            {isLoadingNotifications ? <p className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">Loading...</p> : recentNotifications.length === 0 ? <p className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">No notifications yet.</p> : recentNotifications.map((notification) => {
              const style = user?.role === "ADMIN" ? popoverStyle(notification.type) : userNotificationPresentation(notification.type);
              const Icon = style.icon;
              const isUnread = !notification.read_at;
              const categoryLabel = user?.role === "ADMIN" ? notificationCategoryLabel(notification.type) : userNotificationPresentation(notification.type).label;
              return (
                <div key={notification.id} className={`relative flex items-start gap-3 px-4 py-3 transition motion-safe:duration-150 ${isUnread ? "bg-primary-50/60 dark:bg-primary-400/10" : "bg-white dark:bg-[#1B1836]"}`}>
                  {isUnread && <span className="mt-3 h-2 w-2 shrink-0 rounded-full bg-primary-600" aria-hidden="true" />}
                  <button type="button" onClick={() => openNotification(notification)} className="group flex min-w-0 flex-1 items-start gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500" aria-label={`${notificationTitle(notification)}${isUnread ? ", unread" : ""}`}>
                    <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition motion-safe:group-hover:scale-110 ${style.iconClass}`}><Icon className="h-4 w-4" aria-hidden="true" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5"><span className="text-[9px] font-bold uppercase tracking-wide text-primary-600 dark:text-primary-400">{categoryLabel}</span>{isUnread && <span className="rounded-full bg-primary-100 px-1.5 py-0.5 text-[8px] font-bold uppercase text-primary-700">Unread</span>}</span>
                      <span className={`block truncate text-xs ${isUnread ? "font-bold text-slate-900 dark:text-white" : "font-semibold text-slate-600 dark:text-slate-300"}`}>{notificationTitle(notification)}</span>
                      <span className="mt-0.5 line-clamp-2 block text-[11px] leading-4 text-slate-500 dark:text-slate-400">{notificationMessage(notification)}</span>
                      <span className="mt-1 block text-[10px] text-slate-400">{relativeNotificationTime(notification.created_at)}</span>
                    </span>
                  </button>
                  {isUnread && <button type="button" onClick={() => handleMarkRead(notification.id)} className="shrink-0 rounded px-1 py-0.5 text-[10px] font-semibold text-primary-600 hover:bg-primary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-primary-400">Mark read</button>}
                </div>
              );
            })}
            {user?.role !== "ADMIN" && hiddenUnreadCount > 0 && (
              <Link to="/notifications?filter=unread" onClick={() => setIsOpen(false)} className="block bg-primary-50/50 px-4 py-2.5 text-center text-xs font-semibold text-primary-700 hover:bg-primary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500">
                {hiddenUnreadCount} more unread notification{hiddenUnreadCount === 1 ? "" : "s"}
              </Link>
            )}
          </div>

          <Link to={user?.role === "ADMIN" ? "/admin/notifications?section=received" : "/notifications"} onClick={() => setIsOpen(false)} className="sticky bottom-0 block border-t border-border bg-surface-raised px-4 py-2.5 text-center text-xs font-semibold text-primary-600 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 dark:text-primary-400">View all notifications</Link>
        </div>
      )}
    </div>
  );
}

export default NotificationsPopover;
