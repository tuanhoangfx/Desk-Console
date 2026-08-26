import { useCallback, useEffect, useRef, useState } from "react";
import { emitHubAppLog } from "@tool-workspace/hub-ui";
import { pushDeskNotifyAlert } from "./desk-notify";

type Options = { intervalMs?: number; scope: string; tabActive?: boolean };

export function useDeskLive<T>(loader: () => Promise<T[]>, { intervalMs = 6000, scope, tabActive = true }: Options) {
  const [rows, setRows] = useState<T[]>([]);
  const [error, setError] = useState<string | null>(null);
  const applied = useRef(0);
  const seq = useRef(0);

  const refresh = useCallback(async () => {
    const id = ++seq.current;
    try {
      const next = await loader();
      if (id < applied.current) return;
      applied.current = id;
      setRows(Array.isArray(next) ? next : []);
      setError(null);
    } catch (err) {
      if (id < applied.current) return;
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      pushDeskNotifyAlert({
        id: `host-${scope}`,
        severity: "bad",
        label: `${scope} load failed`,
        detail: message,
        meta: { kind: "critical" },
      });
      emitHubAppLog({ scope: "P0001", screen: scope, kind: "sync", message: `${scope} load failed: ${message}` });
    }
  }, [loader, scope]);

  useEffect(() => {
    if (!tabActive) return;
    void refresh();
    const tick = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const timer = window.setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [intervalMs, refresh, tabActive]);

  return { rows, error, refresh };
}
