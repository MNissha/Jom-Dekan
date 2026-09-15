import { Bell, CheckCheck, Megaphone, PartyPopper, ShieldCheck } from "lucide-react";
import { useModeration } from "../hooks/useModeration";
import { EmptyState } from "../components/common/EmptyState";
import type { Notification } from "../types/moderation";
import { useMinimumLoading } from "../hooks/useMinimumLoading";

function notificationStyle(type: string) {
  if (type === "ACCOUNT_CREATED") {
    return {
      icon: PartyPopper,
      iconClass: "bg-primary-50 text-primary-700 ring-primary-100",
      accentClass: "from-primary-400 to-primary-600",
      badge: "Welcome",
      badgeClass: "bg-primary-50 text-primary-700",
    };
  }
  if (type === "ANNOUNCEMENT") {
    return {
      icon: Megaphone,
      iconClass: "bg-amber-50 text-amber-700 ring-amber-100",
      accentClass: "from-amber-400 to-orange-400",
      badge: "Announcement",
      badgeClass: "bg-amber-50 text-amber-700",
    };
  }
  if (type === "REPORT_REVIEWED") {
    return {
      icon: ShieldCheck,
      iconClass: "bg-emerald-50 text-emerald-700 ring-emerald-100",
      accentClass: "from-emerald-400 to-teal-500",
      badge: "Report update",
      badgeClass: "bg-emerald-50 text-emerald-700",
    };
  }
  return {
    icon: Bell,
    iconClass: "bg-[#EFEEFB] text-[#4338CA] ring-[#E3E0FA]",
    accentClass: "from-[#6D5CE7] to-[#4338CA]",
    badge: "Update",
    badgeClass: "bg-[#EFEEFB] text-[#4338CA]",
  };
}

function fallbackTitle(type: string) {
  return type
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export default function Notifications() {
  const { notifications, isLoadingNotifications, markAsRead } = useModeration();
  const showSkeleton = useMinimumLoading(isLoadingNotifications, 2000);
  const unread = notifications.filter((notification: Notification) => !notification.read_at);

  function handleMarkAllRead() {
    unread.forEach((notification: Notification) => markAsRead(notification.id));
  }

  return (
    <div className="mx-auto max-w-6xl px-[18px] py-[22px]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-400">Your updates</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Notifications</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {unread.length} unread · announcements, report decisions, and activity updates.
          </p>
        </div>
        {unread.length > 0 && (
          <button type="button" onClick={handleMarkAllRead} className="inline-flex items-center gap-2 rounded-full border border-[#DCD8F7] bg-white px-4 py-2 text-sm font-semibold text-[#4338CA] shadow-sm transition motion-safe:duration-150 hover:-translate-y-0.5 hover:border-[#4338CA] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
            <CheckCheck className="h-4 w-4" aria-hidden="true" />
            Mark all as read
          </button>
        )}
      </div>

      <div className="mt-6" aria-busy={showSkeleton}>
        {showSkeleton ? (
          <div className="space-y-3" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-start gap-4 rounded-[22px] border border-[#ECEBF7] bg-white px-5 py-5">
                <div className="h-11 w-11 shrink-0 animate-pulse rounded-2xl bg-slate-100" />
                <div className="min-w-0 flex-1 space-y-2"><div className="h-4 w-1/3 animate-pulse rounded bg-slate-100" /><div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" /></div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-[22px] border border-[#ECEBF7] bg-white p-2">
            <EmptyState icon={Bell} title="No notifications yet" description="Announcements, report decisions, and other updates will appear here." />
          </div>
        ) : (
          <ul className="space-y-3">
            {notifications.map((notification: Notification, index: number) => {
              const style = notificationStyle(notification.type);
              const Icon = style.icon;
              const title = typeof notification.payload?.title === "string" && notification.payload.title.trim()
                ? notification.payload.title
                : fallbackTitle(notification.type);
              const description = typeof notification.payload?.message === "string"
                ? notification.payload.message
                : "You have a new JomDekan update.";
              const response = typeof notification.payload?.response === "string"
                ? notification.payload.response
                : null;

              return (
                <li key={notification.id} className="motion-safe:animate-[notificationRise_320ms_ease-out_both]" style={{ animationDelay: `${Math.min(index, 8) * 55}ms` }}>
                  <button type="button" onClick={() => !notification.read_at && markAsRead(notification.id)} className={`group relative flex w-full items-start gap-4 overflow-hidden rounded-[22px] border bg-white px-5 py-5 text-left shadow-sm transition motion-safe:duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${notification.read_at ? "border-[#ECEBF7]" : "border-[#CFC9F5] ring-1 ring-[#E8E5FC]"}`}>
                    <span className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${style.accentClass}`} aria-hidden="true" />
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 transition motion-safe:duration-200 group-hover:scale-110 group-hover:rotate-3 ${style.iconClass}`}>
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${style.badgeClass}`}>{style.badge}</span>
                      <span className={`mt-2 block text-base ${notification.read_at ? "font-semibold text-slate-700" : "font-bold text-slate-900"}`}>{title}</span>
                      <span className="mt-1 block whitespace-pre-wrap text-sm leading-6 text-slate-600">{description}</span>
                      {response && response !== description && (
                        <span className="mt-3 block rounded-xl bg-[#F8F8FD] px-3 py-2 text-sm leading-6 text-slate-600"><span className="font-semibold text-[#4338CA]">Admin response: </span>{response}</span>
                      )}
                      <span className="mt-2 block text-xs text-slate-400">{new Date(notification.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</span>
                    </span>
                    {!notification.read_at && <span className="mt-1.5 h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-[#F5C21A] ring-4 ring-amber-100" aria-label="Unread" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
