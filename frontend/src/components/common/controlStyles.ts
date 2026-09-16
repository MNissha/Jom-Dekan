export type ButtonVariant = "primary" | "secondary" | "accent" | "destructive" | "danger" | "ghost" | "link";
export type ButtonSize = "small" | "medium" | "large";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-brand-primary text-white shadow-sm hover:bg-brand-primary-hover",
  secondary: "border border-border bg-surface-card text-content-secondary shadow-sm hover:border-border-emphasis hover:bg-surface-muted hover:text-content-primary",
  accent: "bg-brand-accent text-brand-secondary shadow-sm hover:brightness-95",
  destructive: "bg-danger text-white shadow-sm hover:brightness-90",
  danger: "bg-danger text-white shadow-sm hover:brightness-90",
  ghost: "text-content-secondary hover:bg-surface-muted hover:text-content-primary",
  link: "min-h-0 rounded-md p-0 text-brand-primary underline-offset-4 hover:text-brand-primary-hover hover:underline",
};

const buttonSizes: Record<ButtonSize, string> = {
  small: "min-h-10 px-grid-3 text-caption",
  medium: "min-h-control px-grid-4 text-label",
  large: "min-h-control-lg px-grid-6 text-label",
};

export function buttonClassName({ variant = "primary", size = "medium", iconOnly = false, className = "" }: { variant?: ButtonVariant; size?: ButtonSize; iconOnly?: boolean; className?: string } = {}) {
  const iconSizes = { small: "h-10 w-10 p-0", medium: "h-control w-control p-0", large: "h-control-lg w-control-lg p-0" };
  return `interactive-control relative inline-flex shrink-0 items-center justify-center gap-grid-2 rounded-control font-label transition duration-standard ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-55 disabled:transform-none ${iconOnly ? iconSizes[size] : buttonSizes[size]} ${buttonVariants[variant]} ${className}`;
}

export function controlClassName(hasError = false, className = "") {
  return `min-h-control w-full min-w-0 rounded-control border bg-surface-card px-grid-3 py-grid-2 text-body-sm text-content-primary shadow-sm transition duration-standard ease-premium placeholder:text-content-muted focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-content-muted ${hasError ? "border-danger focus:border-danger focus:ring-danger/25" : "border-border focus:border-border-focus focus:ring-brand-primary/20"} ${className}`;
}
