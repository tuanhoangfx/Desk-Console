const STORAGE_PREFIX = "hub-log-seen:";

export function readLogSeenIds(scopeKey: string): Set<string> {
  if (!scopeKey || typeof sessionStorage === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${scopeKey}`);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as { ids?: string[] };
    return new Set(parsed.ids ?? []);
  } catch {
    return new Set();
  }
}

export function writeLogSeenIds(scopeKey: string, ids: string[]): void {
  if (!scopeKey || typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(
      `${STORAGE_PREFIX}${scopeKey}`,
      JSON.stringify({ ids, at: Date.now() }),
    );
  } catch {
    /* quota / private mode */
  }
}

export function markLogSeenId(scopeKey: string, id: string): Set<string> {
  const seen = readLogSeenIds(scopeKey);
  if (!id || seen.has(id)) return seen;
  const next = new Set(seen);
  next.add(id);
  writeLogSeenIds(scopeKey, [...next]);
  return next;
}

export function markAllLogSeen(scopeKey: string, ids: readonly string[]): Set<string> {
  const next = new Set(ids);
  writeLogSeenIds(scopeKey, [...next]);
  return next;
}

export function countUnreadLogEntries(scopeKey: string, logIds: readonly string[]): number {
  if (!scopeKey || !logIds.length) return 0;
  const seen = readLogSeenIds(scopeKey);
  return logIds.filter((id) => !seen.has(id)).length;
}
