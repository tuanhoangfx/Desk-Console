import type { ReactNode } from "react";
import { HubDirectoryScreen, type HubDirectoryScreenProps } from "./HubDirectoryScreen";

export type HubDashboardScreenProps = HubDirectoryScreenProps;

/**
 * Golden **dashboard** template: sticky header + FilterBar + KPI strip + charts + section rule + body.
 * Same layout as `HubDirectoryScreen`; default section pill label is `Overview`.
 * Golden: P0016 `DashboardScreen` · P0008 dashboard (table migration deferred).
 */
export function HubDashboardScreen({
  sectionRuleLabel = "Overview",
  kpis,
  charts,
  children,
  ...rest
}: HubDashboardScreenProps) {
  return (
    <HubDirectoryScreen sectionRuleLabel={sectionRuleLabel} kpis={kpis} charts={charts} {...rest}>
      {children}
    </HubDirectoryScreen>
  );
}
