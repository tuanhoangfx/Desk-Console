import { useEffect, useState } from "react";

/**
 * Frozen leading columns count — per-directory-table pref (SSOT).
 *
 * Default 0 (no freeze) for every table; individual screens opt into a non-zero default
 * (e.g. P0005 Orders = 5). The count freezes the first N *visible* columns (plus the select
 * checkbox) during horizontal scroll — see `useHubDirectoryStickyColumns`.
 */
export type DirectoryFreezePrefs = {
  read: () => number;
  write: (count: number) => void;
  reset: () => void;
  changeEvent: string;
  defaultCount: number;
};

export function createDirectoryFreezePrefs(config: {
  storageKey: string;
  changeEvent: string;
  defaultCount?: number;
  /** Older keys — copy first hit into `storageKey` once, then remove legacy. */
  legacyStorageKeys?: readonly string[];
}): DirectoryFreezePrefs {
  const defaultCount = Math.max(0, Math.floor(config.defaultCount ?? 0));
  const legacyStorageKeys = config.legacyStorageKeys ?? [];
  let migrated = false;

  function migrateLegacy(): void {
    if (migrated || typeof window === "undefined" || legacyStorageKeys.length === 0) return;
    migrated = true;
    try {
      if (window.localStorage.getItem(config.storageKey) != null) {
        for (const key of legacyStorageKeys) window.localStorage.removeItem(key);
        return;
      }
      for (const key of legacyStorageKeys) {
        const raw = window.localStorage.getItem(key);
        if (raw == null) continue;
        window.localStorage.setItem(config.storageKey, raw);
        window.localStorage.removeItem(key);
        return;
      }
    } catch {
      /* ignore quota / private mode */
    }
  }

  function read(): number {
    if (typeof window === "undefined") return defaultCount;
    migrateLegacy();
    const raw = window.localStorage.getItem(config.storageKey);
    if (raw == null) return defaultCount;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : defaultCount;
  }

  function write(count: number) {
    if (typeof window === "undefined") return;
    migrateLegacy();
    const next = Math.max(0, Math.floor(count));
    window.localStorage.setItem(config.storageKey, String(next));
    window.dispatchEvent(new CustomEvent(config.changeEvent));
  }

  function reset() {
    if (typeof window === "undefined") return;
    migrateLegacy();
    window.localStorage.removeItem(config.storageKey);
    for (const key of legacyStorageKeys) window.localStorage.removeItem(key);
    window.dispatchEvent(new CustomEvent(config.changeEvent));
  }

  return { read, write, reset, changeEvent: config.changeEvent, defaultCount };
}

/** Subscribe to a freeze pref — re-renders on its changeEvent (and cross-tab storage / popstate). */
export function useDirectoryFreezeCount(prefs: DirectoryFreezePrefs): number {
  const [count, setCount] = useState(prefs.read);
  useEffect(() => {
    const sync = () => setCount(prefs.read());
    sync();
    window.addEventListener(prefs.changeEvent, sync);
    window.addEventListener("popstate", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(prefs.changeEvent, sync);
      window.removeEventListener("popstate", sync);
      window.removeEventListener("storage", sync);
    };
  }, [prefs]);
  return count;
}

/**
 * Scope-keyed freeze prefs factory — stable identity per scope (safe as a hook dep).
 * Use when one screen hosts multiple directory tables that each need their own freeze count
 * (e.g. P0020 Account vault: facebook / tiktok / material / partner).
 */
export function createScopedDirectoryFreezePrefs<S extends string>(config: {
  storageKey: (scope: S) => string;
  changeEvent: (scope: S) => string;
  defaultCount?: number | ((scope: S) => number);
}): { forScope: (scope: S) => DirectoryFreezePrefs } {
  const cache = new Map<S, DirectoryFreezePrefs>();
  return {
    forScope(scope: S): DirectoryFreezePrefs {
      const existing = cache.get(scope);
      if (existing) return existing;
      const defaultCount =
        typeof config.defaultCount === "function"
          ? config.defaultCount(scope)
          : (config.defaultCount ?? 0);
      const prefs = createDirectoryFreezePrefs({
        storageKey: config.storageKey(scope),
        changeEvent: config.changeEvent(scope),
        defaultCount,
      });
      cache.set(scope, prefs);
      return prefs;
    },
  };
}
