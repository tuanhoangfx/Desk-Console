import type { HubDirectoryColumnHintLine } from "../table/HubDirectoryColumnHint";

/** Semantic count tiers for directory metric badges (linked services, tool counts, …). */

/**
 * Design lock V1 Heat sequential (2026-07-18) — Mail SL / Service count / CRM Qty.
 * Bands: 0 · 1 · 2–5 · 6–9 · 10–20 · >20
 * Count `1` = green · `6–9` = yellow · `10–20` = orange.
 */
export type HubDirectoryMetricTier = "empty" | "one" | "few" | "mid" | "high" | "hot";

export const HUB_DIRECTORY_METRIC_TIER_THRESHOLDS = {
  one: 1,
  fewMax: 5,
  midMax: 9,
  highMax: 20,
} as const;

/** Short legend for cell hover / description strings (Mail Sub / Usage). */
export const HUB_DIRECTORY_METRIC_HEAT_LEGEND =
  "Heat: 0 Muted · 1 Green · 2–5 Sky · 6–9 Yellow · 10–20 Orange · >20 Rose";

const HEAT_DOT = "hub-directory-metric-heat-dot";

/**
 * Rich Option lines for column-header tooltips (Qty / Orders / Usage).
 * Label style matches Update activity-age legend — capitalized colour name.
 */
export const HUB_DIRECTORY_METRIC_HEAT_LEGEND_LINES: HubDirectoryColumnHintLine[] = [
  { label: "0", detail: "Muted", dotClassName: `${HEAT_DOT} ${HEAT_DOT}--empty` },
  { label: "1", detail: "Green", dotClassName: `${HEAT_DOT} ${HEAT_DOT}--one` },
  { label: "2–5", detail: "Sky", dotClassName: `${HEAT_DOT} ${HEAT_DOT}--few` },
  { label: "6–9", detail: "Yellow", dotClassName: `${HEAT_DOT} ${HEAT_DOT}--mid` },
  { label: "10–20", detail: "Orange", dotClassName: `${HEAT_DOT} ${HEAT_DOT}--high` },
  { label: ">20", detail: "Rose", dotClassName: `${HEAT_DOT} ${HEAT_DOT}--hot` },
];

export function resolveHubDirectoryMetricTier(count: number): HubDirectoryMetricTier {
  if (count <= 0) return "empty";
  if (count === HUB_DIRECTORY_METRIC_TIER_THRESHOLDS.one) return "one";
  if (count <= HUB_DIRECTORY_METRIC_TIER_THRESHOLDS.fewMax) return "few";
  if (count <= HUB_DIRECTORY_METRIC_TIER_THRESHOLDS.midMax) return "mid";
  if (count <= HUB_DIRECTORY_METRIC_TIER_THRESHOLDS.highMax) return "high";
  return "hot";
}

export function hubDirectoryMetricHeatDotClass(count: number): string {
  const tier = resolveHubDirectoryMetricTier(count);
  return `${HEAT_DOT} ${HEAT_DOT}--${tier}`;
}

export function hubDirectoryMetricTierClass(tier: HubDirectoryMetricTier): string {
  return `hub-directory-metric-badge--${tier}`;
}
