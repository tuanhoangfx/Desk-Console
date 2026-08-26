import type { FilterIconMeta } from "../types/filter-badge";
import type { HubDirectoryColumnHintContent } from "../table/HubDirectoryColumnHint";
import { CHART_TOP_N, prepareChartItems } from "../chart-items";
import { chartRankBarColor, isChartOthersLabel, CHART_OTHERS_BAR_COLOR } from "../lib/chart-palette";
import { hubValueBandColor } from "../lib/hub-value-band";
import { AnalyticsCaptionLabel, ChartLegendRowLabel } from "./AnalyticsCaptionHint";
import { type HubBrandIconShell } from "./filter-dropdown-primitives";
import { HUB_SHELL_LABEL_TYPO_CLASS } from "./hub-typography";

export type BarItem = {
  label: string;
  value: number;
  color?: string;
  iconMeta?: FilterIconMeta | null;
  emojiGlyph?: string;
  iconSrc?: string;
  iconSrcs?: string[];
  iconShell?: HubBrandIconShell;
  labelHint?: HubDirectoryColumnHintContent;
};

export type MiniBarChartColorMode = "value-band" | "rank";

function fmtInt(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n);
}

function resolveBarColor(
  item: BarItem,
  index: number,
  max: number,
  colorMode: MiniBarChartColorMode,
): string {
  if (item.color) return item.color;
  if (isChartOthersLabel(item.label)) return CHART_OTHERS_BAR_COLOR;
  if (colorMode === "rank") return chartRankBarColor(index, item.label);
  return hubValueBandColor(item.value, max);
}

export function MiniBarChart({
  title,
  titleEmoji,
  titleHint,
  items,
  max,
  formatter,
  colorMode = "rank",
  topN,
  preserveOrder,
  onItemClick,
}: {
  title: string;
  titleEmoji?: string;
  titleHint?: HubDirectoryColumnHintContent;
  items: BarItem[];
  max?: number;
  formatter?: (n: number) => string;
  /** `rank` — golden top-3 palette + grey Other. `value-band` — optional ratio gradient. */
  colorMode?: MiniBarChartColorMode;
  /** Override Hub `CHART_TOP_N` (rare). Default → 3 + Other = 4 legend rows. */
  topN?: number;
  /** Keep input legend order (fixed-bucket charts). */
  preserveOrder?: boolean;
  /** Directory drill-down — same FilterBar keys as KPI click. */
  onItemClick?: (item: BarItem) => void;
}) {
  const rows = prepareChartItems(
    items,
    topN != null || preserveOrder ? { topN, preserveOrder } : undefined,
  );
  const m = max ?? Math.max(1, ...rows.map((i) => i.value));
  const fmt = formatter ?? fmtInt;

  return (
    <div className="hub-chart-card rounded-2xl border border-white/5 bg-[var(--panel)] p-4">
      <div className="mb-2 shrink-0">
        <AnalyticsCaptionLabel label={title} emojiGlyph={titleEmoji} labelHint={titleHint} />
      </div>
      <ul className="hub-chart-card__body space-y-1.5">
        {rows.map((it, i) => {
          const pct = Math.max(2, (it.value / m) * 100);
          const color = resolveBarColor(it, i, m, colorMode);
          const othersRow = isChartOthersLabel(it.label);
          return (
            <li
              key={`${it.label}-${i}`}
              className={`hub-chart-row anim-slide${onItemClick ? " hub-chart-row--interactive cursor-pointer" : ""}`}
              onClick={onItemClick ? () => onItemClick(it) : undefined}
              onKeyDown={
                onItemClick
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onItemClick(it);
                      }
                    }
                  : undefined
              }
              role={onItemClick ? "button" : undefined}
              tabIndex={onItemClick ? 0 : undefined}
            >
              <ChartLegendRowLabel
                label={it.label}
                iconSrc={it.iconSrc}
                iconSrcs={it.iconSrcs}
                iconShell={it.iconShell}
                iconMeta={it.iconMeta}
                emojiGlyph={it.emojiGlyph}
                labelHint={it.labelHint}
                colorDot={!it.iconSrc && !it.emojiGlyph ? color : undefined}
              />
              <div className="relative h-1.5 min-w-0 overflow-hidden rounded-full bg-white/5">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out"
                  style={{
                    width: `${pct}%`,
                    background: color,
                    ...(othersRow ? {} : { boxShadow: `0 0 12px ${color}55` }),
                  }}
                />
              </div>
              <span
                className="hub-chart-row__value tabular-nums"
                style={colorMode === "value-band" ? { color } : undefined}
              >
                {fmt(it.value)}
              </span>
            </li>
          );
        })}
        {rows.length === 0 ? (
          <li className={`py-3 text-center text-[var(--muted)] ${HUB_SHELL_LABEL_TYPO_CLASS}`}>—</li>
        ) : null}
      </ul>
    </div>
  );
}
