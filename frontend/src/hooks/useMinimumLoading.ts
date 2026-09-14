import { useEffect, useState } from "react";

/**
 * Keeps a real loading state visible for at least `minimumMs` after the
 * component mounts. If the request takes longer, the skeleton remains until
 * the request finishes.
 */
export function useMinimumLoading(isLoading: boolean, minimumMs = 2000) {
  const [minimumElapsed, setMinimumElapsed] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setMinimumElapsed(true), minimumMs);
    return () => window.clearTimeout(timer);
  }, [minimumMs]);

  return isLoading || !minimumElapsed;
}
