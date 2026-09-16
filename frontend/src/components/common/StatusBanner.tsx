import { CheckCircle2, X, XCircle } from "lucide-react";
import { IconButton } from "./ui";

interface StatusBannerProps {
  type: "success" | "error";
  message: string;
  onDismiss: () => void;
}

export function StatusBanner({ type, message, onDismiss }: StatusBannerProps) {
  const isSuccess = type === "success";
  const Icon = isSuccess ? CheckCircle2 : XCircle;

  return (
    <div
      role="alert"
      className={`mt-4 flex items-start justify-between gap-3 rounded-control border px-grid-4 py-grid-3 text-body-sm motion-safe:animate-panel-enter ${
        isSuccess
          ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/60 dark:text-green-300"
          : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300"
      }`}
    >
      <span className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        {message}
      </span>
      <IconButton
        onClick={onDismiss}
        aria-label="Dismiss"
        size="small"
        variant="ghost"
        className="-m-2 shrink-0 rounded-full shadow-none hover:bg-black/5 dark:hover:bg-white/10"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </IconButton>
    </div>
  );
}
