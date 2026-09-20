import { useEffect, useState } from "react";
import { Bell, CheckCheck, SlidersHorizontal } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useModeration } from "../hooks/useModeration";
import { EmptyState } from "../components/common/EmptyState";
import type { Notification } from "../types/moderation";
import { useMinimumLoading } from "../hooks/useMinimumLoading";
import {
  notificationMessage,
  notificationTitle,
  type UserNotificationCategory,
  userNotificationDestination,
  userNotificationPresentation,
} from "../utils/notificationPresentation";

const PAGE_SIZE = 10;
const FILTERS: { value: UserNotificationCategory; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "announcements", label: "Announcements" },
  { value: "reports", label: "Reports" },
  { value: "marketplace", label: "Marketplace" },
  { value: "community", label: "Community" },
  { value: "resources", label: "Resources" },
  { value: "account", label: "Account" },
  { value: "requests", label: "Requests" },
];

function isFilter(value: string | null): value is UserNotificationCategory {
  return FILTERS.some((filter) => filter.value === value);
}

export default function Notifications() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { notifications, isLoadingNotifications, markAsRead, markAllAsRead, isMarkingAllAsRead } = useModeration();
  const showSkeleton = useMinimumLoading(isLoadingNotifications, 600);
  const activeFilter = isFilter(searchParams.get("filter")) ? searchParams.get("filter") as UserNotificationCategory : "all";
  const selectedNotificationId = searchParams.get("notification");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [routingMessage, setRoutingMessage] = useState<string | null>(null);
  const sortedNotifications = [...(notifications as Notification[])].sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
  const unreadCount = sortedNotifications.filter((notification) => !notification.read_at).length;
  const filteredNotifications = sortedNotifications.filter((notification) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "unread") return !notification.read_at;
    return userNotificationPresentation(notification.type).category === activeFilter;
  });
  const visibleNotifications = filteredNotifications.slice(0, visibleCount);

  useEffect(() => {
    if (!selectedNotificationId || showSkeleton) return;
    const selected = document.getElementById(`notification-${selectedNotificationId}`);
    selected?.scrollIntoView({ behavior: "smooth", block: "center" });
    selected?.focus({ preventScroll: true });
  }, [selectedNotificationId, showSkeleton]);

  const setFilter = (filter: UserNotificationCategory) => {
    setVisibleCount(PAGE_SIZE);
    setSearchParams(filter === "all" ? {} : { filter });
  };

  const openNotification = (notification: Notification) => {
    if (!notification.read_at) {
      void markAsRead(notification.id).catch((error) => console.error("Failed to mark notification as read", error));
    }
    const destination = userNotificationDestination(notification);
    if (destination) navigate(destination);
    else setRoutingMessage("This update has no linked page, but it has been marked as read.");
  };

  return (
    <div className="page-container page-container-standard">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-400">Your updates</p>
          <h1 className="mt-grid-1 break-words text-2xl font-heading leading-tight tracking-tight text-content-primary sm:text-page-title">Notifications</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{unreadCount} unread · announcements, report decisions, and activity updates.</p>
        </div>
        {unreadCount > 0 && (
          <button type="button" disabled={isMarkingAllAsRead} onClick={() => void markAllAsRead().catch((error) => console.error("Failed to mark all notifications as read", error))} className="inline-flex items-center gap-2 rounded-full border border-[#DCD8F7] bg-white px-4 py-2 text-sm font-semibold text-[#4338CA] shadow-sm transition motion-safe:duration-150 hover:-translate-y-0.5 hover:border-[#4338CA] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50 dark:border-[#494174] dark:bg-[#1B1836] dark:text-primary-300">
            <CheckCheck className="h-4 w-4" aria-hidden="true" />
            Mark all as read
          </button>
        )}
      </div>

      <nav className="mt-5 flex gap-2 overflow-x-auto pb-1" aria-label="Filter notifications">
        {FILTERS.map((filter) => (
          <button key={filter.value} type="button" onClick={() => setFilter(filter.value)} aria-pressed={activeFilter === filter.value} className="filter-chip shrink-0 px-3 text-xs font-bold">
            {filter.label}{filter.value === "unread" ? ` (${unreadCount})` : ""}
          </button>
        ))}
      </nav>
      {routingMessage && <p role="status" className="mt-3 rounded-xl border border-primary-100 bg-primary-50 px-4 py-3 text-sm text-primary-800">{routingMessage}</p>}

      <div className="mt-5" aria-busy={showSkeleton}>
        {showSkeleton ? (
          <div className="space-y-3" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, index) => <div key={index} className="flex items-start gap-4 rounded-[22px] border border-[#ECEBF7] bg-white px-5 py-5"><div className="h-11 w-11 shrink-0 animate-pulse rounded-2xl bg-slate-100" /><div className="min-w-0 flex-1 space-y-2"><div className="h-4 w-1/3 animate-pulse rounded bg-slate-100" /><div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" /></div></div>)}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="rounded-[22px] border border-[#ECEBF7] bg-white p-2 dark:border-[#332C63] dark:bg-[#1B1836]">
            <EmptyState icon={activeFilter === "all" ? Bell : SlidersHorizontal} title={activeFilter === "unread" ? "You're all caught up" : activeFilter === "all" ? "No notifications yet" : `No ${FILTERS.find((filter) => filter.value === activeFilter)?.label.toLowerCase()} notifications`} description={activeFilter === "unread" ? "You have no unread notifications." : "Updates in this category will appear here."} />
          </div>
        ) : (
          <>
            <ul className="space-y-3">
              {visibleNotifications.map((notification, index) => {
                const style = userNotificationPresentation(notification.type);
                const Icon = style.icon;
                const isUnread = !notification.read_at;
                const response = typeof notification.payload?.response === "string" ? notification.payload.response : null;
                const isSelected = selectedNotificationId === notification.id;
                return (
                  <li key={notification.id} id={`notification-${notification.id}`} tabIndex={-1} className={`relative overflow-hidden rounded-[22px] border shadow-sm transition motion-safe:animate-[notificationRise_320ms_ease-out_both] motion-safe:duration-200 focus:outline-none ${isUnread ? `${style.unreadClass} border-[#CFC9F5] shadow-md ring-1 ring-[#E8E5FC] dark:bg-primary-400/10` : "border-[#ECEBF7] bg-white dark:border-[#332C63] dark:bg-[#1B1836]"} ${isSelected ? "ring-2 ring-primary-500 ring-offset-2" : ""}`} style={{ animationDelay: `${Math.min(index, 8) * 55}ms` }}>
                    <span className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${style.accentClass}`} aria-hidden="true" />
                    <div className="flex items-start gap-3 p-4 pl-5 sm:gap-4 sm:p-5 sm:pl-6">
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ${style.iconClass}`}><Icon className="h-5 w-5" aria-hidden="true" /></span>
                      <button type="button" onClick={() => openNotification(notification)} className="group min-w-0 flex-1 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500" aria-label={`${notificationTitle(notification)}${isUnread ? ", unread" : ""}`}>
                        <span className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-caption font-heading uppercase tracking-wide ${style.badgeClass}`}>{style.label}</span>
                          {isUnread && <span className="inline-flex items-center gap-1 rounded-full bg-primary-600 px-2 py-1 text-caption font-heading uppercase tracking-wide text-white"><span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />Unread</span>}
                        </span>
                        <span className={`mt-2 block break-words text-base ${isUnread ? "font-extrabold text-slate-900 dark:text-white" : "font-semibold text-slate-700 dark:text-slate-300"}`}>{notificationTitle(notification)}</span>
                        <span className="mt-1 block whitespace-pre-wrap break-words text-sm leading-6 text-slate-600 dark:text-slate-400">{notificationMessage(notification)}</span>
                        {response && response !== notificationMessage(notification) && <span className="mt-3 block rounded-xl bg-white/80 px-3 py-2 text-sm leading-6 text-slate-600 ring-1 ring-[#ECEBF7] dark:bg-[#231E4A] dark:text-slate-300 dark:ring-[#3B3564]"><span className="font-semibold text-[#4338CA] dark:text-primary-300">Admin response: </span>{response}</span>}
                        <span className="mt-2 block text-xs text-slate-400">{new Date(notification.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</span>
                      </button>
                      {isUnread && <button type="button" onClick={() => void markAsRead(notification.id).catch((error) => console.error("Failed to mark notification as read", error))} className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-primary-300 dark:hover:bg-primary-400/10">Mark as read</button>}
                    </div>
                  </li>
                );
              })}
            </ul>
            {visibleCount < filteredNotifications.length && <div className="mt-5 text-center"><button type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)} className="rounded-full border border-primary-200 bg-white px-5 py-2.5 text-sm font-semibold text-primary-700 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-primary-400/30 dark:text-primary-300 dark:hover:bg-primary-400/10">Load more</button></div>}
          </>
        )}
      </div>
    </div>
  );
}
