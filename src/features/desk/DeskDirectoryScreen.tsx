import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Play, RotateCcw, Trash2, Eye, Square, type LucideIcon } from "lucide-react";
import { deskBulkActionIcon } from "./desk-bulk-action-icons";
import {
  hubDirectoryListResetKey,
  HubBulkActionButton,
  HubDirectoryBulkActionBar,
  HubDirectoryBulkActionRail,
  HubDirectoryBulkMoreMenu,
  HubDirectoryDeleteBulkAction,
  HubDirectoryDetailAction,
  HubDirectoryNewBulkAction,
  HubDirectoryScreen,
  HubListChromeHeader,
  HubPaginatedCardGrid,
  HubSplitDirectoryFilterBar,
  HubSplitDirectoryPane,
  KpiStrip,
  attachDirectoryKpiClicks,
  isHubPrefVisible,
  kpiClearAllIfAny,
  kpiSetOrClear,
  matchesWorkspacePeriod,
  readHubListPrefsCore,
  resolveDirectoryPanelFillRows,
  resolveDirectorySortMode,
  sameFilterValues,
  subscribeHubListPrefs,
  useDirectoryManualSortEnabled,
  useHubClientDirectorySearchQuery,
  useHubDirectorySelection,
  useHubTablePageSize,
  useWorkspacePeriod,
  withPinnedFilterDefs,
  type FilterValues,
  type HubDirectoryLifecycleMode,
  type HubSortDir,
  type HubViewMode,
  type KpiTileData,
} from "@tool-workspace/hub-ui";
import { DeskDirectorySearchToolbar } from "../../components/DeskDirectorySearchToolbar";
import { TabHeaderActions } from "../../components/TabHeaderActions";
import { DeskSplitHubChrome } from "./DeskSplitHubChrome";
import type { AppScreen } from "../../lib/app-screen";
import { deskVersionMetaItems } from "../../lib/app-release";
import { SCREEN_DISPLAY_PREFS } from "../../lib/display-prefs-registry";
import { DeskDirectoryCard } from "./DeskDirectoryCard";
import { DeskDirectoryTable, type DeskRow } from "./DeskDirectoryTable";
import { DESK_SCREEN_TITLE_EMOJI } from "./desk-directory-stickers";
import { DESK_STATUS_FILTER_KEY, DESK_PROJECT_FILTER_KEY, deskProjectFilterDef, deskStatusFilterDef, matchesDeskProjectFilter, matchesDeskStatusFilter } from "./desk-directory-filters";
import { compareDeskDirectoryRows } from "./desk-directory-sort";
import { deskPrimaryDefaultSort } from "./desk-display-sort";
import { deskManualSortPrefsFor } from "./desk-manual-sort-prefs";
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
  /** Tab header emoji sticker — overrides Lucide (hub SSOT). */
  titleEmojiGlyph?: string;
  sectionRuleLabel: string;
  rows: DeskRow[];
  tabActive?: boolean;
  showPeriod?: boolean;
  toolbarActions?: ReactNode;
  sideRail?: ReactNode;
  onRowFocus?: (id: string) => void;
  opsHandlers?: import("./desk-directory-cells").DeskOpsCellHandlers;
  bulkActions?: { label: string; tone?: "rose" | "neutral" | "emerald" | "amber"; icon?: LucideIcon; onClick: (ids: string[]) => void }[];
  lifecycleMode?: HubDirectoryLifecycleMode;
  onLifecycleModeChange?: (mode: HubDirectoryLifecycleMode) => void;
  crudBulk?: {
    onNew: () => void;
    onDelete: (ids: string[]) => void;
    onDetail?: (ids: string[]) => void;
    detailTitle?: string;
    moreActions: (ctx: { ids: string[]; hasSelection: boolean }) => import("@tool-workspace/hub-ui").HubDirectoryBulkMoreAction[];
    newTitle?: string;
    newDisabled?: boolean;
    deleteTitle?: string;
    deleteLabel?: string;
  };
};

export function DeskDirectoryScreen({
  screen,
  title,
  titleIcon,
  titleIconClass = "text-emerald-300",
  titleEmojiGlyph = DESK_SCREEN_TITLE_EMOJI[screen],
  sectionRuleLabel,
  rows,
  tabActive = true,
  showPeriod = true,
  toolbarActions,
  sideRail,
  onRowFocus,
  opsHandlers,
  bulkActions,
  lifecycleMode,
  onLifecycleModeChange,
  crudBulk,
}: Props) {
  const headerActions = <TabHeaderActions />;
  const primaryDefault = deskPrimaryDefaultSort(screen);
  const search = useHubClientDirectorySearchQuery();
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [sortKey, setSortKey] = useState<DeskCol>(primaryDefault.sortKey);
  const [sortDir, setSortDir] = useState<HubSortDir>(primaryDefault.sortDir);
  const manualSortPrefs = deskManualSortPrefsFor(screen);
  const manualSortEnabled = useDirectoryManualSortEnabled(manualSortPrefs);
  const defaultSortOnly = resolveDirectorySortMode({ manualSortEnabled }) === "default-order-only";
  const [viewMode, setViewModeState] = useState<HubViewMode>(() => readViewMode(screen));
  const [prefs, setPrefs] = useState(readHubListPrefsCore);
  const period = useWorkspacePeriod(screen, "all");
  const pageSize = useHubTablePageSize();
  const display = SCREEN_DISPLAY_PREFS[screen];
  const defaultKpiKeys = useMemo(() => new Set(display?.defaultKpiKeys ?? ["total"]), [display]);
  const defaultFilterKeys = useMemo(() => new Set(display?.defaultFilterKeys ?? ["status"]), [display]);

  useEffect(() => subscribeHubListPrefs(() => setPrefs(readHubListPrefsCore())), []);

  useEffect(() => {
    if (!defaultSortOnly) return;
    setSortKey(primaryDefault.sortKey);
    setSortDir(primaryDefault.sortDir);
  }, [defaultSortOnly, primaryDefault.sortDir, primaryDefault.sortKey, screen]);

  const setViewMode = (mode: HubViewMode) => {
    setViewModeState(mode);
    try {
      sessionStorage.setItem(`${VIEW_STORAGE_PREFIX}${screen}`, mode);
    } catch {
      /* ignore quota */
    }
  };

  const statusFilter = useMemo(() => deskStatusFilterDef(rows), [rows]);
  const projectFilter = useMemo(() => deskProjectFilterDef(rows), [rows]);
  const countedFilters = useMemo(() => {
    const next = [];
    if (statusFilter.options.length) next.push(statusFilter);
    if (projectFilter.options.length) next.push(projectFilter);
    return next;
  }, [projectFilter, statusFilter]);
  const filters = useMemo(() => {
    const visible = [];
    if (isHubPrefVisible(prefs.hubFilters, defaultFilterKeys, DESK_STATUS_FILTER_KEY) && statusFilter.options.length) {
      visible.push(statusFilter);
    }
    if (isHubPrefVisible(prefs.hubFilters, defaultFilterKeys, DESK_PROJECT_FILTER_KEY) && projectFilter.options.length) {
      visible.push(projectFilter);
    }
    return withPinnedFilterDefs(countedFilters, visible, filterValues, [DESK_PROJECT_FILTER_KEY]);
  }, [countedFilters, defaultFilterKeys, filterValues, prefs.hubFilters, projectFilter, statusFilter]);

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
      if (!matchesDeskProjectFilter(row, filterValues)) return false;
      if (!q) return true;
      return `${row.name} ${row.status} ${row.extra} ${row.project || ""}`.toLowerCase().includes(q);
    });
    next.sort((a, b) => compareDeskDirectoryRows(a, b, sortKey, sortDir));
    return next;
  }, [filterValues, periodRows, search.query, sortDir, sortKey]);

  const selection = useHubDirectorySelection(filtered, (row) => row.id);
  const listResetKey = hubDirectoryListResetKey(search.query, filterValues);

  const kpis = useMemo<KpiTileData[]>(() => {
    if (!tabActive) return [];
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
    if (isHubPrefVisible(prefs.kpi, defaultKpiKeys, "createdToday")) {
      tiles.push({
        label: "Created today",
        value: filtered.filter((row) => row.createdAt && matchesWorkspacePeriod(row.createdAt, "today")).length,
        emojiGlyph: "📅",
        tone: "emerald",
        prefKey: "createdToday",
      });
    }
    if (isHubPrefVisible(prefs.kpi, defaultKpiKeys, "createdThisWeek")) {
      tiles.push({
        label: "Created this week",
        value: filtered.filter((row) => row.createdAt && matchesWorkspacePeriod(row.createdAt, "thisWeek")).length,
        emojiGlyph: "🗓️",
        tone: "sky",
        prefKey: "createdThisWeek",
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
        if (key === "createdToday" || key === "createdThisWeek") return null;
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
        if (key === "createdToday") return period.range === "today";
        if (key === "createdThisWeek") return period.range === "thisWeek";
        if (key === "total") return Object.keys(current).length === 0;
        if (key === "up") return sameFilterValues(current, DESK_STATUS_FILTER_KEY, ["Up"]);
        if (key === "down") return sameFilterValues(current, DESK_STATUS_FILTER_KEY, ["Down"]);
        if (key === "ready") return sameFilterValues(current, DESK_STATUS_FILTER_KEY, ["Ready"]);
        if (key === "disabled") return sameFilterValues(current, DESK_STATUS_FILTER_KEY, ["Disabled"]);
        if (key === "history") return sameFilterValues(current, DESK_STATUS_FILTER_KEY, ["History"]);
        if (key === "sample") return sameFilterValues(current, DESK_STATUS_FILTER_KEY, ["Sample"]);
        return false;
      },
    ).map((tile) => {
      if (tile.prefKey === "createdToday") {
        return {
          ...tile,
          active: period.range === "today",
          onClick: () => period.setRange(period.range === "today" ? "all" : "today"),
        };
      }
      if (tile.prefKey === "createdThisWeek") {
        return {
          ...tile,
          active: period.range === "thisWeek",
          onClick: () => period.setRange(period.range === "thisWeek" ? "all" : "thisWeek"),
        };
      }
      return tile;
    });
  }, [defaultKpiKeys, filterValues, filtered, period, prefs.kpi, tabActive]);

  const filterToolbar = (
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
      lifecycleMode={lifecycleMode}
      onLifecycleModeChange={onLifecycleModeChange}
    />
  );

  const handleSort = (key: DeskCol) => {
    if (defaultSortOnly) return;
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const noun = sectionRuleLabel.toLowerCase();
  const selectedIds = [...selection.selectedIds];

  const crudBulkRail = crudBulk ? (
    <HubDirectoryBulkActionRail>
      <HubDirectoryNewBulkAction
        title={crudBulk.newTitle ?? "New"}
        disabled={crudBulk.newDisabled}
        onClick={crudBulk.onNew}
      />
      {crudBulk.onDetail ? (
        <HubDirectoryDetailAction
          disabled={selection.selectedIds.size !== 1}
          onClick={() => crudBulk.onDetail!(selectedIds)}
        />
      ) : null}
      <HubDirectoryDeleteBulkAction
        title={crudBulk.deleteTitle ?? "Delete selected"}
        label={crudBulk.deleteLabel ?? (lifecycleMode === "trash" ? "Delete forever" : "Delete")}
        disabled={selection.selectedIds.size === 0}
        onClick={() => crudBulk.onDelete(selectedIds)}
      />
      <HubDirectoryBulkMoreMenu
        selectedCount={selection.selectedIds.size}
        actions={crudBulk.moreActions({ ids: selectedIds, hasSelection: selection.selectedIds.size > 0 })}
      />
    </HubDirectoryBulkActionRail>
  ) : null;

  const legacyBulkButtons =
    !crudBulk && selection.selectedIds.size > 0 && bulkActions?.length
      ? bulkActions.map((a) => {
          const Icon = a.icon ?? deskBulkActionIcon(a.label);
          return (
            <HubBulkActionButton
              key={a.label}
              icon={<Icon size={14} />}
              label={a.label}
              title={a.label}
              tone={a.tone ?? (a.label === "Delete" || a.label === "Stop" ? "rose" : "neutral")}
              onClick={() => a.onClick(selectedIds)}
            />
          );
        })
      : null;

  const opsFilterBar = (
    <HubSplitDirectoryFilterBar
      shortcutScope={screen}
      placeholder="Search…"
      filters={filters}
      query={search.queryInput}
      onQueryChange={search.setQueryInput}
      queryPending={search.queryPending}
      values={filterValues}
      onValuesChange={setFilterValues}
      filterSelectionToolbar={{
        selectedCount: selection.selectedIds.size,
        visibleCount: filtered.length,
        noun,
      }}
      directoryViewMode={viewMode}
      toolbar={filterToolbar}
      row2Actions={
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
            {crudBulkRail}
            {legacyBulkButtons}
          </HubDirectoryBulkActionBar>
        </>
      }
    />
  );

  if (sideRail) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <DeskSplitHubChrome
          ariaLabel={title}
          title={title}
          titleIcon={titleIcon}
          titleIconClass={titleIconClass}
          titleEmojiGlyph={titleEmojiGlyph}
          sectionRuleLabel={sectionRuleLabel}
          headerActions={headerActions}
        >
          <div className="stealth-profile-layout desk-profile-layout flex min-h-0 flex-1 overflow-hidden">
            <div className="stealth-profile-directory-pane desk-profile-directory-pane min-h-0 min-w-0 flex flex-1 flex-col overflow-hidden">
              <HubSplitDirectoryPane
                className="stealth-profile-directory-frame hub-directory-frame"
                panelFillRows={resolveDirectoryPanelFillRows(pageSize, filtered.length)}
                partialPagePad="invisible"
                kpiBand={kpis.length ? <KpiStrip items={kpis} /> : undefined}
                filterBar={opsFilterBar}
              >
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  {viewMode === "card" ? (
                    <HubPaginatedCardGrid
                      items={filtered}
                      resetKey={`${screen}-${search.query}`}
                      pageSize={pageSize}
                      ariaLabel={`${title} cards`}
                    >
                      {(pageRows) =>
                        pageRows.map((row) => (
                          <DeskDirectoryCard
                            key={row.id}
                            row={row}
                            selected={selection.selectedIds.has(row.id)}
                            onToggleSelect={selection.toggleSelect}
                            opsHandlers={opsHandlers}
                          />
                        ))
                      }
                    </HubPaginatedCardGrid>
                  ) : (
                    <DeskDirectoryTable
                      screen={screen}
                      rows={filtered}
                      resetKey={listResetKey}
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={handleSort}
                      defaultSortOnly={defaultSortOnly}
                      selectedIds={selection.selectedIds}
                      onToggleSelect={selection.toggleSelect}
                      onToggleSelectAll={selection.toggleSelectAll}
                      allVisibleSelected={selection.allVisibleSelected}
                      opsHandlers={opsHandlers}
                      onRowClick={onRowFocus ? (row) => onRowFocus(row.id) : undefined}
                      pageSize={pageSize}
                      flushWrap
                      panelFill
                    />
                  )}
                </div>
              </HubSplitDirectoryPane>
            </div>
            <aside className="stealth-workflow-rail desk-ops-workflow-rail desk-ops-three-rail hub-runtime-rail-surface">{sideRail}</aside>
          </div>
        </DeskSplitHubChrome>
      </div>
    );
  }

  return (
      <HubDirectoryScreen
        header={
          <HubListChromeHeader
            ariaLabel={title}
            titleIcon={titleIcon}
            titleIconClass={titleIconClass}
            titleEmojiGlyph={titleEmojiGlyph}
            title={title}
            metaItems={deskVersionMetaItems()}
            versionReleaseNotesCode="P0001"
            actions={headerActions}
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
              {crudBulkRail}
              {legacyBulkButtons}
            </HubDirectoryBulkActionBar>
          </>
        }
      >
        {viewMode === "card" ? (
          <HubPaginatedCardGrid items={filtered} resetKey={`${screen}-${search.query}`} pageSize={pageSize} ariaLabel={`${title} cards`}>
            {(pageRows) =>
              pageRows.map((row) => (
                <DeskDirectoryCard
                  key={row.id}
                  row={row}
                  selected={selection.selectedIds.has(row.id)}
                  onToggleSelect={selection.toggleSelect}
                  opsHandlers={opsHandlers}
                />
              ))
            }
          </HubPaginatedCardGrid>
        ) : (
          <DeskDirectoryTable
            screen={screen}
            rows={filtered}
            resetKey={listResetKey}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            defaultSortOnly={defaultSortOnly}
            selectedIds={selection.selectedIds}
            onToggleSelect={selection.toggleSelect}
            onToggleSelectAll={selection.toggleSelectAll}
            allVisibleSelected={selection.allVisibleSelected}
            opsHandlers={opsHandlers}
            onRowClick={onRowFocus ? (row) => onRowFocus(row.id) : undefined}
            pageSize={pageSize}
            flushWrap={false}
          />
        )}
      </HubDirectoryScreen>
  );
}
