import type { HubSortDir } from "../table/HubSortIndicator";

export type DirectorySortState = {
  sortKey: string;
  sortDir: HubSortDir;
};

/**
 * Directory sort behavior for a given vault/screen.
 *
 * Tools can introduce local overrides (for example, P0020 Data Box uses a
 * `twofaDirectorySortMode` contract to lock additional 2FA tabs to their
 * documented primary default order). Hub-UI stays conservative here — we only
 * treat classic mail-style vaults as "default-order-only" at the shell level.
 *
 * Prefer `resolveDirectorySortMode` when Display has "Allow manual column sort"
 * (default OFF → fixed primary default).
 */
export type DirectorySortMode = "default-order-only" | "interactive-sort";

export function directorySortMode(vaultScope: string): DirectorySortMode {
  return isDirectoryDefaultSortOnlyVault(vaultScope) ? "default-order-only" : "interactive-sort";
}

/**
 * Resolve interactive vs fixed-default sort from Display prefs.
 *
 * Priority: explicit `defaultSortOnly` → `manualSortEnabled === false` →
 * `manualSortEnabled === true` → legacy `vaultScope` mail-style → interactive.
 */
export function resolveDirectorySortMode(opts: {
  manualSortEnabled?: boolean;
  defaultSortOnly?: boolean;
  vaultScope?: string;
}): DirectorySortMode {
  if (opts.defaultSortOnly === true) return "default-order-only";
  if (opts.manualSortEnabled === false) return "default-order-only";
  if (opts.manualSortEnabled === true) return "interactive-sort";
  if (opts.vaultScope != null) return directorySortMode(opts.vaultScope);
  return "interactive-sort";
}

/** Mail-style vaults — fixed multi-key default; no column override or URL persistence. */
export function isDirectoryDefaultSortOnlyVault(vaultScope: string): boolean {
  return vaultScope === "mail";
}

/** Runtime sort matches the documented primary default (tie-break rules are implicit). */
export function directorySortMatchesPrimaryDefault(
  sort: DirectorySortState,
  primaryDefault: DirectorySortState,
): boolean {
  return sort.sortKey === primaryDefault.sortKey && sort.sortDir === primaryDefault.sortDir;
}

/** URL/session sort is eligible only when it matches the vault primary default. */
export function sanitizeDirectorySortFromUrl(
  parsed: DirectorySortState | null,
  primaryDefault: DirectorySortState,
): DirectorySortState | null {
  if (!parsed) return null;
  return directorySortMatchesPrimaryDefault(parsed, primaryDefault) ? parsed : null;
}

/** Never persist column overrides when mode is default-order-only or sort equals primary. */
export function shouldPersistDirectorySortUrl(
  vaultScope: string,
  sort: DirectorySortState,
  primaryDefault: DirectorySortState,
  opts?: { manualSortEnabled?: boolean; defaultSortOnly?: boolean },
): boolean {
  const mode = resolveDirectorySortMode({
    vaultScope,
    manualSortEnabled: opts?.manualSortEnabled,
    defaultSortOnly: opts?.defaultSortOnly,
  });
  if (mode === "default-order-only") return false;
  return !directorySortMatchesPrimaryDefault(sort, primaryDefault);
}
