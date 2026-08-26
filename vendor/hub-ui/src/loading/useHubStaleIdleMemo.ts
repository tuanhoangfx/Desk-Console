import { useEffect, useRef, useState } from "react";

type CacheBucket = Map<string, unknown>;

/** Session cache — survives tab hide / remount (directory chrome stale-first). */
const caches = new Map<string, CacheBucket>();

/**
 * Per-namespace entry cap. Fingerprints embed data revisions (length/ids), so long
 * realtime sessions mint new keys constantly — an unbounded bucket pins every dead
 * generation of large computed bundles (P0020 17k-row vault analytics → OOM).
 */
const MAX_BUCKET_ENTRIES = 2;

function setBucketValue(bucket: CacheBucket, fingerprint: string, value: unknown): void {
  bucket.delete(fingerprint);
  bucket.set(fingerprint, value);
  while (bucket.size > MAX_BUCKET_ENTRIES) {
    const oldest = bucket.keys().next().value;
    if (oldest === undefined) break;
    bucket.delete(oldest);
  }
}

function getBucket(namespace: string): CacheBucket {
  let bucket = caches.get(namespace);
  if (!bucket) {
    bucket = new Map();
    caches.set(namespace, bucket);
  }
  return bucket;
}

/** Test / logout helper — clear one namespace or all. */
export function clearHubStaleIdleMemoCache(namespace?: string): void {
  if (namespace) caches.delete(namespace);
  else caches.clear();
}

/**
 * Stable fingerprint for Hub filter values (order-independent).
 * Use in `useHubStaleIdleMemo` keys with vaultScope + period + row revision.
 */
export function hubFilterValuesFingerprint(values: Record<string, unknown> | null | undefined): string {
  if (!values) return "";
  const keys = Object.keys(values).sort();
  return keys
    .map((key) => {
      const raw = values[key];
      if (Array.isArray(raw)) {
        return `${key}=${[...raw].map(String).sort().join(",")}`;
      }
      if (raw == null) return `${key}=`;
      return `${key}=${String(raw)}`;
    })
    .join("&");
}

type Scheduled =
  | { kind: "idle"; id: number }
  | { kind: "timeout"; id: number }
  | { kind: "raf"; outer: number; inner: number };

function scheduleAfterPaint(run: () => void): Scheduled {
  const handle: Scheduled = { kind: "raf", outer: 0, inner: 0 };
  handle.outer = window.requestAnimationFrame(() => {
    handle.inner = window.requestAnimationFrame(run);
  });
  return handle;
}

function scheduleIdle(run: () => void, timeoutMs = 500): Scheduled {
  if (typeof window.requestIdleCallback === "function") {
    return {
      kind: "idle",
      id: window.requestIdleCallback(() => run(), { timeout: timeoutMs }),
    };
  }
  return { kind: "timeout", id: window.setTimeout(run, 48) };
}

function cancelScheduled(handle: Scheduled | null): void {
  if (!handle) return;
  if (handle.kind === "idle") {
    if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(handle.id);
    return;
  }
  if (handle.kind === "timeout") {
    window.clearTimeout(handle.id);
    return;
  }
  window.cancelAnimationFrame(handle.outer);
  if (handle.inner) window.cancelAnimationFrame(handle.inner);
}

export type HubStaleIdleMemoOptions = {
  /**
   * Stale-while-revalidate stays inside this key (filter / row rev).
   * Changing it (P0020 Mail → Meta) drops the previous value immediately.
   */
  staleKey?: string;
};

type MemoState<T> = { fp: string; staleKey?: string; value: T };

/**
 * Stale-first + idle recompute SSOT for expensive directory chrome (facet/KPI).
 *
 * | Case | Behavior |
 * |------|----------|
 * | Cache hit | Paint immediately; refresh via `requestIdleCallback` |
 * | Cache miss | Compute after rAF×2 (post first paint); store |
 * | Fingerprint change | Keep previous value until new compute finishes |
 * | `staleKey` change | Do **not** keep previous value (cross-vault / cross-tab) |
 *
 * Golden: P0020 large vault KPI band; reuse across P00xx directories.
 */
export function useHubStaleIdleMemo<T>(
  namespace: string,
  fingerprint: string,
  compute: () => T,
  enabled: boolean,
  options?: HubStaleIdleMemoOptions,
): T | undefined {
  const bucket = getBucket(namespace);
  const computeRef = useRef(compute);
  computeRef.current = compute;
  const staleKey = options?.staleKey;

  const [state, setState] = useState<MemoState<T> | undefined>(() => {
    if (!enabled || !fingerprint) return undefined;
    const hit = bucket.get(fingerprint) as T | undefined;
    return hit !== undefined ? { fp: fingerprint, staleKey, value: hit } : undefined;
  });

  useEffect(() => {
    if (!enabled || !fingerprint) return;

    let cancelled = false;
    let handle: Scheduled | null = null;

    const apply = () => {
      if (cancelled) return;
      const next = computeRef.current();
      setBucketValue(bucket, fingerprint, next);
      setState({ fp: fingerprint, staleKey, value: next });
    };

    const hit = bucket.get(fingerprint) as T | undefined;
    if (hit !== undefined) {
      // Fingerprint encodes the inputs — a hit IS current. The old idle refresh here
      // re-ran the full compute AND minted a new value identity on every activation
      // (the P0005 Products "6s per tab open" pattern), cascading through every
      // downstream memo (charts/KPI/band) for an identical result.
      setState((prev) =>
        prev?.fp === fingerprint && prev.value === hit && prev.staleKey === staleKey
          ? prev
          : { fp: fingerprint, staleKey, value: hit },
      );
      return;
    }

    handle = scheduleAfterPaint(apply);
    return () => {
      cancelled = true;
      cancelScheduled(handle);
    };
  }, [bucket, enabled, fingerprint, staleKey]);

  if (!enabled) return undefined;
  if (state?.fp === fingerprint) return state.value;
  const hit = bucket.get(fingerprint) as T | undefined;
  if (hit !== undefined) return hit;
  if (staleKey !== undefined && state?.staleKey !== staleKey) return undefined;
  // Cross-fingerprint stale while new key computes (same staleKey)
  return state?.value;
}
