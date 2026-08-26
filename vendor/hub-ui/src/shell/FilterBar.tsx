import type { LucideIcon } from "lucide-react";
import { startTransition, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  X,
  SlidersHorizontal,
  ChevronDown,
  Plus,
  Pencil,
  Check,
  Activity,
  Clock,
  FolderOpen,
  KeyRound,
  Layers,
  Rocket,
  Link2,
  AlertTriangle,
  Pin,
  RefreshCw,
  Share2,
  ShieldCheck,
  BriefcaseBusiness,
  Package,
  Star,
  LayoutTemplate,
  Users,
} from "lucide-react";
import { HubDirectoryMetricBadge } from "./HubDirectoryMetricBadge";
import type { FilterIconMeta, HubGlyphComponent } from "./filter-icons";
import { resolveFilterAllIcon, resolveFilterOptionIcon } from "./filter-icons";
import { resolveDirectoryFilterColumnIcon } from "./filter-directory-column-roles";
import { HUB_DIRECTORY_BRAND_EMPTY_GLYPH, resolveHubBrandFallbackGlyph } from "../lib/resolve-hub-brand-icon";
import {
  HUB_FILTER_DROPDOWN_LIST_CLASS,
  HUB_FILTER_DROPDOWN_PANEL_CLASS,
  HUB_FILTER_DROPDOWN_PANEL_PORTAL_CLASS,
  HUB_FILTER_DROPDOWN_ROW_CLASS,
  HUB_FILTER_DROPDOWN_ROW_WIDE_CLASS,
  HUB_FILTER_DROPDOWN_ROW_OPTION_DISABLED_CLASS,
  hubFilterDropdownRowClass,
  hubFilterUsesDirectoryValueTypo,
  hubFilterDirectoryTriggerTypoClass,
  hubFilterGlyphPx,
  hubFilterBrandGlyphPx,
  HubFilterDropdownCircle,
  HubFilterDropdownPanelSearch,
  HUB_FILTER_OPTION_EMOJI_CLASS,
  hubFilterOptionEmojiClass,
  HUB_FILTER_BRAND_ICON_CLASS,
  hubBrandIconImgClass,
  hubDirectoryTableBrandImgClass,
  type HubBrandIconShell,
  filterDropdownPanelSearchPlaceholder,
  HUB_FILTER_CREATE_GLYPH_CLASS,
  hubFilterTriggerClass,
  HUB_FILTER_DROPDOWN_TRIGGER_TYPO_CLASS,
  HUB_FILTER_DROPDOWN_TRIGGER_COMPACT_TYPO_CLASS,
  multiFilterTriggerTitle,
} from "./filter-dropdown-primitives";
import { hubPortalPanelPosition } from "./hub-portal-panel-position";
import { compactIconSize } from "../ui-scale";
import { registerHubSearchClear, registerHubSearchFocus } from "../keyboard/hub-keyboard-shortcuts";
import { HubSearchField } from "./HubSearchField";
import { HubFilterDatePicker } from "./HubFilterDatePicker";
import { HubFilterVirtualList } from "./HubFilterVirtualList";
import { isFilterOptionSelected, pinSelectedFilterOptions } from "./pin-selected-filter-options";
import { formatHubCalendarDateCompact } from "../lib/format-hub-timestamp-compact";
import {
  hubFilterDateValue,
  parseHubFilterDateValue,
} from "../lib/hub-filter-date-value";
import {
  HubDirectoryColumnHint,
  type HubDirectoryColumnHintContent,
  type HubDirectoryColumnHintGlyph,
} from "../table/HubDirectoryColumnHint";
import { HubUsersStatusLabel, type HubUsersStatusTone } from "./HubUsersStatusLabel";

export type FilterOption = {
  value: string;
  label: string;
  /**
   * Leading glyph color-dot — only when there is no `emoji` / `iconSrc` / role fallback.
   * For presence beside a status word, use `status` (HubUsersStatusLabel) so the user/avatar
   * icon stays on the left.
   */
  color?: string;
  count?: number;
  /**
   * Number badge beside the label (Hub Number SSOT `HubDirectoryMetricBadge`) — e.g. Team member count.
   * Independent of `count`, which stays the muted facet total on the right.
   */
  labelCount?: number;
  /** Icon for `labelCount` — defaults to Users (team roster). */
  labelCountIcon?: LucideIcon;
  iconSrc?: string;
  /**
   * Dedicated brand first, then hyphen-family siblings (`google-one` → Google SVG).
   * `FilterBrandImg` walks the chain on 404 before the empty glyph.
   */
  iconSrcs?: string[];
  /** Brand img shell — bare (colored), tile (dark mark), darkInk (white mono). Default bare. */
  iconShell?: HubBrandIconShell;
  emoji?: string;
  /** Workspace role glyph when no `iconSrc` / `emoji` (User picker). */
  roleKey?: string;
  /**
   * Short secondary text beside the label in the panel (e.g. `Stream copy · keep codec`).
   * Keep brief — long copy belongs in `tip` / selected-value ColumnHint.
   */
  detail?: string;
  /**
   * Extra muted column after `detail` (e.g. unset Position — "Position").
   * Not a real catalog value; do not invent Team/Position labels here.
   */
  detailPlaceholder?: string;
  /**
   * Live / directory presence (color-dot + text) between label and `status`.
   * Use for Online / Active / Idle / Offline so `status` can stay a second badge.
   */
  detailStatus?: { tone: HubUsersStatusTone; label: string };
  /**
   * Presence/status after label · detail — HubUsersStatusLabel (color-dot + text).
   * Does not replace the leading glyph (emoji / avatar / role icon).
   */
  status?: { tone: HubUsersStatusTone; label: string };
  /**
   * Full hover tip for the selected value (HubDirectoryColumnHint description).
   * Falls back to `detail` when omitted.
   */
  tip?: string;
  /** Rich hover popover — parity directory column header hints. */
  labelHint?: HubDirectoryColumnHintContent;
  /**
   * Controlled enum — keep the row visible (same label/emoji color), mute radio only,
   * block pick. Never omit catalog values. Directory filters leave this unset.
   */
  disabled?: boolean;
  /**
   * Opens an embedded HubFilterDatePicker. Selected value is `date:YYYY-MM-DD`
   * (`hubFilterDateValue`) — not this option's catalog `value`.
   */
  dateInput?: boolean;
};

/** Roster / user rows carry Team · Position · Status beside the name. */
export function hubFilterOptionHasWideMeta(
  option: Pick<FilterOption, "detail" | "detailPlaceholder" | "detailStatus" | "status">,
): boolean {
  return Boolean(
    option.detail?.trim() || option.detailPlaceholder?.trim() || option.detailStatus || option.status,
  );
}

export function hubFilterPanelMinWidthPx(
  options: readonly Pick<FilterOption, "detail" | "detailPlaceholder" | "detailStatus" | "status">[],
  triggerWidth: number,
): number {
  const wide = options.some((option) => hubFilterOptionHasWideMeta(option));
  return Math.max(triggerWidth, wide ? 420 : 288);
}

function hubFilterOptionRowClass(base: string, option: FilterOption, disabled?: boolean): string {
  return `${base}${hubFilterOptionHasWideMeta(option) ? ` ${HUB_FILTER_DROPDOWN_ROW_WIDE_CLASS}` : ""}${
    disabled ? ` ${HUB_FILTER_DROPDOWN_ROW_OPTION_DISABLED_CLASS}` : ""
  }`;
}

/** Panel row label — `Name · detail · status` when set (single truncate + native title). */
export function filterOptionRowLabel(
  option: Pick<FilterOption, "label" | "detail" | "detailPlaceholder" | "detailStatus" | "tip" | "status">,
): {
  text: string;
  title: string;
} {
  const detail = option.detailStatus?.label?.trim() || option.detail?.trim() || "";
  const placeholder = option.detailPlaceholder?.trim() || "";
  const status = option.status?.label?.trim() || "";
  const body = [option.label, detail, placeholder, status].filter(Boolean).join(" · ");
  const tip = option.tip?.trim() || [detail, placeholder, status].filter(Boolean).join(" · ");
  return {
    text: body,
    title: tip && tip !== option.label ? `${option.label} · ${tip}` : body || option.label,
  };
}
export type FilterDef = {
  key: string;
  label: string;
  options: FilterOption[];
  /** When true, empty trigger + panel “select all” row prefix with `All `. Default: false (golden — `Role`, not `All Role`). */
  showAllLabel?: boolean;
  /** Facet inventory — kept for callers; FilterBar never paints it (lean labels). */
  totalCount?: number;
  triggerEmoji?: string;
  /** Skip lucide/semantic fallback on trigger when no option icon (brand filters). */
  suppressDefaultTriggerIcon?: boolean;
  /** Brand img for panel “all” row + empty multi-select trigger (enum SSOT parity with directory cells). */
  allRowIconSrc?: string;
  allRowIconShell?: HubBrandIconShell;
  /** Rich label hint — hover filter facet name (directory column hint SSOT). */
  labelHint?: HubDirectoryColumnHintContent;
  /**
   * Click the leading avatar/glyph without selecting the row (Todo Assign → Users Detail).
   * Only fires when the option has `iconSrc` (person rows). Team / emoji rows stay select-only.
   */
  onOptionIdentityClick?: (option: FilterOption) => void;
  /**
   * Multi-select top-row behavior.
   * - `all-options` (default): toggle every option in the catalog.
   * - `visible-options`: toggle only rows currently visible after panel search.
   */
  multiSelectAllMode?: "all-options" | "visible-options";
  /**
   * Always-on default (e.g. Todo Scope = My Tasks). Not counted as an active filter;
   * Clear filters resets to this value instead of removing the key.
   */
  stickyDefault?: string;
  /**
   * Escape hatch only — **not** golden FilterBar SSOT.
   * - `multi` (default): checkbox panel + **Select shown** row (Hub SSOT for all facets).
   * - `single`: hides select-all row; prefer stickyDefault + domain normalize instead.
   */
  selectionMode?: "multi" | "single";
  /**
   * Panel header “+” — Plan Package chrome. Sits beside Clear when both apply.
   * FilterBar Type/Campaign → Add catalog / New report.
   */
  onPanelCreate?: () => void;
  panelCreateAriaLabel?: string;
};

const FILTER_ICONS: Record<string, HubGlyphComponent> = {
  health: Activity,
  category: Layers,
  deploy: Rocket,
  role: ShieldCheck,
  tool: Package,
  project: BriefcaseBusiness,
  status: Activity,
  drift: AlertTriangle,
  kind: Link2,
  links: Link2,
  sync: RefreshCw,
  org: Layers,
  region: Layers,
  plan: Layers,
  entity: Layers,
  group: Layers,
  template: LayoutTemplate,
  pinned: Pin,
  share: Share2,
  folder: FolderOpen,
  service: KeyRound,
  access: KeyRound,
  grant: KeyRound,
  usage: Clock,
};

export type FilterValues = Record<string, string[]>;

function isStickyFilterDefault(filter: FilterDef, vals: readonly string[]): boolean {
  return Boolean(filter.stickyDefault && vals.length === 1 && vals[0] === filter.stickyDefault);
}

/** Values whose keys are not in the rendered `filters` (KPI-only / pinned facets). */
function orphanFilterValueCount(filters: readonly FilterDef[], values: FilterValues): number {
  const known = new Set(filters.map((f) => f.key));
  let n = 0;
  for (const [key, vals] of Object.entries(values)) {
    if (known.has(key)) continue;
    n += vals?.length ?? 0;
  }
  return n;
}

/** Clear filters shows whenever search, a visible facet, or a KPI-only key is active. */
export function hubFilterBarHasActive(
  query: string,
  filters: readonly FilterDef[],
  values: FilterValues,
): boolean {
  if (query !== "") return true;
  if (orphanFilterValueCount(filters, values) > 0) return true;
  return filters.some((f) => {
    const vals = values[f.key] ?? [];
    if (vals.length === 0) return false;
    return !isStickyFilterDefault(f, vals);
  });
}

export function hubFilterBarActiveCount(
  query: string,
  filters: readonly FilterDef[],
  values: FilterValues,
): number {
  let n = query ? 1 : 0;
  n += orphanFilterValueCount(filters, values);
  for (const f of filters) {
    const vals = values[f.key] ?? [];
    if (vals.length === 0) continue;
    if (isStickyFilterDefault(f, vals)) continue;
    n += vals.length;
  }
  return n;
}

export type FilterBarProps = {
  placeholder?: string;
  filters?: FilterDef[];
  query: string;
  onQueryChange: (q: string) => void;
  /** Debounced search still pending — a11y only (HubSearchField aria-busy). */
  queryPending?: boolean;
  values: FilterValues;
  onValuesChange: (next: FilterValues) => void;
  /** Row 1 — immediately after search (legacy / custom trailing; table selection chip uses toolbar leading). */
  searchTrailing?: React.ReactNode;
  /** Row 1 trailing (view toggle, counts) — used with layout="hub". */
  toolbar?: React.ReactNode;
  /** Row 2 leading — before filter dropdowns in hub layout. */
  row2Leading?: React.ReactNode;
  /** Row 2 trailing actions — right side of filter row (before Clear filters). */
  row2Actions?: React.ReactNode;
  /** Row 2 far-right — selection chip after bulk actions (P0003 golden). */
  row2Trailing?: React.ReactNode;
  /** Single-row trailing (legacy / Links panel). */
  trailing?: React.ReactNode;
  layout?: "inline" | "hub";
  /** Hub: sticky below tab header; section divider sits under this block. */
  pinSticky?: boolean;
  /** When pinSticky, offset for sticky tab header above. */
  headerPinned?: boolean;
  /** Panel only (inside shared sticky chrome with header). */
  embedded?: boolean;
  shortcutScope?: string;
  /** Hub dashboard-style row: filters only, no search field or F shortcut. */
  hideSearch?: boolean;
  /**
   * Searchbar Lite — single row when `hideSearch` (report dashboards).
   * Left: toolbar · filters · Clear · Right: bulk actions.
   * Default true when `hideSearch` so Staff Performance / report screens stay one line.
   */
  searchbarLite?: boolean;
  /** Debounce directory filter query — draft stays in HubSearchField (large vault perf). */
  searchDebounceMs?: number;
  /** Inside HubSplitDirectoryPane — parent owns border/bg; no nested panel chrome. */
  frameless?: boolean;
};

export function FilterBar({
  placeholder = "Search...",
  filters = [],
  query,
  onQueryChange,
  queryPending = false,
  values,
  onValuesChange,
  searchTrailing,
  toolbar,
  row2Leading,
  row2Actions,
  row2Trailing,
  trailing,
  layout = "inline",
  pinSticky = false,
  headerPinned = true,
  embedded = false,
  shortcutScope = "default",
  hideSearch = false,
  searchbarLite,
  searchDebounceMs = 0,
  frameless = false,
}: FilterBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const clearAllRef = useRef<() => void>(() => {});
  const lite = hideSearch && (searchbarLite ?? true);

  function setFilter(key: string, selected: string[]) {
    const next = { ...values };
    if (selected.length === 0) delete next[key];
    else next[key] = selected;
    onValuesChange(next);
  }

  function clearAll() {
    onQueryChange("");
    const next: FilterValues = {};
    for (const f of filters) {
      if (f.stickyDefault) next[f.key] = [f.stickyDefault];
    }
    onValuesChange(next);
  }

  clearAllRef.current = clearAll;

  useEffect(() => {
    const unregisterFocus = hideSearch
      ? () => {}
      : registerHubSearchFocus(shortcutScope, () => {
          inputRef.current?.focus();
          inputRef.current?.select();
        });
    const unregisterClear = registerHubSearchClear(
      shortcutScope,
      () => clearAllRef.current(),
      hideSearch ? undefined : () => inputRef.current,
    );
    return () => {
      unregisterFocus();
      unregisterClear();
    };
  }, [shortcutScope, hideSearch]);

  const hasActive = hubFilterBarHasActive(query, filters, values);
  const activeCount = hubFilterBarActiveCount(query, filters, values);

  const searchField = (
    <HubSearchField
      inputRef={inputRef}
      value={query}
      onChange={onQueryChange}
      debounceMs={searchDebounceMs}
      queryPending={queryPending}
      placeholder={placeholder}
      className={layout === "hub" ? "min-w-0" : ""}
    />
  );

  const clearFiltersBtn = hasActive ? (
    <button
      type="button"
      onClick={clearAll}
      className="hub-filter-clear-btn inline-flex h-[var(--hub-control-h)] shrink-0 items-center hub-inline-gap-comfort rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 text-xs font-medium text-rose-200 transition-colors hover:bg-rose-500/20"
      title="Clear search and all filters"
    >
      Clear filters
      <span className="hub-filter-clear-btn__count grid h-4 min-w-[var(--hub-count-badge-min-w)] place-items-center rounded-full bg-rose-500/80 px-1 text-[9px] font-bold text-white">
        {activeCount}
      </span>
    </button>
  ) : null;

  const filterDropdowns = useMemo(
    () =>
      filters.map((f) => (
        <HubMultiFilterDropdown
          key={f.key}
          filter={f}
          selected={values[f.key] ?? []}
          onChange={(vals) => setFilter(f.key, vals)}
          panelScope={shortcutScope}
        />
      )),
    [filters, shortcutScope, values],
  );

  if (layout === "hub") {
    const stickyTop = headerPinned ? "top-[var(--app-tab-header-sticky-h)]" : "top-0";
    const panelClass = frameless
      ? `hub-filter-bar${lite ? " hub-filter-bar--lite" : " space-y-2"}`
      : `hub-filter-bar${lite ? " hub-filter-bar--lite py-1.5 px-2" : " space-y-2 p-3"} rounded-2xl border border-white/5 bg-[var(--panel)]`;

    const panel = lite ? (
      <div className={panelClass}>
        <div className="hub-filter-bar__lite-row flex w-full min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center hub-inline-gap-name">
            {toolbar}
            {row2Leading ? (
              <div className="flex shrink-0 flex-wrap items-center hub-inline-gap-name">{row2Leading}</div>
            ) : null}
            {filterDropdowns}
            {clearFiltersBtn}
            {searchTrailing}
          </div>
          {row2Actions || row2Trailing ? (
            <div className="flex shrink-0 flex-wrap items-center justify-end hub-inline-gap-name">
              {row2Actions}
              {row2Trailing}
            </div>
          ) : null}
        </div>
      </div>
    ) : (
      <div className={panelClass}>
        {/* Row wrappers — desktop flex rows (search|toolbar · filters|actions). Do NOT share a
            2-col grid across both rows: actions max-content inflate col2 and shrink search (~180px). */}
        <div className="hub-filter-bar__row-tools">
          {hideSearch && !searchTrailing ? null : (
            <div className="hub-filter-bar__row-search flex min-w-0 flex-1 items-center hub-inline-gap-name">
              <div className="hub-filter-bar__search-main flex min-w-0 flex-1 items-center hub-inline-gap-name">
                {hideSearch ? null : searchField}
                {searchTrailing}
              </div>
            </div>
          )}
          {toolbar ? (
            <div className="hub-filter-bar__toolbar flex min-h-[var(--hub-control-h)] shrink-0 flex-wrap items-center hub-inline-gap-name">
              {toolbar}
            </div>
          ) : null}
        </div>
        <div className="hub-filter-bar__row-band">
          <div className="hub-filter-bar__row-filters flex min-h-[var(--hub-control-h)] min-w-0 flex-1 flex-wrap items-center hub-inline-gap-name">
            {row2Leading ? <div className="flex shrink-0 flex-wrap items-center hub-inline-gap-name">{row2Leading}</div> : null}
            {filterDropdowns}
            {clearFiltersBtn}
          </div>
          {row2Actions ? (
            <div className="hub-filter-bar__actions flex min-h-[var(--hub-control-h)] min-w-0 shrink-0 flex-wrap items-center justify-end hub-inline-gap-name">
              {row2Actions}
            </div>
          ) : null}
          {row2Trailing ? <div className="hub-filter-bar__trailing shrink-0">{row2Trailing}</div> : null}
        </div>
      </div>
    );

    if (embedded) {
      return <div className={lite ? "px-6 pb-1.5 pt-0" : "px-6 pb-3 pt-0"}>{panel}</div>;
    }

    if (!pinSticky) return panel;

    return (
      <div
        className={`hub-filter-sticky sticky z-[35] -mx-6 border-b border-white/5 bg-[var(--bg)] px-6 pb-3 pt-0 ${stickyTop}`}
      >
        {panel}
      </div>
    );
  }

  const filterRow = (
    <>
      {filterDropdowns}
      {clearFiltersBtn}
    </>
  );

  return (
    <div className="space-y-2 rounded-2xl border border-white/5 bg-[var(--panel)] p-3">
      <div className="flex flex-wrap items-center hub-inline-gap-name">
        {hideSearch ? null : searchField}
        {filterRow}
        {trailing ? <div className="ml-auto flex items-center hub-inline-gap-name">{trailing}</div> : null}
      </div>
      {hasActive ? (
        <ActivePills
          query={query}
          onClearQ={() => onQueryChange("")}
          filters={filters}
          values={values}
          onClearAll={clearAll}
          onRemove={setFilter}
        />
      ) : null}
    </div>
  );
}

function FilterIconGlyph({ meta, size = compactIconSize(14) }: { meta: FilterIconMeta; size?: number }) {
  const Icon = meta.icon;
  return <Icon size={size} className={`shrink-0 ${meta.className}`} aria-hidden />;
}

function FilterOptionCount(_props: { value?: number }) {
  return null;
}

/** Roster Number badge beside the label — Team member count (Hub Number SSOT). */
function FilterOptionLabelCount({ option }: { option: FilterOption }) {
  if (option.labelCount === undefined) return null;
  return (
    <HubDirectoryMetricBadge
      count={option.labelCount}
      icon={option.labelCountIcon ?? Users}
      display="tool"
      className="shrink-0"
    />
  );
}

function filterBrandSrcChain(src?: string, srcs?: string[]): string[] {
  const list = (srcs?.length ? srcs : src ? [src] : [])
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
  return [...new Set(list)];
}

function FilterBrandImg({
  src,
  srcs,
  iconShell,
  directoryParity = false,
  sizePx,
  slotStyle,
  fallbackLabel,
}: {
  src?: string;
  srcs?: string[];
  iconShell?: HubBrandIconShell;
  directoryParity?: boolean;
  sizePx: number;
  slotStyle?: { width: number; height: number };
  /** Service/platform label — table parity via resolveHubBrandFallbackGlyph on img error. */
  fallbackLabel?: string;
}) {
  const chain = useMemo(() => filterBrandSrcChain(src, srcs), [src, srcs]);
  const chainKey = chain.join("\0");
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    setIdx(0);
  }, [chainKey]);
  const brandSlot = slotStyle ?? { width: sizePx, height: sizePx };
  const current = chain[idx];
  if (!current) {
    const glyph = resolveHubBrandFallbackGlyph(fallbackLabel ?? "");
    return (
      <span className="inline-flex shrink-0 items-center justify-center leading-none" style={brandSlot} aria-hidden>
        <span className={hubFilterOptionEmojiClass()}>{glyph}</span>
      </span>
    );
  }
  const imgClass = directoryParity
    ? hubDirectoryTableBrandImgClass(iconShell)
    : hubBrandIconImgClass(iconShell);
  return (
    <span className="inline-flex shrink-0 items-center justify-center" style={brandSlot} aria-hidden>
      <img
        src={current}
        alt=""
        className={imgClass}
        width={sizePx}
        height={sizePx}
        decoding="async"
        draggable={false}
        onError={() => setIdx((i) => i + 1)}
      />
    </span>
  );
}

function FilterOptionGlyph({
  filterKey,
  option,
  directoryParity = false,
  compact = false,
}: {
  filterKey: string;
  option: FilterOption;
  directoryParity?: boolean;
  compact?: boolean;
}) {
  const glyphPx = compactIconSize(hubFilterGlyphPx({ directoryParity, compact }));
  const brandPx = compactIconSize(hubFilterBrandGlyphPx({ directoryParity, compact }));
  const slotStyle = { width: glyphPx, height: glyphPx };
  if (option.iconSrc) {
    const brandSlot = { width: brandPx, height: brandPx };
    return (
      <FilterBrandImg
        src={option.iconSrc}
        srcs={option.iconSrcs}
        iconShell={option.iconShell}
        directoryParity={directoryParity}
        sizePx={brandPx}
        slotStyle={brandSlot}
        fallbackLabel={option.label}
      />
    );
  }
  if (option.emoji) {
    return (
      <span className="inline-flex shrink-0 items-center justify-center leading-none" style={slotStyle} aria-hidden>
        <span className={hubFilterOptionEmojiClass()}>{option.emoji}</span>
      </span>
    );
  }
  if (option.color) {
    return (
      <span className="inline-flex shrink-0 items-center justify-center" style={slotStyle} aria-hidden>
        <span className="h-2 w-2 rounded-full" style={{ background: option.color }} />
      </span>
    );
  }
  const meta = resolveFilterOptionIcon(filterKey, option.value);
  if (!meta) return null;
  return <FilterIconGlyph meta={meta} size={glyphPx} />;
}

function FilterOptionIdentityGlyph({
  filterKey,
  option,
  directoryParity = false,
  compact = false,
  onIdentityClick,
}: {
  filterKey: string;
  option: FilterOption;
  directoryParity?: boolean;
  compact?: boolean;
  onIdentityClick?: (option: FilterOption) => void;
}) {
  const glyph = (
    <FilterOptionGlyph
      filterKey={filterKey}
      option={option}
      directoryParity={directoryParity}
      compact={compact}
    />
  );
  if (!onIdentityClick || !option.iconSrc) return glyph;
  return (
    <span
      className="inline-flex shrink-0 cursor-pointer rounded-full"
      title={`Open user detail: ${option.label}`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onIdentityClick(option);
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {glyph}
    </span>
  );
}

function FilterAllRowGlyph({
  filter,
  directoryParity = false,
  compact = false,
}: {
  filter: FilterDef;
  directoryParity?: boolean;
  compact?: boolean;
}) {
  const glyphPx = compactIconSize(hubFilterGlyphPx({ directoryParity, compact }));
  const brandPx = compactIconSize(hubFilterBrandGlyphPx({ directoryParity, compact }));
  const slotStyle = { width: glyphPx, height: glyphPx };
  if (filter.allRowIconSrc) {
    const brandSlot = { width: brandPx, height: brandPx };
    return (
      <FilterBrandImg
        src={filter.allRowIconSrc}
        iconShell={filter.allRowIconShell}
        directoryParity={directoryParity}
        sizePx={brandPx}
        slotStyle={brandSlot}
      />
    );
  }
  if (filter.triggerEmoji) {
    return (
      <span className="inline-flex shrink-0 items-center justify-center leading-none" style={slotStyle} aria-hidden>
        <span className={hubFilterOptionEmojiClass()}>{filter.triggerEmoji}</span>
      </span>
    );
  }
  const allIcon = directoryParity
    ? resolveDirectoryFilterColumnIcon(filter.key) ?? resolveFilterAllIcon(filter.key)
    : resolveFilterAllIcon(filter.key);
  if (allIcon) {
    return <FilterIconGlyph meta={allIcon} size={compactIconSize(hubFilterGlyphPx({ directoryParity, compact }))} />;
  }
  return null;
}

function filterAllRowLabel(filter: FilterDef): string {
  return filter.showAllLabel === true ? `All ${filter.label}` : filter.label;
}

function isStickyDefaultOnly(filter: FilterDef, selected: string[]): boolean {
  return Boolean(filter.stickyDefault) && selected.length === 1 && selected[0] === filter.stickyDefault;
}

function filterDateTriggerLabel(selected: readonly string[]): string | null {
  const iso = selected.length === 1 ? parseHubFilterDateValue(selected[0]) : null;
  return iso ? formatHubCalendarDateCompact(iso) : null;
}

function resolveFilterTriggerIcon(
  filter: FilterDef,
  selected: string[],
  directoryParity = false,
): FilterIconMeta | null {
  /** Sticky default keeps the facet glyph (e.g. Assign 👥), not the option sticker. */
  if (!isStickyDefaultOnly(filter, selected) && selected.length === 1) {
    const opt = filter.options.find((o) => o.value === selected[0]);
    if (opt) {
      const icon = resolveFilterOptionIcon(filter.key, opt.value);
      if (icon) return icon;
    }
  }
  if (selected.length === 0 && filter.allRowIconSrc) return null;
  if (directoryParity) {
    const dirIcon = resolveDirectoryFilterColumnIcon(filter.key);
    if (dirIcon) return dirIcon;
  }
  const allIcon = resolveFilterAllIcon(filter.key);
  if (allIcon) return allIcon;
  if (filter.suppressDefaultTriggerIcon) return null;
  const Fallback = FILTER_ICONS[filter.key];
  if (Fallback) return { icon: Fallback, className: "opacity-75" };
  return null;
}

function resolveFilterLabelHintGlyph(
  filter: FilterDef,
  triggerIcon: FilterIconMeta | null,
): HubDirectoryColumnHintGlyph | undefined {
  if (filter.triggerEmoji) return { emoji: filter.triggerEmoji };
  if (triggerIcon?.icon) {
    return { icon: triggerIcon.icon, toneClass: triggerIcon.className };
  }
  return undefined;
}

function FilterTriggerLabel({
  label,
  filter,
  triggerIcon,
}: {
  label: string;
  filter: FilterDef;
  triggerIcon: FilterIconMeta | null;
}) {
  const labelNode = <span className="hub-filter-trigger__label min-w-0 truncate leading-none">{label}</span>;
  if (!filter.labelHint) return labelNode;
  return (
    <HubDirectoryColumnHint
      content={filter.labelHint}
      titleGlyph={resolveFilterLabelHintGlyph(filter, triggerIcon)}
    >
      {labelNode}
    </HubDirectoryColumnHint>
  );
}

function resolveFilterOptionHintGlyph(option: FilterOption): HubDirectoryColumnHintGlyph | undefined {
  if (option.labelHint?.titleGlyph) return option.labelHint.titleGlyph;
  if (option.emoji) return { emoji: option.emoji };
  const lineEmoji = option.labelHint?.lines?.[0]?.emoji;
  if (lineEmoji) return { emoji: lineEmoji };
  return undefined;
}

function filterOptionHintContent(
  option: FilterOption,
): HubDirectoryColumnHintContent | null {
  if (option.labelHint) return option.labelHint;
  const tip = option.tip?.trim();
  if (!tip) return null;
  return {
    title: option.label,
    titleGlyph: option.emoji ? { emoji: option.emoji } : undefined,
    description: tip,
    lines: [],
  };
}

function FilterOptionRowLabel({
  option,
  suppressHint = false,
}: {
  option: FilterOption;
  /** Parent already wraps the row in HubDirectoryColumnHint. */
  suppressHint?: boolean;
}) {
  const display = filterOptionRowLabel(option);
  const content = suppressHint ? null : filterOptionHintContent(option);

  const detail = option.detail?.trim() || "";
  const detailPlaceholder = option.detailPlaceholder?.trim() || "";
  const detailStatus = option.detailStatus;
  const status = option.status;
  const wide = hubFilterOptionHasWideMeta(option);
  const statusSep = (
    <span className="shrink-0 text-[var(--muted)]" aria-hidden>
      ·
    </span>
  );
  const labelNode = (
    <span className={`flex items-center gap-1.5 text-left${wide ? "" : " min-w-0 overflow-hidden"}`}>
      <span className={wide ? "shrink-0" : "min-w-0 truncate"}>{option.label}</span>
      {detail && !detailStatus ? (
        <>
          {statusSep}
          <span className="shrink-0 text-[var(--muted)]">{detail}</span>
        </>
      ) : null}
      {detailPlaceholder && !detailStatus ? (
        <>
          {statusSep}
          <span className="shrink-0 italic text-[var(--muted)] opacity-70">{detailPlaceholder}</span>
        </>
      ) : null}
      {detailStatus ? (
        <>
          {statusSep}
          <HubUsersStatusLabel
            label={detailStatus.label}
            tone={detailStatus.tone}
            capitalize={false}
            className="shrink-0"
          />
        </>
      ) : null}
      {status ? (
        <>
          {statusSep}
          <HubUsersStatusLabel
            label={status.label}
            tone={status.tone}
            capitalize={false}
            className="shrink-0"
          />
        </>
      ) : null}
    </span>
  );
  const badgeNode = <FilterOptionLabelCount option={option} />;

  if (!content) {
    return (
      <span className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden text-left" title={display.title}>
        {labelNode}
        {badgeNode}
      </span>
    );
  }

  return (
    <span className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
      <HubDirectoryColumnHint content={content} titleGlyph={resolveFilterOptionHintGlyph(option)}>
        {labelNode}
      </HubDirectoryColumnHint>
      {badgeNode}
    </span>
  );
}

function FilterOptionRowWithHint({
  option,
  children,
}: {
  option: FilterOption;
  children: ReactNode;
}) {
  const content = filterOptionHintContent(option);
  if (!content) return <>{children}</>;
  return (
    <HubDirectoryColumnHint content={content} titleGlyph={resolveFilterOptionHintGlyph(option)}>
      <span className="flex min-w-0 w-full flex-1 items-center hub-inline-gap-name">{children}</span>
    </HubDirectoryColumnHint>
  );
}

export type HubMultiFilterDropdownProps = {
  filter: FilterDef;
  selected: string[];
  onChange: (values: string[]) => void;
  className?: string;
  triggerClassName?: string;
  /** `label-value` (default): `Label: value`. `value`: selected option label only. */
  triggerFormat?: "label-value" | "value";
  /** Native button title — assignee tooltip, etc. */
  triggerTitle?: string;
  /** Override trigger text (e.g. Display `KPI 4/8`). */
  triggerLabel?: string;
  usePortal?: boolean;
  panelScope?: string;
  /**
   * Keep already-selected rows visible while panel search does not match them.
   * Default on — selected rows also sort to the top of the panel (Hub SSOT).
   */
  pinSelected?: boolean;
};

export function HubMultiFilterDropdown({
  filter,
  selected,
  onChange,
  className = "",
  triggerClassName = "",
  triggerFormat = "label-value",
  triggerTitle,
  triggerLabel,
  usePortal = true,
  panelScope,
  pinSelected = true,
}: HubMultiFilterDropdownProps) {
  const compactDropdown = panelScope === "twofa";
  const directoryValueTypo = hubFilterUsesDirectoryValueTypo(panelScope);
  const rowClass = hubFilterDropdownRowClass(compactDropdown, directoryValueTypo);
  const triggerTypo = directoryValueTypo
    ? hubFilterDirectoryTriggerTypoClass(selected.length)
    : compactDropdown
      ? HUB_FILTER_DROPDOWN_TRIGGER_COMPACT_TYPO_CLASS
      : undefined;
  const glyphPx = hubFilterGlyphPx({ directoryParity: directoryValueTypo, compact: compactDropdown });
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [panelView, setPanelView] = useState<"list" | "date">("list");
  const [dateDraft, setDateDraft] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0, width: 288 });

  useLayoutEffect(() => {
    if (!open || !usePortal || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    // Multi panels can be much taller than their Task Detail trigger. Flip above the
    // trigger when the modal footer / viewport would otherwise cover the roster.
    const { top, left, width } = hubPortalPanelPosition(rect, {
      width: Math.max(
        rect.width,
        panelView === "date" ? 280 : hubFilterPanelMinWidthPx(filter.options, 288),
      ),
      estimatedHeight: panelView === "date" ? 320 : Math.min(340, 86 + filter.options.length * 36),
    });
    setPanelPos({ top, left, width });
  }, [open, usePortal, filter.options.length, panelView]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t)) return;
      if (
        usePortal &&
        (e.target as Element).closest?.("[data-hub-multi-filter-panel], [data-hub-filter-date-panel]")
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open, usePortal]);

  const allMode =
    filter.multiSelectAllMode ??
    // SSOT: the "first row" (select/unselect) should operate on what the user can see
    // after panel search filters the option list.
    "visible-options";
  const exclusive = filter.selectionMode === "single";
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  // Panel math is O(options) on large facets (Orders customer facet ~1.8k options) —
  // compute only while the panel is open so closed dropdowns cost nothing per render.
  const panel = useMemo(() => {
    if (!open) return null;
    const q = search.toLowerCase();
    const matched = q
      ? filter.options.filter(
          (o) =>
            (pinSelected && isFilterOptionSelected(o, selected)) ||
            o.label.toLowerCase().includes(q) ||
            (o.detail || "").toLowerCase().includes(q) ||
            (o.detailPlaceholder || "").toLowerCase().includes(q) ||
            (o.tip || "").toLowerCase().includes(q),
        )
      : filter.options;
    const filtered = pinSelectedFilterOptions(matched, selected, {
      stickyDefault: filter.stickyDefault,
    });
    const allSelected = selected.length > 0 && selected.length === filter.options.length;
    const someSelected = selected.length > 0 && !allSelected;
    let visibleSelectedCount = 0;
    for (const o of filtered) if (isFilterOptionSelected(o, selected)) visibleSelectedCount += 1;
    const allVisibleSelected = filtered.length > 0 && visibleSelectedCount === filtered.length;
    const someVisibleSelected = visibleSelectedCount > 0 && !allVisibleSelected;
    return {
      filtered,
      allSelected,
      allVisibleSelected,
      allRowChecked: allMode === "visible-options" ? allVisibleSelected : allSelected,
      allRowIndeterminate: allMode === "visible-options" ? someVisibleSelected : someSelected,
      allRowLabel:
        allMode === "visible-options"
          ? allVisibleSelected
            ? "Unselect shown"
            : "Select shown"
          : filterAllRowLabel(filter),
      allRowCount:
        allMode === "visible-options"
          ? filtered.length
          : (filter.totalCount ??
            (filter.options.some((o) => o.count !== undefined)
              ? filter.options.reduce((sum, o) => sum + (o.count ?? 0), 0)
              : filter.options.length)),
    };
  }, [open, search, filter, selected, selectedSet, allMode, pinSelected]);

  function toggle(v: string) {
    const option = filter.options.find((o) => o.value === v);
    if (option?.disabled) return;
    if (option?.dateInput) {
      setDateDraft(parseHubFilterDateValue(selected[0]) ?? "");
      setPanelView("date");
      return;
    }
    if (exclusive) {
      if (selectedSet.has(v)) {
        if (filter.stickyDefault) return;
        onChange([]);
        return;
      }
      onChange([v]);
      return;
    }
    if (selectedSet.has(v)) onChange(selected.filter((x) => x !== v));
    else onChange([...selected, v]);
  }
  function toggleAll() {
    if (exclusive || !panel) return;
    if (allMode === "visible-options") {
      if (panel.filtered.length === 0) return;
      const selectableVisible = panel.filtered.filter((o) => !o.disabled);
      if (selectableVisible.length === 0) return;
      if (panel.allVisibleSelected) {
        const visible = new Set(selectableVisible.map((o) => o.value));
        onChange(selected.filter((v) => !visible.has(v)));
        return;
      }
      const next = new Set(selected);
      for (const o of selectableVisible) next.add(o.value);
      onChange([...next]);
      return;
    }
    const selectable = filter.options.filter((o) => !o.disabled);
    const locked = selected.filter((v) => filter.options.find((o) => o.value === v)?.disabled);
    if (panel.allSelected) onChange(locked);
    else onChange([...new Set([...locked, ...selectable.map((o) => o.value)])]);
  }

  const buttonLabel = triggerLabel ?? (() => {
    const idleLabel = filter.showAllLabel === true ? `All ${filter.label}` : filter.label;
    if (selected.length === 0 || isStickyDefaultOnly(filter, selected)) return idleLabel;
    const dateLabel = filterDateTriggerLabel(selected);
    if (dateLabel) return dateLabel;
    if (selected.length === 1) {
      const opt = filter.options.find((o) => o.value === selected[0]);
      return opt?.label ?? selected[0];
    }
    return `${selected.length} selected`;
  })();

  const triggerIcon = resolveFilterTriggerIcon(filter, selected, directoryValueTypo);
  const selectedOpt =
    selected.length === 1 && !isStickyDefaultOnly(filter, selected)
      ? filter.options.find((o) => o.value === selected[0]) ??
        (parseHubFilterDateValue(selected[0])
          ? filter.options.find((o) => o.dateInput)
          : undefined)
      : undefined;
  const triggerIconSrc = selectedOpt?.iconSrc;
  const triggerIconSrcs = selectedOpt?.iconSrcs;
  const resolvedTriggerTitle =
    triggerTitle ??
    (selected.length > 1
      ? multiFilterTriggerTitle(selected, filter.options)
      : selected.length === 1 && !isStickyDefaultOnly(filter, selected)
        ? filter.options.find((o) => o.value === selected[0])?.label
        : (filter.labelHint?.description ?? `Filter by ${filter.label}`));

  const canClearSelection = selected.length > 0 && !isStickyDefaultOnly(filter, selected);
  const panelSearch = (
    <HubFilterDropdownPanelSearch
      value={search}
      onChange={setSearch}
      placeholder={filterDropdownPanelSearchPlaceholder(filter.label)}
      onClearSelection={
        canClearSelection
          ? () => onChange(filter.stickyDefault ? [filter.stickyDefault] : [])
          : undefined
      }
      clearSelectionLabel="Clear"
      clearSelectionEnabled={canClearSelection}
      onCreateAction={
        filter.onPanelCreate
          ? () => {
              setOpen(false);
              filter.onPanelCreate?.();
            }
          : undefined
      }
      createActionAriaLabel={filter.panelCreateAriaLabel ?? "Add"}
    />
  );

  const datePanel =
    panelView === "date" ? (
      <div className="p-3">
        <button
          type="button"
          onClick={() => setPanelView("list")}
          className="mb-3 text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)] hover:text-[var(--text)]"
        >
          ← Back
        </button>
        <HubFilterDatePicker
          embedded
          value={dateDraft}
          onChange={(iso) => {
            if (!iso) {
              onChange(filter.stickyDefault ? [filter.stickyDefault] : []);
              setPanelView("list");
              return;
            }
            onChange([hubFilterDateValue(iso)]);
            setPanelView("list");
            setOpen(false);
          }}
        />
      </div>
    ) : null;

  return (
    <div ref={ref} className={`relative ${open ? "z-[60]" : ""} ${className}`.trim()}>
      <button
        ref={triggerRef}
        type="button"
        title={filter.labelHint && selected.length === 0 ? undefined : resolvedTriggerTitle}
        onClick={() =>
          setOpen((v) => {
            const next = !v;
            if (next) setPanelView("list");
            return next;
          })
        }
        className={hubFilterTriggerClass(
          selected.length > 0 && !isStickyDefaultOnly(filter, selected),
          triggerClassName,
          triggerTypo,
        )}
      >
        {(() => {
          const triggerSlotStyle = { width: compactIconSize(glyphPx), height: compactIconSize(glyphPx) };
          const brandPx = compactIconSize(hubFilterBrandGlyphPx({ directoryParity: directoryValueTypo, compact: compactDropdown }));
          const brandSlotStyle = { width: brandPx, height: brandPx };
          if (triggerIconSrc) {
            return (
              <FilterBrandImg
                src={triggerIconSrc}
                srcs={triggerIconSrcs}
                iconShell={selectedOpt?.iconShell}
                directoryParity={directoryValueTypo}
                sizePx={brandPx}
                slotStyle={brandSlotStyle}
                fallbackLabel={selectedOpt?.label ?? selectedOpt?.value}
              />
            );
          }
          if (selected.length === 0 && filter.allRowIconSrc) {
            return (
              <FilterBrandImg
                src={filter.allRowIconSrc}
                iconShell={filter.allRowIconShell}
                directoryParity={directoryValueTypo}
                sizePx={brandPx}
                slotStyle={brandSlotStyle}
              />
            );
          }
          if (selected.length === 1 && selectedOpt?.color) {
            return (
              <span className="inline-flex shrink-0 items-center justify-center" style={triggerSlotStyle} aria-hidden>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: selectedOpt.color }} />
              </span>
            );
          }
          if (filter.triggerEmoji) {
            return (
              <span className="inline-flex shrink-0 items-center justify-center leading-none" style={triggerSlotStyle} aria-hidden>
                <span className={hubFilterOptionEmojiClass()}>{filter.triggerEmoji}</span>
              </span>
            );
          }
          if (selectedOpt?.emoji) {
            return (
              <span className="inline-flex shrink-0 items-center justify-center leading-none" style={triggerSlotStyle} aria-hidden>
                <span className={hubFilterOptionEmojiClass()}>{selectedOpt.emoji}</span>
              </span>
            );
          }
          if (triggerIcon) {
            return (
              <span className="inline-flex shrink-0 items-center justify-center" style={triggerSlotStyle} aria-hidden>
                <FilterIconGlyph meta={triggerIcon} size={compactIconSize(glyphPx)} />
              </span>
            );
          }
          if (selectedOpt?.color) {
            return (
              <span className="inline-flex shrink-0 items-center justify-center" style={triggerSlotStyle} aria-hidden>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: selectedOpt.color }} />
              </span>
            );
          }
          return null;
        })()}
        <FilterTriggerLabel label={buttonLabel} filter={filter} triggerIcon={triggerIcon} />

        <ChevronDown size={compactIconSize(glyphPx)} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {panel ? (
        usePortal ? (
          createPortal(
            <div
              data-hub-multi-filter-panel
              data-hub-filter-scope={panelScope}
              className={`${HUB_FILTER_DROPDOWN_PANEL_PORTAL_CLASS}${compactDropdown ? " hub-filter-panel--compact" : ""}`}
              style={{
                position: "fixed",
                top: panelPos.top,
                left: panelPos.left,
                width: panelPos.width,
              }}
              role="listbox"
            >
              {datePanel ?? (
                <>
              {panelSearch}
              <HubFilterVirtualList
                className={HUB_FILTER_DROPDOWN_LIST_CLASS}
                items={panel.filtered}
                getItemKey={(o) => o.value}
                header={
                  !exclusive ? (
                    <>
                      <button type="button" onClick={toggleAll} className={rowClass}>
                        <HubFilterDropdownCircle checked={panel.allRowChecked} indeterminate={panel.allRowIndeterminate} />
                        <FilterAllRowGlyph filter={filter} directoryParity={directoryValueTypo} compact={compactDropdown} />
                        <span className="min-w-0 flex-1 truncate text-left">{panel.allRowLabel}</span>
                        <FilterOptionCount value={panel.allRowCount} />
                      </button>
                      <div className="my-1 border-t border-white/5" />
                    </>
                  ) : null
                }
                footer={
                  panel.filtered.length === 0 ? (
                    <div className="py-4 text-center text-xs text-[var(--muted)]">No matches</div>
                  ) : null
                }
                renderItem={(o) => (
                  <button
                    type="button"
                    aria-disabled={o.disabled || undefined}
                    onClick={() => toggle(o.value)}
                    className={hubFilterOptionRowClass(rowClass, o, o.disabled)}
                  >
                    <FilterOptionRowWithHint option={o}>
                      <HubFilterDropdownCircle checked={isFilterOptionSelected(o, selected)} disabled={Boolean(o.disabled)} />
                      <FilterOptionIdentityGlyph filterKey={filter.key} option={o} directoryParity={directoryValueTypo} compact={compactDropdown} onIdentityClick={filter.onOptionIdentityClick} />
                      <FilterOptionRowLabel option={o} suppressHint />
                      <FilterOptionCount value={o.count} />
                    </FilterOptionRowWithHint>
                  </button>
                )}
              />
                </>
              )}
            </div>,
            document.body,
          )
        ) : (
          <div
            data-hub-filter-scope={panelScope}
            className={`${HUB_FILTER_DROPDOWN_PANEL_CLASS} absolute left-0 top-full z-30 mt-1${compactDropdown ? " hub-filter-panel--compact" : ""}`}
            role="listbox"
          >
            {datePanel ?? (
              <>
            {panelSearch}
            <HubFilterVirtualList
              className={HUB_FILTER_DROPDOWN_LIST_CLASS}
              items={panel.filtered}
              getItemKey={(o) => o.value}
              header={
                !exclusive ? (
                  <>
                    <button type="button" onClick={toggleAll} className={rowClass}>
                      <HubFilterDropdownCircle checked={panel.allRowChecked} indeterminate={panel.allRowIndeterminate} />
                      <FilterAllRowGlyph filter={filter} directoryParity={directoryValueTypo} compact={compactDropdown} />
                      <span className="min-w-0 flex-1 truncate text-left">{panel.allRowLabel}</span>
                      <FilterOptionCount value={panel.allRowCount} />
                    </button>
                    <div className="my-1 border-t border-white/5" />
                  </>
                ) : null
              }
              footer={
                panel.filtered.length === 0 ? (
                  <div className="py-4 text-center text-xs text-[var(--muted)]">No matches</div>
                ) : null
              }
              renderItem={(o) => (
                <button
                  type="button"
                  aria-disabled={o.disabled || undefined}
                  onClick={() => toggle(o.value)}
                  className={hubFilterOptionRowClass(rowClass, o, o.disabled)}
                >
                  <FilterOptionRowWithHint option={o}>
                    <HubFilterDropdownCircle checked={isFilterOptionSelected(o, selected)} disabled={Boolean(o.disabled)} />
                    <FilterOptionIdentityGlyph filterKey={filter.key} option={o} directoryParity={directoryValueTypo} compact={compactDropdown} onIdentityClick={filter.onOptionIdentityClick} />
                    <FilterOptionRowLabel option={o} suppressHint />
                    <FilterOptionCount value={o.count} />
                  </FilterOptionRowWithHint>
                </button>
              )}
            />
              </>
            )}
          </div>
        )
      ) : null}
    </div>
  );
}

export type HubSingleFilterDropdownProps = {
  filterKey: string;
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  /**
   * Typography classes for the trigger. Default = FilterBar shell (`text-sm font-medium`).
   * Pass `""` for HubAdm / Mail Modal value triggers (ADM CSS `--hub-adm-type-*` owns type).
   */
  triggerTypoClass?: string;
  usePortal?: boolean;
  /** `label-value` (default): `Label: value`. `value`: selected option label only — pair with external `HubFormFieldLabel`. */
  triggerFormat?: "label-value" | "value";
  /** Custom trigger body (e.g. icon-only access badge in directory cells). */
  triggerContent?: React.ReactNode;
  triggerHideChevron?: boolean;
  ariaLabel?: string;
  /** Server/async option lists — panel search drives parent fetch; skip client label filter when true. */
  panelSearchAsync?: {
    query: string;
    onQueryChange: (query: string) => void;
    serverFiltered?: boolean;
  };
  /**
   * Show Clear (X) next to panel search when a value is selected.
   * Default on — SSOT with HubAdm. Resets to `""` (no fake “None” option).
   * Pass `false` only for required enums (clone count, price format).
   */
  allowClear?: boolean;
  clearLabel?: string;
  /**
   * Panel header “+” — sits beside Clear when both are set. Closes panel then runs (e.g. Add Material).
   */
  onPanelCreate?: () => void;
  panelCreateAriaLabel?: string;
  /**
   * Allow creating a brand-new value from the panel search text (free-text combobox).
   * When the search does not exactly match an option, a "Create …" row selects the typed text.
   */
  allowCustom?: boolean;
  /** Custom "create" row label builder — defaults to `Create “<query>”`. */
  customOptionLabel?: (query: string) => string;
  /**
   * When a catalog value is selected, allow renaming it to the panel search text.
   * Shows a "Rename …" row when search differs from the current value and the target is unused.
   */
  allowRename?: boolean;
  onRename?: (from: string, to: string) => void;
  /** Custom rename row label — defaults to `Rename “<from>” to “<to>”`. */
  renameOptionLabel?: (from: string, to: string) => string;
};

/** Single-select — identical trigger/panel chrome as `HubMultiFilterDropdown`. */
export function HubSingleFilterDropdown({
  filterKey,
  label,
  options,
  value,
  onChange,
  disabled = false,
  className = "",
  triggerClassName = "",
  triggerTypoClass = HUB_FILTER_DROPDOWN_TRIGGER_TYPO_CLASS,
  usePortal = true,
  triggerFormat = "label-value",
  triggerContent,
  triggerHideChevron = false,
  ariaLabel,
  panelSearchAsync,
  allowClear = true,
  clearLabel = "Clear",
  onPanelCreate,
  panelCreateAriaLabel = "Add",
  allowCustom = false,
  customOptionLabel,
  allowRename = false,
  onRename,
  renameOptionLabel,
}: HubSingleFilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0, width: 288 });

  const search = panelSearchAsync?.query ?? localSearch;
  const setSearch = panelSearchAsync?.onQueryChange ?? setLocalSearch;

  useEffect(() => {
    if (open) return;
    setLocalSearch("");
    panelSearchAsync?.onQueryChange("");
  }, [open, panelSearchAsync]);

  const filter: FilterDef = { key: filterKey, label, options };
  const selected = value ? [value] : [];

  useLayoutEffect(() => {
    if (!open || !usePortal || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const { top, left, width } = hubPortalPanelPosition(rect, {
      width: hubFilterPanelMinWidthPx(options, rect.width),
      estimatedHeight: Math.min(320, 52 + options.length * 36),
    });
    setPanelPos({ top, left, width });
  }, [open, usePortal, options]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t)) return;
      if (usePortal && (e.target as Element).closest?.("[data-hub-single-filter-panel]")) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open, usePortal]);

  /** `__catalog_loading__` stays pinned while form catalogs fetch — search must not hide it or unlock Create. */
  const catalogLoadingOptions = options.filter((o) => o.value === "__catalog_loading__");
  const catalogLoading = catalogLoadingOptions.length > 0;
  const selectableOptions = catalogLoading
    ? options.filter((o) => o.value !== "__catalog_loading__")
    : options;
  const filteredSelectable = pinSelectedFilterOptions(
    panelSearchAsync?.serverFiltered
      ? selectableOptions
      : selectableOptions.filter((o) => {
          if (!search) return true;
          const q = search.toLowerCase();
          return (
            o.label.toLowerCase().includes(q) ||
            (o.detail || "").toLowerCase().includes(q) ||
            (o.detailPlaceholder || "").toLowerCase().includes(q) ||
            (o.tip || "").toLowerCase().includes(q)
          );
        }),
    selected,
  );
  const filtered = catalogLoading
    ? [...catalogLoadingOptions, ...filteredSelectable]
    : filteredSelectable;

  const trimmedSearch = search.trim();
  const hasExactMatch = selectableOptions.some(
    (o) =>
      o.label.toLowerCase() === trimmedSearch.toLowerCase() ||
      o.value.toLowerCase() === trimmedSearch.toLowerCase(),
  );
  const renameFrom = value.trim();
  const showRename =
    allowRename &&
    Boolean(onRename) &&
    renameFrom.length > 0 &&
    trimmedSearch.length > 0 &&
    trimmedSearch.toLowerCase() !== renameFrom.toLowerCase() &&
    !hasExactMatch &&
    !catalogLoading;
  const showCreate =
    allowCustom && trimmedSearch.length > 0 && !hasExactMatch && !showRename && !catalogLoading;

  const handleCreateCustom = () => {
    onChange(trimmedSearch);
    setOpen(false);
  };

  const handleRename = () => {
    onRename?.(renameFrom, trimmedSearch);
    onChange(trimmedSearch);
    setOpen(false);
  };

  const opt = options.find((o) => o.value === value);
  const triggerIcon = resolveFilterTriggerIcon(filter, selected);
  const triggerIconNode = opt?.iconSrc ? (
    <FilterBrandImg
      src={opt.iconSrc}
      srcs={opt.iconSrcs}
      iconShell={opt.iconShell}
      sizePx={compactIconSize(hubFilterBrandGlyphPx())}
      fallbackLabel={opt.label}
    />
  ) : opt?.emoji ? (
    <span className={HUB_FILTER_OPTION_EMOJI_CLASS} aria-hidden>
      {opt.emoji}
    </span>
  ) : opt?.color ? (
    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: opt.color }} aria-hidden />
  ) : triggerIcon ? (
    <FilterIconGlyph meta={triggerIcon} size={compactIconSize(12)} />
  ) : undefined;

  const handleClearSelection = () => {
    onChange("");
  };

  const panelInner = (
    <>
      <HubFilterDropdownPanelSearch
        value={search}
        onChange={setSearch}
        placeholder={filterDropdownPanelSearchPlaceholder(label)}
        onClearSelection={allowClear ? handleClearSelection : undefined}
        clearSelectionLabel={clearLabel}
        clearSelectionEnabled={allowClear && Boolean(value.trim())}
        onCreateAction={
          onPanelCreate
            ? () => {
                setOpen(false);
                onPanelCreate();
              }
            : undefined
        }
        createActionAriaLabel={panelCreateAriaLabel}
      />
      <HubFilterVirtualList
        className={HUB_FILTER_DROPDOWN_LIST_CLASS}
        items={filtered}
        getItemKey={(o) => o.value}
        footer={
          <>
            {showRename ? (
              <button
                type="button"
                onClick={handleRename}
                className={HUB_FILTER_DROPDOWN_ROW_CLASS}
              >
                <Pencil size={compactIconSize(12)} className="shrink-0 text-[var(--muted)]" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-left">
                  {renameOptionLabel
                    ? renameOptionLabel(renameFrom, trimmedSearch)
                    : `Rename “${renameFrom}” to “${trimmedSearch}”`}
                </span>
              </button>
            ) : null}
            {showCreate ? (
              <button
                type="button"
                onClick={handleCreateCustom}
                className={HUB_FILTER_DROPDOWN_ROW_CLASS}
              >
                <Plus size={compactIconSize(12)} className={HUB_FILTER_CREATE_GLYPH_CLASS} aria-hidden />
                <span className="min-w-0 flex-1 truncate text-left">
                  {customOptionLabel ? customOptionLabel(trimmedSearch) : `Create “${trimmedSearch}”`}
                </span>
              </button>
            ) : null}
            {filtered.length === 0 && !showCreate && !showRename ? (
              <div className="py-4 text-center text-xs text-[var(--muted)]">No matches</div>
            ) : null}
          </>
        }
        renderItem={(o) => (
          <button
            type="button"
            aria-disabled={o.disabled || undefined}
            onClick={() => {
              if (o.disabled) return;
              onChange(o.value);
              setOpen(false);
            }}
            className={hubFilterOptionRowClass(HUB_FILTER_DROPDOWN_ROW_CLASS, o, o.disabled)}
          >
            <FilterOptionRowWithHint option={o}>
              <HubFilterDropdownCircle checked={o.value === value} disabled={Boolean(o.disabled)} />
              <FilterOptionGlyph filterKey={filterKey} option={o} />
              <FilterOptionRowLabel option={o} suppressHint />
              <FilterOptionCount value={o.count} />
            </FilterOptionRowWithHint>
          </button>
        )}
      />
    </>
  );

  const panelEl = open ? (
    <div
      data-hub-single-filter-panel
      className={usePortal ? HUB_FILTER_DROPDOWN_PANEL_PORTAL_CLASS : HUB_FILTER_DROPDOWN_PANEL_CLASS}
      style={
        usePortal
          ? {
              position: "fixed",
              top: panelPos.top,
              left: panelPos.left,
              width: panelPos.width,
            }
          : undefined
      }
      role="listbox"
    >
      {panelInner}
    </div>
  ) : null;

  return (
    <div ref={ref} className={`relative shrink-0 ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel ?? label}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={hubFilterTriggerClass(selected.length > 0, triggerClassName, triggerTypoClass)}
      >
        {triggerContent ? (
          <>
            {triggerContent}
            {!triggerHideChevron ? (
              <ChevronDown
                size={compactIconSize(12)}
                className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
              />
            ) : null}
          </>
        ) : (
          <>
            {triggerIconNode}
            <span className="min-w-0 truncate">
              {triggerFormat === "value" ? (
                opt?.label ?? label
              ) : (
                <>
                  <span className="hub-filter-trigger-text__prefix">{label}:</span>{" "}
                  <span className="hub-filter-trigger-text__value">{opt?.label ?? label}</span>
                </>
              )}
            </span>
            <ChevronDown
              size={compactIconSize(12)}
              className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </>
        )}
      </button>
      {panelEl &&
        (usePortal ? createPortal(panelEl, document.body) : (
          <div className="absolute left-0 top-full z-30 mt-1">{panelEl}</div>
        ))}
    </div>
  );
}

function ActivePills({
  query,
  onClearQ,
  filters,
  values,
  onClearAll,
  onRemove,
}: {
  query: string;
  onClearQ: () => void;
  filters: FilterDef[];
  values: FilterValues;
  onClearAll: () => void;
  onRemove: (key: string, selected: string[]) => void;
}) {
  const activeItems: { key: string; value: string; label: string; iconMeta: FilterIconMeta | null }[] = [];
  const known = new Set(filters.map((f) => f.key));
  for (const f of filters) {
    for (const v of values[f.key] ?? []) {
      const opt = f.options.find((o) => o.value === v);
      activeItems.push({
        key: f.key,
        value: v,
        label: `${f.label}: ${opt?.label ?? v}`,
        iconMeta: opt ? resolveFilterOptionIcon(f.key, opt.value) : null,
      });
    }
  }
  for (const [key, vals] of Object.entries(values)) {
    if (known.has(key)) continue;
    for (const v of vals ?? []) {
      activeItems.push({
        key,
        value: v,
        label: `${key}: ${v}`,
        iconMeta: null,
      });
    }
  }

  return (
    <div className="flex flex-wrap items-center hub-inline-gap-comfort border-t border-white/5 pt-2 text-xs">
      <SlidersHorizontal size={compactIconSize(10)} className="text-[var(--muted)]" />
      <span className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Active:</span>
      {query ? (
        <button
          type="button"
          onClick={onClearQ}
          className="badge cursor-pointer border border-indigo-500/30 bg-indigo-500/15 text-indigo-200 hover:bg-indigo-500/25"
        >
          q: &quot;{query}&quot; <X size={compactIconSize(10)} className="ml-1" />
        </button>
      ) : null}
      {activeItems.map((it) => {
        const PillIcon = it.iconMeta?.icon;
        return (
        <button
          key={`${it.key}:${it.value}`}
          type="button"
          onClick={() => onRemove(it.key, (values[it.key] ?? []).filter((v) => v !== it.value))}
          className="badge inline-flex cursor-pointer items-center hub-inline-gap-tight border border-white/15 bg-white/10 hover:bg-white/15"
        >
          {PillIcon ? <PillIcon size={compactIconSize(10)} className={it.iconMeta!.className} aria-hidden /> : null}
          {it.label} <X size={compactIconSize(10)} className="ml-0.5" />
        </button>
        );
      })}
      <button type="button" onClick={onClearAll} className="ml-auto text-[10px] text-rose-300 hover:underline">
        Clear all
      </button>
    </div>
  );
}
