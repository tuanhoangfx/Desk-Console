const STORAGE_PREFIX = "hub-notify-seen:";

function notifyStorage(): Storage | null {
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {
    /* private mode */
  }
  try {
    if (typeof sessionStorage !== "undefined") return sessionStorage;
  } catch {
    /* private mode */
  }
  return null;
}

function readRawSeen(scopeKey: string): string | null {
  const store = notifyStorage();
  if (!store) return null;
  try {
    const primary = store.getItem(`${STORAGE_PREFIX}${scopeKey}`);
    if (primary) return primary;
    if (typeof sessionStorage !== "undefined" && store !== sessionStorage) {
      return sessionStorage.getItem(`${STORAGE_PREFIX}${scopeKey}`);
    }
  } catch {
    /* quota / private mode */
  }
  return null;
}

export function readNotifySeenIds(scopeKey: string): Set<string> {
  if (!scopeKey) return new Set();
  try {
    const raw = readRawSeen(scopeKey);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as { ids?: string[] };
    return new Set((parsed.ids ?? []).filter((id): id is string => typeof id === "string" && id.length > 0));
  } catch {
    return new Set();
  }
}

export function writeNotifySeenIds(scopeKey: string, ids: string[]): void {
  if (!scopeKey) return;
  const store = notifyStorage();
  if (!store) return;
  const key = `${STORAGE_PREFIX}${scopeKey}`;
  try {
    store.setItem(key, JSON.stringify({ ids, at: Date.now() }));
    if (typeof sessionStorage !== "undefined" && store !== sessionStorage) {
      sessionStorage.removeItem(key);
    }
  } catch {
    /* quota / private mode */
  }
}

export function hasUnreadNotifyAlerts(scopeKey: string, alertIds: string[]): boolean {
  if (!scopeKey || !alertIds.length) return false;
  const seen = readNotifySeenIds(scopeKey);
  return alertIds.some((id) => !seen.has(id));
}

export function markNotifySeenId(scopeKey: string, id: string): Set<string> {
  const seen = readNotifySeenIds(scopeKey);
  if (!id || seen.has(id)) return seen;
  const next = new Set(seen);
  next.add(id);
  writeNotifySeenIds(scopeKey, [...next]);
  return next;
}

/** Union stored seen-ids with extra ids (DB `is_read`, mark-all). Never drops prior reads. */
export function mergeNotifySeenIds(scopeKey: string, ids: readonly string[]): Set<string> {
  const next = readNotifySeenIds(scopeKey);
  let added = false;
  for (const id of ids) {
    if (!id || next.has(id)) continue;
    next.add(id);
    added = true;
  }
  if (added) writeNotifySeenIds(scopeKey, [...next]);
  return next;
}

export function markAllNotifySeen(scopeKey: string, ids: readonly string[]): Set<string> {
  return mergeNotifySeenIds(scopeKey, ids);
}

/** `base` or `base:<userId>` so two accounts on one browser do not share seen-ids. */
export function hubNotifyScopeKey(base: string, userId?: string | null): string {
  const id = typeof userId === "string" ? userId.trim() : "";
  return id ? `${base}:${id}` : base;
}

/** Cap stored seen-ids to the live alert window (Todo fetch limit 100). */
export const HUB_NOTIFY_SEEN_MAX_IDS = 100;

/**
 * Drop seen-ids that left the current alert window. Empty `keepIds` is a no-op
 * so a loading flicker cannot wipe localStorage.
 */
export function pruneNotifySeenIds(
  scopeKey: string,
  keepIds: readonly string[],
  maxIds = HUB_NOTIFY_SEEN_MAX_IDS,
): Set<string> {
  const seen = readNotifySeenIds(scopeKey);
  if (!scopeKey || !keepIds.length) return seen;
  const next: string[] = [];
  for (const id of keepIds) {
    if (!id || !seen.has(id) || next.includes(id)) continue;
    next.push(id);
    if (next.length >= maxIds) break;
  }
  const nextSet = new Set(next);
  if (nextSet.size === seen.size && [...seen].every((id) => nextSet.has(id))) return seen;
  writeNotifySeenIds(scopeKey, next);
  return nextSet;
}
