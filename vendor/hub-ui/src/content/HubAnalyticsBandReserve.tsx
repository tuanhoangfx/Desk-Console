import { MAX_VISIBLE_CHART } from "../display-prefs/chart-visible";
import { DEFAULT_KPI_ON_COUNT, MAX_VISIBLE_KPI } from "../display-prefs/kpi-visible";
import { clampBandSlotCount } from "../lib/analytics-band-count";
import { AnalyticsCaptionLabel } from "../shell/AnalyticsCaptionHint";
import { ChartsBand } from "../shell/ChartsBand";
import { KpiStrip, type KpiStripTone, type KpiTileData } from "../shell/KpiStrip";

export type HubAnalyticsReserveKpi = {
  label?: string;
  emojiGlyph?: string;
  prefKey?: string;
  tone?: KpiStripTone;
};

export type HubAnalyticsReserveChart = {
  title?: string;
  titleEmoji?: string;
};

export type HubAnalyticsReserveChrome = {
  kpiItems?: HubAnalyticsReserveKpi[];
  chartItems?: HubAnalyticsReserveChart[];
  kpiCount?: number;
  chartCount?: number;
};

/** Empty chart chrome — Display title + card frame only (no skeleton bars / 0 / —). INC-022. */
export function HubChartCardReserve({
  title,
  titleEmoji,
}: HubAnalyticsReserveChart) {
  return (
    <div className="hub-chart-card hub-chart-card--reserve rounded-2xl border border-white/5 bg-[var(--panel)] p-4">
      {title ? (
        <div className="mb-2 shrink-0">
          <AnalyticsCaptionLabel label={title} emojiGlyph={titleEmoji} />
        </div>
      ) : null}
      <div className="hub-chart-card__body" aria-hidden />
    </div>
  );
}

/**
 * Cold analytics band: real `hub-kpi-tile` + `hub-chart-card` frames.
 * Values stay blank until the live band hydrates — never paint 0 / — / grey pulse.
 */
export function HubAnalyticsBandReserve({
  kpiItems,
  chartItems,
  kpiCount = DEFAULT_KPI_ON_COUNT,
  chartCount = MAX_VISIBLE_CHART,
  bandOrder = "kpis-first",
}: HubAnalyticsReserveChrome & { bandOrder?: "kpis-first" | "charts-first" }) {
  const kpiSlots =
    kpiItems !== undefined
      ? kpiItems.slice(0, MAX_VISIBLE_KPI)
      : Array.from(
          { length: clampBandSlotCount(kpiCount, MAX_VISIBLE_KPI) || DEFAULT_KPI_ON_COUNT },
          (): HubAnalyticsReserveKpi => ({}),
        );
  const chartSlots =
    chartItems !== undefined
      ? chartItems.slice(0, MAX_VISIBLE_CHART)
      : Array.from(
          { length: clampBandSlotCount(chartCount, MAX_VISIBLE_CHART) || MAX_VISIBLE_CHART },
          (): HubAnalyticsReserveChart => ({}),
        );

  const kpis: KpiTileData[] = kpiSlots.map((item, i) => ({
    label: item.label ?? "",
    value: "",
    emojiGlyph: item.emojiGlyph,
    prefKey: item.prefKey ?? `reserve-kpi-${i}`,
    tone: item.tone ?? "indigo",
  }));

  const kpiRow = kpis.length ? <KpiStrip items={kpis} className="hub-kpi-strip--reserve-frames" /> : null;
  const chartsBand = chartSlots.length ? (
    <ChartsBand count={chartSlots.length} className="hub-charts-band--reserve-frames">
      {chartSlots.map((chart, i) => (
        <HubChartCardReserve key={chart.title ?? `reserve-chart-${i}`} title={chart.title} titleEmoji={chart.titleEmoji} />
      ))}
    </ChartsBand>
  ) : null;

  return bandOrder === "charts-first" ? (
    <>
      {chartsBand}
      {kpiRow}
    </>
  ) : (
    <>
      {kpiRow}
      {chartsBand}
    </>
  );
}
