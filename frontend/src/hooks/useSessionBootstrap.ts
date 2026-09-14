import { useEffect } from 'react';
import axios from 'axios';
import { authService } from '../service/authService';
import { useAuthStore } from '../store/useAuthStore';

const RETRY_DELAY_MS = 800;
const MAX_RETRIES = 2;

/**
 * On first app load there is no access token in memory yet (a full
 * page refresh clears it, by design — it is never persisted). This
 * silently attempts a refresh using the HTTP-only cookie so an
 * already-logged-in visitor doesn't have to log in again every time
 * they reload the page — the same "just works" feel as reloading Gmail.
 *
 * A clean 401 is the only outcome that means "not logged in" and clears
 * the session quietly. Anything else (a network blip, a 429 from a
 * shared IP, a transient 5xx) is retried a couple of times with a short
 * backoff before giving up — never treated as a logout, so a hiccup
 * during the request doesn't kick a real session out to /login.
 */
export function useSessionBootstrap(): void {
  const setSession = useAuthStore((s) => s.setSession);
  const setInitialized = useAuthStore((s) => s.setInitialized);
  const setSessionCheckFailed = useAuthStore((s) => s.setSessionCheckFailed);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  useEffect(() => {
    if (isInitialized) return;
    let cancelled = false;

    async function attempt(retriesLeft: number): Promise<void> {
      try {
        const data = await authService.refresh();
        if (!cancelled) setSession(data.accessToken, data.user);
      } catch (err) {
        if (cancelled) return;

        const status = axios.isAxiosError(err) ? err.response?.status : undefined;

        if (status === 401) {
          // No valid session cookie — that's fine, user stays logged out.
          return;
        }

        if (retriesLeft > 0) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
          if (!cancelled) return attempt(retriesLeft - 1);
        }

        setSessionCheckFailed(true);
      }
    }

    attempt(MAX_RETRIES).finally(() => {
      if (!cancelled) setInitialized();
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized]);
}
