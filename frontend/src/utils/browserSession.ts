const ACTIVE_SESSION_KEY = 'jomdekan.active-session';

export function hasActiveBrowserSession(): boolean {
  try {
    return window.sessionStorage.getItem(ACTIVE_SESSION_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markBrowserSessionActive(): void {
  try {
    window.sessionStorage.setItem(ACTIVE_SESSION_KEY, 'true');
  } catch {
    // Storage can be unavailable in hardened/private browser contexts.
  }
}

export function clearBrowserSession(): void {
  try {
    window.sessionStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch {
    // The in-memory auth state is still cleared by the caller.
  }
}
