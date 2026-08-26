import type { ReactNode } from "react";
import { FilterBar, type FilterDef, type FilterValues } from "../shell/FilterBar";
import type { HubDirectoryToolbarSelectionProps } from "../shell/HubDirectoryToolbarSelection";
import { buildHubDirectorySelectionSlots } from "../shell/hubDirectorySelectionSlots";
import type { HubViewMode } from "../shell/ViewToggle";
import type { SettingsExtraTab } from "../display-prefs/types";
import type { TabHeaderStatItem } from "../shell/AppTabHeader";
import type { KpiTileData } from "../shell/KpiStrip";
import { HubDirectoryFieldQueryPendingProvider } from "../shell/HubDirectoryFieldQueryPending";
import { HubDirectorySelectionChromeProvider } from "../shell/HubDirectorySelectionChromeContext";
import { HubTabChrome, useHubChromePrefs } from "../shell/HubTabChrome";
import { HubTabScreenBody } from "../content/HubTabScreenBody";
import type { HubAnalyticsReserveChrome } from "../content/HubAnalyticsBandReserve";

export type HubDirectoryScreenProps = {
  /** App-built tab header (e.g. ConsoleTabHeader, AppTabHeader). */
  header: ReactNode;
  centerStats?: TabHeaderStatItem[];
  kpis?: KpiTileData[];
  kpiBand?: ReactNode;
  charts?: ReactNode;
  chartCount?: number;
  sectionRuleLabel?: string;
  reserveAnalyticsBand?: boolean;
  analyticsReserve?: HubAnalyticsReserveChrome;
  bandOrder?: "kpis-first" | "charts-first";
  kpiZoneClassName?: string;
  filters?: FilterDef[];
  query?: string;
  onQueryChange?: (q: string) => void;
  queryPending?: boolean;
  filterValues?: FilterValues;
  onFilterValuesChange?: (v: FilterValues) => void;
  filterPlaceholder?: string;
  /** FilterBar keyboard focus scope (e.g. `library`, `bots`). */
  filterShortcutScope?: string;
  /** Debounce filter query in HubSearchField — avoids directory chrome re-render per keystroke. */
  searchDebounceMs?: number;
  /** Filters/actions only — no HubSearchField (e.g. Performance Staff: time + bulk). */
  hideSearch?: boolean;
  /**
   * Searchbar Lite single row (default when hideSearch). Pass false to keep stacked hub rows without search.
   */
  searchbarLite?: boolean;
  filterToolbar?: ReactNode;
  /** `x/y` selection chip — table: toolbar leading (before ViewToggle) · card: filter row-2 trailing. */
  filterSelectionToolbar?: HubDirectoryToolbarSelectionProps;
  /** Placement for `filterSelectionToolbar` (default `table`). */
  directoryViewMode?: HubViewMode;
  /** Row 2 leading — before filter dropdowns (e.g. active bot selector). */
  filterRowLeading?: ReactNode;
  filterRowActions?: ReactNode;
  settingsExtraTabs?: SettingsExtraTab[];
  /** ViewToggle + HubResultCount — rendered in FilterBar toolbar when filters/search enabled */
  directoryToolbar?: ReactNode;
  bodyFlex?: boolean;
  children: ReactNode;
};

/**
 * Golden **directory** template: Hub tab header + FilterBar + KPI/charts + section rule + table/card body.
 * Golden screens: P0004 Users/Hub list; P0006 Bots/Groups/Channels (via app TabScreenChrome wrapper).
 */
export function HubDirectoryScreen({
  header,
  kpis,
  kpiBand,
  charts,
  chartCount,
  sectionRuleLabel,
  reserveAnalyticsBand = false,
  analyticsReserve,
  bandOrder,
  kpiZoneClassName,
  filters = [],
  query = "",
  onQueryChange,
  queryPending = false,
  filterValues = {},
  onFilterValuesChange,
  filterPlaceholder = "Search…",
  filterShortcutScope = "default",
  searchDebounceMs = 0,
  hideSearch = false,
  searchbarLite,
  filterToolbar,
  filterSelectionToolbar,
  directoryViewMode = "table",
  filterRowLeading,
  filterRowActions,
  directoryToolbar,
  bodyFlex = false,
  children,
}: HubDirectoryScreenProps) {
  const { searchPin, headerPin, stackChrome } = useHubChromePrefs();
  const showFilterBar =
    Boolean(onQueryChange) ||
    Boolean(filterRowLeading || filterRowActions || directoryToolbar || filterToolbar) ||
    filters.length > 0;
  const noopQuery = onQueryChange ?? (() => {});
  const noopFilterValues = onFilterValuesChange ?? (() => {});
  const selectionSlots = buildHubDirectorySelectionSlots(filterSelectionToolbar, directoryViewMode);
  const effectiveHideSearch = hideSearch || !onQueryChange;

  const filterBar = showFilterBar ? (
    <FilterBar
      shortcutScope={filterShortcutScope}
      layout="hub"
      pinSticky={searchPin && !stackChrome}
      headerPinned={headerPin}
      embedded={stackChrome}
      placeholder={filterPlaceholder}
      filters={filters}
      query={query}
      onQueryChange={noopQuery}
      queryPending={queryPending}
      values={filterValues}
      onValuesChange={noopFilterValues}
      searchTrailing={selectionSlots.searchTrailing}
      toolbar={
        selectionSlots.toolbarLeading || directoryToolbar || filterToolbar ? (
          <>
            {selectionSlots.toolbarLeading}
            {directoryToolbar}
            {filterToolbar}
          </>
        ) : undefined
      }
      row2Leading={filterRowLeading}
      row2Actions={filterRowActions}
      row2Trailing={selectionSlots.row2Trailing}
      searchDebounceMs={searchDebounceMs}
      hideSearch={effectiveHideSearch}
      searchbarLite={searchbarLite}
    />
  ) : undefined;

  return (
    <HubDirectoryFieldQueryPendingProvider>
      <HubDirectorySelectionChromeProvider active={Boolean(filterSelectionToolbar)}>
        <HubTabChrome header={header} filterBar={filterBar}>
          <HubTabScreenBody
            kpis={kpis}
            kpiBand={kpiBand}
            charts={charts}
            chartCount={chartCount}
            sectionRuleLabel={sectionRuleLabel}
            reserveAnalyticsBand={reserveAnalyticsBand}
            analyticsReserve={analyticsReserve}
            bandOrder={bandOrder}
            kpiZoneClassName={kpiZoneClassName}
            bodyFlex={bodyFlex}
          >
            {children}
          </HubTabScreenBody>
        </HubTabChrome>
      </HubDirectorySelectionChromeProvider>
    </HubDirectoryFieldQueryPendingProvider>
  );
}
