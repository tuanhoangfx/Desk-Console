import type { ReactNode } from "react";
import { ChartsBand } from "../shell/ChartsBand";
import { KpiStrip, type KpiTileData } from "../shell/KpiStrip";
import { HubTabSectionRule } from "../shell/HubTabSectionRule";
import {
  HubAnalyticsBandReserve,
  type HubAnalyticsReserveChrome,
} from "./HubAnalyticsBandReserve";

/**
 * P0004 HubListPage content bands below chrome:
 * mt-5 KPI/charts → section rule pill → space-y-3 main body.
 */
export function HubTabScreenBody({
  kpis,
  kpiBand,
  charts,
  chartCount,
  sectionRuleLabel,
  bodyFlex = false,
  reserveAnalyticsBand = false,
  analyticsReserve,
  bandOrder = "kpis-first",
  kpiZoneClassName,
  embedded = false,
  children,
}: {
  kpis?: KpiTileData[];
  /** Custom KPI row (e.g. sparkline tiles); takes precedence over `kpis`. */
  kpiBand?: ReactNode;
  charts?: ReactNode;
  chartCount?: number;
  sectionRuleLabel?: string;
  bodyFlex?: boolean;
  reserveAnalyticsBand?: boolean;
  /** Optional labels/slot counts for the cold KPI + chart frames (no 0 / —). */
  analyticsReserve?: HubAnalyticsReserveChrome;
  bandOrder?: "kpis-first" | "charts-first";
  kpiZoneClassName?: string;
  embedded?: boolean;
  children: ReactNode;
}) {
  const hasAnalytics = Boolean(kpiBand || kpis?.length || charts);
  const showAnalyticsZone = hasAnalytics || reserveAnalyticsBand;
  const showSectionRule = Boolean(sectionRuleLabel && (hasAnalytics || reserveAnalyticsBand));
  const bodyClass = bodyFlex
    ? "hub-tab-body-zone hub-tab-body-zone--split space-y-3"
    : "hub-tab-body-zone space-y-3";

  const showReserve = Boolean(!hasAnalytics && reserveAnalyticsBand);
  const kpiRow = kpiBand ?? (kpis?.length ? <KpiStrip items={kpis} /> : null);

  const chartsBand = charts ? <ChartsBand count={chartCount}>{charts}</ChartsBand> : null;

  const inner = (
    <>
      {showAnalyticsZone ? (
        <div
          className={[
            "hub-tab-kpi-zone flex flex-col",
            showReserve ? "hub-tab-kpi-zone--reserved" : "",
            kpiZoneClassName ?? "",
          ]
            .filter(Boolean)
            .join(" ")}
          {...(showReserve
            ? { "data-hub-analytics-reserve": "", "aria-busy": true }
            : {})}
        >
          {showReserve ? (
            <HubAnalyticsBandReserve {...analyticsReserve} bandOrder={bandOrder} />
          ) : bandOrder === "charts-first" ? (
            <>
              {chartsBand}
              {kpiRow}
            </>
          ) : (
            <>
              {kpiRow}
              {chartsBand}
            </>
          )}
        </div>
      ) : null}
      {showSectionRule ? <HubTabSectionRule label={sectionRuleLabel!} /> : null}
      <div className={bodyClass}>{children}</div>
    </>
  );

  if (embedded) return inner;
  return <div className="hub-tab-content-zone">{inner}</div>;
}
