/**
 * Hub entity activity-log SSOT — framework-agnostic core (P0020 vault audit-log parity).
 *
 * Persistent, structured audit trail stored on a row at `metadata.activity_log`
 * (or a dedicated jsonb column). Each tool builds its per-field diff on top of
 * these primitives; the render rail (`HubChangeLogList`) consumes the generic shapes.
 *
 * No React / entity imports here so it stays portable across every Hub tool.
 */

/** One field-level delta. `field` is entity-defined (kept as a plain string here). */
export type HubEntityLogChange = {
  field: string;
  before?: string;
  after?: string;
};

export type HubEntityLogEntry = {
  /** ISO timestamp. */
  at: string;
  /** Human summary — e.g. `Price: 100 → 120 · Qty: 1 → 2`. */
  message: string;
  /** Structured deltas (preferred over parsing message). */
  changes?: HubEntityLogChange[];
};

/** Sticker + label used by the render rail to draw one change row. */
export type HubEntityLogFieldMeta = {
  label: string;
  emoji?: string;
};

export const HUB_ENTITY_ACTIVITY_LOG_META_KEY = "activity_log";
export const MAX_HUB_ENTITY_LOG_ENTRIES = 80;

/**
 * Canonical ISO-8601 UTC (`…Z`). Postgres / PostgREST often echo the same instant as
 * `…+00:00` — string merge keys then fail to dedupe and Detail Log shows each change twice.
 */
export function canonicalizeHubEntityLogAt(at: string): string {
  const trimmed = at.trim();
  if (!trimmed) return trimmed;
  const ms = Date.parse(trimmed);
  if (!Number.isFinite(ms)) return trimmed;
  return new Date(ms).toISOString();
}

function hubEntityLogDedupeKey(entry: HubEntityLogEntry): string {
  return `${canonicalizeHubEntityLogAt(entry.at)}\u0000${entry.message}`;
}

function preferRicherHubEntityLogEntry(a: HubEntityLogEntry, b: HubEntityLogEntry): HubEntityLogEntry {
  const ac = a.changes?.length ?? 0;
  const bc = b.changes?.length ?? 0;
  if (bc > ac) return { ...b, at: canonicalizeHubEntityLogAt(b.at) };
  return { ...a, at: canonicalizeHubEntityLogAt(a.at) };
}

/** Collapse Z / +00:00 twins and exact append dupes while preserving chronological order. */
export function dedupeHubEntityLogEntries(entries: HubEntityLogEntry[]): HubEntityLogEntry[] {
  if (entries.length <= 1) {
    return entries.map((e) => ({ ...e, at: canonicalizeHubEntityLogAt(e.at) }));
  }
  const byKey = new Map<string, HubEntityLogEntry>();
  for (const entry of entries) {
    const normalized: HubEntityLogEntry = { ...entry, at: canonicalizeHubEntityLogAt(entry.at) };
    const key = hubEntityLogDedupeKey(normalized);
    const prev = byKey.get(key);
    byKey.set(key, prev ? preferRicherHubEntityLogEntry(prev, normalized) : normalized);
  }
  return [...byKey.values()]
    .sort((x, y) => {
      const dx = Date.parse(x.at);
      const dy = Date.parse(y.at);
      if (Number.isFinite(dx) && Number.isFinite(dy) && dx !== dy) return dx - dy;
      return x.at < y.at ? -1 : x.at > y.at ? 1 : 0;
    })
    .slice(-MAX_HUB_ENTITY_LOG_ENTRIES);
}

export function hubEntityLogSameText(a: string | null | undefined, b: string | null | undefined): boolean {
  return (a?.trim() || "") === (b?.trim() || "");
}

export function hubEntityLogTextValue(value: string | null | undefined): string {
  return value?.trim() || "";
}

/** Append a change only when the value actually differs. */
export function pushHubEntityLogChange(
  changes: HubEntityLogChange[],
  field: string,
  before: string,
  after: string,
): void {
  if (before.trim() === after.trim()) return;
  changes.push({ field, before, after });
}

function normalizeChange(raw: unknown, allowedFields?: ReadonlySet<string>): HubEntityLogChange | null {
  if (!raw || typeof raw !== "object") return null;
  const field = "field" in raw && typeof raw.field === "string" ? raw.field.trim() : "";
  if (!field) return null;
  if (allowedFields && !allowedFields.has(field)) return null;
  const before = "before" in raw && typeof raw.before === "string" ? raw.before : undefined;
  const after = "after" in raw && typeof raw.after === "string" ? raw.after : undefined;
  return { field, before, after };
}

/**
 * Coerce untrusted JSON (from `metadata.activity_log`) into a clean entry list.
 * `allowedFields` optionally drops changes with fields the entity no longer knows.
 */
export function normalizeHubEntityLog(
  entries: unknown,
  allowedFields?: ReadonlySet<string>,
): HubEntityLogEntry[] {
  if (!Array.isArray(entries)) return [];
  const out: HubEntityLogEntry[] = [];
  for (const item of entries) {
    if (!item || typeof item !== "object") continue;
    const atRaw = "at" in item && typeof item.at === "string" ? item.at.trim() : "";
    const at = canonicalizeHubEntityLogAt(atRaw);
    const message = "message" in item && typeof item.message === "string" ? item.message.trim() : "";
    if (!at || !message) continue;
    const changesRaw = "changes" in item && Array.isArray(item.changes) ? item.changes : [];
    const changes = changesRaw
      .map((change: unknown) => normalizeChange(change, allowedFields))
      .filter((change: HubEntityLogChange | null): change is HubEntityLogChange => Boolean(change));
    out.push({ at, message, ...(changes.length ? { changes } : {}) });
  }
  return dedupeHubEntityLogEntries(out);
}

/** Append one entry, capping to the newest `MAX_HUB_ENTITY_LOG_ENTRIES`. */
export function appendHubEntityLogEntry(
  existing: HubEntityLogEntry[] | undefined,
  entry: HubEntityLogEntry,
): HubEntityLogEntry[] {
  const message = entry.message.trim();
  const at = canonicalizeHubEntityLogAt(entry.at);
  if (!message || !at) return existing ? [...existing] : [];
  return dedupeHubEntityLogEntries([...(existing ?? []), { ...entry, at, message }]);
}

/**
 * Union two logs, de-duped by canonical `at + message`, oldest → newest, capped.
 * P0020 `mergeTwofaVaultAuditLogs` parity — guarantees no history is dropped
 * when merging a local snapshot with the freshest DB copy under concurrent edits.
 */
export function mergeHubEntityAuditLogs(a: unknown, b: unknown): HubEntityLogEntry[] {
  return dedupeHubEntityLogEntries([
    ...normalizeHubEntityLog(a),
    ...normalizeHubEntityLog(b),
  ]);
}

/** Read the persisted audit trail from a row's metadata. */
export function readHubEntityActivityLog(
  row: { metadata?: unknown } | null | undefined,
  allowedFields?: ReadonlySet<string>,
): HubEntityLogEntry[] {
  const meta = (row?.metadata ?? null) as Record<string, unknown> | null;
  return normalizeHubEntityLog(meta?.[HUB_ENTITY_ACTIVITY_LOG_META_KEY], allowedFields);
}

/**
 * Full `metadata` PATCH replaces the jsonb blob. Directory rows often slim away
 * `activity_log`; a write that omits the key (or sends a shorter tip) wipes
 * persisted history. Keep / union the existing log so an append RPC can add
 * the new entry on top. P0005 2026-08-15 `withoutActivityLog` incident.
 */
export function preserveHubEntityActivityLogOnMetadataWrite(
  next: Record<string, unknown>,
  existing?: Record<string, unknown> | null,
): Record<string, unknown> {
  const key = HUB_ENTITY_ACTIVITY_LOG_META_KEY;
  const existingLog = existing?.[key];
  const nextLog = next[key];
  const existingNorm = normalizeHubEntityLog(existingLog);
  const nextNorm = normalizeHubEntityLog(nextLog);
  if (existingNorm.length === 0) {
    const out = { ...next };
    delete out[key];
    return out;
  }
  if (nextNorm.length === 0 || nextNorm.length < existingNorm.length) {
    return { ...next, [key]: mergeHubEntityAuditLogs(existingLog, nextLog) };
  }
  return next;
}

/** Merge one entry into a metadata object's activity_log (append + cap). */
export function withHubEntityActivityLog(
  metadata: Record<string, unknown> | null | undefined,
  entry: HubEntityLogEntry | null,
): Record<string, unknown> {
  const meta = { ...((metadata ?? {}) as Record<string, unknown>) };
  if (!entry) return meta;
  const existing = normalizeHubEntityLog(meta[HUB_ENTITY_ACTIVITY_LOG_META_KEY]);
  meta[HUB_ENTITY_ACTIVITY_LOG_META_KEY] = appendHubEntityLogEntry(existing, entry);
  return meta;
}

/** Render a single `Label: before → after` line for a change. */
export function formatHubEntityLogChangeLine(
  change: HubEntityLogChange,
  labels: Record<string, string>,
): string {
  const label = labels[change.field] ?? change.field;
  if (change.before !== undefined && change.after !== undefined) {
    const before = change.before.trim() === "" ? "—" : change.before;
    const after = change.after.trim() === "" ? "—" : change.after;
    return `${label}: ${before} → ${after}`;
  }
  if (change.after !== undefined) return `${label}: ${change.after}`;
  return label;
}

/** Human summary joining every change with `·`. */
export function buildHubEntityLogMessage(
  changes: HubEntityLogChange[],
  labels: Record<string, string>,
  fallback: string,
): string {
  if (!changes.length) return fallback;
  return changes.map((change) => formatHubEntityLogChangeLine(change, labels)).join(" · ");
}

/** Round-trip legacy `Label: a → b · …` messages back into structured changes. */
export function parseHubEntityLogMessageChanges(
  message: string,
  labelToField: Record<string, string>,
): HubEntityLogChange[] {
  const parts = message.split(" · ").map((part) => part.trim()).filter(Boolean);
  const changes: HubEntityLogChange[] = [];
  for (const part of parts) {
    const match = part.match(/^(.+?):\s*(.+?)\s*→\s*(.+)$/);
    if (!match) continue;
    const field = labelToField[match[1].trim()];
    if (!field) continue;
    const before = match[2].trim() === "—" ? "" : match[2].trim();
    const after = match[3].trim() === "—" ? "" : match[3].trim();
    changes.push({ field, before, after });
  }
  return changes;
}

/** Build a field-meta resolver from label + emoji maps (used by the render rail). */
export function hubEntityLogFieldMetaResolver(
  labels: Record<string, string>,
  emoji: Record<string, string>,
): (field: string) => HubEntityLogFieldMeta {
  return (field: string) => ({ label: labels[field] ?? field, emoji: emoji[field] });
}
