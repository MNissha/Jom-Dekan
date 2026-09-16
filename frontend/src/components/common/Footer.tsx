export function Footer() {
  return (
    <footer className="border-t border-border bg-surface-card px-gutter-mobile py-grid-4 text-center text-body-sm text-content-muted transition-colors motion-safe:duration-standard sm:px-gutter-tablet lg:px-gutter-desktop">
      <p>&copy; {new Date().getFullYear()} JomDekan. Built for Malaysian university students.</p>
    </footer>
  );
}
