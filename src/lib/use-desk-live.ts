import { useCallback, useEffect, useRef, useState } from "react";
import { emitHubAppLog } from "@tool-workspace/hub-ui";
import { pushDeskNotifyAlert } from "./desk-notify";
import { getDeskActiveScreen, subscribeDeskActiveScreen } from "./desk-active-screen";
import type { AppScreen } from "./app-screen";

type Options = {
  intervalMs?: number;
  scope: string;
  /** When set, poll/refresh only while this desk screen is active (no React re-render on tab leave). */
  screenId?: AppScreen;
  /** @deprecated Prefer screenId — tabActive forces keep-alive tree re-render on every switch. */
  tabActive?: boolean;
  rowStableKey?: (row: T) => string;
};

export function useDeskLive<T>(
  loader: () => Promise<T[]>,
  { intervalMs = 6000, scope, screenId, tabActive = true, rowStableKey }: Options,
) {
  const [rows, setRows] = useState<T[]>([]);
  const [error, setError] = useState<string | null>(null);
  const applied = useRef(0);
  const seq = useRef(0);
  const lastLoggedError = useRef<string | null>(null);
  const lastStableSig = useRef("");
  const tabActiveRef = useRef(tabActive);
  const pendingRows = useRef<T[] | null>(null);
  tabActiveRef.current = tabActive;

  const isActive = useCallback(() => {
    if (screenId) return getDeskActiveScreen() === screenId;
    return tabActiveRef.current;
  }, [screenId]);

  const applyRows = useCallback(
    (next: T[]) => {
      if (screenId && getDeskActiveScreen() !== screenId && applied.current > 0) {
        pendingRows.current = next;
        return;
      }
      pendingRows.current = null;
      setRows(next);
    },
    [screenId],
  );

  const refresh = useCallback(async () => {
    const id = ++seq.current;
    try {
      const next = await loader();
      if (id < applied.current) return;
      applied.current = id;
      if (rowStableKey && Array.isArray(next) && next.length > 0) {
        const sig = next.map((row) => rowStableKey(row)).join("\n");
        if (sig === lastStableSig.current) {
          setError(null);
          lastLoggedError.current = null;
          return;
        }
        lastStableSig.current = sig;
      }
      applyRows(Array.isArray(next) ? next : []);
      setError(null);
      lastLoggedError.current = null;
    } catch (err) {
      if (id < applied.current) return;
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      if (lastLoggedError.current === message) return;
      lastLoggedError.current = message;
      pushDeskNotifyAlert({
        id: `host-${scope}`,
        severity: "bad",
        label: `${scope} load failed`,
        detail: message,
        meta: { kind: "critical" },
      });
      emitHubAppLog({ scope: "P0001", screen: scope, kind: "sync", message: `${scope} load failed: ${message}` });
    }
  }, [applyRows, loader, rowStableKey, scope]);

  useEffect(() => {
    let cancelled = false;
    const runIfActive = () => {
      if (!cancelled && isActive()) void refresh();
    };
    // Mount: load once (even if inactive later — keep-alive needs initial rows).
    void refresh();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") runIfActive();
    }, intervalMs);
    const onVis = () => {
      if (document.visibilityState === "visible") runIfActive();
    };
    document.addEventListener("visibilitychange", onVis);
    const unsub = screenId
      ? subscribeDeskActiveScreen(() => {
          if (getDeskActiveScreen() === screenId) {
            if (pendingRows.current) {
              setRows(pendingRows.current);
              pendingRows.current = null;
            }
            const hasCached = applied.current > 0;
            if (hasCached) window.setTimeout(runIfActive, 0);
            else runIfActive();
          }
        })
      : () => {};
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
      unsub();
    };
  }, [intervalMs, isActive, refresh, screenId]);

  const refreshBurst = useCallback(
    (ms = 30_000, everyMs = intervalMs) => {
      void refresh();
      const deadline = Date.now() + ms;
      const burst = window.setInterval(() => {
        void refresh();
        if (Date.now() >= deadline) window.clearInterval(burst);
      }, everyMs);
    },
    [refresh, intervalMs],
  );

  return { rows, error, refresh, refreshBurst };
}
