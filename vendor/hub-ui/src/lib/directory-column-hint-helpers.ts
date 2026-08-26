import type { HubDirectoryColumnDef } from "../table/hub-directory-table-meta";
import type {
  HubDirectoryColumnHintContent,
  HubDirectoryColumnHintLine,
} from "../table/HubDirectoryColumnHint";
import type { DirectoryColumnHeaderMeta } from "./directory-column-meta-helpers";
import type { FilterDef } from "../shell/FilterBar";

/** Standard column hint — title case; default Option section from HubDirectoryColumnHint. */
export function colHint(
  title: string,
  description: string,
  lines?: HubDirectoryColumnHintLine[],
): HubDirectoryColumnHintContent {
  return {
    title,
    description,
    lines: lines?.length ? lines : [],
  };
}

/**
 * Prefix OPTION rows with `Sort priority N` — shared legend contract for every tool/tooltip.
 * Skips lines that already include a sort-priority prefix.
 */
export function withSortPriorityHintLines(
  lines: readonly HubDirectoryColumnHintLine[],
): HubDirectoryColumnHintLine[] {
  return lines.map((line, index) => {
    const rank = `Sort priority ${index + 1}`;
    const detail = line.detail?.trim() ?? "";
    if (/^sort priority\s+\d+/i.test(detail)) return line;
    return {
      ...line,
      detail: detail ? `${rank} — ${detail}` : rank,
    };
  });
}

/** Activity-age dot legend — SSOT `hubActivityAgeTone` (Created, Last update, activity columns). */
export const HUB_ACTIVITY_AGE_HINT_LINES: HubDirectoryColumnHintLine[] = withSortPriorityHintLines([
  { statusDot: "age-recent", label: "Fresh", detail: "≤ 1 hour — e.g. just now, 45m ago" },
  { statusDot: "age-aging", label: "Recent", detail: "≤ 24 hours — e.g. 5h ago" },
  { statusDot: "age-days", label: "1–3 days", detail: "≤ 3 days — dd/mm/yy date" },
  { statusDot: "age-week", label: "4–7 days", detail: "≤ 7 days — dd/mm/yy date" },
  { statusDot: "age-stale", label: "Stale", detail: "> 7 days — dd/mm/yy date" },
]);

const ACTIVITY_AGE_KEY_RE = /(^|_)(created|updated|last|sync|activity|modified|seen)(_|$)/i;
/** CamelCase / compound keys: createdAt, lastActiveAt, updatedAt, … */
const ACTIVITY_AGE_CAMEL_RE = /(created|updated|lastactive|lastopened|modified|synctime|activityat|seenat)/i;

export function isActivityAgeDirectoryColumn(key: string, label?: string): boolean {
  const k = key.toLowerCase();
  const l = (label ?? "").toLowerCase();
  if (ACTIVITY_AGE_KEY_RE.test(k) || ACTIVITY_AGE_KEY_RE.test(l)) return true;
  if (ACTIVITY_AGE_CAMEL_RE.test(k.replace(/_/g, ""))) return true;
  return /last |created|updated|sync|ago|activit/.test(l);
}

export function inferDirectoryColumnHintLines(
  key: string,
  label: string,
): HubDirectoryColumnHintLine[] | undefined {
  return isActivityAgeDirectoryColumn(key, label) ? HUB_ACTIVITY_AGE_HINT_LINES : undefined;
}

/** Infer a readable intro from column key + label. */
export function inferDirectoryColumnDescription(key: string, label: string): string {
  const l = label.toLowerCase();
  const k = key.toLowerCase();
  if (k.includes("status") || l === "status" || l === "health" || l === "run") {
    return `${label} — current row state.`;
  }
  if (k.includes("created") || l.includes("created") || l === "added") {
    return `${label} — when the record was first created.`;
  }
  if (k.includes("updated") || l.includes("updated") || l.includes("last")) {
    return `${label} — last change timestamp.`;
  }
  if (k.includes("sync") || l.includes("sync")) {
    return `${label} — sync state or last sync time.`;
  }
  if (k.endsWith("id") || k.includes("_id") || l.includes(" id") || l === "uuid" || l === "uid") {
    return `${label} — unique identifier.`;
  }
  if (k.includes("count") || k.includes("qty") || l.includes("total") || l.includes("followers")) {
    return `${label} — numeric count.`;
  }
  if (k.includes("url") || l === "url" || l.includes("path") || l.includes("host")) {
    return `${label} — link or path reference.`;
  }
  if (k.includes("email") || l === "email" || l.includes("account")) {
    return `${label} — account reference.`;
  }
  if (k.includes("note") || l.includes("notes")) {
    return `${label} — free-text notes.`;
  }
  return `${label} shown in this directory table.`;
}

/** Merge headerHint maps into directory column meta (same keys). */
export function withDirectoryColumnHints<M extends Record<string, DirectoryColumnHeaderMeta>>(
  meta: M,
  hints: Partial<Record<keyof M & string, HubDirectoryColumnHintContent>>,
): M {
  const out = { ...meta } as M;
  for (const key of Object.keys(hints) as (keyof M & string)[]) {
    const hint = hints[key];
    if (hint && out[key]) {
      out[key] = { ...out[key], headerHint: hint };
    }
  }
  return out;
}

/** Bulk hints from column labels — optional per-key description and option lines. */
export function buildDirectoryColumnHintsFromMeta<M extends Record<string, Pick<DirectoryColumnHeaderMeta, "label">>>(
  meta: M,
  descriptions?: Partial<Record<keyof M & string, string>>,
  lineDetails?: Partial<Record<keyof M & string, HubDirectoryColumnHintLine[]>>,
): Partial<Record<keyof M & string, HubDirectoryColumnHintContent>> {
  return Object.fromEntries(
    Object.entries(meta).map(([key, def]) => {
      const title = def.label;
      const description = descriptions?.[key] ?? inferDirectoryColumnDescription(key, title);
      const lines = lineDetails?.[key] ?? inferDirectoryColumnHintLines(key, title);
      return [key, colHint(title, description, lines)];
    }),
  ) as Partial<Record<keyof M & string, HubDirectoryColumnHintContent>>;
}

/** Attach inferred standard hints to every column in a meta record. */
export function applyStandardDirectoryColumnHints<M extends Record<string, DirectoryColumnHeaderMeta>>(
  meta: M,
  descriptions?: Partial<Record<keyof M & string, string>>,
  lineDetails?: Partial<Record<keyof M & string, HubDirectoryColumnHintLine[]>>,
): M {
  return withDirectoryColumnHints(meta, buildDirectoryColumnHintsFromMeta(meta, descriptions, lineDetails));
}

/** Attach hints to column meta records (alias for withDirectoryColumnHints). */
export function attachDirectoryColumnHints<
  T extends Record<string, DirectoryColumnHeaderMeta>,
>(
  meta: T,
  hints: Partial<Record<keyof T & string, HubDirectoryColumnHintContent>>,
): T {
  return withDirectoryColumnHints(meta, hints);
}

/** Attach inferred hints to inline HubDirectoryColumnDef arrays (P0020-style tables). */
export function applyStandardDirectoryColumnHintsToDefs<TKey extends string>(
  columns: readonly HubDirectoryColumnDef<TKey>[],
  descriptions?: Partial<Record<TKey, string>>,
  lineDetails?: Partial<Record<TKey, HubDirectoryColumnHintLine[]>>,
): HubDirectoryColumnDef<TKey>[] {
  return columns.map((col) => {
    const description = descriptions?.[col.key] ?? inferDirectoryColumnDescription(col.key, col.label);
    const lines = lineDetails?.[col.key] ?? inferDirectoryColumnHintLines(col.key, col.label);
    const headerHint: HubDirectoryColumnHintContent = colHint(col.label, description, lines);
    return { ...col, headerHint };
  });
}

/** Attach `labelHint` to directory column preset items (Display → Table columns). */
export function withDirectoryColumnLabelHints<
  K extends string,
  T extends { key: K; label: string; labelHint?: HubDirectoryColumnHintContent },
>(
  items: readonly T[],
  resolveHint: (key: K, label: string) => HubDirectoryColumnHintContent,
): Array<T & { labelHint: HubDirectoryColumnHintContent }> {
  return items.map((item) => ({
    ...item,
    labelHint: item.labelHint ?? resolveHint(item.key, item.label),
  }));
}

/** Attach `labelHint` to FilterBar facet defs — parity Display panel filter toggles. */
export function withFilterLabelHints(
  filters: readonly FilterDef[],
  resolveHint: (key: string, label: string) => HubDirectoryColumnHintContent | undefined,
): FilterDef[] {
  return filters.map((filter) => {
    const labelHint = filter.labelHint ?? resolveHint(filter.key, filter.label);
    return labelHint ? { ...filter, labelHint } : filter;
  });
}

/** Attach native `tip` on each filter option — hover parity with facet labelHint. */
export function withFilterOptionTips(
  filters: readonly FilterDef[],
  resolveTip: (filterKey: string, filterLabel: string, option: FilterDef["options"][number]) => string | undefined,
): FilterDef[] {
  return filters.map((filter) => ({
    ...filter,
    options: filter.options.map((option) => {
      const tip = option.tip?.trim() || resolveTip(filter.key, filter.label, option)?.trim();
      return tip ? { ...option, tip } : option;
    }),
  }));
}

/** Attach rich `labelHint` popover on each filter option (uses existing `tip` when resolver omits). */
export function withFilterOptionLabelHints(
  filters: readonly FilterDef[],
  resolveHint: (
    filterKey: string,
    filterLabel: string,
    option: FilterDef["options"][number],
  ) => HubDirectoryColumnHintContent | undefined,
): FilterDef[] {
  return filters.map((filter) => ({
    ...filter,
    options: filter.options.map((option) => {
      const labelHint =
        option.labelHint ??
        resolveHint(filter.key, filter.label, option) ??
        (option.tip?.trim()
          ? {
              title: option.label,
              description: option.tip.trim(),
              lines: [],
            }
          : undefined);
      return labelHint ? { ...option, labelHint } : option;
    }),
  }));
}

/** Attach sheet-parity emoji stickers to directory column meta (table header SSOT). */
export function withDirectoryColumnStickers<M extends Record<string, DirectoryColumnHeaderMeta>>(
  meta: M,
  stickers: Partial<Record<keyof M & string, string>>,
): M {
  const out = { ...meta } as M;
  for (const key of Object.keys(stickers) as (keyof M & string)[]) {
    const emoji = stickers[key];
    if (emoji && out[key]) {
      out[key] = { ...out[key], headerEmoji: emoji };
    }
  }
  return out;
}
