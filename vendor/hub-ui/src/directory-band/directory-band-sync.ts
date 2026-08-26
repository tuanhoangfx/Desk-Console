import type { KpiTileData } from "../shell/KpiStrip";

/** Stable signature for directory KPI sync effects (avoids setState loops). */
export function kpiTilesSignature(kpis: KpiTileData[] | undefined): string {
  if (!kpis?.length) return "";
  return kpis.map((k) => `${k.prefKey ?? k.label}:${String(k.value)}:${k.hint ?? ""}`).join("|");
}

/** Visible chart pref keys in display order. */
export function chartKeysSignature(visible: Set<string>, orderedKeys: readonly string[]): string {
  return orderedKeys.filter((key) => visible.has(key)).join(",");
}

/** Bar chart data fingerprint for directory charts band sync. */
export function barChartSeriesSignature(series: readonly { label: string; value: number }[]): string {
  return series.map((item) => `${item.label}:${item.value}`).join(",");
}

export function visibleKpiKeysSignature(stored: Set<string> | null): string {
  return stored === null ? "__null__" : [...stored].sort().join(",");
}
