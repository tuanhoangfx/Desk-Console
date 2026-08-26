import type { ReactNode } from "react";
import { CHART_TOP_N, type ChartRow } from "../chart-items";
import type { PrefItem } from "../display-prefs/types";
import { chartPanelTitleFromDefs } from "../lib/chart-panel-titles";
import { MiniBarChart } from "./MiniBarChart";
import { MiniDonut } from "./MiniDonut";

function isDonutChartKey(key: string): boolean {
  return key.endsWith("_donut");
}

/**
 * Allowlist only — `topN > CHART_TOP_N` (3) is forbidden unless the facet is a
 * fixed band that fills exactly `--hub-chart-bar-rows: 4`, either as 4 real
 * buckets (contact channels) or as 3 buckets + an always-rendered `Other`
 * rollup emitted by the aggregate (P0005 order status SSOT).
 * Slot / Price / open vocab → default `CHART_TOP_N` (3 + Other).
 */
const BAR_CHART_TOP_N: Record<string, number> = {
  contact_bar: 4,
  customers_bar: 4,
  day_bar: 4,
  notify_bar: 4,
  order_status_bar: 4,
  pay_status_bar: 4,
  // Todo board — fixed 3 buckets + always-rendered Other (P0005 order band SSOT).
  status_bar: 4,
  priority_bar: 4,
  deadline_bar: 4,
  // Users directory — fixed 4-bucket facets (Role+Other · Status+Other · Tools · Created · Last active+Other).
  role_bar: 4,
  activity_bar: 4,
  tool_bar: 4,
  distribution_bar: 4,
  last_active_bar: 4,
  created_bar: 4,
  identity_bar: 4,
};

/** Fixed-bucket facets — keep aggregate row order (not value-rank). */
const BAR_CHART_PRESERVE_ORDER = new Set([
  "contact_bar",
  "customers_bar",
  "day_bar",
  "notify_bar",
  "order_status_bar",
  "pay_status_bar",
  "status_bar",
  "priority_bar",
  "deadline_bar",
  "role_bar",
  "activity_bar",
  "tool_bar",
  "distribution_bar",
  "last_active_bar",
  "created_bar",
  "identity_bar",
]);

export type DirectoryChartBandProps = {
  visCharts: Set<string>;
  defs: PrefItem[];
  data: Record<string, ChartRow[] | undefined>;
  onItemClick?: (chartKey: string, item: ChartRow) => void;
};

export function hasDirectoryCharts(
  visCharts: Set<string>,
  defs: PrefItem[],
  data: Record<string, ChartRow[] | undefined>,
): boolean {
  return defs.some((d) => visCharts.has(d.key) && data[d.key]);
}

/** Pass to `HubDirectoryScreen` `charts` only when ≥1 chart visible — avoids empty analytics frame. */
export function directoryChartBandNode(props: DirectoryChartBandProps): ReactNode | undefined {
  return hasDirectoryCharts(props.visCharts, props.defs, props.data) ? (
    <DirectoryChartBand {...props} />
  ) : undefined;
}

/** Golden directory charts row — defs order, Display prefs visibility, MiniBarChart + top-N/Other. */
export function DirectoryChartBand({ visCharts, defs, data, onItemClick }: DirectoryChartBandProps) {
  const keys = defs.map((d) => d.key).filter((k) => visCharts.has(k) && data[k]);
  if (keys.length === 0) return null;
  return (
    <>
      {keys.map((key) => {
        const def = defs.find((d) => d.key === key);
        const title = chartPanelTitleFromDefs(defs, key);
        const items = data[key]!;
        const titleEmoji = def?.emoji;
        const titleHint = def?.labelHint;
        const topN = BAR_CHART_TOP_N[key] ?? CHART_TOP_N;
        const preserveOrder = BAR_CHART_PRESERVE_ORDER.has(key);
        return isDonutChartKey(key) ? (
          <MiniDonut key={key} title={title} titleEmoji={titleEmoji} titleHint={titleHint} items={items} />
        ) : (
          <MiniBarChart
            key={key}
            title={title}
            titleEmoji={titleEmoji}
            titleHint={titleHint}
            items={items}
            topN={topN}
            preserveOrder={preserveOrder}
            onItemClick={onItemClick ? (item) => onItemClick(key, item) : undefined}
          />
        );
      })}
    </>
  );
}
