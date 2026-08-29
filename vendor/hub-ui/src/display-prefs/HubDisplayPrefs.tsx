import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { RotateCcw, Settings } from "lucide-react";
import { buildSemanticTocIcon } from "../lib/semantic-icon-registry";
import { LIMIT_OPTIONS, TABLE_PAGE_SIZE_OPTIONS, TIME_RANGES } from "./constants";
import { MAX_VISIBLE_CHART } from "./chart-visible";
import { MAX_VISIBLE_KPI } from "./kpi-visible";
import { Section, ToggleRow } from "./primitives";
import { SettingsAdmSection } from "./SettingsAdmSection";
import type { HubDisplayPrefsProps, PrefItem } from "./types";
import {
  countVisiblePrefs,
  defaultsForPrefItems,
  isHubPrefVisible,
  toggleHubPrefSet,
} from "./hub-display-visibility";
import { HubHeaderPanelButton } from "../shell/HubHeaderPanelButton";
import { HUB_SETTINGS_ICON_CLASS } from "../shell/hub-typography";
import { HubKeyboardShortcutsPanel } from "../keyboard/HubKeyboardShortcutsPanel";
import { HubToolDetailModal, HubToolDetailModalSecondaryAction, HUB_TOOL_DETAIL_SCROLL_ROOT } from "../shell/HubToolDetailModal";
import { HubToolDetailSection, HUB_TOOL_DETAIL_SECTIONS_CLASS } from "../shell/HubToolDetailSection";
import { HubTocSectionNav, type HubTocNavItem } from "../shell/HubTocSectionNav";
import { registerHubSettingsOpen } from "../keyboard/hub-keyboard-shortcuts";
import { HUB_SETTINGS_TITLE } from "../shell/hub-chrome-messages";
import { HubDirectoryTableColumnPresetMenu } from "../prefs/HubDirectoryTableColumnPresetMenu";
import { patchHubTablePageSizeValue } from "../table/hub-table-page-size";
import { readHubChromePrefs } from "../shell/HubTabChrome";

function parseSet(raw: string | null): Set<string> | null {
  if (raw === null) return null;
  if (raw === "") return new Set();
  return new Set(raw.split(",").filter(Boolean));
}

function searchParam(key: string): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(key);
}

function settingsSectionId(key: string) {
  return key.startsWith("settings-") ? key : `settings-${key}`;
}

export function HubDisplayPrefs({
  kpis,
  charts,
  filters,
  headerStats: headerStatsProp = [],
  showHeaderPin = true,
  showRange = true,
  showLimit = true,
  showPageSize = false,
  showNavToggle = false,
  hideSearchPinOnSystem = false,
  defaultKpiKeys,
  defaultChartKeys,
  defaultFilterKeys,
  defaultHeaderStatKeys,
  compact = false,
  sidebarRow = false,
  scope = "tab",
  filterParam = "hfilt",
  filtersFromUrl = false,
  readPrefs,
  patchPrefs,
  getScreen,
  getSystemTab,
  systemDisplay,
  getSubTab,
  subTabDisplay,
  generalExtras,
  headerExtras,
  displayExtras,
  footerActions,
  tablePanel,
  tableColumnPresets,
  tableSectionLabel = "Table columns",
  tableSectionActions,
  tableActiveCount = 0,
  headerStatLabel = (isSystem) => (isSystem ? "System header" : "Hub header"),
  onLog,
  title = HUB_SETTINGS_TITLE,
  extraTabs = [],
  toolSections = [],
}: HubDisplayPrefsProps) {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState(readPrefs);
  const [screen, setScreen] = useState(getScreen);
  const [systemTab, setSystemTab] = useState(() => getSystemTab?.() ?? "");
  const [subTab, setSubTab] = useState(() => getSubTab?.() ?? "");
  const [displayTick, setDisplayTick] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const subTabChangeEvent = subTabDisplay?.changeEvent ?? "subtab-display-change";
    const sync = () => {
      setScreen(getScreen());
      if (getSystemTab) setSystemTab(getSystemTab());
      if (getSubTab) setSubTab(getSubTab());
      setDisplayTick((n) => n + 1);
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
    if (scope === "global") return;
    return registerHubSettingsOpen(() => setOpen(true));
  }, [scope]);

  useEffect(() => {
    const sync = () => setPrefs(readPrefs());
    window.addEventListener("popstate", sync);
    window.addEventListener("hub-list-prefs-change", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("hub-list-prefs-change", sync);
    };
  }, [readPrefs]);

  const isSystem = screen === "system";
  const rawKpi = searchParam("kpi");
  const rawCharts = searchParam("charts");
  const rawFilters = searchParam(filterParam);
  const rawHeaderStats = searchParam(isSystem ? "sstat" : "hstat");
  const rawHpin = searchParam("hpin");
  const rawSpin = searchParam("spin");
  const rawNavicon = searchParam("navicon");

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

  const isGlobalScope = scope === "global";
  const tabKpis = isGlobalScope ? [] : (kpis ?? []);
  const tabCharts = isGlobalScope ? [] : (charts ?? []);
  const tabFilters = isGlobalScope ? [] : (filters ?? []);
  const headerStats = isGlobalScope ? [] : headerStatsProp;
  const headerStatDefaults = isGlobalScope ? new Set<string>() : (defaultHeaderStatKeys ?? new Set<string>());
  const visHeaderStats = isSystem ? prefs.systemHeaderStats : prefs.headerStats;
  const headerStatParam = isSystem ? "sstat" : "hstat";

  const logScope = isGlobalScope
    ? "Tool"
    : usesSubTabDisplay
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

  function defaultsFor(allItems: PrefItem[], defaults?: Set<string>) {
    return defaultsForPrefItems(allItems, defaults);
  }

  function toggleSetParam(
    param: string,
    cur: Set<string> | null,
    allItems: PrefItem[],
    defaults: Set<string>,
    key: string,
  ) {
    return toggleHubPrefSet(cur, defaults, key);
  }

  function toggle(
    param: "kpi" | "charts" | "hstat" | "sstat" | typeof filterParam,
    allItems: PrefItem[],
    defaults: Set<string>,
    key: string,
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
    if (!wasSelected) {
      const selectedCount = countVisiblePrefs(allItems, cur, defaults);
      if (param === "kpi" && selectedCount >= MAX_VISIBLE_KPI) {
        emitLog(`KPI limit: maximum ${MAX_VISIBLE_KPI} — turn one off to add another`);
        return;
      }
      if (param === "charts" && selectedCount >= MAX_VISIBLE_CHART) {
        emitLog(`Charts limit: maximum ${MAX_VISIBLE_CHART} — turn one off to add another`);
        return;
      }
    }

    let { next, allDefault } = toggleSetParam(param, cur, allItems, defaults, key);

    if (usesLegacySystemDisplay && systemDisplay && systemTab && (param === "kpi" || param === "charts")) {
      systemDisplay.patch(systemTab, {
        [param]: allDefault ? null : [...next],
      });
      setDisplayTick((n) => n + 1);
      emitLog(`Updated ${systemTab} display`);
      return;
    }

    if (usesSubTabDisplay && subTabDisplay && (param === "kpi" || param === "charts" || param === filterParam)) {
      const subKey = param === filterParam ? "filters" : param;
      subTabDisplay.adapter.patch(effectiveSubTab, {
        [subKey]: allDefault ? null : [...next],
      });
      setDisplayTick((n) => n + 1);
      const evt = subTabDisplay.changeEvent ?? "subtab-display-change";
      window.dispatchEvent(new CustomEvent(evt));
      emitLog(`Updated ${effectiveSubTab} display`);
      return;
    }

    if (allDefault) {
      update({ [param]: null });
    } else {
      update({ [param]: [...next].join(",") });
    }
  }

  function isVisible(set: Set<string> | null, defaults: Set<string>, key: string) {
    return isHubPrefVisible(set, defaults, key);
  }

  const kpiDefaults = defaultsFor(tabKpis, defaultKpiKeys);
  const chartsDefaults = defaultsFor(tabCharts, defaultChartKeys);
  const filterDefaults = defaultsFor(tabFilters, defaultFilterKeys);
  const visFilterCount = visHubFilters === null ? filterDefaults.size : visHubFilters.size;

  const hasTablePanel = Boolean(tablePanel) && !isGlobalScope;
  const displayOnToolbar = !isGlobalScope;

  const activeCount = isGlobalScope
    ? (showHeaderPin && rawHpin !== null ? 1 : 0) +
      (rawSpin === "0" ? 1 : 0) +
      (showNavToggle && rawNavicon === "0" ? 1 : 0)
    : 0;

  function resetDefaults() {
    if (isGlobalScope) {
      const patch: Record<string, string | null> = { hpin: null, spin: null };
      if (showNavToggle) patch.navicon = null;
      update(patch, "Reset global settings");
      return;
    }

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

    const patch: Record<string, string | null> = {
      kpi: null,
      charts: null,
      [filterParam]: null,
      hstat: null,
    };
    if (showRange) patch.range = null;
    if (showLimit) patch.limit = null;
    patch.tpage = null;
    update(patch, "Reset display settings");
  }

  const tocItems: HubTocNavItem[] = [];
  const sectionIds: string[] = [];
  const sectionNodes: ReactNode[] = [];

  const pushSection = (
    id: string,
    label: string,
    icon: ReactNode | undefined,
    body: ReactNode,
    headerActions?: ReactNode,
  ) => {
    const sectionId = settingsSectionId(id);
    tocItems.push({ id: sectionId, label, icon });
    sectionIds.push(sectionId);
    sectionNodes.push(
      <HubToolDetailSection key={sectionId} id={sectionId} title={label} icon={icon} headerActions={headerActions}>
        {body}
      </HubToolDetailSection>,
    );
  };

  const displayParts: ReactNode[] = [];

  if (!isGlobalScope && showRange) {
    displayParts.push(
      <Section
        key="range"
        label="Time range"
        icon={buildSemanticTocIcon("settings.range")}
      >
        <div className="grid grid-cols-3 gap-1">
          {TIME_RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => update({ range: r.value === "30d" ? null : r.value })}
              className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                prefs.range === r.value
                  ? "bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-500/40"
                  : "bg-white/[.03] text-[var(--muted)]"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </Section>,
    );
  }

  if (!isGlobalScope && showLimit) {
    displayParts.push(
      <Section key="rows" label="Rows" icon={buildSemanticTocIcon("settings.rows")}>
        <div className="grid grid-cols-5 gap-1">
          {LIMIT_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => update({ limit: n === 100 ? null : String(n) })}
              className={`rounded-md px-1.5 py-1.5 text-xs font-semibold transition-colors ${
                prefs.limit === n
                  ? "bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-500/40"
                  : "bg-white/[.03] text-[var(--muted)]"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </Section>,
    );
  }

  const pinLocked = Boolean(readHubChromePrefs().pinLocked);
  const showPinToggles = showHeaderPin && !pinLocked;
  if (showPinToggles || headerExtras) {
    const showSearchPin = !(hideSearchPinOnSystem && isSystem);
    displayParts.push(
      <SettingsAdmSection key="header" label="Header" emoji="🗂️">
        {showPinToggles ? (
          <>
            <div className={showSearchPin ? "hub-settings-pin-row" : undefined}>
              <ToggleRow
                label="Pin header (sticky)"
                on={prefs.headerPin}
                onChange={() => update({ hpin: prefs.headerPin ? "0" : null })}
              />
              {showSearchPin ? (
                <ToggleRow
                  label="Pin search bar (sticky)"
                  on={prefs.searchPin}
                  onChange={() => update({ spin: prefs.searchPin ? "0" : null })}
                />
              ) : null}
            </div>
            {showNavToggle && prefs.navToggleIcon !== undefined ? (
              <ToggleRow
                label="Show submenu +/- icon"
                on={prefs.navToggleIcon}
                onChange={() => update({ navicon: prefs.navToggleIcon ? "0" : null })}
              />
            ) : null}
          </>
        ) : null}
        {headerExtras}
      </SettingsAdmSection>,
    );
  }

  if (showPageSize) {
    displayParts.push(
      <SettingsAdmSection key="page-size" label="Rows per page" emoji="📄">
        <div className="space-y-0.5">
          {TABLE_PAGE_SIZE_OPTIONS.map((n) => (
            <ToggleRow
              key={n}
              label={`${n} rows`}
              on={prefs.tablePageSize === n}
              onChange={() => update({ tpage: patchHubTablePageSizeValue(n) }, `Page size: ${n}`)}
            />
          ))}
        </div>
      </SettingsAdmSection>,
    );
  }

  const toolDisplayExtras = displayExtras ?? generalExtras;
  if (toolDisplayExtras) {
    displayParts.push(<Fragment key="display-extras">{toolDisplayExtras}</Fragment>);
  }

  for (const tab of extraTabs) {
    displayParts.push(
      <Section key={`extra-${tab.id}`} label={tab.label} icon={tab.icon}>
        {tab.content}
      </Section>,
    );
  }

  if (!isGlobalScope && tabFilters.length > 0) {
    displayParts.push(
      <Section
        key="filters"
        label={`Filters (${visFilterCount}/${tabFilters.length})`}
        icon={buildSemanticTocIcon("settings.filters")}
      >
        <div className="space-y-0.5">
          {tabFilters.map((f) => (
            <ToggleRow
              key={f.key}
              label={f.label}
              icon={f.icon}
              iconClassName={f.iconClassName}
              emoji={f.emoji}
              brandIcon={f.brandIcon}
              imageSrc={f.imageSrc}
              labelHint={f.labelHint}
              on={isVisible(visHubFilters, filterDefaults, f.key)}
              onChange={() => toggle(filterParam, tabFilters, filterDefaults, f.key)}
            />
          ))}
        </div>
      </Section>,
    );
  }

  if (!displayOnToolbar && displayParts.length > 0) {
    pushSection(
      "display",
      "Display",
      buildSemanticTocIcon("settings.display"),
      <div className="space-y-0">{displayParts}</div>,
    );
  }

  for (const sec of toolSections) {
    pushSection(sec.id, sec.label, sec.icon, sec.body, sec.headerActions);
  }

  if (hasTablePanel) {
    const tableHeaderActions =
      tableColumnPresets || tableSectionActions ? (
        <div className="flex items-center gap-1.5">
          {tableColumnPresets ? (
            <HubDirectoryTableColumnPresetMenu
              key={tableColumnPresets.scopeId}
              manager={tableColumnPresets}
              onLog={emitLog}
              compact
            />
          ) : null}
          {tableSectionActions}
        </div>
      ) : undefined;
    pushSection(
      "table",
      tableSectionLabel,
      buildSemanticTocIcon("settings.table"),
      tablePanel,
      tableHeaderActions,
    );
  }

  pushSection(
    "shortcuts",
    "Keyboard shortcuts",
    buildSemanticTocIcon("settings.shortcuts"),
    <HubKeyboardShortcutsPanel className="-mx-1" />,
  );

  /** Always show TOC when any section exists — matches Log / User access modals. */
  const showSettingsToc = tocItems.length > 0;

  return (
    <div ref={ref} className={sidebarRow ? "relative w-full" : "relative"}>
      <HubHeaderPanelButton
        icon={Settings}
        iconClassName={HUB_SETTINGS_ICON_CLASS}
        label={title}
        title={title}
        compact={compact}
        sidebarRow={sidebarRow}
        onClick={() => setOpen(true)}
      />

      <HubToolDetailModal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        titleId="hub-settings-modal-title"
        headerIcon={Settings}
        headerIconClassName={HUB_SETTINGS_ICON_CLASS}
        shellClassName="hub-header-panel-modal"
        sectionIds={showSettingsToc ? sectionIds : undefined}
        toc={
          showSettingsToc ? (
            <div className="hub-toc-nav">
              <HubTocSectionNav items={tocItems} scrollRootSelector={HUB_TOOL_DETAIL_SCROLL_ROOT} />
            </div>
          ) : undefined
        }
        footer={
          <>
            {footerActions}
            <HubToolDetailModalSecondaryAction
              label="Reset to defaults"
              onClick={resetDefaults}
              icon={RotateCcw}
            />
          </>
        }
      >
        <div className={HUB_TOOL_DETAIL_SECTIONS_CLASS}>{sectionNodes}</div>
      </HubToolDetailModal>
    </div>
  );
}
