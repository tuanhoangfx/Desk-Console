/** Golden Hub sparkline rank fills — P0004 directory charts (top 3 + neutral Other). */
export const CHART_RANK_COLORS = ["#22c55e", "#a855f7", "#60a5fa"] as const;

export const CHART_OTHERS_BAR_COLOR = "#64748b";

export const DEFAULT_CHART_PALETTE = [...CHART_RANK_COLORS, CHART_OTHERS_BAR_COLOR] as const;

/** Canonical `Other` + legacy `Others` for rollup bar detection. */
export const CHART_OTHERS_LABELS = new Set(["Other", "Others"]);

export function isChartOthersLabel(label: string): boolean {
  return CHART_OTHERS_LABELS.has(label.trim());
}

/** Rank-based bar color — index 0–2 vivid, slot 3 / Other neutral grey. */
export function chartRankBarColor(index: number, label?: string): string {
  if (label && isChartOthersLabel(label)) return CHART_OTHERS_BAR_COLOR;
  if (index >= CHART_RANK_COLORS.length) return CHART_OTHERS_BAR_COLOR;
  return CHART_RANK_COLORS[index]!;
}
