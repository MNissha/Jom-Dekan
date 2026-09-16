import { useEffect } from 'react';
import axios from 'axios';
import { refreshAccessToken } from '../api/axiosInstance';
import { useAuthStore } from '../store/useAuthStore';
import { hasActiveBrowserSession } from '../utils/browserSession';

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
 *
 * This goes through axiosInstance's shared single-flight
 * `refreshAccessToken` (which also sets the session on success) rather
 * than issuing its own independent /auth/refresh call. The backend
 * rotates the refresh token on every call, so two concurrent refresh
 * requests racing on the same not-yet-rotated cookie — e.g. this effect
 * running twice under React StrictMode, whose cleanup can't actually
 * abort the in-flight request — makes the backend's reuse-detection
 * logic treat the second, legitimate request as token theft and revoke
 * the whole session family, including the one the first request just
 * created. Sharing the single in-flight promise app-wide closes that race.
 */
export function useSessionBootstrap(): void {
  const setInitialized = useAuthStore((s) => s.setInitialized);
  const setSessionCheckFailed = useAuthStore((s) => s.setSessionCheckFailed);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  useEffect(() => {
    if (isInitialized) return;

    // Refreshes in the same tab retain sessionStorage; reopening JomDekan
    // after closing its tab does not. Do not silently revive that old login
    // from the longer-lived HTTP-only refresh cookie in a new tab.
    if (!hasActiveBrowserSession()) {
      setInitialized();
      return;
    }
    let cancelled = false;

    async function attempt(retriesLeft: number): Promise<void> {
      try {
        await refreshAccessToken();
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
