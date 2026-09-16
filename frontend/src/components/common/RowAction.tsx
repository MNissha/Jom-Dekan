import type { ReactElement } from "react";

// Same square icon-button look as AdminUsers' management column — reused
// across the taxonomy admin tables (universities/faculties/programmes/
// subjects) so every admin table's row actions look and behave alike.
export function RowAction({
  title,
  onClick,
  className,
  disabled,
  children,
}: {
  title: string;
  onClick: () => void;
  className: string;
  disabled?: boolean;
  children: ReactElement<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-control border p-2 transition duration-fast hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export default RowAction;
