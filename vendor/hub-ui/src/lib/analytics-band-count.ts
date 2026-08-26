import { Children, Fragment, isValidElement, type ReactNode } from "react";
import { MAX_VISIBLE_CHART } from "../display-prefs/chart-visible";
import { MAX_VISIBLE_KPI } from "../display-prefs/kpi-visible";

/** Golden analytics band caps — KPI max 8, Charts max 4. */
export const ANALYTICS_BAND_MAX = {
  kpi: MAX_VISIBLE_KPI,
  chart: MAX_VISIBLE_CHART,
} as const;

/** Clamp slot count for `data-kpi-count` / `data-chart-count` (0 → 0, else 1…max). */
export function clampBandSlotCount(count: number, max: number): number {
  if (count <= 0) return 0;
  return Math.min(max, Math.max(1, count));
}

/** Count visible analytics band slots (fragment children; skips null/false). */
export function countAnalyticsBandSlots(node: ReactNode): number {
  let n = 0;
  Children.forEach(node, (child) => {
    if (child == null || child === false) return;
    if (isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment) {
      n += countAnalyticsBandSlots(child.props.children);
      return;
    }
    n++;
  });
  return n;
}
