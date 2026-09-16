import {
  forwardRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { LoaderCircle } from "lucide-react";
import { buttonClassName, type ButtonSize, type ButtonVariant } from "./controlStyles";

type ContainerSize = "reading" | "standard" | "wide" | "dashboard" | "full";

export function PageContainer({
  children,
  size,
  wide = false,
  className = "",
}: {
  children: ReactNode;
  size?: ContainerSize;
  /** @deprecated Prefer size="wide". Retained while pages migrate. */
  wide?: boolean;
  className?: string;
}) {
  const resolvedSize = size ?? (wide ? "wide" : "standard");
  return (
    <div className={`page-container page-container-${resolvedSize} ${className}`}>
      {children}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  align = "start",
  className = "",
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  align?: "start" | "center";
  className?: string;
}) {
  return (
    <header className={`${align === "center" ? "text-center" : "flex flex-col justify-between gap-grid-4 sm:flex-row sm:items-end"} mb-grid-6 min-w-0 ${className}`}>
      <div className="min-w-0">
        {eyebrow && <p className="text-overline uppercase text-brand-primary">{eyebrow}</p>}
        <h1 className="mt-grid-1 break-words text-2xl font-heading leading-tight tracking-tight text-content-primary sm:text-page-title">{title}</h1>
        {description && <div className={`${align === "center" ? "mx-auto" : ""} mt-grid-1 max-w-2xl break-words text-body-sm text-content-muted sm:text-body`}>{description}</div>}
      </div>
      {actions && <div className={`${align === "center" ? "mt-grid-6 justify-center" : "shrink-0"} flex min-w-0 flex-wrap items-center gap-grid-2`}>{actions}</div>}
    </header>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  actions,
  className = "",
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={`flex min-w-0 flex-col justify-between gap-grid-3 sm:flex-row sm:items-start ${className}`}>
      <div className="min-w-0">
        {eyebrow && <p className="text-overline uppercase text-brand-primary">{eyebrow}</p>}
        <h2 className="break-words text-section-title text-content-primary">{title}</h2>
        {description && <div className="mt-grid-1 max-w-2xl break-words text-body-sm text-content-secondary">{description}</div>}
      </div>
      {actions && <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-grid-2">{actions}</div>}
    </header>
  );
}

export function ContentStack({
  children,
  spacing = "default",
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & { spacing?: "compact" | "default" | "comfortable" }) {
  const spaces = { compact: "gap-grid-3", default: "gap-grid-6", comfortable: "gap-grid-8" };
  return <div className={`flex min-w-0 flex-col ${spaces[spacing]} ${className}`} {...props}>{children}</div>;
}

export function ResponsiveGrid({
  children,
  columns = 3,
  gap = "default",
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & { columns?: 2 | 3 | 4; gap?: "compact" | "default" | "comfortable" }) {
  const columnClasses = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
  };
  const gapClasses = { compact: "gap-grid-3", default: "gap-grid-4", comfortable: "gap-grid-6" };
  return <div className={`grid min-w-0 grid-cols-1 ${columnClasses[columns]} ${gapClasses[gap]} ${className}`} {...props}>{children}</div>;
}

export function SectionCard({
  children,
  padding = "default",
  className = "",
  ...props
}: HTMLAttributes<HTMLElement> & { padding?: "compact" | "default" | "spacious" }) {
  const paddings = {
    compact: "p-grid-4",
    default: "p-grid-4 sm:p-grid-6",
    spacious: "p-grid-6 sm:p-grid-8",
  };
  return <section className={`surface-card min-w-0 overflow-wrap-anywhere rounded-card ${paddings[padding]} ${className}`} {...props}>{children}</section>;
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingLabel?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({
  variant = "primary",
  size = "medium",
  loading = false,
  loadingLabel = "Loading",
  disabled,
  children,
  className = "",
  type = "button",
  ...props
}, ref) {
  const isDisabled = disabled || loading;
  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={buttonClassName({ variant, size, className })}
      {...props}
    >
      <span className={loading ? "invisible inline-flex items-center gap-grid-2" : "inline-flex items-center gap-grid-2"}>{children}</span>
      {loading && <span className="absolute inset-0 flex items-center justify-center" aria-label={loadingLabel}><LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /></span>}
    </button>
  );
});

export interface IconButtonProps extends Omit<ButtonProps, "children" | "aria-label"> {
  "aria-label": string;
  children: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton({
  variant = "ghost",
  size = "medium",
  loading = false,
  disabled,
  children,
  className = "",
  type = "button",
  ...props
}, ref) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClassName({ variant, size, iconOnly: true, className })}
      {...props}
    >
      <span className={loading ? "invisible" : "inline-flex"}>{children}</span>
      {loading && <LoaderCircle className="absolute h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
    </button>
  );
});

export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "success" | "warning" | "danger" | "info" | "neutral" }) {
  const tones = {
    success: "bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-950/50 dark:text-green-300",
    warning: "bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-950/50 dark:text-amber-200",
    danger: "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950/50 dark:text-red-300",
    info: "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950/50 dark:text-blue-300",
    neutral: "bg-surface-muted text-content-secondary ring-border-default",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${tones[tone]}`}>{children}</span>;
}
