import { useEffect, useRef, useCallback } from "react";

const POLL_INTERVAL = 30_000; // 30 seconds

/**
 * Auto-refreshes data on an interval. Returns a manual refresh trigger.
 * The refresh is silent (no loading spinners).
 */
export function useAutoRefresh(refreshFn: () => Promise<void>) {
  const fnRef = useRef(refreshFn);
  fnRef.current = refreshFn;

  const refresh = useCallback(() => {
    fnRef.current();
  }, []);

  useEffect(() => {
    const id = setInterval(() => fnRef.current(), POLL_INTERVAL);
    return () => clearInterval(id);
  }, []);

  return refresh;
}
