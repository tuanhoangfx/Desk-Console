import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  DIRECTORY_SEARCH_CLIENT_FILTER_OPTS,
  HubDirectoryAdaptiveEditAction,
  HubDirectoryBulkActionBar,
  HubDirectoryBulkActionRail,
  HubDirectoryBulkDetailModal,
  HubDirectoryBulkMoreMenu,
  HubDirectoryDeleteBulkAction,
  HubDirectoryNewBulkAction,
  HubDirectoryScreen,
  HubListChromeHeader,
  HubPaginatedCardGrid,
  attachDirectoryKpiClicks,
  directoryChartBandNode,
  hubDirectoryListResetKey,
  isHubPrefVisible,
  kpiClearAllIfAny,
  kpiSetOrClear,
  matchesWorkspacePeriod,
  patchHubListPrefs,
  readHubListPrefsCore,
  resolveDirectorySortMode,
  sameFilterValues,
  searchTextIncludes,
  subscribeHubListPrefs,
  useDirectoryHaystackFilter,
  useDirectoryManualSortEnabled,
  useDirectorySearchQuery,
  useHubDirectorySelection,
  useHubTablePageSize,
  useStableDirectoryFilterToolbar,
  useWorkspacePeriod,
  withPinnedFilterDefs,
  type FilterValues,
  type HubDirectoryBulkDetailSection,
  type HubDirectoryBulkMoreAction,
  type HubDirectoryLifecycleMode,
  type HubSortDir,
  type HubViewMode,
  type KpiTileData,
} from "@tool-workspace/hub-ui";
import { DeskDirectorySearchToolbar } from "../../components/DeskDirectorySearchToolbar";
import { TabHeaderActions } from "../../components/TabHeaderActions";
import { useDeskDesktopUpdate } from "../../hooks/useDeskDesktopUpdate";
import { useHostHeaderStats } from "../../hooks/useHostHeaderStats";
import { deskVersionMetaItems } from "../../lib/app-release";
import type { AppScreen } from "../../lib/app-screen";
import { SCREEN_DISPLAY_PREFS } from "../../lib/display-prefs-registry";
import { buildDeskDirectoryChartData } from "./desk-charts";
import { DeskDirectoryCard } from "./DeskDirectoryCard";
import { DeskDirectoryTable, type DeskRow } from "./DeskDirectoryTable";
import {
  DESK_FORMAT_FILTER_KEY,
  DESK_PROJECT_FILTER_KEY,
  DESK_STATUS_FILTER_KEY,
  deskFormatFilterDef,
  deskProjectFilterDef,
  deskStatusFilterDef,
  matchesDeskFormatFilter,
  matchesDeskProjectFilter,
  matchesDeskStatusFilter,
} from "./desk-directory-filters";
import { compareDeskDirectoryRows } from "./desk-directory-sort";
import { DESK_SCREEN_TITLE_EMOJI, DESK_STATUS_KPI_EMOJI } from "./desk-directory-stickers";
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

export type DeskCrudBulkConfig = {
  onNew?: () => void;
  newTitle?: string;
  newDisabled?: boolean;
  onDelete?: (ids: string[]) => void;
  deleteTitle?: string;
  deleteLabel?: string;
  deleteDisabled?: (ids: string[]) => boolean;
  onDetail?: (ids: string[]) => void;
  detailTitle?: string;
  moreActions: (ctx: {
    ids: string[];
    selectedRows: DeskRow[];
    hasSelection: boolean;
  }) => HubDirectoryBulkMoreAction[];
  bulkDetailSections?: (ctx: {
    ids: string[];
    selectedRows: DeskRow[];
    closeBulkDetail: () => void;
  }) => HubDirectoryBulkDetailSection[];
};

type Props = {
  screen: AppScreen;
  title: string;
  titleIcon: LucideIcon;
  titleIconClass?: string;
  /** Tab header emoji sticker — overrides Lucide (hub SSOT). */
  titleEmojiGlyph?: string;
  sectionRuleLabel: string;
  searchPlaceholder?: string;
  rows: DeskRow[];
  tabActive?: boolean;
  showPeriod?: boolean;
  onRowFocus?: (id: string) => void;
  onPinToggle?: (id: string, nextPinned: boolean) => void;
  opsHandlers?: import("./desk-directory-cells").DeskOpsCellHandlers;
  lifecycleMode?: HubDirectoryLifecycleMode;
  onLifecycleModeChange?: (mode: HubDirectoryLifecycleMode) => void;
  crudBulk?: DeskCrudBulkConfig;
};

export function DeskDirectoryScreen({
  screen,
  title,
  titleIcon,
  titleIconClass = "text-emerald-300",
  titleEmojiGlyph = DESK_SCREEN_TITLE_EMOJI[screen],
  sectionRuleLabel,
  searchPlaceholder = "Search…",
  rows,
  tabActive = true,
  showPeriod = true,
  onRowFocus,
  onPinToggle,
  opsHandlers,
  lifecycleMode,
  onLifecycleModeChange,
  crudBulk,
}: Props) {
  const centerStats = useHostHeaderStats();
  const desktopUpdate = useDeskDesktopUpdate();
  const primaryDefault = deskPrimaryDefaultSort(screen);
  const search = useDirectorySearchQuery(DIRECTORY_SEARCH_CLIENT_FILTER_OPTS);
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [sortKey, setSortKey] = useState<DeskCol>(primaryDefault.sortKey);
  const [sortDir, setSortDir] = useState<HubSortDir>(primaryDefault.sortDir);
  const [bulkDetailOpen, setBulkDetailOpen] = useState(false);
  const manualSortPrefs = deskManualSortPrefsFor(screen);
  const manualSortEnabled = useDirectoryManualSortEnabled(manualSortPrefs);
  const defaultSortOnly = resolveDirectorySortMode({ manualSortEnabled }) === "default-order-only";
  const [viewMode, setViewModeState] = useState<HubViewMode>(() => readViewMode(screen));
  const [prefs, setPrefs] = useState(readHubListPrefsCore);
  const period = useWorkspacePeriod(screen, "all");
  const pageSize = useHubTablePageSize();
  const display = SCREEN_DISPLAY_PREFS[screen];
  const defaultKpiKeys = useMemo(() => new Set(display?.defaultKpiKeys ?? ["total"]), [display]);
  const defaultChartKeys = useMemo(() => new Set(display?.defaultChartKeys ?? []), [display]);
  const defaultFilterKeys = useMemo(() => new Set(display?.defaultFilterKeys ?? ["status"]), [display]);

  useEffect(() => subscribeHubListPrefs(() => setPrefs(readHubListPrefsCore())), []);

  /** One-shot: older runners URL `kpi=total,up,down` hid the new Running tile — merge key in. */
  useEffect(() => {
    if (screen !== "runners") return;
    const kpi = prefs.kpi;
    if (kpi === null || kpi.has("running")) return;
    if (!kpi.has("up") && !kpi.has("down") && !kpi.has("total")) return;
    const next = new Set(kpi);
    next.add("running");
    patchHubListPrefs({ kpi: [...next].join(",") });
  }, [prefs.kpi, screen]);

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

  const { haystackOf } = useDirectoryHaystackFilter(
    rows,
    (row) => row.id,
    (row) =>
      `${row.id} ${row.name} ${row.schedule || ""} ${row.status} ${row.extra} ${row.log || ""} ${row.project || ""} ${row.stack || ""}`,
  );

  const statusFilter = useMemo(() => deskStatusFilterDef(rows), [rows]);
  const formatFilter = useMemo(() => deskFormatFilterDef(rows), [rows]);
  const projectFilter = useMemo(() => deskProjectFilterDef(rows, screen), [rows, screen]);
  const countedFilters = useMemo(() => {
    const next = [];
    if (statusFilter.options.length) next.push(statusFilter);
    if (formatFilter.options.length) next.push(formatFilter);
    if (projectFilter.options.length) next.push(projectFilter);
    return next;
  }, [formatFilter, projectFilter, statusFilter]);
  const filters = useMemo(() => {
    const visible = [];
    if (isHubPrefVisible(prefs.hubFilters, defaultFilterKeys, DESK_STATUS_FILTER_KEY) && statusFilter.options.length) {
      visible.push(statusFilter);
    }
    if (isHubPrefVisible(prefs.hubFilters, defaultFilterKeys, DESK_FORMAT_FILTER_KEY) && formatFilter.options.length) {
      visible.push(formatFilter);
    }
    if (isHubPrefVisible(prefs.hubFilters, defaultFilterKeys, DESK_PROJECT_FILTER_KEY) && projectFilter.options.length) {
      visible.push(projectFilter);
    }
    return withPinnedFilterDefs(countedFilters, visible, filterValues, [DESK_FORMAT_FILTER_KEY, DESK_PROJECT_FILTER_KEY]);
  }, [countedFilters, defaultFilterKeys, filterValues, formatFilter, prefs.hubFilters, projectFilter, statusFilter]);

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
    return rows.filter((row) => {
      const ts = row.createdAt?.trim() || row.updated?.trim();
      if (!ts) return periodPrefs.range === "all";
      return matchesWorkspacePeriod(ts, periodPrefs);
    });
  }, [periodPrefs, rows, showPeriod]);

  const filtered = useMemo(() => {
    const q = search.query.trim();
    const next = periodRows.filter((row) => {
      if (!matchesDeskStatusFilter(row, filterValues)) return false;
      if (!matchesDeskFormatFilter(row, filterValues)) return false;
      if (!matchesDeskProjectFilter(row, filterValues)) return false;
      if (!q) return true;
      return searchTextIncludes(haystackOf(row), q);
    });
    next.sort((a, b) => compareDeskDirectoryRows(a, b, sortKey, sortDir));
    return next;
  }, [filterValues, haystackOf, periodRows, search.query, sortDir, sortKey]);

  const selection = useHubDirectorySelection(filtered, (row) => row.id);
  const listResetKey = useMemo(
    () =>
      hubDirectoryListResetKey(
        search.query,
        filterValues,
        viewMode,
        sortKey,
        sortDir,
        period.range,
        period.customMonth,
        period.customStartDate,
        period.customEndDate,
      ),
    [
      filterValues,
      period.customEndDate,
      period.customMonth,
      period.customStartDate,
      period.range,
      search.query,
      sortDir,
      sortKey,
      viewMode,
    ],
  );

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
        label: screen === "apps" ? "Active" : "Up",
        value: filtered.filter((row) =>
          screen === "apps" ? /active|installed|running|up/i.test(row.status) : row.status === "Up",
        ).length,
        emojiGlyph: DESK_STATUS_KPI_EMOJI.up,
        tone: "emerald",
        prefKey: "up",
      });
    }
    if (isHubPrefVisible(prefs.kpi, defaultKpiKeys, "running")) {
      tiles.push({
        label: screen === "runners" ? "Starting" : "Running",
        value: filtered.filter((row) =>
          screen === "apps"
            ? Boolean(row.opsUp) || /running/i.test(row.status)
            : row.status === "Starting" || row.opsAction === "starting" || /running/i.test(row.status),
        ).length,
        emojiGlyph: DESK_STATUS_KPI_EMOJI.running,
        tone: "amber",
        prefKey: "running",
      });
    }
    if (isHubPrefVisible(prefs.kpi, defaultKpiKeys, "down")) {
      tiles.push({
        label: screen === "apps" ? "Offline" : "Down",
        value: filtered.filter((row) =>
          screen === "apps" ? /offline|missing|down|stopped/i.test(row.status) : row.status === "Down",
        ).length,
        emojiGlyph: DESK_STATUS_KPI_EMOJI.down,
        tone: "rose",
        prefKey: "down",
      });
    }
    if (isHubPrefVisible(prefs.kpi, defaultKpiKeys, "ready")) {
      tiles.push({
        label: "Active",
        value: filtered.filter((row) => /active|ready/i.test(row.status)).length,
        emojiGlyph: "🟢",
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
    if (isHubPrefVisible(prefs.kpi, defaultKpiKeys, "daemon")) {
      tiles.push({
        label: "Daemons",
        value: filtered.filter(
          (row) => row.project === "Host Daemon" || row.project === "Daemon" || /^Daemon-/i.test(row.id),
        ).length,
        emojiGlyph: "⚡",
        tone: "violet",
        prefKey: "daemon",
      });
    }
    if (isHubPrefVisible(prefs.kpi, defaultKpiKeys, "schtask")) {
      tiles.push({
        label: "Scheduled",
        value: filtered.filter(
          (row) => row.project === "Task Scheduler" || row.project === "Schtask" || /^Dev-/i.test(row.id),
        ).length,
        emojiGlyph: "📅",
        tone: "sky",
        prefKey: "schtask",
      });
    }
    if (isHubPrefVisible(prefs.kpi, defaultKpiKeys, "ui")) {
      tiles.push({
        label: "UI Apps",
        value: filtered.filter((row) => row.opsKind === "runner" && !row.id.startsWith("worker:")).length,
        emojiGlyph: "🖥️",
        tone: "sky",
        prefKey: "ui",
      });
    }
    if (isHubPrefVisible(prefs.kpi, defaultKpiKeys, "worker")) {
      tiles.push({
        label: "Workers",
        value: filtered.filter((row) => row.opsKind === "runner" && row.id.startsWith("worker:")).length,
        emojiGlyph: "⚙️",
        tone: "violet",
        prefKey: "worker",
      });
    }
    if (isHubPrefVisible(prefs.kpi, defaultKpiKeys, "pinned")) {
      tiles.push({
        label: "Pinned",
        value: filtered.filter((row) => Boolean(row.pinned)).length,
        emojiGlyph: "📌",
        tone: "cyan",
        prefKey: "pinned",
      });
    }
    if (isHubPrefVisible(prefs.kpi, defaultKpiKeys, "outdated")) {
      tiles.push({
        label: "Outdated",
        value: filtered.filter((row) => Boolean(row.outdated) || /pending|conflict|outdated/i.test(row.status)).length,
        emojiGlyph: "⚠️",
        tone: "amber",
        prefKey: "outdated",
      });
    }
    if (isHubPrefVisible(prefs.kpi, defaultKpiKeys, "sxs")) {
      tiles.push({
        label: "SxS Builds",
        value: filtered.filter((row) => row.appKind === "sxs" || row.project === "Antigravity SxS").length,
        emojiGlyph: "🔀",
        tone: "violet",
        prefKey: "sxs",
      });
    }
    if (isHubPrefVisible(prefs.kpi, defaultKpiKeys, "zalo")) {
      tiles.push({
        label: "Zalo Fleet",
        value: filtered.filter((row) => row.project === "Zalo Desktop").length,
        emojiGlyph: "💬",
        tone: "sky",
        prefKey: "zalo",
      });
    }
    if (isHubPrefVisible(prefs.kpi, defaultKpiKeys, "healthy")) {
      tiles.push({
        label: screen === "cron" ? "Exit 0" : "Healthy",
        value: filtered.filter((row) =>
          screen === "cron"
            ? row.opsLastResult === "0" || /active|ready/i.test(row.status)
            : row.status === "Up",
        ).length,
        emojiGlyph: "☑️",
        tone: "emerald",
        prefKey: "healthy",
      });
    }
    if (isHubPrefVisible(prefs.kpi, defaultKpiKeys, "ranToday")) {
      tiles.push({
        label: "Ran today",
        value: filtered.filter((row) => {
          if (!row.updated || row.updated === "—") return false;
          const d = new Date(row.updated);
          if (Number.isNaN(d.getTime())) return false;
          const now = new Date();
          return (
            d.getFullYear() === now.getFullYear() &&
            d.getMonth() === now.getMonth() &&
            d.getDate() === now.getDate()
          );
        }).length,
        emojiGlyph: "🕒",
        tone: "cyan",
        prefKey: "ranToday",
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
    if (isHubPrefVisible(prefs.kpi, defaultKpiKeys, "links")) {
      tiles.push({
        label: "Links",
        value: filtered.filter((row) => row.clipFormat === "Link").length,
        emojiGlyph: "🌐",
        tone: "emerald",
        prefKey: "links",
      });
    }
    if (isHubPrefVisible(prefs.kpi, defaultKpiKeys, "images")) {
      tiles.push({
        label: "Images",
        value: filtered.filter((row) => row.clipFormat === "Image").length,
        emojiGlyph: "🖼️",
        tone: "violet",
        prefKey: "images",
      });
    }
    return attachDirectoryKpiClicks(
      tiles,
      filterValues,
      setFilterValues,
      (key, current) => {
        if (key === "createdToday" || key === "createdThisWeek") return null;
        if (key === "total") return kpiClearAllIfAny(current) ?? {};
        if (key === "up" && screen !== "apps") return kpiSetOrClear(current, DESK_STATUS_FILTER_KEY, ["Up"]);
        if (key === "running" && screen === "runners") return kpiSetOrClear(current, DESK_STATUS_FILTER_KEY, ["Starting"]);
        if (key === "down" && screen !== "apps") return kpiSetOrClear(current, DESK_STATUS_FILTER_KEY, ["Down"]);
        if (key === "ready") return kpiSetOrClear(current, DESK_STATUS_FILTER_KEY, ["Active"]);
        if (key === "disabled") return kpiSetOrClear(current, DESK_STATUS_FILTER_KEY, ["Disabled"]);
        if (key === "daemon") return kpiSetOrClear(current, DESK_PROJECT_FILTER_KEY, ["Host Daemon"]);
        if (key === "schtask") return kpiSetOrClear(current, DESK_PROJECT_FILTER_KEY, ["Task Scheduler"]);
        if (key === "sxs") return kpiSetOrClear(current, DESK_PROJECT_FILTER_KEY, ["Antigravity SxS"]);
        if (key === "zalo") return kpiSetOrClear(current, DESK_PROJECT_FILTER_KEY, ["Zalo Desktop"]);
        if (key === "history") return kpiSetOrClear(current, DESK_STATUS_FILTER_KEY, ["History"]);
        if (key === "sample") return kpiSetOrClear(current, DESK_STATUS_FILTER_KEY, ["Sample"]);
        if (key === "links") return kpiSetOrClear(current, DESK_FORMAT_FILTER_KEY, ["Link"]);
        if (key === "images") return kpiSetOrClear(current, DESK_FORMAT_FILTER_KEY, ["Image"]);
        return null;
      },
      (key, current) => {
        if (key === "createdToday") return period.range === "today";
        if (key === "createdThisWeek") return period.range === "thisWeek";
        if (key === "total") return Object.keys(current).length === 0;
        if (key === "up" && screen !== "apps") return sameFilterValues(current, DESK_STATUS_FILTER_KEY, ["Up"]);
        if (key === "running" && screen === "runners") return sameFilterValues(current, DESK_STATUS_FILTER_KEY, ["Starting"]);
        if (key === "down" && screen !== "apps") return sameFilterValues(current, DESK_STATUS_FILTER_KEY, ["Down"]);
        if (key === "ready") return sameFilterValues(current, DESK_STATUS_FILTER_KEY, ["Active"]);
        if (key === "disabled") return sameFilterValues(current, DESK_STATUS_FILTER_KEY, ["Disabled"]);
        if (key === "daemon") return sameFilterValues(current, DESK_PROJECT_FILTER_KEY, ["Host Daemon"]);
        if (key === "schtask") return sameFilterValues(current, DESK_PROJECT_FILTER_KEY, ["Task Scheduler"]);
        if (key === "sxs") return sameFilterValues(current, DESK_PROJECT_FILTER_KEY, ["Antigravity SxS"]);
        if (key === "zalo") return sameFilterValues(current, DESK_PROJECT_FILTER_KEY, ["Zalo Desktop"]);
        if (key === "history") return sameFilterValues(current, DESK_STATUS_FILTER_KEY, ["History"]);
        if (key === "sample") return sameFilterValues(current, DESK_STATUS_FILTER_KEY, ["Sample"]);
        if (key === "links") return sameFilterValues(current, DESK_FORMAT_FILTER_KEY, ["Link"]);
        if (key === "images") return sameFilterValues(current, DESK_FORMAT_FILTER_KEY, ["Image"]);
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
  }, [defaultKpiKeys, filterValues, filtered, period, prefs.kpi, screen, tabActive]);

  const visCharts = useMemo(() => prefs.charts ?? defaultChartKeys, [defaultChartKeys, prefs.charts]);
  const chartData = useMemo(
    () => (tabActive ? buildDeskDirectoryChartData(screen, filtered, rows) : {}),
    [filtered, rows, screen, tabActive],
  );
  const chartsNode = useMemo(() => {
    const defs = display?.charts ?? [];
    if (!tabActive || defs.length === 0) return undefined;
    return directoryChartBandNode({ visCharts, defs, data: chartData });
  }, [chartData, display?.charts, tabActive, visCharts]);

  const noun = sectionRuleLabel.toLowerCase();

  const filterToolbar = useStableDirectoryFilterToolbar(
    {
      showResultCount: false,
      shown: filtered.length,
      total: periodRows.length,
    },
    () => (
      <DeskDirectorySearchToolbar
        screen={screen}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        countIcon={titleIcon}
        shown={filtered.length}
        total={periodRows.length}
        countLabel={noun}
        showResultCount={false}
        showPeriod={showPeriod}
        lifecycleMode={lifecycleMode}
        onLifecycleModeChange={onLifecycleModeChange}
      />
    ),
    [lifecycleMode, noun, onLifecycleModeChange, screen, showPeriod, titleIcon, viewMode],
  );

  const handleSort = (key: DeskCol) => {
    if (defaultSortOnly) return;
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const selectedIds = useMemo(() => [...selection.selectedIds], [selection.selectedIds]);
  const selectedRows = selection.selectedRows;

  const openSingleDetail = () => {
    if (crudBulk?.onDetail) {
      crudBulk.onDetail(selectedIds);
    } else if (selectedIds[0] && onRowFocus) {
      onRowFocus(selectedIds[0]);
    }
  };

  const bulkMoreActions = useMemo(
    () =>
      crudBulk
        ? crudBulk.moreActions({
            ids: selectedIds,
            selectedRows,
            hasSelection: selection.selectedIds.size > 0,
          })
        : [],
    [crudBulk, selectedIds, selectedRows, selection.selectedIds.size],
  );

  const filterRowActions = (
    <HubDirectoryBulkActionBar
      selectAll={{
        visibleCount: filtered.length,
        selectedCount: selection.selectedIds.size,
        allVisibleSelected: selection.allVisibleSelected,
        onToggleSelectAll: selection.toggleSelectAll,
        noun,
      }}
    >
      <HubDirectoryBulkActionRail>
        {crudBulk?.onNew ? (
          <HubDirectoryNewBulkAction
            title={crudBulk.newTitle ?? "New"}
            disabled={crudBulk.newDisabled}
            onClick={crudBulk.onNew}
          />
        ) : null}
        <HubDirectoryAdaptiveEditAction
          selectedCount={selection.selectedIds.size}
          onEditSingle={openSingleDetail}
          onEditBulk={() => setBulkDetailOpen(true)}
          singleLabel="Detail"
          bulkLabel="Detail"
          noneTitle={`Select 1 item for Detail, or 2+ items for Bulk Detail`}
          singleTitle={crudBulk?.detailTitle ?? "Open Detail"}
          bulkTitle="Open Bulk Detail & batch actions"
        />
        {crudBulk?.onDelete ? (
          <HubDirectoryDeleteBulkAction
            title={crudBulk.deleteTitle ?? "Delete selected"}
            label={crudBulk.deleteLabel ?? (lifecycleMode === "trash" ? "Delete forever" : "Delete")}
            disabled={
              selection.selectedIds.size === 0 || Boolean(crudBulk.deleteDisabled?.(selectedIds))
            }
            onClick={() => crudBulk.onDelete!(selectedIds)}
          />
        ) : null}
        {bulkMoreActions.length > 0 ? (
          <HubDirectoryBulkMoreMenu
            selectedCount={selection.selectedIds.size}
            actions={bulkMoreActions}
          />
        ) : null}
      </HubDirectoryBulkActionRail>
    </HubDirectoryBulkActionBar>
  );

  const bulkDetailSections = useMemo<HubDirectoryBulkDetailSection[]>(() => {
    if (crudBulk?.bulkDetailSections) {
      return crudBulk.bulkDetailSections({
        ids: selectedIds,
        selectedRows,
        closeBulkDetail: () => setBulkDetailOpen(false),
      });
    }
    if (bulkMoreActions.length === 0) return [];
    return [
      {
        id: "batch-ops",
        label: "Batch Operations",
        emoji: "⚡",
        description: `Execute batch actions across ${selectedRows.length} selected ${noun}.`,
        actions: bulkMoreActions.map((act) => ({
          key: act.key,
          label: act.label,
          title: act.title || act.label,
          tone:
            act.tone === "rose"
              ? ("rose" as const)
              : act.tone === "amber"
                ? ("amber" as const)
                : act.tone === "emerald"
                  ? ("emerald" as const)
                  : ("indigo" as const),
          disabled: act.disabled,
          onClick: act.onClick,
        })),
      },
    ];
  }, [bulkMoreActions, crudBulk, noun, selectedIds, selectedRows]);

  return (
    <>
      <HubDirectoryScreen
        header={
          <HubListChromeHeader
            ariaLabel={title}
            title={title}
            titleIcon={titleIcon}
            titleIconClass={titleIconClass}
            titleEmojiGlyph={titleEmojiGlyph}
            metaItems={deskVersionMetaItems()}
            centerStats={centerStats}
            versionReleaseNotesCode="P0001"
            versionReleaseNotesDesktopUpdate={desktopUpdate}
            actions={<TabHeaderActions />}
          />
        }
        kpis={kpis.length > 0 ? kpis : undefined}
        charts={chartsNode}
        sectionRuleLabel={sectionRuleLabel}
        filters={filters}
        query={search.queryInput}
        onQueryChange={search.setQueryInput}
        queryPending={search.queryPending}
        filterValues={filterValues}
        onFilterValuesChange={setFilterValues}
        filterPlaceholder={searchPlaceholder}
        filterShortcutScope={screen}
        filterSelectionToolbar={{
          visibleCount: filtered.length,
          selectedCount: selection.selectedIds.size,
          noun,
        }}
        directoryViewMode={viewMode}
        filterToolbar={filterToolbar}
        filterRowActions={filterRowActions}
      >
        {viewMode === "card" ? (
          <HubPaginatedCardGrid
            items={filtered}
            resetKey={listResetKey}
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
                  onOpenDetail={onRowFocus}
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
            onPinToggle={onPinToggle}
            onRowClick={onRowFocus ? (row) => onRowFocus(row.id) : undefined}
            pageSize={pageSize}
          />
        )}
      </HubDirectoryScreen>

      <HubDirectoryBulkDetailModal
        open={bulkDetailOpen && selectedRows.length >= 2}
        onClose={() => setBulkDetailOpen(false)}
        entitySingular="item"
        entityPlural={noun}
        headerIcon={titleIcon}
        panelTitle={`Batch ${title} Operations`}
        panelTitleEmoji={titleEmojiGlyph || "⚡"}
        selectedItems={selectedRows.map((row) => ({
          id: row.id,
          label: row.name,
          sublabel: `${row.project ? `${row.project} · ` : ""}${row.status}`,
          badge: row.status,
          onOpenSingle: onRowFocus
            ? () => {
                setBulkDetailOpen(false);
                onRowFocus(row.id);
              }
            : undefined,
        }))}
        sections={bulkDetailSections}
      />
    </>
  );
}
