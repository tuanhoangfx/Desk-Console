import { normalizeHubEntityLog, type HubEntityLogEntry } from "../lib/hub-entity-log";

const STORAGE_PREFIX = "hub-user-account-log:";

function persistKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId.trim()}`;
}

/** Session cache for Account modal Log — survives close + F5 in the same tab. */
export function readUserAccountLog(userId: string): HubEntityLogEntry[] {
  const id = userId.trim();
  if (!id || typeof sessionStorage === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(persistKey(id));
    if (!raw) return [];
    return normalizeHubEntityLog(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function writeUserAccountLog(userId: string, logs: readonly HubEntityLogEntry[]): void {
  const id = userId.trim();
  if (!id || typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(persistKey(id), JSON.stringify(logs));
  } catch {
    /* quota / private mode */
  }
}

export function clearUserAccountLog(userId: string): void {
  const id = userId.trim();
  if (!id || typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(persistKey(id));
  } catch {
    /* noop */
  }
}
