import type { ReactNode } from "react";
import { MAX_VISIBLE_CHART } from "../display-prefs/chart-visible";
import { clampBandSlotCount, countAnalyticsBandSlots } from "../lib/analytics-band-count";

/** Resolve chart band slot count (max {@link MAX_VISIBLE_CHART}) for `data-chart-count`. */
export function resolveChartsBandCount(node: ReactNode, override?: number): number {
  if (node == null || node === false) return 0;
  const raw = override ?? countAnalyticsBandSlots(node);
  return clampBandSlotCount(raw, MAX_VISIBLE_CHART);
}

/**
 * Golden charts row — `hub-charts-band` + `data-chart-count` (max 4 slots).
 * Layout CSS: `hub-shell-layout.css` (1–3 → ¼ slot, 4 → full row).
 */
export function ChartsBand({
  children,
  count,
  className = "",
  reserve = false,
}: {
  children?: ReactNode;
  /** Override auto-count (facet charts in a fragment). */
  count?: number;
  className?: string;
  reserve?: boolean;
}) {
  if (reserve) {
    return (
      <div
        className={`hub-charts-band hub-charts-band--reserve${className ? ` ${className}` : ""}`}
        aria-hidden
      />
    );
  }

  if (children == null || children === false) return null;

  const slotCount = resolveChartsBandCount(children, count);

  return (
    <div
      className={`hub-charts-band${className ? ` ${className}` : ""}`.trim()}
      data-chart-count={slotCount}
    >
      {children}
    </div>
  );
}
