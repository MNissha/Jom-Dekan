import type { LucideIcon } from "lucide-react";
import { cardClassName, SkeletonBlock } from "../common/cards";

interface SummaryCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  isLoading?: boolean;
  // Reference rotates a distinct icon-container tint per stat card
  // (purple/amber/blue/green) rather than reusing one color everywhere —
  // defaults to the purple pair so existing callers keep working.
  iconClass?: string;
  // Staggers the reveal animation across a row of cards that all finish
  // loading on the same tick, instead of everything popping in at once.
  revealDelayMs?: number;
}

export function SummaryCard({
  icon: Icon,
  label,
  value,
  isLoading,
  iconClass = "bg-[#EFEEFB] text-[#4338CA]",
  revealDelayMs = 0,
}: SummaryCardProps) {
  return (
    <div
      className={cardClassName("stat", "flex items-center gap-grid-4")}
      aria-busy={isLoading}
    >
      <div className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[13px] ${iconClass}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-body-sm text-content-muted">{label}</p>
        {isLoading ? (
          <SkeletonBlock className="mt-grid-1 h-6 w-10" />
        ) : (
          <p
            style={{ animationDelay: `${revealDelayMs}ms` }}
            className="text-xl font-heading text-content-primary motion-safe:animate-content-enter"
          >
            {value}
          </p>
        )}
      </div>
    </div>
  );
}
