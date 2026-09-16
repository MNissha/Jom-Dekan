import type { LucideIcon } from "lucide-react";
import { Bell, BookOpen, BriefcaseBusiness, LifeBuoy, Megaphone, MessageCircle, PartyPopper, ShieldCheck, UserRound } from "lucide-react";
import type { Notification } from "../types/moderation";

export type UserNotificationCategory = "all" | "unread" | "announcements" | "reports" | "marketplace" | "community" | "resources" | "account" | "requests";

export interface NotificationPresentation {
  category: Exclude<UserNotificationCategory, "all" | "unread">;
  label: string;
  icon: LucideIcon;
  iconClass: string;
  accentClass: string;
  badgeClass: string;
  unreadClass: string;
}

export function userNotificationPresentation(type: string): NotificationPresentation {
  if (type === "ANNOUNCEMENT") return { category: "announcements", label: "Announcement", icon: Megaphone, iconClass: "bg-amber-50 text-amber-700 ring-amber-100", accentClass: "from-amber-400 to-orange-400", badgeClass: "bg-amber-50 text-amber-700", unreadClass: "bg-amber-50/45" };
  if (type === "REPORT_REVIEWED" || type === "COMMENT_MODERATED") return { category: "reports", label: "Report update", icon: ShieldCheck, iconClass: "bg-emerald-50 text-emerald-700 ring-emerald-100", accentClass: "from-emerald-400 to-teal-500", badgeClass: "bg-emerald-50 text-emerald-700", unreadClass: "bg-emerald-50/40" };
  if (type.startsWith("OPPORTUNITY_") || type.startsWith("TUTORING_") || type.startsWith("FREELANCE_")) return { category: "marketplace", label: type.includes("APPLICATION") ? "Application" : "Marketplace", icon: BriefcaseBusiness, iconClass: "bg-violet-50 text-violet-700 ring-violet-100", accentClass: "from-violet-400 to-primary-600", badgeClass: "bg-violet-50 text-violet-700", unreadClass: "bg-violet-50/50" };
  if (type.startsWith("FORUM_") || type.includes("REPLY") || type.includes("MENTION")) return { category: "community", label: type.includes("MENTION") ? "Mention" : "Community", icon: MessageCircle, iconClass: "bg-blue-50 text-blue-700 ring-blue-100", accentClass: "from-blue-400 to-indigo-500", badgeClass: "bg-blue-50 text-blue-700", unreadClass: "bg-blue-50/40" };
  if (type.startsWith("RESOURCE_")) return { category: "resources", label: "Resource update", icon: BookOpen, iconClass: "bg-teal-50 text-teal-700 ring-teal-100", accentClass: "from-teal-400 to-cyan-500", badgeClass: "bg-teal-50 text-teal-700", unreadClass: "bg-teal-50/40" };
  if (type.startsWith("TAXONOMY_") || type.startsWith("SUBJECT_") || type.startsWith("SUPPORT_")) return { category: "requests", label: type.startsWith("SUPPORT_") ? "Support" : "Request update", icon: LifeBuoy, iconClass: "bg-cyan-50 text-cyan-700 ring-cyan-100", accentClass: "from-cyan-400 to-sky-500", badgeClass: "bg-cyan-50 text-cyan-700", unreadClass: "bg-cyan-50/40" };
  if (type === "ACCOUNT_CREATED") return { category: "account", label: "Welcome", icon: PartyPopper, iconClass: "bg-primary-50 text-primary-700 ring-primary-100", accentClass: "from-primary-400 to-primary-600", badgeClass: "bg-primary-50 text-primary-700", unreadClass: "bg-primary-50/50" };
  if (type.startsWith("ACCOUNT_") || type.startsWith("SECURITY_")) return { category: "account", label: type.startsWith("SECURITY_") ? "Security" : "Account", icon: UserRound, iconClass: "bg-indigo-50 text-indigo-700 ring-indigo-100", accentClass: "from-indigo-400 to-primary-600", badgeClass: "bg-indigo-50 text-indigo-700", unreadClass: "bg-indigo-50/40" };
  return { category: "account", label: "Update", icon: Bell, iconClass: "bg-[#EFEEFB] text-[#4338CA] ring-[#E3E0FA]", accentClass: "from-[#6D5CE7] to-[#4338CA]", badgeClass: "bg-[#EFEEFB] text-[#4338CA]", unreadClass: "bg-primary-50/40" };
}

export function userNotificationDestination(notification: Notification): string | null {
  const payload = notification.payload;
  const presentation = userNotificationPresentation(notification.type);
  if (presentation.category === "marketplace" && typeof payload.opportunityId === "string") {
    const type = payload.listingType === "TUTORING" ? "&type=TUTORING" : "";
    return `/marketplace?listing=${encodeURIComponent(payload.opportunityId)}${type}`;
  }
  if (presentation.category === "community" && typeof payload.postId === "string") return `/forum/${encodeURIComponent(payload.postId)}`;
  if (presentation.category === "resources" && typeof payload.resourceId === "string") return `/resources/${encodeURIComponent(payload.resourceId)}`;
  if (notification.type === "ACCOUNT_CREATED" || notification.type.startsWith("ACCOUNT_") || notification.type.startsWith("SECURITY_")) return "/profile";
  if (presentation.category === "requests") return "/profile?section=contact";
  if (presentation.category === "announcements" || presentation.category === "reports") return `/notifications?filter=${presentation.category}&notification=${encodeURIComponent(notification.id)}`;
  return null;
}

export function notificationTitle(notification: Notification) {
  const title = notification.payload?.title;
  if (typeof title === "string" && title.trim()) return title;
  return userNotificationPresentation(notification.type).label;
}

export function notificationMessage(notification: Notification) {
  return typeof notification.payload?.message === "string" ? notification.payload.message : "You have a new JomDekan update.";
}

export function relativeNotificationTime(value: string, now = Date.now()) {
  const elapsedSeconds = Math.max(0, Math.floor((now - new Date(value).getTime()) / 1000));
  if (elapsedSeconds < 60) return "Just now";
  const minutes = Math.floor(elapsedSeconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(value).toLocaleDateString([], { dateStyle: "medium" });
}
