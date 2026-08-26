import { useEffect, useState } from "react";

/** Macrotask fallback when rAF is starved by a long sync task (large vault hydrate). */
export const HUB_DIRECTORY_CHROME_READY_FALLBACK_MS = 48;

/**
 * Visited-tab perf SSOT — after `tabActive` flips true, keep the first paint light
 * (table / shell only) and enable expensive facet counts + KPI/charts on the next frames.
 * Golden: P0020 large-vault facet defer; P0005 Orders/Customers/Products.
 *
 * Ready = first of (rAF×2 after paint) | setTimeout(FALLBACK_MS). The timeout recovers
 * when a long main-thread task delays animation frames so FilterBar / KPI stay gated
 * for many seconds.
 *
 * `rafOnly` opts out of the timeout fallback. Use it for consumers that START new work
 * on ready (mirror hydration, fetches) rather than merely un-gating deferred memos:
 * rAF starvation signals the main thread is already busy, so kicking off extra work
 * from a timer during the long task makes contention worse, not better.
 *
 * `armKey` re-arms the gate when it changes (e.g. P0020 vault sub-scope Services↔Mail):
 * without it the deferral only ever fires on tab enter, and every sub-scope switch runs
 * the full facet/KPI/chart pipeline synchronously in one commit.
 */
export function useHubDirectoryChromeReady(
  tabActive: boolean,
  opts?: { rafOnly?: boolean; armKey?: string | number },
): boolean {
  const rafOnly = opts?.rafOnly === true;
  const armKey = opts?.armKey;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!tabActive) {
      setReady(false);
      return;
    }
    // Re-arm (armKey change while active) — same light-first-paint contract as tab enter.
    setReady(false);
    let cancelled = false;
    let inner = 0;
    const mark = () => {
      if (!cancelled) setReady(true);
    };
    const outer = window.requestAnimationFrame(() => {
      inner = window.requestAnimationFrame(mark);
    });
    const fallback = rafOnly
      ? 0
      : window.setTimeout(mark, HUB_DIRECTORY_CHROME_READY_FALLBACK_MS);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(outer);
      if (inner) window.cancelAnimationFrame(inner);
      if (fallback) window.clearTimeout(fallback);
    };
  }, [tabActive, rafOnly, armKey]);

  return tabActive && ready;
}
