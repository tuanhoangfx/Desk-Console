import type { ReactNode } from "react";
import { HubLogRail, type HubLogRailProps } from "./HubLogRail";

export type HubChartsLogSplitProps = {
  children?: ReactNode;
  /** When false, render children only (full hero / original chart band). */
  showLog?: boolean;
  /** When false, render Log rail only (right 2fr). */
  showChart?: boolean;
  logProps?: Omit<HubLogRailProps, "className">;
  className?: string;
};

/**
 * Full-width charts-band row (same size as hero chart) with inner 8fr / 2fr Log.
 * Direct band children that are not `.hub-chart-card--hero` only fill 1 of 4 slots.
 */
export function HubChartsLogSplit({
  children,
  showLog = true,
  showChart = true,
  logProps,
  className = "",
}: HubChartsLogSplitProps) {
  const chart = showChart ? children : null;
  const log = showLog ? <HubLogRail compact variant="tab" {...logProps} /> : null;

  if (!chart && !log) return null;
  if (chart && !log) return <>{chart}</>;
  /** Log-only: compact rail without empty 8fr chart column (avoids blank analytics band). */
  if (!chart && log) {
    return (
      <div
        data-hub-charts-log-split=""
        data-hub-charts-log-split-log-only=""
        className={`hub-charts-band__full hub-charts-split-log-only${className ? ` ${className}` : ""}`}
      >
        {log}
      </div>
    );
  }

  return (
    <div
      data-hub-charts-log-split=""
      className={`hub-charts-band__full hub-charts-split-8-2${className ? ` ${className}` : ""}`}
    >
      <div className="hub-charts-split-8-2__main">{chart}</div>
      {log}
    </div>
  );
}
