import { useEffect, useState } from "react";

/**
 * Opt-in manual column sort prefs — Display → Table SSOT.
 *
 * Default OFF (fixed default order). Tools must not invent a second storage shape;
 * use this factory (or the scoped map variant) and `HubDirectoryManualSortToggle`.
 */
export type DirectoryManualSortPrefs = {
  read: () => boolean;
  write: (enabled: boolean) => void;
  reset: () => void;
  changeEvent: string;
  /** Always false — opt-in only. */
  defaultEnabled: false;
};

function truthyStored(raw: string | null): boolean {
  return raw === "1" || raw === "true";
}

export function createDirectoryManualSortPrefs(config: {
  storageKey: string;
  changeEvent: string;
  /** Older keys — copy first hit into `storageKey` once, then remove legacy. */
  legacyStorageKeys?: readonly string[];
}): DirectoryManualSortPrefs {
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
        window.localStorage.setItem(config.storageKey, truthyStored(raw) ? "1" : "0");
        window.localStorage.removeItem(key);
        return;
      }
    } catch {
      /* ignore quota / private mode */
    }
  }

  function read(): boolean {
    if (typeof window === "undefined") return false;
    migrateLegacy();
    try {
      return truthyStored(window.localStorage.getItem(config.storageKey));
    } catch {
      return false;
    }
  }

  function write(enabled: boolean): void {
    if (typeof window === "undefined") return;
    migrateLegacy();
    try {
      window.localStorage.setItem(config.storageKey, enabled ? "1" : "0");
      window.dispatchEvent(new CustomEvent(config.changeEvent));
    } catch {
      /* ignore */
    }
  }

  function reset(): void {
    if (typeof window === "undefined") return;
    migrateLegacy();
    try {
      window.localStorage.removeItem(config.storageKey);
      for (const key of legacyStorageKeys) window.localStorage.removeItem(key);
      window.dispatchEvent(new CustomEvent(config.changeEvent));
    } catch {
      /* ignore */
    }
  }

  return { read, write, reset, changeEvent: config.changeEvent, defaultEnabled: false };
}

/** Subscribe — re-renders on changeEvent / storage / popstate. Default OFF. */
export function useDirectoryManualSortEnabled(prefs: DirectoryManualSortPrefs): boolean {
  const [enabled, setEnabled] = useState(prefs.read);
  useEffect(() => {
    const sync = () => setEnabled(prefs.read());
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
  return enabled;
}

/**
 * Scope-keyed map in one localStorage JSON object (P0020 vaults / P0010 mix).
 * Missing keys read as OFF. Optional `alwaysInteractiveScopes` always read true (no opt-in).
 */
export function createScopedDirectoryManualSortPrefs<S extends string>(config: {
  storageKey: string;
  /** Single event name, or per-scope. */
  changeEvent: string | ((scope: S) => string);
  /** Scopes that stay interactive without the Display toggle (legacy exceptions). */
  alwaysInteractiveScopes?: ReadonlySet<S>;
  /**
   * CustomEvent detail key for the scope id.
   * Default `scope`; P0020 uses `vaultScope` for existing listeners.
   */
  detailScopeKey?: "scope" | "vaultScope" | string;
}): {
  forScope: (scope: S) => DirectoryManualSortPrefs;
  changeEvent: string;
  readMap: () => Partial<Record<S, boolean>>;
} {
  const cache = new Map<S, DirectoryManualSortPrefs>();
  const rootChangeEvent =
    typeof config.changeEvent === "string" ? config.changeEvent : "directory-manual-sort-change";
  const detailScopeKey = config.detailScopeKey ?? "scope";

  function readMap(): Partial<Record<S, boolean>> {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem(config.storageKey);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Partial<Record<S, boolean>>;
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function eventFor(scope: S): string {
    return typeof config.changeEvent === "function" ? config.changeEvent(scope) : config.changeEvent;
  }

  function detail(scope: S, enabled: boolean): Record<string, unknown> {
    return { [detailScopeKey]: scope, scope, enabled };
  }

  return {
    changeEvent: rootChangeEvent,
    readMap,
    forScope(scope: S): DirectoryManualSortPrefs {
      const existing = cache.get(scope);
      if (existing) return existing;

      const alwaysOn = config.alwaysInteractiveScopes?.has(scope) === true;
      const changeEvent = eventFor(scope);

      const prefs: DirectoryManualSortPrefs = {
        defaultEnabled: false,
        changeEvent,
        read: () => {
          if (alwaysOn) return true;
          return readMap()[scope] === true;
        },
        write: (enabled: boolean) => {
          if (typeof window === "undefined" || alwaysOn) return;
          const next = { ...readMap(), [scope]: enabled };
          try {
            window.localStorage.setItem(config.storageKey, JSON.stringify(next));
            window.dispatchEvent(new CustomEvent(changeEvent, { detail: detail(scope, enabled) }));
            if (changeEvent !== rootChangeEvent) {
              window.dispatchEvent(
                new CustomEvent(rootChangeEvent, { detail: detail(scope, enabled) }),
              );
            }
          } catch {
            /* ignore */
          }
        },
        reset: () => {
          if (typeof window === "undefined" || alwaysOn) return;
          const next = { ...readMap() };
          delete next[scope];
          try {
            window.localStorage.setItem(config.storageKey, JSON.stringify(next));
            window.dispatchEvent(
              new CustomEvent(changeEvent, { detail: detail(scope, false) }),
            );
            if (changeEvent !== rootChangeEvent) {
              window.dispatchEvent(
                new CustomEvent(rootChangeEvent, { detail: detail(scope, false) }),
              );
            }
          } catch {
            /* ignore */
          }
        },
      };

      cache.set(scope, prefs);
      return prefs;
    },
  };
}
