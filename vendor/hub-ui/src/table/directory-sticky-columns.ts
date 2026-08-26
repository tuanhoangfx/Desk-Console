/**
 * Directory sticky (frozen) leading columns — Hub-UI SSOT.
 *
 * Freezes the first N columns (plus the select checkbox) while the directory table
 * scrolls horizontally, WITHOUT changing the resting UI:
 *  - Frozen cells get an opaque base (`--panel`) so scrolling columns can't bleed through.
 *  - Every row-state tint (hover / selected / detail / highlighted / flash) is re-applied as a
 *    semi-transparent layer over that opaque base, so the composited RGB is pixel-identical to
 *    the non-frozen area (see hub-directory-table.css row-state tints — kept in sync here).
 *  - A soft right-edge shadow appears only while scrolled (scope `[data-sticky-scrolled="1"]`).
 *
 * The generated CSS is keyed on each column's `colClass`, so it reaches product-rendered body
 * cells with no shell/product cell edits and stays correct after column reorder / hide.
 */

import { failDirectoryColumnMeta } from "./hub-directory-column-width-registry";

export type DirectoryStickyLeadEntry = {
  /** Column class present on both `<th>` and `<td>` (e.g. `hub-users-col--od-order-date`). */
  colClass: string;
  /** Fixed CSS length — `px` or `rem` only (matches `table-layout: fixed` colgroup width). */
  width: string;
};

export type StickyLeftMode =
  /** `left` offsets computed from each column's fixed px/rem `width` (SSR-stable, no measure). */
  | "css"
  /**
   * `left` offsets read from `--hub-sticky-left-{i}` CSS vars set at runtime by
   * `useHubDirectoryStickyColumns` from *measured* column widths. Required for tables whose
   * lead columns use fluid (`%`) or zoom-dependent widths (P0016/P0020) — `width` is ignored.
   */
  | "measured";

/** CSS var prefix the measured mode reads for per-column left offsets. */
export const DIRECTORY_STICKY_LEFT_VAR_PREFIX = "--hub-sticky-left-";

export type BuildDirectoryStickyColumnsCssOptions = {
  /** Scope selector for the table (e.g. `.p0005-crm-directory-table--sticky-lead`). Required to avoid leakage. */
  scopeSelector: string;
  /** Ordered frozen columns, leftmost first. Include the select column first when the table has one. */
  entries: readonly DirectoryStickyLeadEntry[];
  /** thead surface var — frozen headers keep the same background as the rest of the head row. */
  headSurfaceVar?: string;
  /** Opaque base var for frozen body cells. */
  panelVar?: string;
  /** Soft right-edge shadow on the last frozen column while scrolled. Default true. */
  edgeShadow?: boolean;
  /** How `left` is resolved. Default "css" (parse fixed widths); "measured" reads runtime CSS vars. */
  leftMode?: StickyLeftMode;
};

/** Row-state tint SSOT — MUST mirror hub-directory-table.css `[data-hub-directory-select] .hub-users-row*`. */
const STICKY_ROW_STATE_TINTS: readonly { selector: string; tint: string }[] = [
  { selector: ".hub-users-row:hover", tint: "rgba(99, 102, 241, 0.06)" },
  { selector: ".hub-users-row.is-selected", tint: "rgba(99, 102, 241, 0.08)" },
  { selector: ".hub-users-row.is-selected:hover", tint: "rgba(99, 102, 241, 0.1)" },
  { selector: ".hub-users-row.is-detail", tint: "rgba(52, 211, 153, 0.08)" },
  { selector: ".hub-users-row.is-detail:hover", tint: "rgba(52, 211, 153, 0.1)" },
  { selector: ".hub-users-row.is-highlighted", tint: "rgba(99, 102, 241, 0.07)" },
  { selector: ".hub-users-row.is-highlighted:hover", tint: "rgba(99, 102, 241, 0.09)" },
];

/** Left-accent bar SSOT — mirror hub-directory-table.css inset box-shadow (drawn on first frozen cell). */
const STICKY_ROW_ACCENTS: readonly { selector: string; shadow: string }[] = [
  { selector: ".hub-users-row.is-detail", shadow: "inset 3px 0 0 rgba(52, 211, 153, 0.5)" },
  { selector: ".hub-users-row.is-highlighted", shadow: "inset 3px 0 0 rgba(129, 140, 248, 0.45)" },
];

type LengthSum = { px: number; rem: number };

function parseLength(width: string): LengthSum {
  const trimmed = width.trim();
  if (trimmed.endsWith("rem")) return { px: 0, rem: Number.parseFloat(trimmed) };
  if (trimmed.endsWith("px")) return { px: Number.parseFloat(trimmed), rem: 0 };
  failDirectoryColumnMeta(`directory-sticky-columns: unsupported width "${width}" (only px/rem)`);
  return { px: 0, rem: 0 };
}

function formatLeft(sum: LengthSum): string {
  const parts: string[] = [];
  if (sum.px) parts.push(`${sum.px}px`);
  if (sum.rem) parts.push(`${sum.rem}rem`);
  if (parts.length === 0) return "0px";
  if (parts.length === 1) return parts[0]!;
  return `calc(${parts.join(" + ")})`;
}

const Z_FROZEN_BODY = 3;
const Z_FROZEN_HEAD = 6;

/**
 * Frozen block wider than this many CSS px eats most of a laptop/tablet viewport, leaving little
 * room to scroll the remaining columns. Screens should keep their DEFAULT freeze count under it.
 */
export const DIRECTORY_STICKY_VIEWPORT_WARN_PX = 720;

/** Total rendered width (px) of a frozen lead block — px + rem widths resolved against `remPx`. */
export function measureDirectoryStickyLeadWidthPx(
  entries: readonly DirectoryStickyLeadEntry[],
  remPx = 16,
): number {
  return entries.reduce((total, entry) => {
    const w = parseLength(entry.width);
    return total + w.px + w.rem * remPx;
  }, 0);
}

/** True when the frozen block exceeds the small-viewport warning threshold. */
export function directoryStickyLeadExceedsViewport(
  entries: readonly DirectoryStickyLeadEntry[],
  warnPx = DIRECTORY_STICKY_VIEWPORT_WARN_PX,
  remPx = 16,
): boolean {
  return measureDirectoryStickyLeadWidthPx(entries, remPx) > warnPx;
}

/** Build scoped CSS that freezes the given leading columns during horizontal scroll. */
export function buildDirectoryStickyColumnsCss(options: BuildDirectoryStickyColumnsCssOptions): string {
  const {
    scopeSelector,
    entries,
    headSurfaceVar = "--hub-directory-thead-surface",
    panelVar = "--panel",
    edgeShadow = true,
    leftMode = "css",
  } = options;

  if (entries.length === 0) return "";

  const panel = `var(${panelVar}, #121830)`;
  const head = `var(${headSurfaceVar}, ${panel})`;
  const scope = scopeSelector;

  // Measured mode: `left` comes from runtime CSS vars (set from real column widths), so any
  // width unit works. CSS mode: sum each column's fixed px/rem width into cumulative offsets.
  const lefts: string[] = [];
  if (leftMode === "measured") {
    for (let i = 0; i < entries.length; i += 1) {
      lefts.push(`var(${DIRECTORY_STICKY_LEFT_VAR_PREFIX}${i}, 0px)`);
    }
  } else {
    const running: LengthSum = { px: 0, rem: 0 };
    for (const entry of entries) {
      lefts.push(formatLeft({ ...running }));
      const w = parseLength(entry.width);
      running.px += w.px;
      running.rem += w.rem;
    }
  }

  const rules: string[] = [];

  entries.forEach((entry, index) => {
    const cc = entry.colClass;
    const left = lefts[index]!;
    rules.push(
      `${scope} thead th.${cc},\n${scope} tbody td.${cc}{position:sticky;left:${left};}`,
      `${scope} thead th.${cc}{z-index:${Z_FROZEN_HEAD};background:${head};}`,
      `${scope} tbody td.${cc}{z-index:${Z_FROZEN_BODY};background-color:${panel};}`,
      /* Pad slots stay sticky for H-scroll, but no --panel boxes / ghost grid. */
      `${scope} tbody tr.hub-users-row--pad td.${cc}{background:transparent;background-image:none;box-shadow:none;}`,
    );
  });

  const tdSel = (state: string) => entries.map((e) => `${scope} ${state} td.${e.colClass}`).join(",\n");

  for (const { selector, tint } of STICKY_ROW_STATE_TINTS) {
    rules.push(
      `${tdSel(selector)}{background-color:${panel};background-image:linear-gradient(${tint},${tint});}`,
    );
  }

  const firstCc = entries[0]!.colClass;
  for (const { selector, shadow } of STICKY_ROW_ACCENTS) {
    rules.push(`${scope} ${selector} td.${firstCc}{box-shadow:${shadow};}`);
  }

  const flashTdSel = entries.map((e) => `${scope} .hub-users-row.is-flash-border td.${e.colClass}`).join(",\n");
  rules.push(
    `${flashTdSel}{animation:hub-flash-border-directory-row-frozen var(--hub-flash-border-duration, 2s) ease-out both;}`,
  );

  if (edgeShadow && entries.length > 0) {
    const lastCc = entries[entries.length - 1]!.colClass;
    rules.push(
      `${scope}[data-sticky-scrolled="1"] thead th.${lastCc},\n${scope}[data-sticky-scrolled="1"] tbody tr:not(.hub-users-row--pad) td.${lastCc}{box-shadow:8px 0 8px -8px rgba(0,0,0,0.45);}`,
    );
  }

  return rules.join("\n");
}
