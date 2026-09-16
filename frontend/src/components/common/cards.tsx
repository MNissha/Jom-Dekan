import type { HTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export type CardCategory =
  | "static"
  | "interactive"
  | "stat"
  | "resource"
  | "forum-post"
  | "comment"
  | "tutor"
  | "opportunity"
  | "conversation"
  | "booking"
  | "admin-summary"
  | "admin-table";

const categoryClasses: Record<CardCategory, string> = {
  static: "card-static",
  interactive: "card-interactive",
  stat: "card-static card-stat",
  resource: "card-interactive card-resource",
  "forum-post": "card-interactive card-forum-post",
  comment: "card-static card-comment",
  tutor: "card-interactive card-tutor",
  opportunity: "card-interactive card-opportunity",
  conversation: "card-interactive card-conversation",
  booking: "card-static card-booking",
  "admin-summary": "card-static card-admin-summary",
  "admin-table": "card-static admin-table-container",
};

// Kept beside the category contract so semantic class composition has one source.
// eslint-disable-next-line react-refresh/only-export-components
export function cardClassName(category: CardCategory = "static", className = "") {
  return `card-base ${categoryClasses[category]} ${className}`;
}

export function Card({ category = "static", className = "", ...props }: HTMLAttributes<HTMLElement> & { category?: CardCategory }) {
  return <article className={cardClassName(category, className)} {...props} />;
}

export function CardHeading({ className = "", ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={`break-words text-subsection-title text-content-primary ${className}`} {...props} />;
}

export function CardMeta({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`flex min-w-0 flex-wrap items-center gap-grid-2 text-caption text-content-muted ${className}`} {...props} />;
}

export function CardFooter({ className = "", ...props }: HTMLAttributes<HTMLElement>) {
  return <footer className={`mt-grid-4 flex min-w-0 flex-wrap items-center gap-grid-2 border-t border-border-subtle pt-grid-4 ${className}`} {...props} />;
}

export type StatusTone = "neutral" | "success" | "warning" | "danger" | "info";
const statusClasses: Record<StatusTone, string> = {
  neutral: "bg-surface-muted text-content-secondary ring-border",
  success: "bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-950/60 dark:text-green-300",
  warning: "bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-950/60 dark:text-amber-200",
  danger: "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950/60 dark:text-red-300",
  info: "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950/60 dark:text-blue-300",
};

export function StatusIndicator({ children, tone = "neutral", icon: Icon, className = "" }: { children: ReactNode; tone?: StatusTone; icon?: LucideIcon; className?: string }) {
  return <span className={`inline-flex max-w-full items-center gap-grid-1 rounded-full px-2.5 py-1 text-caption font-label ring-1 ring-inset ${statusClasses[tone]} ${className}`}>{Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}<span className="truncate">{children}</span></span>;
}

export function ListSurface({ className = "", ...props }: HTMLAttributes<HTMLUListElement>) {
  return <ul className={`divide-y divide-border-subtle overflow-hidden rounded-card border border-border bg-surface-card ${className}`} {...props} />;
}

export function TableContainer({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`card-base admin-table-container overflow-x-auto p-0 ${className}`} {...props}>{children}</div>;
}

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`block animate-pulse rounded bg-surface-muted motion-reduce:animate-none ${className}`} />;
}

export function Alert({ children, tone = "info", className = "", ...props }: HTMLAttributes<HTMLDivElement> & { tone?: Exclude<StatusTone, "neutral"> }) {
  const tones = {
    success: "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/60 dark:text-green-200",
    warning: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200",
    danger: "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200",
    info: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-200",
  };
  return <div role={tone === "danger" ? "alert" : "status"} className={`rounded-control border px-grid-4 py-grid-3 text-body-sm ${tones[tone]} ${className}`} {...props}>{children}</div>;
}
