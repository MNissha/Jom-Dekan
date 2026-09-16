import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "./ui";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  isConfirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  isConfirming = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return createPortal(
    <div className="overlay-root">
      <div
        className="overlay-backdrop"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="dialog-surface max-w-sm p-grid-6"
      >
        <h2
          id="confirm-dialog-title"
          className="text-lg font-semibold text-content-primary"
        >
          {title}
        </h2>
        <p className="mt-2 text-sm text-content-secondary">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button
            ref={cancelRef}
            onClick={onCancel}
            variant="secondary"
            className="rounded-full"
          >
            {cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            loading={isConfirming}
            loadingLabel={confirmLabel}
            variant={destructive ? "danger" : "primary"}
            className="rounded-full"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
