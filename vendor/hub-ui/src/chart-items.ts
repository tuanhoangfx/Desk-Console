import { Pencil } from "lucide-react";
import type { FilterIconMeta } from "./types/filter-badge";
import type { HubDirectoryColumnHintContent } from "./table/HubDirectoryColumnHint";
import type { HubBrandIconShell } from "./shell/filter-dropdown-primitives";
import { isChartOthersLabel } from "./lib/chart-palette";

export type ChartLegendIcon = FilterIconMeta;

export type ChartRow = {
  label: string;
  value: number;
  color?: string;
  iconMeta?: FilterIconMeta | null;
  /** Sticker emoji — takes precedence over iconMeta in chart legends. */
  emojiGlyph?: string;
  /** Brand image — takes precedence over iconMeta when set. */
  iconSrc?: string;
  /** Dedicated + hyphen-family fallbacks — legend walks on 404. */
  iconSrcs?: string[];
  iconShell?: HubBrandIconShell;
  /** Popover hint for legend row (bucket semantics). */
  labelHint?: HubDirectoryColumnHintContent;
};

/** Chart rollup bucket - SSOT singular `Other` (legacy `Others` still matched in palette). */
export const CHART_OTHERS_LABEL = "Other";

/** Chart rollup sticker — workspace SSOT (P0020 `TWOFA_UI_BUCKET.other`). */
export const CHART_OTHERS_EMOJI = "📂";

/** Top-N legend rows shown in MiniBarChart / MiniDonut (+1 Other bucket). */
export const CHART_TOP_N = 3;
export const CHART_LEGEND_SLOT_COUNT = CHART_TOP_N + 1;

const FALLBACK_LEGEND: Record<string, FilterIconMeta> = {
  Draft: { icon: Pencil, className: "text-amber-300" },
};

let resolveLegend: ((label: string) => FilterIconMeta | null) | null = null;

/** Host app wires P0004 `resolveChartLegendIcon` for full registry parity. */
export function configureChartLegend(resolve: (label: string) => FilterIconMeta | null) {
  resolveLegend = resolve;
}

function legendFor(label: string): FilterIconMeta | null {
  const key = label.trim();
  if (isChartOthersLabel(key)) return null;
  return resolveLegend?.(key) ?? FALLBACK_LEGEND[key] ?? null;
}

export function withChartLegendIcon<T extends ChartRow>(row: T): T {
  if (isChartOthersLabel(row.label)) {
    return { ...row, emojiGlyph: row.emojiGlyph ?? CHART_OTHERS_EMOJI, iconMeta: null } as T;
  }
  /** Directory sticker wins — legend keeps the same glyph the table cell shows. */
  if (row.emojiGlyph) {
    return { ...row, iconMeta: null } as T;
  }
  /** Heat / status / quantity dots win — never force the folder sticker over an explicit color. */
  if (row.color) {
    return { ...row, iconMeta: null } as T;
  }
  if (row.emojiGlyph) return row;
  const iconMeta = row.iconMeta ?? legendFor(row.label);
  return iconMeta ? { ...row, iconMeta } : row;
}

export function topChartItems<T extends ChartRow>(
  items: T[],
  topN = CHART_TOP_N,
  othersLabel = CHART_OTHERS_LABEL,
  preserveOrder = false,
): T[] {
  const sorted = preserveOrder
    ? [...items]
    : [...items].sort((a, b) => {
        const aOther = isChartOthersLabel(a.label);
        const bOther = isChartOthersLabel(b.label);
        if (aOther !== bOther) return aOther ? 1 : -1;
        return b.value - a.value;
      });
  if (sorted.length === 0) return [];
  const head = sorted.slice(0, topN).map((row) => withChartLegendIcon(row));
  const rest = sorted.slice(topN);
  if (rest.length === 0) return head;
  const restHasExplicitOther = rest.some((row) => isChartOthersLabel(row.label));
  const othersValue = rest.reduce((sum, row) => sum + row.value, 0);
  if (othersValue <= 0 && !restHasExplicitOther) return head;
  return [
    ...head,
    withChartLegendIcon({ label: othersLabel, value: othersValue, emojiGlyph: CHART_OTHERS_EMOJI } as T),
  ];
}

export type PrepareChartItemsOptions = {
  /** Visible buckets before Remaining → Other (default `CHART_TOP_N`). */
  topN?: number;
  /** Keep input order (fixed-bucket day/notify charts). */
  preserveOrder?: boolean;
};

export function prepareChartItems<T extends ChartRow>(
  items: T[],
  opts?: PrepareChartItemsOptions,
): T[] {
  return topChartItems(
    items,
    opts?.topN ?? CHART_TOP_N,
    CHART_OTHERS_LABEL,
    Boolean(opts?.preserveOrder),
  );
}
