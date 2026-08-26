export type HubDirectoryPinScope = "dashboard-screens" | "hub-tools";

const STORAGE_KEYS: Record<HubDirectoryPinScope, string> = {
  "dashboard-screens": "dash:pinned",
  "hub-tools": "hub:pinned-tools",
};

const PURGE_FLAG = "hub:directory-pinned-purged-v1";

/** One-shot cleanup after pin UI removal — clears legacy local/session storage keys. */
export function purgeHubDirectoryPinnedStorage(): void {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(PURGE_FLAG) === "1") return;
    for (const key of Object.values(STORAGE_KEYS)) {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    }
    localStorage.setItem(PURGE_FLAG, "1");
  } catch {
    /* ignore quota / private mode */
  }
}

const legacyMigrated = new Set<HubDirectoryPinScope>();

function migrateLegacyDashboardPins(): void {
  if (typeof window === "undefined" || legacyMigrated.has("dashboard-screens")) return;
  legacyMigrated.add("dashboard-screens");
  try {
    const legacy = sessionStorage.getItem(STORAGE_KEYS["dashboard-screens"]);
    if (!legacy) return;
    const parsed = JSON.parse(legacy) as unknown;
    const legacyIds = Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
    if (legacyIds.length > 0) {
      const merged = new Set(readRawWithoutMigrate("dashboard-screens"));
      for (const id of legacyIds) merged.add(id);
      localStorage.setItem(STORAGE_KEYS["dashboard-screens"], JSON.stringify([...merged]));
    }
    sessionStorage.removeItem(STORAGE_KEYS["dashboard-screens"]);
  } catch {
    /* ignore corrupt legacy payload */
  }
}

function readRawWithoutMigrate(scope: HubDirectoryPinScope): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS[scope]);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function readRaw(scope: HubDirectoryPinScope): string[] {
  if (scope === "dashboard-screens") migrateLegacyDashboardPins();
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS[scope]);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeRaw(scope: HubDirectoryPinScope, ids: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS[scope], JSON.stringify(ids));
}

export function readHubDirectoryPinnedIds(scope: HubDirectoryPinScope): Set<string> {
  return new Set(readRaw(scope));
}

export function toggleHubDirectoryPinnedId(scope: HubDirectoryPinScope, id: string): Set<string> {
  const next = new Set(readRaw(scope));
  if (next.has(id)) next.delete(id);
  else next.add(id);
  writeRaw(scope, [...next]);
  return next;
}

export function pinHubDirectoryIds(scope: HubDirectoryPinScope, ids: Iterable<string>): Set<string> {
  const next = new Set(readRaw(scope));
  for (const id of ids) next.add(id);
  writeRaw(scope, [...next]);
  return next;
}

/** Stable pin-first ordering; tie-break with optional comparator (default: preserve relative order). */
export function sortHubDirectoryPinnedFirst<T>(
  items: readonly T[],
  pinnedIds: ReadonlySet<string>,
  idOf: (item: T) => string,
  compare?: (a: T, b: T) => number,
): T[] {
  return [...items].sort((a, b) => {
    const ap = pinnedIds.has(idOf(a)) ? 0 : 1;
    const bp = pinnedIds.has(idOf(b)) ? 0 : 1;
    if (ap !== bp) return ap - bp;
    return compare ? compare(a, b) : 0;
  });
}
