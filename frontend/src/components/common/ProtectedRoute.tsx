import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const user = useAuthStore((s) => s.user);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const sessionCheckFailed = useAuthStore((s) => s.sessionCheckFailed);
  const retrySessionCheck = useAuthStore((s) => s.retrySessionCheck);

  if (!isInitialized) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-live="polite">
        <span className="text-slate-500">Loading…</span>
      </div>
    );
  }

  // A transient failure (network blip, rate limit, 5xx) while checking
  // for an existing session is not the same as "not logged in" — offer
  // a retry instead of silently bouncing a real session to /login.
  if (!user && sessionCheckFailed) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 text-center" role="alert">
        <p className="text-slate-600">Couldn&apos;t verify your session. Check your connection and try again.</p>
        <button
          type="button"
          onClick={retrySessionCheck}
          className="rounded-full bg-primary-600 px-5 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && user.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
