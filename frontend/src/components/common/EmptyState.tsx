import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { buttonClassName } from "./controlStyles";
import { cardClassName } from "./cards";

interface EmptyStateAction {
  label: string;
  to: string;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  children?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  children,
}: EmptyStateProps) {
  return (
    <div className={cardClassName("static", "flex flex-col items-center px-grid-6 py-grid-12 text-center")}>
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary-soft text-brand-primary">
        <Icon className="h-7 w-7" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-content-primary">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-content-muted">{description}</p>
      {(primaryAction || secondaryAction) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {primaryAction && (
            <Link
              to={primaryAction.to}
              className={buttonClassName({ variant: "primary", className: "rounded-full" })}
            >
              {primaryAction.label}
            </Link>
          )}
          {secondaryAction && (
            <Link
              to={secondaryAction.to}
              className={buttonClassName({ variant: "secondary", className: "rounded-full" })}
            >
              {secondaryAction.label}
            </Link>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
