import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { TABLE_PAGE_SIZE_OPTIONS } from "./constants";
import { buildSemanticTocIcon, resolveSemanticIcon } from "../lib/semantic-icon-registry";
import { patchHubListPrefs, readHubListPrefsCore } from "../lib/hub-url-prefs";
import { compactIconSize } from "../ui-scale";
import { HUB_DIRECTORY_TOOLBAR_TYPO_CLASS } from "../shell/hub-typography";
import {
  HUB_TABLE_PAGE_SIZE_DEFAULT,
  patchHubTablePageSizeValue,
  useHubTablePageSize,
} from "../table/hub-table-page-size";
import { MAX_VISIBLE_CHART } from "./chart-visible";
import { MAX_VISIBLE_KPI } from "./kpi-visible";
import { Section, ToggleRow } from "./primitives";
import {
  HubDirectoryColumnHint,
  type HubDirectoryColumnHintContent,
} from "../table/HubDirectoryColumnHint";
import {
  countVisiblePrefs,
  defaultsForPrefItems,
  isHubPrefVisible,
  toggleHubPrefSet,
} from "./hub-display-visibility";
import { HubDirectoryTableColumnPresetMenu } from "../prefs/HubDirectoryTableColumnPresetMenu";
import type { HubDisplayPrefsProps, PrefItem } from "./types";

export type HubDirectoryDisplayPanelProps = Pick<
  HubDisplayPrefsProps,
  | "kpis"
  | "charts"
  | "filters"
  | "headerStats"
  | "defaultKpiKeys"
  | "defaultChartKeys"
  | "defaultFilterKeys"
  | "defaultHeaderStatKeys"
  | "headerStatLabel"
  | "filterParam"
  | "filtersFromUrl"
  | "getScreen"
  | "getSystemTab"
  | "systemDisplay"
  | "getSubTab"
  | "subTabDisplay"
  | "onLog"
  | "tablePanel"
  | "tableColumnPresets"
  | "tableSectionLabel"
  | "tableSectionActions"
  | "tableSectionFirst"
  | "tableActiveCount"
  | "sectionHints"
> &
  /**
   * Defaulted below (`DEFAULT_READ_PREFS` / `DEFAULT_PATCH_PREFS`) — optional here so callers
   * that want the shared hub-list-prefs store can just omit them (P0010, P0014).
   */
  Partial<Pick<HubDisplayPrefsProps, "readPrefs" | "patchPrefs">> & {
  /** Directory rail — icon + chevron only (P0021 Audio / P0005 narrow toolbar SSOT). */
  triggerIconOnly?: boolean;
};

function parseSet(raw: string | null): Set<string> | null {
  if (raw === null) return null;
  if (raw === "") return new Set();
  return new Set(raw.split(",").filter(Boolean));
}

function searchParam(key: string): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(key);
}

function PanelSection({
  label,
  icon,
  labelHint,
  headerActions,
  children,
}: {
  label: string;
  icon?: ReactNode;
  labelHint?: HubDirectoryColumnHintContent;
  headerActions?: ReactNode;
  children: ReactNode;
}) {
  const labelNode = <span>{label}</span>;
  return (
    <div className="hub-directory-display-panel__section">
      <div className="hub-directory-display-panel__section-head">
        <div className="hub-directory-display-panel__section-title">
          {icon}
          {labelHint ? (
            <HubDirectoryColumnHint content={labelHint}>{labelNode}</HubDirectoryColumnHint>
          ) : (
            labelNode
          )}
        </div>
        {headerActions ? <div className="shrink-0">{headerActions}</div> : null}
      </div>
      <div className="hub-directory-display-panel__section-body">{children}</div>
    </div>
  );
}

/** Single search-bar control — KPI · Charts · header · filters · table columns. */
const DEFAULT_READ_PREFS = () => readHubListPrefsCore();
const DEFAULT_PATCH_PREFS = (patch: Record<string, string | null>) => {
  patchHubListPrefs(patch);
};
const DEFAULT_GET_SCREEN = () => "hub";

export function HubDirectoryDisplayPanel({
  kpis = [],
  charts = [],
  filters: tabFilters = [],
  headerStats: headerStatsProp = [],
  defaultKpiKeys,
  defaultChartKeys,
  defaultFilterKeys,
  defaultHeaderStatKeys,
  headerStatLabel = (isSystem) => (isSystem ? "System header" : "Hub header"),
  filterParam = "hfilt",
  filtersFromUrl = false,
  readPrefs = DEFAULT_READ_PREFS,
  patchPrefs = DEFAULT_PATCH_PREFS,
  getScreen = DEFAULT_GET_SCREEN,
  getSystemTab,
  systemDisplay,
  getSubTab,
  subTabDisplay,
  onLog,
  tablePanel,
  tableColumnPresets,
  tableSectionLabel = "Table columns",
  tableSectionActions,
  tableSectionFirst,
  showPageSize = true,
  sectionHints,
  triggerIconOnly = false,
}: HubDirectoryDisplayPanelProps & { showPageSize?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [prefs, setPrefs] = useState(readPrefs);
  const [screen, setScreen] = useState(getScreen);
  const [systemTab, setSystemTab] = useState(() => getSystemTab?.() ?? "");
  const [subTab, setSubTab] = useState(() => getSubTab?.() ?? "");
  const [displayTick, setDisplayTick] = useState(0);

  const rawFilters = searchParam(filterParam);

  useEffect(() => {
    const subTabChangeEvent = subTabDisplay?.changeEvent ?? "subtab-display-change";
    const sync = () => {
      setScreen(getScreen());
      if (getSystemTab) setSystemTab(getSystemTab());
      if (getSubTab) setSubTab(getSubTab());
      setDisplayTick((tick) => tick + 1);
    };
    window.addEventListener("popstate", sync);
    window.addEventListener("system-display-change", sync);
    window.addEventListener(subTabChangeEvent, sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("system-display-change", sync);
      window.removeEventListener(subTabChangeEvent, sync);
    };
  }, [getScreen, getSystemTab, getSubTab, subTabDisplay?.changeEvent]);

  useEffect(() => {
    const sync = () => setPrefs(readPrefs());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [readPrefs]);

  const repositionPanel = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = Math.min(288, window.innerWidth * 0.92);
    let left = rect.right - width;
    if (left < 8) left = Math.max(8, rect.left);
    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - width - 8);
    }
    setPanelPos({ top: rect.bottom + 4, left, width });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPanelPos(null);
      return;
    }
    repositionPanel();
    window.addEventListener("scroll", repositionPanel, true);
    window.addEventListener("resize", repositionPanel);
    return () => {
      window.removeEventListener("scroll", repositionPanel, true);
      window.removeEventListener("resize", repositionPanel);
    };
  }, [open, repositionPanel]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      // Keep the panel open when interacting with a portaled child dropdown (e.g. Frozen columns).
      if (target instanceof Element && target.closest("[data-hub-single-filter-panel]")) return;
      if (ref.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isSystem = screen === "system";
  const effectiveSubTab = isSystem && subTabDisplay?.screens.includes("system") ? systemTab : subTab;
  const usesSubTabDisplay = Boolean(
    subTabDisplay?.screens.includes(screen) && effectiveSubTab && subTabDisplay?.adapter,
  );
  const usesLegacySystemDisplay = Boolean(isSystem && systemDisplay && systemTab && !usesSubTabDisplay);

  const systemSlice = useMemo(() => {
    void displayTick;
    return usesLegacySystemDisplay ? systemDisplay!.read(systemTab) : null;
  }, [usesLegacySystemDisplay, systemDisplay, systemTab, displayTick]);

  const subTabSlice = useMemo(() => {
    void displayTick;
    return usesSubTabDisplay ? subTabDisplay!.adapter.read(effectiveSubTab) : null;
  }, [usesSubTabDisplay, subTabDisplay, effectiveSubTab, displayTick]);

  const visKpiEffective = usesSubTabDisplay
    ? (subTabSlice?.kpi ?? null)
    : usesLegacySystemDisplay
      ? (systemSlice?.kpi ?? null)
      : prefs.kpi;
  const visChartsEffective = usesSubTabDisplay
    ? (subTabSlice?.charts ?? null)
    : usesLegacySystemDisplay
      ? (systemSlice?.charts ?? null)
      : prefs.charts;
  const visHubFilters = usesSubTabDisplay
    ? (subTabSlice?.filters ?? null)
    : filtersFromUrl
      ? parseSet(rawFilters)
      : (prefs.hubFilters ?? null);
  const visHeaderStats = isSystem ? prefs.systemHeaderStats : prefs.headerStats;
  const headerStatParam = isSystem ? "sstat" : "hstat";

  const kpiDefaults = defaultsForPrefItems(kpis, defaultKpiKeys);
  const chartsDefaults = defaultsForPrefItems(charts, defaultChartKeys);
  const filterDefaults = defaultsForPrefItems(tabFilters, defaultFilterKeys);
  const headerStatDefaults = defaultHeaderStatKeys ?? new Set(headerStatsProp.map((item) => item.key));

  const visKpiCount = countVisiblePrefs(kpis, visKpiEffective, kpiDefaults);
  const kpiCap = Math.min(MAX_VISIBLE_KPI, Math.max(kpis.length, 1));
  const kpiAtMax = visKpiCount >= kpiCap;
  const visChartsCount = countVisiblePrefs(charts, visChartsEffective, chartsDefaults);
  const chartAtMax = visChartsCount >= MAX_VISIBLE_CHART;

  const logScope = usesSubTabDisplay
    ? (subTabDisplay?.logScope?.(effectiveSubTab) ?? `${screen} / ${effectiveSubTab}`)
    : isSystem
      ? `System / ${systemTab}`
      : "Hub";

  function emitLog(message: string) {
    onLog?.(logScope, message);
  }

  function update(patch: Record<string, string | null>, logMessage = "Updated display settings") {
    patchPrefs(patch, logMessage);
    setPrefs(readPrefs());
    emitLog(logMessage);
  }

  function toggle(
    param: "kpi" | "charts" | "hstat" | "sstat" | typeof filterParam,
    allItems: PrefItem[],
    defaults: Set<string>,
    key: string,
    maxVisible?: number,
    capMessage?: string,
  ) {
    const cur =
      param === "kpi"
        ? visKpiEffective
        : param === "charts"
          ? visChartsEffective
          : param === "hstat" || param === "sstat"
            ? visHeaderStats
            : visHubFilters;

    const wasSelected = isHubPrefVisible(cur, defaults, key);
    if (!wasSelected && maxVisible != null) {
      const selectedCount = countVisiblePrefs(allItems, cur, defaults);
      if (selectedCount >= maxVisible) {
        if (capMessage) emitLog(capMessage);
        return;
      }
    }

    const { next, allDefault } = toggleHubPrefSet(cur, defaults, key);

    if (usesLegacySystemDisplay && systemDisplay && systemTab && (param === "kpi" || param === "charts")) {
      systemDisplay.patch(systemTab, { [param]: allDefault ? null : [...next] });
      setDisplayTick((tick) => tick + 1);
      emitLog(`Updated ${systemTab} display`);
      return;
    }

    if (
      usesSubTabDisplay &&
      subTabDisplay &&
      (param === "kpi" || param === "charts" || param === filterParam)
    ) {
      const subKey = param === filterParam ? "filters" : param;
      subTabDisplay.adapter.patch(effectiveSubTab, { [subKey]: allDefault ? null : [...next] });
      setDisplayTick((tick) => tick + 1);
      const evt = subTabDisplay.changeEvent ?? "subtab-display-change";
      window.dispatchEvent(new CustomEvent(evt));
      emitLog(`Updated ${effectiveSubTab} display`);
      return;
    }

    update({ [param]: allDefault ? null : [...next].join(",") });
  }

  function resetDisplay() {
    if (usesLegacySystemDisplay && systemDisplay && systemTab) {
      systemDisplay.reset(systemTab);
      update({ sstat: null }, `Reset ${systemTab} display settings`);
      return;
    }

    if (usesSubTabDisplay && subTabDisplay) {
      subTabDisplay.adapter.reset(effectiveSubTab);
      const evt = subTabDisplay.changeEvent ?? "subtab-display-change";
      window.dispatchEvent(new CustomEvent(evt));
      update({}, `Reset ${effectiveSubTab} display settings`);
      return;
    }

    update(
      { kpi: null, charts: null, [filterParam]: null, hstat: null, sstat: null },
      "Reset display settings",
    );
  }

  const pageSize = useHubTablePageSize();
  const { icon: DisplayTriggerIcon, className: displayIconClass } = resolveSemanticIcon("settings.display");

  function pickPageSize(next: number) {
    patchHubListPrefs({ tpage: patchHubTablePageSizeValue(next) });
    emitLog(`Rows per page: ${next}`);
    queueMicrotask(() => setOpen(false));
  }

  const headerLabel = headerStatLabel(isSystem);
  const hasBody =
    showPageSize ||
    kpis.length > 0 ||
    charts.length > 0 ||
    headerStatsProp.length > 0 ||
    tabFilters.length > 0 ||
    Boolean(tablePanel) ||
    Boolean(tableColumnPresets);

  if (!hasBody) return null;

  const showTableFirst = tableSectionFirst ?? Boolean(tablePanel);

  const tableSection = tablePanel ? (
    <PanelSection
      label={tableSectionLabel}
      icon={buildSemanticTocIcon("settings.table")}
      headerActions={tableSectionActions}
      labelHint={sectionHints?.table}
    >
      {tablePanel}
    </PanelSection>
  ) : null;

  const kpiSection =
    kpis.length > 0 ? (
      <PanelSection
        label={`KPI (${visKpiCount}/${kpiCap})`}
        icon={buildSemanticTocIcon("settings.kpi")}
        labelHint={sectionHints?.kpi}
      >
        <div className="space-y-0.5">
          {kpis.map((item) => {
            const selected = isHubPrefVisible(visKpiEffective, kpiDefaults, item.key);
            return (
              <ToggleRow
                key={item.key}
                label={item.label}
                icon={item.icon}
                iconClassName={item.iconClassName}
                emoji={item.emoji}
                brandIcon={item.brandIcon}
                imageSrc={item.imageSrc}
                labelHint={item.labelHint}
                on={selected}
                disabled={kpiAtMax && !selected}
                onDisabledClick={() =>
                  emitLog(`KPI limit: maximum ${kpiCap} — turn one off to add another`)
                }
                onChange={() => toggle("kpi", kpis, kpiDefaults, item.key, kpiCap)}
              />
            );
          })}
        </div>
      </PanelSection>
    ) : null;

  const chartsSection =
    charts.length > 0 ? (
      <PanelSection
        label={`Charts (${visChartsCount}/${MAX_VISIBLE_CHART})`}
        icon={buildSemanticTocIcon("settings.charts")}
        labelHint={sectionHints?.charts}
      >
        <div className="space-y-0.5">
          {charts.map((item) => {
            const selected = isHubPrefVisible(visChartsEffective, chartsDefaults, item.key);
            return (
              <ToggleRow
                key={item.key}
                label={item.label}
                icon={item.icon}
                iconClassName={item.iconClassName}
                emoji={item.emoji}
                brandIcon={item.brandIcon}
                imageSrc={item.imageSrc}
                labelHint={item.labelHint}
                on={selected}
                disabled={chartAtMax && !selected}
                onDisabledClick={() =>
                  emitLog(`Charts limit: maximum ${MAX_VISIBLE_CHART} — turn one off to add another`)
                }
                onChange={() => toggle("charts", charts, chartsDefaults, item.key, MAX_VISIBLE_CHART)}
              />
            );
          })}
        </div>
      </PanelSection>
    ) : null;

  const headerStatsSection =
    headerStatsProp.length > 0 ? (
      <PanelSection
        label={`${headerLabel} (${countVisiblePrefs(headerStatsProp, visHeaderStats, headerStatDefaults)}/${headerStatsProp.length})`}
        icon={buildSemanticTocIcon("settings.headerStats")}
        labelHint={sectionHints?.headerStats}
      >
        <div className="space-y-0.5">
          {headerStatsProp.map((item) => (
            <ToggleRow
              key={item.key}
              label={item.label}
              icon={item.icon}
              iconClassName={item.iconClassName}
              emoji={item.emoji}
              brandIcon={item.brandIcon}
              imageSrc={item.imageSrc}
              labelHint={item.labelHint}
              on={isHubPrefVisible(visHeaderStats, headerStatDefaults, item.key)}
              onChange={() => toggle(headerStatParam, headerStatsProp, headerStatDefaults, item.key)}
            />
          ))}
        </div>
      </PanelSection>
    ) : null;

  const filtersSection =
    tabFilters.length > 0 ? (
      <PanelSection
        label={`Filters (${countVisiblePrefs(tabFilters, visHubFilters, filterDefaults)}/${tabFilters.length})`}
        icon={buildSemanticTocIcon("settings.filters")}
        labelHint={sectionHints?.filters}
      >
        <div className="space-y-0.5">
          {tabFilters.map((item) => (
            <ToggleRow
              key={item.key}
              label={item.label}
              icon={item.icon}
              iconClassName={item.iconClassName}
              emoji={item.emoji}
              brandIcon={item.brandIcon}
              imageSrc={item.imageSrc}
              labelHint={item.labelHint}
              on={isHubPrefVisible(visHubFilters, filterDefaults, item.key)}
              onChange={() => toggle(filterParam, tabFilters, filterDefaults, item.key)}
            />
          ))}
        </div>
      </PanelSection>
    ) : null;

  const pageSizeSection = showPageSize ? (
    <PanelSection label="Rows per page" icon={buildSemanticTocIcon("settings.pageSize")} labelHint={sectionHints?.pageSize}>
      <div className="space-y-0.5">
        {TABLE_PAGE_SIZE_OPTIONS.map((n) => (
          <ToggleRow key={n} label={`${n} rows`} on={pageSize === n} onChange={() => pickPageSize(n)} />
        ))}
      </div>
    </PanelSection>
  ) : null;

  const panelInner = (
    <>
      <div className="hub-directory-display-panel__body">
        {showTableFirst ? tableSection : null}
        {kpiSection}
        {chartsSection}
        {headerStatsSection}
        {filtersSection}
        {!showTableFirst ? tableSection : null}
        {pageSizeSection}
      </div>
      <div className="hub-directory-display-panel__footer">
        <button type="button" className="hub-directory-display-panel__reset" onClick={resetDisplay}>
          Reset display
        </button>
      </div>
    </>
  );

  const panelEl =
    open && panelPos && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            data-hub-directory-display-panel
            className="hub-directory-display-panel anim-pop fixed z-[10050]"
            style={{ top: panelPos.top, left: panelPos.left, width: panelPos.width }}
          >
            {panelInner}
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={ref} className="relative flex shrink-0 items-center gap-1.5">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex h-[var(--hub-control-h)] items-center rounded-lg border border-white/10 bg-[var(--panel-2)] ${HUB_DIRECTORY_TOOLBAR_TYPO_CLASS} text-[var(--text)] transition-colors hover:bg-white/5 ${
          triggerIconOnly ? "hub-filter-chip--icon-only gap-0.5 px-[0.4rem]" : "gap-1.5 px-3"
        }`}
        title="Display options"
        aria-label="Display"
        aria-expanded={open}
      >
        <DisplayTriggerIcon size={compactIconSize(13)} className={`shrink-0 opacity-90 ${displayIconClass}`} aria-hidden />
        {triggerIconOnly ? null : <span className="hub-filter-trigger__label">Display</span>}
        <ChevronDown size={compactIconSize(12)} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {tableColumnPresets ? (
        <HubDirectoryTableColumnPresetMenu
          key={tableColumnPresets.scopeId}
          manager={tableColumnPresets}
          onLog={emitLog}
        />
      ) : null}
      {panelEl}
    </div>
  );
}

/** @deprecated Use `HubDirectoryDisplayPanel`. */
export const HubDisplayBandToolbar = HubDirectoryDisplayPanel;
export type HubDisplayBandToolbarProps = HubDirectoryDisplayPanelProps;
