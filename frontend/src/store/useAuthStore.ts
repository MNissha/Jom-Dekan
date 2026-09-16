import { create } from 'zustand';
import { clearBrowserSession, markBrowserSessionActive } from '../utils/browserSession';

interface AuthUser {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  /** True once the initial silent-refresh attempt on app load has resolved. */
  isInitialized: boolean;
  /**
   * True when the initial session check couldn't be completed (network
   * blip, rate limit, 5xx) — as opposed to a clean 401 meaning "not
   * logged in". Lets the UI offer a retry instead of bouncing an
   * already-logged-in student straight to /login on every reload hiccup.
   */
  sessionCheckFailed: boolean;
  setSession: (accessToken: string, user: AuthUser) => void;
  clearSession: () => void;
  setInitialized: () => void;
  setSessionCheckFailed: (failed: boolean) => void;
  retrySessionCheck: () => void;
}

/**
 * Client-only session state. The access token deliberately lives here
 * (in-memory, never persisted as readable token data) rather
 * than as TanStack Query data — it is not server data to cache, it is
 * ephemeral UI/session state, and Zustand is reserved for exactly this
 * per the architecture guide.
 *
 * The refresh token never touches JavaScript at all: it lives only in
 * the HTTP-only cookie set by the backend.
 */
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isInitialized: false,
  sessionCheckFailed: false,
  setSession: (accessToken, user) => {
    markBrowserSessionActive();
    set({ accessToken, user, sessionCheckFailed: false });
  },
  clearSession: () => {
    clearBrowserSession();
    set({ accessToken: null, user: null });
  },
  setInitialized: () => set({ isInitialized: true }),
  setSessionCheckFailed: (failed) => set({ sessionCheckFailed: failed }),
  // Re-arms the bootstrap effect (useSessionBootstrap only runs while
  // !isInitialized) so the "Retry" button can re-attempt the same
  // silent refresh instead of forcing a full page reload.
  retrySessionCheck: () => set({ isInitialized: false, sessionCheckFailed: false }),
}));
