import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Play, RotateCcw, Trash2, Eye, type LucideIcon } from "lucide-react";
import {
  HubBulkActionButton,
  HubDirectoryBulkActionBar,
  HubDirectoryScreen,
  HubInactiveTabContent,
  HubListChromeHeader,
  HubPaginatedCardGrid,
  attachDirectoryKpiClicks,
  isHubPrefVisible,
  kpiClearAllIfAny,
  kpiSetOrClear,
  matchesWorkspacePeriod,
  readHubListPrefsCore,
  sameFilterValues,
  subscribeHubListPrefs,
  useHubClientDirectorySearchQuery,
  useHubDirectorySelection,
  useHubTablePageSize,
  useStableDirectoryFilterToolbar,
  useWorkspacePeriod,
  type FilterValues,
  type HubSortDir,
  type HubViewMode,
  type KpiTileData,
} from "@tool-workspace/hub-ui";
import { DeskDirectorySearchToolbar } from "../../components/DeskDirectorySearchToolbar";
import { TabHeaderActions } from "../../components/TabHeaderActions";
import type { AppScreen } from "../../lib/app-screen";
import { deskVersionMetaItems } from "../../lib/app-release";
import { SCREEN_DISPLAY_PREFS } from "../../lib/display-prefs-registry";
import { DeskDirectoryCard } from "./DeskDirectoryCard";
import { DeskDirectoryTable, type DeskRow } from "./DeskDirectoryTable";
import { DESK_STATUS_FILTER_KEY, deskStatusFilterDef, matchesDeskStatusFilter } from "./desk-directory-filters";
import type { DeskCol } from "./desk-table-prefs";

const VIEW_STORAGE_PREFIX = "p0001:view:";

function readViewMode(screen: AppScreen): HubViewMode {
  try {
    return sessionStorage.getItem(`${VIEW_STORAGE_PREFIX}${screen}`) === "card" ? "card" : "table";
  } catch {
    return "table";
  }
}

type Props = {
  screen: AppScreen;
  title: string;
  titleIcon: LucideIcon;
  titleIconClass?: string;
  sectionRuleLabel: string;
  rows: DeskRow[];
  tabActive?: boolean;
  showPeriod?: boolean;
  toolbarActions?: ReactNode;
  sideRail?: ReactNode;
  opsHandlers?: import("./desk-directory-cells").DeskOpsCellHandlers;
  bulkActions?: { label: string; tone?: "rose" | "neutral" | "emerald" | "amber"; icon?: LucideIcon; onClick: (ids: string[]) => void }[];
};

export function DeskDirectoryScreen({
  screen,
  title,
  titleIcon,
  titleIconClass = "text-emerald-300",
  sectionRuleLabel,
  rows,
  tabActive = true,
  showPeriod = true,
  toolbarActions,
  sideRail,
  opsHandlers,
  bulkActions,
}: Props) {
  const search = useHubClientDirectorySearchQuery();
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [sortKey, setSortKey] = useState<DeskCol>("updated");
  const [sortDir, setSortDir] = useState<HubSortDir>("desc");
  const [viewMode, setViewModeState] = useState<HubViewMode>(() => readViewMode(screen));
  const [prefs, setPrefs] = useState(readHubListPrefsCore);
  const period = useWorkspacePeriod(screen, "all");
  const pageSize = useHubTablePageSize();
  const display = SCREEN_DISPLAY_PREFS[screen];
  const defaultKpiKeys = useMemo(() => new Set(display?.defaultKpiKeys ?? ["total"]), [display]);
  const defaultFilterKeys = useMemo(() => new Set(display?.defaultFilterKeys ?? ["status"]), [display]);

  useEffect(() => subscribeHubListPrefs(() => setPrefs(readHubListPrefsCore())), []);

  const setViewMode = (mode: HubViewMode) => {
    setViewModeState(mode);
    try {
      sessionStorage.setItem(`${VIEW_STORAGE_PREFIX}${screen}`, mode);
    } catch {
      /* ignore quota */
    }
  };

  const statusFilter = useMemo(() => deskStatusFilterDef(rows), [rows]);
  const filters = useMemo(() => {
    const next: typeof statusFilter[] = [];
    if (isHubPrefVisible(prefs.hubFilters, defaultFilterKeys, DESK_STATUS_FILTER_KEY) && statusFilter.options.length) {
      next.push(statusFilter);
    }
    return next;
  }, [defaultFilterKeys, prefs.hubFilters, statusFilter]);

  const periodPrefs = useMemo(
    () => ({
      range: period.range,
      customMonth: period.customMonth,
      customStartDate: period.customStartDate,
      customEndDate: period.customEndDate,
    }),
    [period.customEndDate, period.customMonth, period.customStartDate, period.range],
  );

  const periodRows = useMemo(() => {
    if (!showPeriod) return rows.slice();
    return rows.filter((row) => matchesWorkspacePeriod(row.createdAt, periodPrefs));
  }, [periodPrefs, rows, showPeriod]);

  const filtered = useMemo(() => {
    const q = search.query.trim().toLowerCase();
    const next = periodRows.filter((row) => {
      if (!matchesDeskStatusFilter(row, filterValues)) return false;
      if (!q) return true;
      return `${row.name} ${row.status} ${row.extra}`.toLowerCase().includes(q);
    });
    next.sort((a, b) => {
      const av = String(a[sortKey] || "");
      const bv = String(b[sortKey] || "");
      const cmp = av.localeCompare(bv);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return next;
  }, [filterValues, periodRows, search.query, sortDir, sortKey]);

  const selection = useHubDirectorySelection(filtered, (row) => row.id);

  const kpis = useMemo<KpiTileData[]>(() => {
    const tiles: KpiTileData[] = [];
    if (isHubPrefVisible(prefs.kpi, defaultKpiKeys, "total")) {
      tiles.push({
        label: "Total",
        value: filtered.length,
        emojiGlyph: "📋",
        tone: "indigo",
        prefKey: "total",
      });
    }
    if (isHubPrefVisible(prefs.kpi, defaultKpiKeys, "up")) {
      tiles.push({
        label: "Up",
        value: filtered.filter((row) => row.status === "Up").length,
        emojiGlyph: "✅",
        tone: "emerald",
        prefKey: "up",
      });
    }
    if (isHubPrefVisible(prefs.kpi, defaultKpiKeys, "down")) {
      tiles.push({
        label: "Down",
        value: filtered.filter((row) => row.status === "Down").length,
        emojiGlyph: "⛔",
        tone: "rose",
        prefKey: "down",
      });
    }
    if (isHubPrefVisible(prefs.kpi, defaultKpiKeys, "ready")) {
      tiles.push({
        label: "Ready",
        value: filtered.filter((row) => /ready/i.test(row.status)).length,
        emojiGlyph: "✅",
        tone: "emerald",
        prefKey: "ready",
      });
    }
    if (isHubPrefVisible(prefs.kpi, defaultKpiKeys, "disabled")) {
      tiles.push({
        label: "Disabled",
        value: filtered.filter((row) => /disabled/i.test(row.status)).length,
        emojiGlyph: "⏸️",
        tone: "amber",
        prefKey: "disabled",
      });
    }
    if (isHubPrefVisible(prefs.kpi, defaultKpiKeys, "history")) {
      tiles.push({
        label: "History",
        value: filtered.filter((row) => row.status === "History").length,
        emojiGlyph: "📋",
        tone: "sky",
        prefKey: "history",
      });
    }
    if (isHubPrefVisible(prefs.kpi, defaultKpiKeys, "sample")) {
      tiles.push({
        label: "Samples",
        value: filtered.filter((row) => row.status === "Sample").length,
        emojiGlyph: "📌",
        tone: "amber",
        prefKey: "sample",
      });
    }
    return attachDirectoryKpiClicks(
      tiles,
      filterValues,
      setFilterValues,
      (key, current) => {
        if (key === "total") return kpiClearAllIfAny(current) ?? {};
        if (key === "up") return kpiSetOrClear(current, DESK_STATUS_FILTER_KEY, ["Up"]);
        if (key === "down") return kpiSetOrClear(current, DESK_STATUS_FILTER_KEY, ["Down"]);
        if (key === "ready") return kpiSetOrClear(current, DESK_STATUS_FILTER_KEY, ["Ready"]);
        if (key === "disabled") return kpiSetOrClear(current, DESK_STATUS_FILTER_KEY, ["Disabled"]);
        if (key === "history") return kpiSetOrClear(current, DESK_STATUS_FILTER_KEY, ["History"]);
        if (key === "sample") return kpiSetOrClear(current, DESK_STATUS_FILTER_KEY, ["Sample"]);
        return null;
      },
      (key, current) => {
        if (key === "total") return Object.keys(current).length === 0;
        if (key === "up") return sameFilterValues(current, DESK_STATUS_FILTER_KEY, ["Up"]);
        if (key === "down") return sameFilterValues(current, DESK_STATUS_FILTER_KEY, ["Down"]);
        if (key === "ready") return sameFilterValues(current, DESK_STATUS_FILTER_KEY, ["Ready"]);
        if (key === "disabled") return sameFilterValues(current, DESK_STATUS_FILTER_KEY, ["Disabled"]);
        if (key === "history") return sameFilterValues(current, DESK_STATUS_FILTER_KEY, ["History"]);
        if (key === "sample") return sameFilterValues(current, DESK_STATUS_FILTER_KEY, ["Sample"]);
        return false;
      },
    );
  }, [defaultKpiKeys, filterValues, filtered, prefs.kpi]);

  const filterToolbar = useStableDirectoryFilterToolbar(
    { showResultCount: viewMode === "card", shown: filtered.length, total: periodRows.length },
    () => (
      <DeskDirectorySearchToolbar
        screen={screen}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        countIcon={titleIcon}
        shown={filtered.length}
        total={periodRows.length}
        countLabel={sectionRuleLabel.toLowerCase()}
        showResultCount={viewMode === "card"}
        showPeriod={showPeriod}
      />
    ),
    [screen, sectionRuleLabel, showPeriod, titleIcon, viewMode],
  );

  const handleSort = (key: DeskCol) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const noun = sectionRuleLabel.toLowerCase();

  return (
    <HubInactiveTabContent active={tabActive}>
      <HubDirectoryScreen
        header={
          <HubListChromeHeader
            ariaLabel={title}
            titleIcon={titleIcon}
            titleIconClass={titleIconClass}
            title={title}
            metaItems={deskVersionMetaItems()}
            versionReleaseNotesCode="P0001"
            actions={<TabHeaderActions />}
          />
        }
        kpis={kpis}
        filters={filters}
        query={search.queryInput}
        onQueryChange={search.setQueryInput}
        queryPending={search.queryPending}
        searchDebounceMs={0}
        filterValues={filterValues}
        onFilterValuesChange={setFilterValues}
        filterPlaceholder="Search…"
        filterShortcutScope={screen}
        sectionRuleLabel={sectionRuleLabel}
        directoryViewMode={viewMode}
        filterSelectionToolbar={{
          selectedCount: selection.selectedIds.size,
          visibleCount: filtered.length,
          noun,
        }}
        filterToolbar={filterToolbar}
        filterRowActions={
          <>
            {toolbarActions}
            <HubDirectoryBulkActionBar
              selectAll={{
                visibleCount: filtered.length,
                selectedCount: selection.selectedIds.size,
                allVisibleSelected: selection.allVisibleSelected,
                onToggleSelectAll: selection.toggleSelectAll,
                noun,
              }}
            >
              {selection.selectedIds.size > 0 && bulkActions?.length
                ? bulkActions.map((a) => {
                    const Icon =
                      a.icon ??
                      (a.label === "Delete" || a.label === "Disable"
                        ? Trash2
                        : a.label === "Detail"
                          ? Eye
                          : a.label === "Start" || a.label === "Run"
                            ? Play
                            : RotateCcw);
                    return (
                      <HubBulkActionButton
                        key={a.label}
                        icon={<Icon size={14} />}
                        label={a.label}
                        title={a.label}
                        tone={a.tone ?? (a.label === "Delete" ? "rose" : "neutral")}
                        onClick={() => a.onClick([...selection.selectedIds])}
                      />
                    );
                  })
                : null}
            </HubDirectoryBulkActionBar>
          </>
        }
      >
        {sideRail ? (
          <div className="flex min-h-0 flex-1 gap-3">
            <div className="flex min-h-0 min-w-0 flex-[3] flex-col overflow-hidden">
              {viewMode === "card" ? (
                <HubPaginatedCardGrid items={filtered} resetKey={`${screen}-${search.query}`} pageSize={pageSize} ariaLabel={`${title} cards`}>
                  {(pageRows) =>
                    pageRows.map((row) => (
                      <DeskDirectoryCard
                        key={row.id}
                        row={row}
                        selected={selection.selectedIds.has(row.id)}
                        onToggleSelect={selection.toggleSelect}
                      />
                    ))
                  }
                </HubPaginatedCardGrid>
              ) : (
                <DeskDirectoryTable
                  rows={filtered}
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                  selectedIds={selection.selectedIds}
                  onToggleSelect={selection.toggleSelect}
                  onToggleSelectAll={selection.toggleSelectAll}
                  allVisibleSelected={selection.allVisibleSelected}
                  opsHandlers={opsHandlers}
                />
              )}
            </div>
            <div className="flex min-h-0 min-w-0 flex-[2] flex-col gap-3 overflow-hidden">{sideRail}</div>
          </div>
        ) : viewMode === "card" ? (
          <HubPaginatedCardGrid items={filtered} resetKey={`${screen}-${search.query}`} pageSize={pageSize} ariaLabel={`${title} cards`}>
            {(pageRows) =>
              pageRows.map((row) => (
                <DeskDirectoryCard
                  key={row.id}
                  row={row}
                  selected={selection.selectedIds.has(row.id)}
                  onToggleSelect={selection.toggleSelect}
                />
              ))
            }
          </HubPaginatedCardGrid>
        ) : (
          <DeskDirectoryTable
            rows={filtered}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            selectedIds={selection.selectedIds}
            onToggleSelect={selection.toggleSelect}
            onToggleSelectAll={selection.toggleSelectAll}
            allVisibleSelected={selection.allVisibleSelected}
            opsHandlers={opsHandlers}
          />
        )}
      </HubDirectoryScreen>
    </HubInactiveTabContent>
  );
}
