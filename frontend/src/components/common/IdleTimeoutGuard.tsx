import { useCallback, useEffect, useRef, useState } from "react";
import { useLogout } from "../../hooks/useAuth";

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "wheel", "touchstart", "scroll"] as const;

// Security-conscious defaults for a platform often used on shared/lab
// computers: warn after 90s of inactivity, sign out 30s later if there's
// still no activity (2 minutes total). Any mouse/keyboard/touch/scroll
// activity — including just moving toward the warning dialog's button —
// cancels the countdown and restarts the idle clock.
const WARNING_AFTER_MS = 90_000;
const LOGOUT_AFTER_MS = 120_000;
const COUNTDOWN_SECONDS = Math.round((LOGOUT_AFTER_MS - WARNING_AFTER_MS) / 1000);

/**
 * Mounted once inside DashboardLayout, so it's alive for every
 * authenticated page and nowhere else. A full logout (not just a client
 * redirect) so the refresh-token cookie is actually revoked — an
 * unattended device can't be "un-idled" from the back button.
 */
export function IdleTimeoutGuard() {
  const logout = useLogout();
  const [warningVisible, setWarningVisible] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const warningTimer = useRef<ReturnType<typeof setTimeout>>();
  const logoutTimer = useRef<ReturnType<typeof setTimeout>>();
  const tickTimer = useRef<ReturnType<typeof setInterval>>();

  const clearAllTimers = useCallback(() => {
    clearTimeout(warningTimer.current);
    clearTimeout(logoutTimer.current);
    clearInterval(tickTimer.current);
  }, []);

  const handleTimeout = useCallback(() => {
    clearAllTimers();
    setWarningVisible(false);
    logout.mutate("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearAllTimers]);

  const showWarning = useCallback(() => {
    setSecondsLeft(COUNTDOWN_SECONDS);
    setWarningVisible(true);
    tickTimer.current = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    logoutTimer.current = setTimeout(handleTimeout, LOGOUT_AFTER_MS - WARNING_AFTER_MS);
  }, [handleTimeout]);

  const resetIdleTimer = useCallback(() => {
    clearAllTimers();
    setWarningVisible(false);
    warningTimer.current = setTimeout(showWarning, WARNING_AFTER_MS);
  }, [clearAllTimers, showWarning]);

  useEffect(() => {
    resetIdleTimer();
    const handleActivity = () => resetIdleTimer();
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, handleActivity, { passive: true }));
    return () => {
      clearAllTimers();
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, handleActivity));
    };
    // Intentionally mount-only: re-subscribing 6 window listeners on
    // every render (which recreating this effect on every state change
    // would cause) is unnecessary — the closures below stay valid.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!warningVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60" aria-hidden="true" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="idle-warning-title"
        className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
      >
        <h2 id="idle-warning-title" className="text-lg font-semibold text-slate-900">
          Still there?
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          For your security, you&apos;ll be signed out in{" "}
          <span className="font-semibold text-slate-900">{secondsLeft}s</span> due to inactivity.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleTimeout}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            Sign out now
          </button>
          <button
            type="button"
            onClick={resetIdleTimer}
            className="rounded-full bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            I&apos;m still here
          </button>
        </div>
      </div>
    </div>
  );
}
