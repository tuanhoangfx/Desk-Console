import type { HubLogEntry } from "./HubUsageLogPanel";

const STORAGE_PREFIX = "hub-app-log:";
/** Soft cap — trim oldest lines if JSON exceeds quota. */
const MAX_PAYLOAD_CHARS = 480_000;

function isValidPersistedLog(entry: unknown): entry is HubLogEntry {
  if (!entry || typeof entry !== "object") return false;
  const row = entry as HubLogEntry;
  return (
    typeof row.id === "string" &&
    typeof row.at === "number" &&
    typeof row.scope === "string" &&
    typeof row.message === "string"
  );
}

export function readPersistedAppLogs(persistKey: string): HubLogEntry[] {
  if (!persistKey || typeof sessionStorage === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${persistKey}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { logs?: unknown[] };
    return (parsed.logs ?? []).filter(isValidPersistedLog);
  } catch {
    return [];
  }
}

export function writePersistedAppLogs(persistKey: string, logs: readonly HubLogEntry[]): void {
  if (!persistKey || typeof sessionStorage === "undefined") return;
  try {
    let payload = JSON.stringify({ logs, at: Date.now() });
    if (payload.length > MAX_PAYLOAD_CHARS) {
      const trimmed = logs.slice(0, Math.max(5, Math.floor(logs.length * 0.65)));
      payload = JSON.stringify({ logs: trimmed, at: Date.now() });
    }
    sessionStorage.setItem(`${STORAGE_PREFIX}${persistKey}`, payload);
  } catch {
    /* quota / private mode */
  }
}

export function clearPersistedAppLogs(persistKey: string): void {
  if (!persistKey || typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(`${STORAGE_PREFIX}${persistKey}`);
  } catch {
    /* noop */
  }
}

const ACTIVITY_LOG_KINDS = new Set(["create", "update", "delete", "sync"]);

/** True when persist is empty or only boot/system lines — mirror hydrate should run. */
export function sessionLogsNeedActivityHydrate(logs: readonly HubLogEntry[]): boolean {
  if (!logs.length) return true;
  return !logs.some((log) => ACTIVITY_LOG_KINDS.has((log.kind ?? "").trim().toLowerCase()));
}

export const HUB_APP_LOG_REQUEST_HYDRATE_EVENT = "hub-app-log-request-hydrate";

const ANON_IDENTITY = "anon";

function persistKeyIdentity(key: string): string {
  return String(key ?? "").split(":").pop()?.trim().toLowerCase() ?? "";
}

function persistKeyToolScope(key: string): string {
  const parts = String(key ?? "").split(":");
  return parts.length > 1 ? parts.slice(0, -1).join(":") : String(key ?? "");
}

/**
 * True when a `TOOL:anon` → `TOOL:<uid>` handoff should keep the lines already emitted.
 * Auth resolves after boot, so without this the Header Log resets on every sign-in/refresh.
 * A different user (or a different tool) always starts clean.
 */
export function shouldCarryOverSessionLogs(
  prevKey: string | undefined,
  nextKey: string | undefined,
): boolean {
  if (!prevKey || !nextKey || prevKey === nextKey) return false;
  if (persistKeyToolScope(prevKey) !== persistKeyToolScope(nextKey)) return false;
  return persistKeyIdentity(prevKey) === ANON_IDENTITY && persistKeyIdentity(nextKey) !== ANON_IDENTITY;
}

/** Newest-first dedupe by `id` — used when merging carried-over rows with persisted rows. */
export function mergeSessionLogsById(
  rows: readonly HubLogEntry[],
  maxLogs: number,
): HubLogEntry[] {
  const seen = new Set<string>();
  const out: HubLogEntry[] = [];
  for (const row of rows) {
    const id = String(row?.id ?? "");
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(row);
  }
  return out.sort((a, b) => (b.at ?? 0) - (a.at ?? 0)).slice(0, Math.max(1, maxLogs));
}

/**
 * Replace session-log rows whose `id` starts with `idPrefix` (newest-first merge).
 * Used by tools that hydrate a period timeline into Header Log without chart-side rails.
 */
export function replacePersistedAppLogsByIdPrefix(
  logs: readonly HubLogEntry[],
  idPrefix: string,
  replacements: readonly HubLogEntry[],
): HubLogEntry[] {
  const prefix = String(idPrefix ?? "");
  const without = prefix
    ? logs.filter((row) => !String(row.id ?? "").startsWith(prefix))
    : [...logs];
  if (!replacements.length) return without as HubLogEntry[];
  return [...replacements, ...without];
}
