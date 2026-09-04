import { isDirectoryEmptyLabel } from "./directory-empty-label";
import type { HubEntityLogChange, HubEntityLogEntry } from "./hub-entity-log";

/**
 * Hub entity change-log row logic — golden SSOT shared by every tool's rail
 * (P0020 `TwofaChangeLogList`, P0005 `HubChangeLogList`, …).
 *
 * Pure functions only (no React): flatten entries → one row per field delta,
 * resolve structured-vs-legacy changes, and format the `Field added/removed/updated`
 * action label. Each tool keeps its own rendering (icons, masking, copy, flash)
 * but consumes this single source for row/label semantics.
 */
export type HubEntityLogRow = {
  key: string;
  at: string;
  dotIndex: number;
  entryIndex: number;
  change?: HubEntityLogChange;
  changeIndex?: number;
  message?: string;
  /** Resolved display label for `change.field` (via `labelFor`). */
  fieldLabel?: string;
};

export type FlattenHubEntityLogOptions = {
  /** Round-trip legacy `Label: a → b · …` messages into structured changes. */
  parseMessage?: (message: string) => HubEntityLogChange[];
  /** Treat a change as a no-op (skipped). Default: trimmed before === after. */
  isNoOpChange?: (change: HubEntityLogChange) => boolean;
  /** Resolve the human label for a change's field (column/entity label). */
  labelFor?: (change: HubEntityLogChange) => string;
  /**
   * Rail order. Default `true` (newest `at` first). Persist/merge stays chronological;
   * callers must not pre-reverse or the stamp order is still corrected here.
   */
  newestFirst?: boolean;
  /** Lower rank = higher on the rail within the same stamp. Default: hubEntityLogFieldDisplayRank. */
  fieldRank?: (field: string) => number;
  /** Keep `changes[]` persist order (Header Log session line). Default false. */
  preserveFieldOrder?: boolean;
};

/**
 * Same-Save display rank — Status/Own first, credentials last.
 * Unknown fields sit in the middle (identity / plan / notes) so tools do not need a local sort.
 */
export function hubEntityLogFieldDisplayRank(field: string): number {
  const key = field.trim();
  const rank = HUB_ENTITY_LOG_FIELD_DISPLAY_RANK[key];
  if (rank != null) return rank;
  const lower = key.toLowerCase();
  if (lower.includes("password") || lower.includes("secret") || lower.includes("backup")) return 900;
  if (lower.includes("status") || lower.includes("ownership") || lower === "own") return 10;
  return 500;
}

const HUB_ENTITY_LOG_FIELD_DISPLAY_RANK: Record<string, number> = {
  status: 10,
  listing_status: 10,
  orderStatus: 10,
  ownership: 20,
  payStatus: 15,
  planStatus: 16,
  notifyStatus: 18,
  fbPaymentStatus: 19,
  access: 25,
  service: 30,
  category: 30,
  orderId: 35,
  product: 38,
  account: 40,
  customer: 40,
  grantee: 40,
  uid: 45,
  browser: 50,
  mailRecover: 55,
  phone: 60,
  mailState: 65,
  planPackage: 100,
  planTier: 105,
  planDate: 110,
  planDays: 115,
  planExpiresAt: 120,
  planNotes: 125,
  price: 130,
  qty: 135,
  discount: 140,
  list_price_cents: 130,
  productPrice: 130,
  note: 200,
  notes: 200,
  remark: 205,
  password: 900,
  secret: 910,
  backupCode: 920,
};

function compareHubEntityLogAtDesc(a: string, b: string): number {
  const da = Date.parse(a);
  const db = Date.parse(b);
  if (Number.isFinite(da) && Number.isFinite(db) && da !== db) return db - da;
  return a < b ? 1 : a > b ? -1 : 0;
}

const defaultIsNoOp = (change: HubEntityLogChange): boolean =>
  (change.before?.trim() ?? "") === (change.after?.trim() ?? "");

/** Legacy messages encode deltas with `→` or ASCII `->` (SQL/import sometimes used ASCII). */
export function hubEntityLogMessageHasDeltaArrow(message: string): boolean {
  return message.includes("→") || message.includes("->");
}

/** Structured changes (preferred) else parsed legacy message deltas, no-ops dropped. */
export function resolveHubEntityLogEntryChanges(
  entry: HubEntityLogEntry,
  options: FlattenHubEntityLogOptions = {},
): HubEntityLogChange[] {
  const isNoOp = options.isNoOpChange ?? defaultIsNoOp;
  const structured = (entry.changes ?? []).filter((change) => !isNoOp(change));
  if (structured.length) return structured;
  if (!options.parseMessage || !hubEntityLogMessageHasDeltaArrow(entry.message)) return [];
  return options.parseMessage(entry.message).filter((change) => !isNoOp(change));
}

/** Flatten log entries into one row per change (or a message row when no deltas). */
export function flattenHubEntityLog(
  entries: HubEntityLogEntry[],
  options: FlattenHubEntityLogOptions = {},
): HubEntityLogRow[] {
  const newestFirst = options.newestFirst !== false;
  const fieldRank = options.fieldRank ?? hubEntityLogFieldDisplayRank;
  const ordered = entries.map((entry, sourceIndex) => ({ entry, sourceIndex }));
  if (newestFirst) {
    ordered.sort((a, b) => {
      const byAt = compareHubEntityLogAtDesc(a.entry.at, b.entry.at);
      if (byAt !== 0) return byAt;
      return b.sourceIndex - a.sourceIndex;
    });
  }

  const rows: HubEntityLogRow[] = [];
  ordered.forEach(({ entry }, entryIndex) => {
    const resolved = resolveHubEntityLogEntryChanges(entry, options);
    const changes =
      options.preserveFieldOrder || resolved.length <= 1
        ? resolved
        : [...resolved].sort((x, y) => {
            const d = fieldRank(x.field) - fieldRank(y.field);
            return d !== 0 ? d : x.field.localeCompare(y.field);
          });
    if (changes.length) {
      changes.forEach((change, changeIndex) => {
        rows.push({
          key: `${entry.at}-${entryIndex}-${change.field}-${changeIndex}`,
          at: entry.at,
          dotIndex: entryIndex % 3,
          entryIndex,
          change,
          changeIndex,
          fieldLabel: options.labelFor?.(change),
        });
      });
      return;
    }
    rows.push({
      key: `${entry.at}-${entryIndex}-msg`,
      at: entry.at,
      dotIndex: entryIndex % 3,
      entryIndex,
      message: entry.message,
    });
  });
  return rows;
}

const DIRECTORY_SUMMARY_CREDENTIAL_FIELDS = ["password", "secret", "backupCode"] as const;

/** True when the field is a credential (rail ranks these last). */
export function isHubEntityLogCredentialField(field: string): boolean {
  const key = field.trim();
  if ((DIRECTORY_SUMMARY_CREDENTIAL_FIELDS as readonly string[]).includes(key)) return true;
  return hubEntityLogFieldDisplayRank(key) >= 900;
}

/**
 * Directory Log chip — prefer a credential delta when the Save has one,
 * else the top rail row (Status/Own). Rail flatten stays Status-first.
 */
export function pickHubEntityLogDirectorySummaryRow<T extends { change?: { field?: string } }>(
  rows: readonly T[],
): T | undefined {
  for (const field of DIRECTORY_SUMMARY_CREDENTIAL_FIELDS) {
    const hit = rows.find((row) => row.change?.field === field);
    if (hit) return hit;
  }
  const cred = rows.find((row) => row.change?.field && isHubEntityLogCredentialField(row.change.field));
  return cred ?? rows[0];
}

/** `Field added | removed | updated` (or the raw message for event-only rows). */
export function formatHubEntityLogActionLabel(
  row: Pick<HubEntityLogRow, "change" | "fieldLabel" | "message">,
  fallback = "Updated",
): string {
  if (!row.change) return row.message?.trim() || fallback;
  const label = row.fieldLabel ?? row.change.field;
  const before = row.change.before?.trim();
  const after = row.change.after?.trim();
  const hadBefore = Boolean(before && !isDirectoryEmptyLabel(before));
  const hasAfter = Boolean(after && !isDirectoryEmptyLabel(after));
  if (!hasAfter && hadBefore) return `${label} removed`;
  if (hasAfter && !hadBefore) return `${label} added`;
  return `${label} updated`;
}
