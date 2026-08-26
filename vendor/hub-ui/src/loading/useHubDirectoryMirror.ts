import { useCallback, useEffect, useRef, useState } from "react";
import { useHubDirectoryBoot } from "./useHubDirectoryBoot";

export type DirectoryFetchOptions = {
  silent?: boolean;
};

export type HubDirectoryMirrorOptions<T> = {
  readMirror: () => T[];
  mirrorChangeEvent: string;
  fetchDirectory: (opts?: DirectoryFetchOptions) => Promise<T[]>;
  tabActive: boolean;
  registerRefresh: (listener: () => void | Promise<void>) => () => void;
  setLastError?: (message: string | null) => void;
  onRowsLoaded?: (rows: T[]) => void;
  ensureSync?: () => () => void;
  mapMirror?: (rows: T[]) => T[];
  revalidateCooldownMs?: number;
};

const DEFAULT_REVALIDATE_COOLDOWN_MS = 30_000;

/**
 * Remote directory mirror boot — P0020 Mail perf parity for Supabase directories.
 * Cache-first paint → boot gate on cold miss → silent revalidate.
 */
export function useHubDirectoryMirror<T>({
  readMirror,
  mirrorChangeEvent,
  fetchDirectory,
  tabActive,
  registerRefresh,
  setLastError,
  onRowsLoaded,
  ensureSync,
  mapMirror,
  revalidateCooldownMs = DEFAULT_REVALIDATE_COOLDOWN_MS,
}: HubDirectoryMirrorOptions<T>) {
  const readMirrorRef = useRef(readMirror);
  readMirrorRef.current = readMirror;

  const normalize = useCallback(
    (rows: T[]) => (mapMirror ? mapMirror(rows) : rows),
    [mapMirror],
  );

  // Lazy init — mapping the full mirror is O(n) (normalizeCustomerRow × all rows).
  // Computing it inline every render re-maps the entire directory on unrelated
  // re-renders (checkbox toggle, hover), adding input lag on large tables. The
  // initializer runs once; boot readiness is a mount-time snapshot.
  const [rows, setRows] = useState<T[]>(() => normalize(readMirror()));
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const [loading, setLoading] = useState(false);
  const [revalidating, setRevalidating] = useState(false);
  const revalidatingRef = useRef(false);
  revalidatingRef.current = revalidating;
  const [fetchSettled, setFetchSettled] = useState(() => readMirror().length > 0);
  const initialReadyRef = useRef(rows.length > 0);
  const { directoryBootReady, settleBoot, beginBootGate, bootedRef } = useHubDirectoryBoot({
    initialReady: initialReadyRef.current,
  });
  const bootSyncDoneRef = useRef(false);
  const lastFetchAtRef = useRef(0);
  const tabActiveRef = useRef(tabActive);
  tabActiveRef.current = tabActive;
  const pendingRowsApplyRef = useRef(false);

  const commitRows = useCallback(
    (next: T[]) => {
      pendingRowsApplyRef.current = false;
      setRows(next);
      onRowsLoaded?.(next);
      if (next.length > 0) settleBoot();
    },
    [onRowsLoaded, settleBoot],
  );

  const applyRows = useCallback(
    (next: T[]) => {
      if (revalidatingRef.current && next.length > 0 && next.length < rowsRef.current.length) return;
      rowsRef.current = next;
      if (!tabActiveRef.current) {
        pendingRowsApplyRef.current = true;
        return;
      }
      commitRows(next);
    },
    [commitRows],
  );

  const syncFromMirror = useCallback(() => {
    const next = normalize(readMirrorRef.current());
    if (next.length === 0 && rowsRef.current.length > 0) return;
    // Keep stale full cache visible during silent revalidate (progressive mirror warm parity).
    if (revalidatingRef.current && next.length > 0 && next.length < rowsRef.current.length) return;
    applyRows(next);
  }, [applyRows, normalize]);

  const load = useCallback(
    async (opts?: DirectoryFetchOptions) => {
      const silent = opts?.silent ?? false;
      const mirrorCount = readMirrorRef.current().length;
      const needsGate = !silent && mirrorCount === 0 && !bootedRef.current;

      if (tabActiveRef.current) {
        if (silent) {
          setRevalidating(true);
        } else {
          setLoading(true);
          if (needsGate) beginBootGate();
        }
      }

      setLastError?.(null);
      try {
        const next = normalize(await fetchDirectory(opts));
        applyRows(next);
        lastFetchAtRef.current = Date.now();
        setFetchSettled(true);
      } catch (error) {
        setFetchSettled(true);
        if (!silent) {
          setLastError?.(error instanceof Error ? error.message : "Failed to load directory");
          applyRows([]);
        }
      } finally {
        if (tabActiveRef.current) {
          if (silent) {
            setRevalidating(false);
          } else {
            setLoading(false);
          }
        }
        settleBoot();
      }
    },
    [applyRows, beginBootGate, bootedRef, fetchDirectory, normalize, setLastError, settleBoot],
  );

  const reload = useCallback(() => load(), [load]);
  const revalidateSilent = useCallback(() => load({ silent: true }), [load]);

  useEffect(() => {
    syncFromMirror();

    const onMirror = () => syncFromMirror();
    window.addEventListener(mirrorChangeEvent, onMirror);
    const unreg = registerRefresh(reload);
    const releaseSync = ensureSync?.();

    // Heal stale data after returning to a backgrounded tab (e.g. a bulk
    // server-side change ran elsewhere). Cheap silent delta-fetch, cooldown-gated.
    // visibilitychange only — a window `focus` listener additionally fired on every
    // app-window switch and stacked one silent fetch per mounted directory (lag).
    const revalidateOnVisible = () => {
      if (!tabActiveRef.current) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      if (Date.now() - lastFetchAtRef.current <= revalidateCooldownMs) return;
      void load({ silent: true });
    };
    document.addEventListener("visibilitychange", revalidateOnVisible);

    return () => {
      releaseSync?.();
      window.removeEventListener(mirrorChangeEvent, onMirror);
      document.removeEventListener("visibilitychange", revalidateOnVisible);
      unreg();
    };
  }, [ensureSync, load, mirrorChangeEvent, registerRefresh, reload, revalidateCooldownMs, syncFromMirror]);

  useEffect(() => {
    if (!tabActive) return;

    if (pendingRowsApplyRef.current) {
      commitRows(rowsRef.current);
    }

    syncFromMirror();

    const hasCache = readMirrorRef.current().length > 0 || rowsRef.current.length > 0 || bootedRef.current;
    const neverFetched = lastFetchAtRef.current === 0;
    const stale = Date.now() - lastFetchAtRef.current > revalidateCooldownMs;

    if (hasCache) {
      // Defer silent reconcile so tab-switch paint is not competed by network
      // (prefetch / hover warm already filled mirror; lastFetchAt stays 0 until load()).
      const delayMs = neverFetched
        ? Math.min(2_500, revalidateCooldownMs)
        : stale
          ? 350
          : 0;
      if (!neverFetched && !stale) return;
      const timer = window.setTimeout(() => {
        void load({ silent: true });
      }, delayMs);
      return () => window.clearTimeout(timer);
    }

    if (!bootSyncDoneRef.current) {
      bootSyncDoneRef.current = true;
      void load({ silent: false });
      return;
    }

    if (stale) {
      const timer = window.setTimeout(() => {
        void load({ silent: true });
      }, 350);
      return () => window.clearTimeout(timer);
    }
  }, [bootedRef, commitRows, load, revalidateCooldownMs, syncFromMirror, tabActive]);

  return {
    rows,
    loading,
    revalidating,
    fetchSettled,
    refreshing: (loading || revalidating) && rows.length > 0,
    directoryBootReady,
    reload,
    revalidateSilent,
  };
}
