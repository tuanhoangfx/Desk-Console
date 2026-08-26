import { useEffect, useMemo, useState, type ReactNode } from "react";
import { HubDirectoryScreen } from "./HubDirectoryScreen";
import type { FilterDef, FilterValues } from "../shell/FilterBar";
import type { HubDirectoryToolbarSelectionProps } from "../shell/HubDirectoryToolbarSelection";
import type { HubViewMode } from "../shell/ViewToggle";
import { subscribeHubListPrefs } from "../lib/hub-url-prefs";
import type { KpiTileData } from "../shell/KpiStrip";
import type { HubAnalyticsReserveChrome } from "../content/HubAnalyticsBandReserve";

function readVisibleFilterKeys(param: string): Set<string> | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get(param);
  return raw === null ? null : new Set(raw.split(",").filter(Boolean));
}

export type HubWorkspaceDirectoryScreenProps = {
  header: ReactNode;
  /** URL param for visible filter keys (Hub display prefs). */
  filterParam?: string;
  showSearch?: boolean;
  filters?: FilterDef[];
  query?: string;
  onQueryChange?: (q: string) => void;
  queryPending?: boolean;
  filterValues?: FilterValues;
  onFilterValuesChange?: (next: FilterValues) => void;
  filterPlaceholder?: string;
  filterShortcutScope?: string;
  searchDebounceMs?: number;
  directoryToolbar?: ReactNode;
  filterSelectionToolbar?: HubDirectoryToolbarSelectionProps;
  directoryViewMode?: HubViewMode;
  /** Row 2 leading — before filter dropdowns (e.g. active bot selector). */
  filterRowLeading?: ReactNode;
  filterRowActions?: ReactNode;
  kpis?: KpiTileData[];
  charts?: ReactNode;
  sectionRuleLabel?: string;
  reserveAnalyticsBand?: boolean;
  analyticsReserve?: HubAnalyticsReserveChrome;
  bodyFlex?: boolean;
  children: ReactNode;
};

/**
 * Generic directory chrome — filter visibility from URL prefs + HubDirectoryScreen body.
 * Tool adapters supply header (WorkspaceTabHeader / HubListChromeHeader wrappers).
 */
export function HubWorkspaceDirectoryScreen({
  header,
  filterParam,
  showSearch = true,
  filters = [],
  query = "",
  onQueryChange = () => {},
  queryPending = false,
  filterValues = {},
  onFilterValuesChange = () => {},
  filterPlaceholder,
  filterShortcutScope = "default",
  searchDebounceMs = 0,
  directoryToolbar,
  filterSelectionToolbar,
  directoryViewMode,
  filterRowLeading,
  filterRowActions,
  kpis,
  charts,
  sectionRuleLabel,
  reserveAnalyticsBand = false,
  analyticsReserve,
  bodyFlex = false,
  children,
}: HubWorkspaceDirectoryScreenProps) {
  const [visibleFilterKeys, setVisibleFilterKeys] = useState(() =>
    filterParam ? readVisibleFilterKeys(filterParam) : null,
  );

  useEffect(() => {
    if (!filterParam) return;
    const sync = () => setVisibleFilterKeys(readVisibleFilterKeys(filterParam));
    sync();
    return subscribeHubListPrefs(sync);
  }, [filterParam]);

  const visibleFilters = useMemo(() => {
    const keys = visibleFilterKeys ?? new Set(filters.map((filter) => filter.key));
    return filters.filter((filter) => keys.has(filter.key));
  }, [filters, visibleFilterKeys]);

  if (!showSearch) {
    return (
      <HubDirectoryScreen
        header={header}
        kpis={kpis}
        charts={charts}
        sectionRuleLabel={sectionRuleLabel}
        reserveAnalyticsBand={reserveAnalyticsBand}
        analyticsReserve={analyticsReserve}
        bodyFlex={bodyFlex}
      >
        {children}
      </HubDirectoryScreen>
    );
  }

  return (
    <HubDirectoryScreen
      header={header}
      filters={visibleFilters}
      query={query}
      onQueryChange={onQueryChange}
      queryPending={queryPending}
      filterValues={filterValues}
      onFilterValuesChange={onFilterValuesChange}
      filterPlaceholder={filterPlaceholder}
      filterShortcutScope={filterShortcutScope}
      searchDebounceMs={searchDebounceMs}
      directoryToolbar={directoryToolbar}
      filterSelectionToolbar={filterSelectionToolbar}
      directoryViewMode={directoryViewMode}
      filterRowLeading={filterRowLeading}
      filterRowActions={filterRowActions}
      kpis={kpis}
      charts={charts}
      sectionRuleLabel={sectionRuleLabel}
      reserveAnalyticsBand={reserveAnalyticsBand}
      analyticsReserve={analyticsReserve}
      bodyFlex={bodyFlex}
    >
      {children}
    </HubDirectoryScreen>
  );
}
