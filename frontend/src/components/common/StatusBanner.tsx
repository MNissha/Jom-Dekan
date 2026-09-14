import { CheckCircle2, X, XCircle } from "lucide-react";

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
      className={`mt-4 flex items-start justify-between gap-3 rounded-lg border px-4 py-2 text-sm ${
        isSuccess
          ? "border-green-200 bg-green-50 text-green-700"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      <span className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        {message}
      </span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded-full p-0.5 hover:bg-black/5"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
