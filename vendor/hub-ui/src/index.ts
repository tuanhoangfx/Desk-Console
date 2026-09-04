export { HubDisplayPrefs } from "./display-prefs/HubDisplayPrefs";
export { HUB_USER_LOG_FIELD_META, hubUserLogFieldMeta } from "./auth/hub-user-log-field-meta";
export { HubDirectoryDisplayPanel, HubDisplayBandToolbar, type HubDirectoryDisplayPanelProps, type HubDisplayBandToolbarProps } from "./display-prefs/HubDirectoryDisplayPanel";
export { HubDisplayVisibilityMenu, type HubDisplayVisibilityMenuProps } from "./display-prefs/HubDisplayVisibilityMenu";
export {
  countVisiblePrefs,
  defaultsForPrefItems,
  isHubPrefVisible,
  toggleHubPrefSet,
} from "./display-prefs/hub-display-visibility";
export { HubSettingsExtras, type HubSettingsExtrasProps } from "./display-prefs/HubSettingsExtras";
export { Section, SectionIcon, SettingsSubsection, TabButton, ToggleRow } from "./display-prefs/primitives";
export { SettingsAdmSection } from "./display-prefs/SettingsAdmSection";
export {
  DirectoryDefaultSortHint,
  type DirectoryDefaultSortHintProps,
  type DirectoryDefaultSortRow,
} from "./display-prefs/DirectoryDefaultSortHint";
export {
  DirectoryTableDisplaySettingsShell,
  type DirectoryTableDisplaySettingsShellProps,
} from "./display-prefs/DirectoryTableDisplaySettingsShell";
export {
  DirectoryTableLegacyDisplaySettings,
  type DirectoryTableLegacyDisplaySettingsProps,
} from "./display-prefs/DirectoryTableLegacyDisplaySettings";
export {
  HubDirectoryManualSortToggle,
  type HubDirectoryManualSortToggleProps,
} from "./display-prefs/HubDirectoryManualSortToggle";
export { SettingsOptionFilter, type SettingsOptionFilterProps } from "./display-prefs/SettingsOptionFilter";
export { LIMIT_OPTIONS, TIME_RANGES, type TimeRange } from "./display-prefs/constants";
export {
  CHART_KEY_MIGRATION,
  migrateChartKeyList,
  migrateChartKeySet,
  migrateChartKeysWithPersist,
  serializeChartKeySet,
} from "./display-prefs/chart-key-migrate";
export {
  MAX_VISIBLE_CHART,
  defaultChartKeysFromDefs,
  enforceChartMaxOnAdd,
  resolveVisibleChartKeys,
  useResolvedVisibleChartKeys,
} from "./display-prefs/chart-visible";
export {
  DEFAULT_KPI_ON_COUNT,
  MAX_VISIBLE_KPI,
  defaultKpiKeysExcluding,
  defaultKpiKeysFromDefs,
  enforceKpiMaxOnAdd,
  resolveVisibleKpiKeys,
  useResolvedVisibleKpiKeys,
} from "./display-prefs/kpi-visible";
export {
  barChartSeriesSignature,
  chartKeysSignature,
  kpiTilesSignature,
  visibleKpiKeysSignature,
} from "./directory-band/directory-band-sync";
export {
  useDirectoryBandSync,
  type DirectoryBandHandlers,
  type DirectoryBandSyncSnapshot,
} from "./directory-band/useDirectoryBandSync";
export {
  useWorkspaceDirectoryChrome,
  DirectoryBootGate,
  HUB_LARGE_DIRECTORY_BOOT_THRESHOLD,
  needsLargeDirectoryBoot,
  type DirectoryBootGateProps,
  type WorkspaceDirectoryChromeHandlers,
  type WorkspaceDirectoryChromeSnapshot,
} from "./directory-band/useWorkspaceDirectoryChrome";
export {
  hubDirectoryHasPaintedRows,
  resolveHubDirectoryBootGateReady,
  useHubDirectoryBootGateReady,
} from "./loading/hub-directory-boot-gate";
export type {
  DisplayPrefsPrefs,
  HubDisplayPrefsProps,
  HubDisplayPrefsToolSection,
  HubDisplaySectionHints,
  PrefItem,
  PrefIcon,
  SettingsExtraTab,
  SubTabDisplayConfig,
  SystemDisplayAdapter,
} from "./display-prefs/types";
export { SUBTAB_DISPLAY_CHANGE } from "./display-prefs/types";
export {
  withPrefItemIcons,
  withDirectoryColumnIcons,
  prefIconMapFromDirectoryColumnHeaderMeta,
  prefIconMapFromHubDirectoryColumnMeta,
  buildDirectoryColumnItemsFromRoles,
  buildDirectoryColumnItemsFromHeaderMeta,
  type PrefIconMap,
  type PrefIconMeta,
  type DirectoryColumnRoleDef,
} from "./display-prefs/pref-item-icons";
export { buildStickerPrefItems, stickerPrefIconMap } from "./display-prefs/sticker-pref-items";
export { createDynamicDirectoryTableColumnPrefs } from "./prefs/create-dynamic-directory-table-column-prefs";
export {
  createDirectoryFreezePrefs,
  createScopedDirectoryFreezePrefs,
  useDirectoryFreezeCount,
  type DirectoryFreezePrefs,
} from "./prefs/directory-freeze-prefs";
export {
  createDirectoryManualSortPrefs,
  createScopedDirectoryManualSortPrefs,
  useDirectoryManualSortEnabled,
  type DirectoryManualSortPrefs,
} from "./prefs/directory-manual-sort-prefs";
export {
  HubDirectoryFreezeColumnsSetting,
  type HubDirectoryFreezeColumnsSettingProps,
} from "./display-prefs/HubDirectoryFreezeColumnsSetting";
export {
  useHubScopedFreeze,
  HUB_DIRECTORY_FREEZE_SCROLL_WRAP_CLASS,
  type UseHubScopedFreezeOptions,
  type UseHubScopedFreezeResult,
} from "./table/useHubScopedFreeze";
export {
  countHiddenDirectoryTableColumns,
  createDirectoryTableColumnPrefs,
  mergeDirectoryTableColumnOrder,
  parseDirectoryTableColumnPrefsStorage,
  serializeDirectoryTableColumnPrefsStorage,
  type DirectoryTableColumnItem,
  type DirectoryTableColumnPrefs,
} from "./prefs/directory-table-column-prefs";
export {
  createDirectoryTableColumnPresetManager,
  directoryTableColumnStatesEqual,
  asDirectoryTableColumnPresetManagerProp,
  type DirectoryTableColumnPreset,
  type DirectoryTableColumnPresetManager,
  type DirectoryTableColumnPresetManagerProp,
} from "./prefs/directory-table-column-presets";
export {
  upsertDirectoryBuiltinFramePresets,
  type DirectoryBuiltinFrameSpec,
} from "./prefs/upsert-directory-builtin-frame-presets";
export {
  HubDirectoryTableColumnPresetMenu,
  type HubDirectoryTableColumnPresetMenuProps,
} from "./prefs/HubDirectoryTableColumnPresetMenu";
export {
  DirectoryTableColumnsSettings,
  type DirectoryTableColumnsSettingsProps,
} from "./prefs/DirectoryTableColumnsSettings";
export { DirectoryTableColumnsResetAction } from "./prefs/DirectoryTableColumnsResetAction";
export { compactIconSize, HUB_CHROME_ICON_PX, HUB_COMPACT_SCALE, HUB_DIRECTORY_HEADER_GLYPH_PX, useCompactIconSize } from "./ui-scale";
export { deployLabel } from "./lib/deploy-label";
export { HUB_NO_SPELLCHECK_PROPS } from "./lib/no-spellcheck";
export { HubChromeActivityAge, type HubChromeActivityAgeProps } from "./shell/HubChromeActivityAge";
export {
  useHubHeaderBundleFreshness,
  type HubHeaderBundleFreshness,
} from "./shell/useHubHeaderBundleFreshness";
export { formatTabHeaderTimestamp } from "./lib/tab-header-timestamp";
export {
  resolveAppVersionReleaseMeta,
  parseChangelogReleaseTimestamp,
  normalizeChangelogTimestampRaw,
  type AppVersionReleaseMeta,
  type ToolManifestReleaseSlice,
} from "./lib/app-version-release-meta";
export {
  resolveHubProductVersionMeta,
  type HubProductVersionMeta,
} from "./lib/hub-product-version-meta";
export {
  buildConsoleVersionMetaItems,
  buildConsoleVersionMetaItemsLegacy,
} from "./shell/console-version-meta";
export {
  CATEGORY,
  DEPLOY,
  DRIFT,
  FIELD_KEY,
  HUB_KPI,
  LINK_KIND,
  LINK_KIND_LABEL,
  LINKS,
  LINK_STATUS,
  LINK_STATUS_LABEL,
  LINK_STATUS_TONE,
  MODE_LABEL_SHORT,
  SCHEMA_GROUP,
  SCHEMA_MODE,
  STATUS_HEALTH,
  pickBadgeIcon,
  resolveCategoryDisplayIcon,
  resolveChartLegendIcon,
  resolveDeployBadge,
  resolveDeployTargetIcon,
  resolveDriftChipIcon,
  resolveDriftCleanIcon,
  resolveFieldSpecIcon,
  resolveHealthStatusIcon,
  resolveHubKpiIcon,
  resolveLinkGapChipIcon,
  resolveLinkKindBadge,
  resolveLinkStatusBadge,
  resolveLocalOnlyIcon,
  resolveLocalPortIcon,
  resolveSchemaGroupIcon,
  resolveSchemaModeIcon,
  type BadgeSpec,
  type SchemaMode,
} from "./lib/badge-registry-core";
export { hubCatalogKpiStickerEmoji, hubCatalogStickerEmoji } from "./lib/hub-catalog-stickers";
export {
  applyHubUserZoomPct,
  HUB_USER_ZOOM_DEFAULT,
  HUB_USER_ZOOM_MAX,
  HUB_USER_ZOOM_MIN,
  HUB_USER_ZOOM_STEPS,
  hubUserZoomBootScript,
  hubUserZoomStepIndex,
  initHubUserZoom,
  readHubUserZoomPct,
  syncHubUserZoomDom,
  type HubUserZoomPct,
} from "./hub-user-zoom";
export { HubUiZoomControl } from "./shell/HubUiZoomControl";
export { HubUserZoomBoot } from "./shell/HubUserZoomBoot";
export {
  hideBootLoader,
  ensureHubTabLoaderRoot,
  HUB_BOOT_LOADER_ID,
  HUB_TAB_LOADER_ROOT_ID,
} from "./loading/hub-loader-dom";
export { useHubTabLeader } from "./loading/useHubTabLeader";
export {
  HUB_LABEL_COLLATOR,
  HUB_LABEL_NUMERIC_COLLATOR,
  HUB_NUMERIC_COLLATOR,
} from "./lib/hub-collators";
export {
  HubToolLoadingProvider,
  useHubToolLoading,
  useHubToolLoadingOptional,
  type HubToolLoadingProviderProps,
  type HubToolLoadingValue,
} from "./loading/HubToolLoadingContext";
export {
  hubToolLoadingAriaLabel,
  resolveHubToolIconSrc,
  resolveHubToolIconSrcForVite,
  resolveVitePublicPath,
} from "./loading/resolve-hub-tool-icon";
export { useHubDirectoryBoot, type HubDirectoryBootState, type UseHubDirectoryBootOptions } from "./loading/useHubDirectoryBoot";
export {
  useHubDirectoryMirror,
  type DirectoryFetchOptions,
  type HubDirectoryMirrorOptions,
} from "./loading/useHubDirectoryMirror";
export {
  applyDirectoryOrderFreeze,
  buildDirectoryOrderFreezeKey,
  clearDirectoryOrderFreeze,
} from "./loading/directory-order-freeze";
export { useTabFrozenRows } from "./loading/useTabFrozenRows";
export { useHubDirectoryChromeReady, HUB_DIRECTORY_CHROME_READY_FALLBACK_MS } from "./loading/useHubDirectoryChromeReady";
export {
  useHubStaleIdleMemo,
  hubFilterValuesFingerprint,
  clearHubStaleIdleMemoCache,
  type HubStaleIdleMemoOptions,
} from "./loading/useHubStaleIdleMemo";
export { HubInactiveTabContent } from "./loading/HubInactiveTabContent";
export { HubChromeBoundary, HubLazyScreenBoundary } from "./loading/HubLazyScreenBoundary";
export { useHubVaultBoot, type HubVaultBootOptions } from "./loading/useHubVaultBoot";
export { mountHubApp } from "./loading/mount-hub-app";
export { installHubChunkReloadGuard } from "./loading/hub-chunk-reload-guard";
export {
  installHubPerfBlackbox,
  hubBlackboxEvent,
  beginHubBlackboxSpan,
  type HubBlackboxEntry,
  type HubBlackboxOptions,
} from "./lib/hub-perf-blackbox";
export { HubLoaderRoot } from "./shell/HubLoaderRoot";
export {
  HubMainChromeInsetSync,
  HubMainChromeStack,
} from "./shell/HubMainChromeInset";
export { useHubMainChromeInset } from "./shell/useHubMainChromeInset";
export { syncHubMainChromeInset, HUB_MAIN_CHROME_TOP_VAR } from "./loading/hub-main-chrome-inset";
export {
  HubLoadingView,
  HubLoaderOrb,
  HubToolLoadingView,
  type HubLoadingViewProps,
} from "./shell/HubLoadingView";
export {
  HubScreenChunkFallback,
  HubToolScreenChunkFallback,
  type HubScreenChunkFallbackProps,
} from "./shell/HubScreenChunkFallback";
export { CacheHitBadge } from "./shell/CacheHitBadge";
export { HubHealthChip, type HubHealthChipProps, type HubSyncHealth } from "./shell/HubHealthChip";
export {
  hubThreadPreviewFromContent,
  resolveHubThreadPreview,
  type HubThreadPreview,
  type HubThreadPreviewSource,
} from "./thread/hub-thread-preview";
export { HubThreadPreviewThumb, type HubThreadPreviewThumbProps } from "./thread/HubThreadPreviewThumb";
export {
  FilterBar,
  HubMultiFilterDropdown,
  HubSingleFilterDropdown,
  filterOptionRowLabel,
  filterOptionMatchesQuery,
  hubFilterOptionHasWideMeta,
  hubFilterPanelMinWidthPx,
  hubFilterBarActiveCount,
  hubFilterBarHasActive,
  type FilterBarProps,
  type FilterDef,
  type FilterOption,
  type FilterValues,
  type HubMultiFilterDropdownProps,
  type HubSingleFilterDropdownProps,
} from "./shell/FilterBar";
export {
  HUB_FILTER_VIRTUAL_OVERSCAN,
  HUB_FILTER_VIRTUAL_ROW_PX,
  HUB_FILTER_VIRTUAL_THRESHOLD,
  hubFilterShouldVirtualize,
  hubFilterVirtualWindow,
} from "./shell/hub-filter-virtual-window";
export {
  isFilterOptionSelected,
  appendMissingSelectedFilterOptions,
  pinSelectedFilterOptions,
  type PinableFilterOption,
} from "./shell/pin-selected-filter-options";
export {
  HUB_FILTER_DATE_VALUE_PREFIX,
  hubFilterDateValue,
  isHubFilterDateValue,
  parseHubFilterDateValue,
} from "./lib/hub-filter-date-value";
export {
  hubPortalPanelPosition,
  type HubPortalPanelPosition,
  type HubPortalPanelPositionOpts,
  type HubPortalPanelRect,
} from "./shell/hub-portal-panel-position";
export {
  HubModalDirectoryFilterBar,
  type HubModalDirectoryFilterBarProps,
} from "./shell/HubModalDirectoryFilterBar";
export {
  HubTableCellFilterDropdown,
  type HubTableCellFilterDropdownProps,
} from "./shell/HubTableCellFilterDropdown";
export {
  HUB_FILTER_DROPDOWN_LIST_CLASS,
  HUB_SCROLLBAR_CLASS,
  HUB_FILTER_DROPDOWN_PANEL_CLASS,
  HUB_FILTER_DROPDOWN_PANEL_PORTAL_CLASS,
  HUB_FILTER_DROPDOWN_ROW_CLASS,
  HUB_FILTER_DROPDOWN_ROW_OPTION_DISABLED_CLASS,
  HUB_FILTER_DROPDOWN_ROW_COMPACT_CLASS,
  HUB_FILTER_DROPDOWN_ROW_DIRECTORY_VALUE_CLASS,
  hubFilterDropdownRowClass,
  hubFilterUsesDirectoryValueTypo,
  hubFilterDirectoryTriggerTypoClass,
  hubFilterGlyphPx,
  hubFilterBrandGlyphPx,
  HubFilterDropdownCircle,
  HubFilterDropdownPanelSearch,
  HubFilterDropdownTrigger,
  HUB_FILTER_OPTION_EMOJI_CLASS,
  HUB_INLINE_EMOJI_SIZE_CSS_VAR,
  hubFilterEmojiUsesColorPresentation,
  hubFilterEmojiToneClass,
  hubFilterOptionEmojiClass,
  HUB_FILTER_DROPDOWN_TRIGGER_COMPACT_TYPO_CLASS,
  HUB_FILTER_DROPDOWN_TRIGGER_DIRECTORY_HEADER_TYPO_CLASS,
  HUB_FILTER_DROPDOWN_TRIGGER_DIRECTORY_VALUE_TYPO_CLASS,
  HUB_FILTER_BRAND_ICON_CLASS,
  HUB_BRAND_ICON_BARE_CLASS,
  hubBrandIconImgClass,
  hubDirectoryTableBrandImgClass,
  type HubBrandIconShell,
  HUB_FILTER_PANEL_CLEAR_BTN_CLASS,
  HUB_FILTER_PANEL_CREATE_BTN_CLASS,
  HUB_FILTER_CREATE_GLYPH_CLASS,
  filterDropdownPanelSearchPlaceholder,
  folderFilterButtonLabel,
  multiFilterTriggerTitle,
  hubFilterTriggerClass,
} from "./shell/filter-dropdown-primitives";
export {
  configureDirectoryFilterColumnRoles,
  resolveDirectoryFilterColumnIcon,
} from "./shell/filter-directory-column-roles";
export {
  enrichFilterDefs,
  refineSparseFacetOptions,
  ENRICH_FILTER_OPTION_SCAN_CAP,
  type EnrichFilterOptionValuesOf,
} from "./lib/filter-option-counts";
export {
  fetchWorkspaceUserDirectoryRows,
  workspaceDirectoryRowToProfile,
  type WorkspaceDirectoryProfile,
  type WorkspaceUserDirectoryRow,
} from "./lib/workspace-user-directory";
export {
  configureHubUrlPrefs,
  getHubUrlPrefsDefaults,
  HUB_LIST_PREFS_CHANGE_EVENT,
  HUB_URL_DEFAULT_LIMIT,
  HUB_URL_DEFAULT_RANGE,
  parseHubChartPrefSet,
  parseHubPrefSet,
  patchHubListPrefs,
  readHubListPrefsCore,
  subscribeHubListPrefs,
  type HubListPrefsCore,
  type HubUrlPrefsConfig,
} from "./lib/hub-url-prefs";
export {
  directoryActivityIso,
  matchesDirectoryActivityAt,
  matchesDirectoryTimeRange,
  resolveDirectoryTimeRange,
  useDirectoryTimeRange,
} from "./lib/directory-time-range";
export {
  ANALYTICS_BAND_MAX,
  clampBandSlotCount,
  countAnalyticsBandSlots,
} from "./lib/analytics-band-count";
export { ChartsBand, resolveChartsBandCount } from "./shell/ChartsBand";
export { resolveKpiStripCount } from "./shell/KpiStrip";
export { HubTimeRangeSelect } from "./shell/HubTimeRangeSelect";
export {
  HubPeriodSelect,
  HubMonthPickerPanel,
  type HubPeriodSelectProps,
  type HubPeriodOption,
} from "./shell/HubPeriodSelect";
export {
  HubWorkspacePeriodSelect,
  type HubWorkspacePeriodSelectProps,
} from "./shell/HubWorkspacePeriodSelect";
export {
  hubMondayWeekOffset,
  isWorkspacePeriodKey,
  matchesWorkspacePeriod,
  normalizeWorkspacePeriodKey,
  patchWorkspacePeriod,
  readWorkspacePeriod,
  workspacePeriodOptions,
  workspacePeriodRangeParam,
  slugWorkspacePeriodUrlKeys,
  WORKSPACE_PERIOD_FILTER_HINT,
  WORKSPACE_PERIOD_ORDER,
  WORKSPACE_PERIOD_LABELS,
  type WorkspacePeriodKey,
  type WorkspacePeriodPrefs,
  type WorkspacePeriodScope,
} from "./lib/hub-workspace-period";
export {
  WORKSPACE_PERIOD_DOT_COLORS,
  workspacePeriodDotColor,
  workspacePeriodTriggerIconColor,
} from "./lib/workspace-period-dot-color";
export { useWorkspacePeriod } from "./hooks/useWorkspacePeriod";
export { useDebouncedValue } from "./hooks/useDebouncedValue";
export {
  useDirectorySearchQuery,
  type DirectorySearchQuery,
  type UseDirectorySearchQueryOptions,
} from "./hooks/useDirectorySearchQuery";
export {
  DIRECTORY_SEARCH_UI_DEBOUNCE_MS,
  DIRECTORY_SEARCH_FILTER_DEBOUNCE_MS,
  DIRECTORY_SEARCH_FETCH_DEBOUNCE_MS,
  DIRECTORY_SEARCH_CLIENT_FILTER_DEBOUNCE_MS,
  DIRECTORY_SEARCH_CLIENT_FILTER_OPTS,
  DIRECTORY_SEARCH_CLIENT_FILTER_LIVE_OPTS,
  DIRECTORY_SEARCH_FILTERBAR_QUERY_FORBIDDEN,
  directoryFacetCountQuery,
} from "./lib/directory-search-contract";
export {
  useStableDirectoryFilterToolbar,
  type StableDirectoryFilterToolbarCounts,
} from "./hooks/useStableDirectoryFilterToolbar";
export {
  useHubClientDirectorySearchQuery,
  isHubClientDirectorySearchActive,
} from "./lib/hub-client-directory-search";
export {
  directorySortMode,
  directorySortMatchesPrimaryDefault,
  resolveDirectorySortMode,
  sanitizeDirectorySortFromUrl,
  shouldPersistDirectorySortUrl,
  isDirectoryDefaultSortOnlyVault,
  type DirectorySortMode,
  type DirectorySortState,
} from "./lib/directory-sort-contract";
export { useDirectoryHaystackFilter } from "./hooks/useDirectoryHaystackFilter";
export { useHubDirectorySelection } from "./hooks/useHubDirectorySelection";
export {
  useHubDirectoryDeepLink,
  useDirectoryDeepLink,
  findDirectoryDeepLinkRow,
  readDirectoryDeepLinkId,
} from "./hooks/useHubDirectoryDeepLink";

export { HubRowLimitSelect } from "./shell/HubRowLimitSelect";
export { HubTablePageSizeSelect } from "./shell/HubTablePageSizeSelect";
export { HubFilterSelect, type HubFilterSelectOption } from "./shell/HubFilterSelect";
export { HubVisitedTabPanel, type HubVisitedTabMountMode } from "./shell/HubVisitedTabPanel";
export {
  useHubVisitedTabsLru,
  type HubVisitedTabsLruOptions,
} from "./shell/useHubVisitedTabsLru";
export {
  AppTabHeader,
  type TabHeaderMetaItem,
  type TabHeaderStatItem,
  type TabTitleMenuItem,
} from "./shell/AppTabHeader";
export { withPrefKeyHeaderStatClicks } from "./shell/withPrefKeyHeaderStatClicks";
export { HubListChromeHeader, type HubListChromeHeaderProps } from "./shell/HubListChromeHeader";
export {
  HubHeaderStatusNote,
  hubHeaderStatusSummary,
  type HubHeaderStatusNoteAction,
  type HubHeaderStatusNoteProps,
} from "./shell/HubHeaderStatusNote";
export {
  HubUserDirectoryHeaderActions,
  type HubUserDirectoryHeaderActionsProps,
} from "./shell/HubUserDirectoryHeaderActions";
export {
  HubDirectorySettings,
  type HubDirectorySettingsProps,
} from "./shell/HubDirectorySettings";
export { KpiStrip, type KpiStripTone, type KpiTileData } from "./shell/KpiStrip";
export {
  HUB_KPI_TODAY_FILTER_VALUE,
  HUB_KPI_YES_FILTER_VALUE,
  attachDirectoryKpiClicks,
  hubKpiTodayFilterDef,
  hubKpiYesFilterDef,
  isKpiPatchActive,
  kpiClearAllIfAny,
  kpiSetOrClear,
  matchesKpiTodayFilter,
  matchesKpiYesFilter,
  sameFilterValues,
  withPinnedFilterDefs,
} from "./lib/hub-kpi-filter";
export { MiniBarChart, type BarItem } from "./shell/MiniBarChart";
export {
  HubTimeSeriesLineChart,
  type HubTimeSeriesLineChartProps,
  type HubTimeSeriesLinePoint,
} from "./shell/HubTimeSeriesLineChart";
export {
  createHubTimeSeriesAreaPath,
  createHubTimeSeriesLinePath,
  createHubTimeSeriesPath,
  createHubTimeSeriesSmoothPath,
  hubTimeSeriesPlotPoints,
  pickHubTimeSeriesLabelIndexes,
  resolveHubTimeSeriesAxisMax,
  type HubTimeSeriesCurve,
} from "./lib/hub-time-series-line";
export {
  AnalyticsCaptionLabel,
  ChartLegendRowLabel,
  resolveAnalyticsLabelGlyph,
} from "./shell/AnalyticsCaptionHint";
export {
  DirectoryChartBand,
  directoryChartBandNode,
  hasDirectoryCharts,
  type DirectoryChartBandProps,
} from "./shell/DirectoryChartBand";
export { MiniSparkline } from "./shell/MiniSparkline";
export { EntityRankMiniChart, type EntityRankRow } from "./shell/EntityRankMiniChart";
export { MiniDonut, type DonutItem } from "./shell/MiniDonut";
export { MetricBadge, RegistryMetricBadge, type MetricBadgeProps, type MetricBadgeTone } from "./shell/MetricBadge";
export {
  HubUsersStatusLabel,
  HubUsersOnOffLabel,
  type HubUsersStatusLabelProps,
  type HubUsersStatusTone,
} from "./shell/HubUsersStatusLabel";
export { HubDirectoryIconCell, type HubDirectoryIconCellProps } from "./shell/HubDirectoryIconCell";
export {
  HubDirectoryBrandNameCell,
  HUB_DIRECTORY_TABLE_BRAND_ICON_PX,
  type HubDirectoryBrandNameCellProps,
} from "./shell/HubDirectoryBrandNameCell";
export { HUB_DIRECTORY_BRAND_EMPTY_GLYPH } from "./lib/resolve-hub-brand-icon";
export {
  PRODUCT_PLAN_SUFFIX_PATTERNS,
  inferProductCategory,
  parseProductPlanDurationDays,
  resolveProductPlatformGroup,
  stripProductPlanSuffix,
} from "./lib/product-category-infer";
export {
  escapeHtml as escapeHubRouteHtml,
  mapCloudRouteToExtensionStatus,
  resolveCloudRouteHealthDisplay,
  resolveExtensionRouteStatusDisplay,
  renderRouteStatusChipHtml,
} from "./lib/hub-route-status";
export {
  buildHubBrandFilterOption,
  hubBrandFilterIcon,
  hubBrandFilterIconFromHits,
  hubBrandFilterGlyphFields,
  hubBrandIconSrcFields,
  hubBrandIconSrcFieldsById,
  hubBrandIconSrcFieldsByLabel,
  type HubBrandFilterIcon,
} from "./lib/build-hub-brand-filter-option";
export { HubDirectoryToolBadge, type HubDirectoryToolBadgeProps } from "./shell/HubDirectoryToolBadge";
export {
  HubDirectoryMetricBadge,
  type HubDirectoryMetricBadgeProps,
} from "./shell/HubDirectoryMetricBadge";
export {
  HUB_DIRECTORY_METRIC_TIER_THRESHOLDS,
  HUB_DIRECTORY_METRIC_HEAT_LEGEND,
  HUB_DIRECTORY_METRIC_HEAT_LEGEND_LINES,
  hubDirectoryMetricTierClass,
  resolveHubDirectoryMetricTier,
  type HubDirectoryMetricTier,
} from "./lib/directory-metric-tier";
export { HUB_DIRECTORY_ID_EMOJI } from "./lib/directory-id-emoji";
export {
  HubDirectoryMetricStrip,
  type HubDirectoryMetricItem,
  type HubDirectoryMetricTone,
} from "./shell/HubDirectoryMetricStrip";
export { HubCopyBadge, type HubCopyBadgeProps, type HubCopyBadgeDisplay, type HubCopyFeedback, hubCopyBadgeDisplayLabel } from "./shell/HubCopyBadge";
export {
  HubAdmCopyValueBadge,
  type HubAdmCopyValueBadgeProps,
  type HubAdmCopyValueBadgeTone,
} from "./shell/HubAdmCopyValueBadge";
export { HubCopyTickWrap, type HubCopyTickWrapProps } from "./shell/HubCopyTickWrap";
export {
  HubAdmPlainRelativeTime,
  type HubAdmPlainRelativeTimeProps,
} from "./shell/HubAdmPlainRelativeTime";
export {
  HubInlineCopyControl,
  useHubCopyFlash,
  type HubInlineCopyControlProps,
} from "./shell/HubInlineCopyControl";
export {
  HUB_FLASH_BORDER_ACCENT_CLASS,
  HUB_FLASH_BORDER_MS,
  HUB_FLASH_BORDER_ROW_CLASS,
  HUB_FLASH_BORDER_SURFACE_CLASS,
  useHubFlashBorder,
} from "./lib/useHubFlashBorder";
export {
  HubTwofaCopyControl,
  type HubTwofaCopyControlProps,
} from "./shell/HubTwofaCopyControl";
export {
  HUB_TWOFA_CODE_BADGE_CLASS,
  HUB_TWOFA_CODE_BADGE_DESIGN_LOCK,
} from "./shell/hub-twofa-code-badge";
export {
  formatHubOrderPriceParts,
  formatHubOrderPricePillLabel,
  formatHubOrderPriceLabel,
  HUB_ORDER_PRICE_DEFAULT_VND_USD_RATE,
  type HubOrderPriceCurrency,
  type HubOrderPriceParts,
  type HubOrderPriceFormat,
  type HubOrderPriceLabelOptions,
} from "./lib/format-order-price";
export {
  createHubPriceFormatStore,
  coerceHubOrderPriceFormat,
  type HubPriceFormatSettings,
  type HubResolvedPriceFormat,
  type HubPriceFormatStore,
  type HubPriceFormatStoreConfig,
} from "./lib/hub-price-format";
export {
  HubPriceFormatField,
  HUB_PRICE_FORMAT_PREVIEW_AMOUNT_CENTS,
  type HubPriceFormatFieldProps,
} from "./shell/HubPriceFormatField";
export { HubPriceFormatSettingsSection } from "./shell/HubPriceFormatSettingsSection";
export {
  HubDetailFieldsGroup,
  HubDetailFieldRow,
} from "./shell/HubDetailFieldsScope";
export {
  HubOrderPriceBadge,
  HubOrderPriceText,
  type HubOrderPriceBadgeProps,
  type HubOrderPriceBadgeTone,
} from "./shell/HubOrderPriceBadge";
export {
  HUB_ORDER_PRICE_TEXT_CLASS,
  HUB_ORDER_PRICE_TEXT_DEFAULT_TONE,
  HUB_ORDER_PRICE_BADGE_CLASS,
  HUB_ORDER_PRICE_BADGE_DESIGN_LOCK,
  HUB_ORDER_PRICE_BADGE_DEFAULT_TONE,
  type HubOrderPriceTextTone,
} from "./shell/hub-order-price-badge";
export {
  HubDirectoryCopyText,
  type HubDirectoryCopyTextProps,
} from "./shell/HubDirectoryCopyText";
export {
  HubDirectoryOptionCell,
  type HubDirectoryOptionCellProps,
} from "./shell/HubDirectoryOptionCell";
export {
  HubDirectoryPhoneCell,
  type HubDirectoryPhoneCellProps,
} from "./shell/HubDirectoryPhoneCell";
export {
  HubDirectoryContactCell,
  type HubDirectoryContactCellProps,
} from "./shell/HubDirectoryContactCell";
export {
  HubContactOpenAction,
  type HubContactOpenActionProps,
} from "./shell/HubContactOpenAction";
export {
  HUB_RELATED_DETAIL_OPEN_ICON,
  HUB_RELATED_PARTNER_DETAIL_OPEN_ICON,
  HUB_RELATED_DETAIL_OPEN_ICON_SIZE,
  HubRelatedDetailOpenButton,
  type HubRelatedDetailOpenButtonProps,
} from "./shell/HubRelatedDetailOpenButton";
export {
  HubPhoneCallAction,
  type HubPhoneCallActionProps,
} from "./shell/HubPhoneCallAction";
export { hubPhoneDigits, hubPhoneTelHref } from "./lib/hub-phone-tel";
export {
  hubContactChannelHref,
  type HubContactChannel,
} from "./lib/hub-contact-channel-href";
export { hubZaloValueFromPhone } from "./lib/hub-zalo-from-phone";
export {
  HubDirectoryReadonlyCopyText,
  type HubDirectoryReadonlyCopyTextProps,
} from "./shell/HubDirectoryReadonlyCopyText";
export { HubDirectoryEllipsisCell, type HubDirectoryEllipsisCellProps } from "./shell/HubDirectoryEllipsisCell";
export {
  DIRECTORY_CELL_TRUNCATE,
  DIRECTORY_CELL_RICH_TOOLTIP_MIN_LEN,
  directoryCellHoverTitle,
  directoryCellNeedsRichTooltip,
} from "./lib/directory-cell-hover";
export { safeTrim } from "./lib/safe-trim";
export {
  copyTextWithExecCommand,
  copyTextWithFallback,
} from "./lib/copy-text-with-fallback";
export {
  HUB_DIRECTORY_LOG_CLASS,
  HUB_DIRECTORY_LOG_NOTE_CLASS,
  HUB_DIRECTORY_TIMESTAMP_CLASS,
} from "./lib/hub-directory-timestamp";
export {
  HUB_DIRECTORY_POPOVER_OFFSET_PX,
  hubDirectoryPopoverPosition,
  sameHubDirectoryPopoverPos,
} from "./lib/hub-directory-popover";
export {
  CRM_ORDER_DETAILS_EMAIL_REGEX,
  canonicalizeCrmOrderMailbox,
  countCrmOrderDetailMailboxes,
  crmOrderDetailMailboxOrder,
  countCrmOrderDetailMentions,
  crmOrderDetailsSnippet,
  crmOrderProductMatchesService,
  extractCrmOrderDetailCredentialTokens,
  extractCrmOrderDetailEmails,
  extractCrmOrderDetailIdentityTokens,
  expandCrmOrderGmailAliases,
  isCrmOrderCompletedStatus,
  normalizeCrmOrderDetailsIdentifier,
  normalizeCrmOrderDetailsText,
  readCrmOrderDetailsFromRow,
  type CrmOrderDetailsMirrorRow,
} from "./lib/crm-order-details";
export {
  CRM_ORDER_MAIL_VAULT_SERVICES,
  crmOrderProductIsMailSku,
  crmOrderVaultCandidateEligible,
  crmOrderVaultCandidateIdentityHits,
  capCrmOrderServicesVaultIds,
  crmOrderMultiSeatSlot,
  crmOrderNeedsServicesVaultBackfill,
  isCrmOrderMailVaultService,
  readCrmOrderServicesVaultIds,
  resolveCrmOrderServicesVaultId,
  resolveCrmOrderServicesVaultIds,
  sameCrmOrderVaultAccountIds,
  type CrmOrderVaultCandidate,
  type CrmOrderVaultLinkQuery,
} from "./lib/crm-order-vault-link";
export {
  EMPTY_CRM_ORDER_USAGE,
  crmOrderCountsForExpiredUsage,
  crmOrderCountsForLiveUsage,
  crmOrderCountsForUsageBucket,
  crmOrderSubscriptionIsLive,
  crmOrderUsageHitAllowedForSubject,
  lookupCrmOrderUsage,
  lookupTeamMemberCrmOrderUsage,
  lookupTeamSharedPlanCrmOrderUsage,
  mergeCrmOrderUsage,
  resolveTeamMemberCrmUsageVaultAccount,
  teamMemberToCrmUsageSubject,
  type CrmOrderUsage,
  type CrmOrderUsageBucket,
  type CrmOrderUsageHit,
  type CrmOrderUsageIndex,
  type CrmOrderUsageSubscriptionBucket,
  type CrmUsageSubject,
  type CrmUsageVaultRow,
} from "./lib/crm-order-usage-lookup";
export {
  CRM_DURATION_LIFETIME_DAYS,
  CRM_SAMPLE_NOTIFY_HIGHLIGHT_DAYS,
  CRM_SUBSCRIPTION_EXPIRING_DAYS,
  CRM_SUBSCRIPTION_STATUS,
  CRM_SUBSCRIPTION_STATUS_LABELS,
  ORDER_DAYS_LEFT_TONE_META,
  ORDER_DAYS_LEFT_TONE_ORDER,
  canonicalizeSubscriptionStatus,
  deriveSubscriptionStatusFromDaysLeft,
  orderDaysLeftDirectoryClass,
  orderDaysLeftDisplayTone,
  orderDaysLeftExpiryClass,
  orderDaysLeftLegendLines,
  orderDaysLeftPopoverClass,
  orderDaysLeftTone,
  orderDaysLeftToneClass,
  type CrmSubscriptionStatus,
  type OrderDaysLeftDisplayTone,
  type OrderDaysLeftTone,
} from "./lib/crm-subscription-status";
export {
  HubDirectoryValuePopover,
  type HubDirectoryValuePopoverProps,
} from "./table/HubDirectoryValuePopover";
export {
  HubToastProvider,
  HubToastContainer,
  HubToastShell,
  resolveHubToastPortalTarget,
  useHubToast,
  useHubToastRequired,
  formatCopyToastPreview,
  copyToastLabelFromTitle,
  formatHubUnknownMessage,
  type HubToast,
  type HubToastIcon,
  type HubToastType,
} from "./toast";
export { CopyMetaChip, MetaChip, HUB_EMAIL_COPY_CHIP_CLASS, type MetaTone } from "./shell/CopyMetaChip";
export { HubResultCount } from "./shell/HubResultCount";
export { HubSearchField, type HubSearchFieldProps } from "./shell/HubSearchField";
export {
  HubDirectoryQueryPendingChip,
  type HubDirectoryQueryPendingChipProps,
} from "./shell/HubDirectoryQueryPendingChip";
export {
  HubDirectorySyncChip,
  type HubDirectorySyncChipProps,
} from "./shell/HubDirectorySyncChip";
export {
  hubDirectorySyncChipHintContent,
  hubDirectorySyncChipStatusKey,
  resolveHubDirectoryRealtimeSyncChipView,
  resolveHubDirectorySyncLivePath,
  type HubDirectoryRealtimeStatus,
  type HubDirectorySyncChipView,
  type HubDirectorySyncLivePath,
} from "./shell/hub-directory-sync-chip";
export {
  HubDirectoryFieldQueryPendingProvider,
  useHubDirectoryFieldQueryPending,
  useHubDirectoryFieldQueryPendingReport,
} from "./shell/HubDirectoryFieldQueryPending";
export {
  HubSegmentToggle,
  hubSegmentIconSize,
  hubSegmentActiveToneClass,
  type HubSegmentActiveTone,
  type HubSegmentToggleOption,
  type HubSegmentToggleProps,
} from "./shell/HubSegmentToggle";
export {
  HubSourceInputField,
  type HubSourceDropActiveTone,
  type HubSourceInputFieldProps,
} from "./shell/HubSourceInputField";
export {
  HubCommentSendButton,
  HUB_COMMENT_SEND_BUTTON_CLASS,
} from "./shell/HubCommentSendButton";
export {
  HubDirectoryLifecycleToggle,
  type HubDirectoryLifecycleMode,
  type HubDirectoryLifecycleToggleProps,
} from "./shell/HubDirectoryLifecycleToggle";
export { DirectorySearchToolbar, type DirectorySearchToolbarProps } from "./shell/DirectorySearchToolbar";
export { resolveDirectoryToolbarShowTablePageSize } from "./shell/directory-search-toolbar-page-size";
export { HubDirectoryToolbarSlots, type HubDirectoryToolbarSlotsProps } from "./shell/HubDirectoryToolbarSlots";
export { ViewToggle, type HubViewMode } from "./shell/ViewToggle";
export {
  HubTabChrome,
  HubTabBody,
  configureHubChromePrefs,
  readHubChromePrefs,
  useHubChromePrefs,
  type HubChromePrefs,
} from "./shell/HubTabChrome";
export { HubTabSectionRule, type HubTabSectionRuleTone } from "./shell/HubTabSectionRule";
export { HubAlert } from "./content/HubAlert";
export { HubDriftBanner, type HubDriftBannerAction, type HubDriftBannerProps } from "./content/HubDriftBanner";
export { HubDataTable, HubTableEmptyRow, type HubTableColumn } from "./content/HubDataTable";
export { HubPaginatedDataTable, type HubPaginatedDataTableProps } from "./content/HubPaginatedDataTable";
export { HubReadOnlyDataTable, type HubReadOnlyDataTableProps } from "./content/HubReadOnlyDataTable";
export { HubPaginatedTableShell, type HubPaginatedTableShellProps } from "./content/HubPaginatedTableShell";
export {
  HubPaginatedCardGrid,
  HUB_DIRECTORY_CARD_GRID_CLASS,
  type HubPaginatedCardGridProps,
} from "./content/HubPaginatedCardGrid";
export { HubTablePager, type HubTablePagerProps } from "./content/HubTablePager";
export {
  DirectoryRelativeTimeCell,
  type DirectoryRelativeTimeCellProps,
} from "./content/DirectoryRelativeTimeCell";
export {
  HubDirectoryCompactTimestampLabel,
  HubDirectoryTimestampLabel,
  type HubDirectoryCompactTimestampLabelProps,
} from "./content/HubDirectoryCompactTimestampLabel";
export {
  HubDirectoryDateOnlyLabel,
  type HubDirectoryDateOnlyLabelProps,
} from "./content/HubDirectoryDateOnlyLabel";
export {
  HubDirectoryTimestampTooltipCell,
  type HubDirectoryTimestampTooltipCellProps,
  type HubDirectoryTimestampTooltipVariant,
} from "./content/HubDirectoryTimestampTooltipCell";
export {
  HubActivityTimestampLabel,
  type HubActivityTimestampLabelProps,
} from "./content/HubActivityTimestampLabel";
export {
  HubDirectoryLogLabel,
  type HubDirectoryLogLabelProps,
} from "./content/HubDirectoryLogLabel";
export {
  HubDirectoryLogCell,
  type HubDirectoryLogCellProps,
} from "./content/HubDirectoryLogCell";
export { HubChangeLogList, formatHubChangeLogRowTooltip, type HubChangeLogListProps, type HubChangeLogRowDecoration } from "./content/HubChangeLogList";
export {
  HUB_ENTITY_ACTIVITY_LOG_META_KEY,
  MAX_HUB_ENTITY_LOG_ENTRIES,
  appendHubEntityLogEntry,
  buildHubEntityLogMessage,
  formatHubEntityLogChangeLine,
  hubEntityLogFieldMetaResolver,
  hubEntityLogSameText,
  hubEntityLogTextValue,
  mergeHubEntityAuditLogs,
  normalizeHubEntityLog,
  canonicalizeHubEntityLogAt,
  dedupeHubEntityLogEntries,
  parseHubEntityLogMessageChanges,
  preserveHubEntityActivityLogOnMetadataWrite,
  pushHubEntityLogChange,
  readHubEntityActivityLog,
  withHubEntityActivityLog,
  type HubEntityLogChange,
  type HubEntityLogEntry,
  type HubEntityLogFieldMeta,
} from "./lib/hub-entity-log";
export {
  emitHubAppLog,
  hubLogFieldLabels,
  hubSessionLogHasDelta,
  HUB_APP_LOG_EVENT,
  TOOL_HUB_LOG_EVENT,
  type HubAppLogEmitDetail,
  type HubAppLogEventDetail,
  type HubAppLogFieldLabel,
  type HubAppLogFieldLabels,
  type HubLogEntityChip,
  type HubLogEntityRef,
} from "./lib/hub-session-log-emit";
export {
  emitWorkspaceDualSignInSessionLog,
  WORKSPACE_AUTH_SIGN_IN_SLOW_HUB_MS,
  WORKSPACE_AUTH_SIGN_IN_SLOW_TOTAL_MS,
  type EmitWorkspaceDualSignInSessionLogOptions,
  type WorkspaceAuthSignInPlaneTiming,
  type WorkspaceAuthSignInTimings,
} from "./lib/workspace-auth-sign-in-log";
export {
  markAllLogSeen,
  markLogSeenId,
  readLogSeenIds,
  countUnreadLogEntries,
} from "./shell/hub-log-seen";
export { HubSessionLogAuditBody, type HubSessionLogAuditBodyProps } from "./shell/HubSessionLogAuditBody";
export {
  isHubTempEntityId,
  reseedHubDetailDraftAfterSave,
  runHubDetailOptimisticSave,
  type HubDetailOptimisticSaveOptions,
} from "./lib/hub-detail-optimistic-save";
export {
  HUB_DETAIL_CLOUD_PENDING_PREFIX,
  hubDetailCloudFailedToast,
  hubDetailCloudPendingToast,
  hubDetailPlural,
  hubDetailSaveToast,
  scheduleHubDetailCloudSaveFeedback,
  type HubDetailCloudAck,
  type HubDetailSaveToastInput,
} from "./lib/hub-detail-save-toast";
export {
  mergeHubDetailDisplayRow,
  useHubDetailDirtyBaseline,
  useHubDetailDisplayRow,
  type UseHubDetailDisplayRowOptions,
} from "./lib/use-hub-detail-dirty-baseline";
export {
  isHubMultilineDraftDirty,
  isHubMultilinePersistDirty,
  normalizeHubMultilineDraftText,
  persistHubMultilineDraftText,
  readHubMultilinePersistedText,
} from "./lib/hub-multiline-draft-text";
export {
  flattenHubEntityLog,
  formatHubEntityLogActionLabel,
  hubEntityLogFieldDisplayRank,
  hubEntityLogMessageHasDeltaArrow,
  isHubEntityLogCredentialField,
  pickHubEntityLogDirectorySummaryRow,
  resolveHubEntityLogEntryChanges,
  type FlattenHubEntityLogOptions,
  type HubEntityLogRow,
} from "./lib/hub-entity-log-rows";
export { formatHubRelativeTime } from "./lib/format-hub-relative-time";
export {
  DIRECTORY_EMPTY_LABEL,
  DirectoryEmptyDash,
  HubDirectoryEmptyCell,
  isDirectoryEmptyLabel,
} from "./lib/directory-empty-label";
export {
  HubEmptyValue,
  type HubEmptyValueProps,
  type HubEmptyValueState,
} from "./lib/hub-empty-value";
export {
  formatHubActivityRelativeAge,
  formatHubActivityStaleLabel,
  formatHubActivityTime,
  formatLastOpenedRelativeAge,
  formatLastOpenedStaleDate,
  HUB_ACTIVITY_AGING_MS,
  HUB_ACTIVITY_DAYS_MS,
  HUB_ACTIVITY_FRESH_MS,
  HUB_ACTIVITY_RECENT_MS,
  HUB_ACTIVITY_WEEK_MS,
  hubActivityAgeHubTone,
  hubActivityAgeTone,
  hubActivityAgeUsesCalendarLabel,
  lastOpenedAgeTone,
  lastOpenedHubTone,
  parseHubActivityMs,
  type HubActivityAgeTone,
} from "./lib/format-hub-activity-time";
export {
  formatHubCalendarDateCompact,
  formatHubDirectoryDateCompact,
  formatHubTimestampCompact,
  formatHubTimestampDateOnly,
  formatHubTimestampFull,
  formatHubTimestampLog,
} from "./lib/format-hub-timestamp-compact";
export {
  extractNumericSearchTerm,
  matchesDirectoryIdSearch,
  getDirectorySearchHighlight,
  directorySearchHighlightTerms,
  buildHighlightSegments,
  type DirectoryIdSearchInput,
  type DirectoryIdSearchOptions,
  type DirectorySearchHighlight,
  type HighlightSegment,
} from "./lib/directory-id-search";
export { HubDirectorySearchHighlightText } from "./content/HubDirectorySearchHighlightText";

export { useRelativeNow } from "./lib/use-relative-now";
export {
  configureDirectoryPager,
  directoryPagerChangeEvent,
  directoryPagerHideWhenSinglePage,
} from "./table/directory-pager-config";
export { HubTableColumnHeader, type HubTableColumnHeaderProps } from "./content/HubTableColumnHeader";
export {
  HubDirectoryColumnHint,
  pickHubDirectoryHintLineGlyph,
  type HubDirectoryColumnHintContent,
  type HubDirectoryColumnHintGlyph,
  type HubDirectoryColumnHintLine,
  type HubDirectoryHintLineGlyph,
} from "./table/HubDirectoryColumnHint";
export { HubSortIndicator, type HubSortDir } from "./table/HubSortIndicator";
export {
  directoryTableSortReducer,
  useDirectoryTableSort,
  type DirectoryTableSortTieBreak,
} from "./table/useDirectoryTableSort";
export {
  HUB_DIRECTORY_TABLE_SCROLL_CLASS,
  HUB_DIRECTORY_TABLE_INLINE_WRAP_CLASS,
  HUB_DIRECTORY_TABLE_PANE_CHROME_SPLIT_CLASS,
  HUB_DIRECTORY_TABLE_PANE_WRAP_CLASS,
  HUB_DIRECTORY_TABLE_PANE_INLINE_SCROLL_CLASS,
  HUB_DIRECTORY_TABLE_SCROLL_FLEX_CLASS,
  HUB_DIRECTORY_ICON_CELL_HIT_EXPAND_CLASS,
} from "./table/directory-table-scroll";
export {
  readHubDirectoryPinnedIds,
  toggleHubDirectoryPinnedId,
  pinHubDirectoryIds,
  sortHubDirectoryPinnedFirst,
  purgeHubDirectoryPinnedStorage,
  type HubDirectoryPinScope,
} from "./prefs/hub-directory-pinned";
export {
  HubDirectoryTableShell,
  type HubDirectoryTableColumn,
  type HubDirectoryTableShellProps,
  type HubDirectoryTableStaticColumn,
} from "./table/HubDirectoryTableShell";
export { DirectorySplitScrollTable } from "./table/DirectorySplitScrollTable";
export { DirectoryInlineTable } from "./table/DirectoryInlineTable";
export {
  buildDirectoryStickyColumnsCss,
  measureDirectoryStickyLeadWidthPx,
  directoryStickyLeadExceedsViewport,
  DIRECTORY_STICKY_VIEWPORT_WARN_PX,
  DIRECTORY_STICKY_LEFT_VAR_PREFIX,
  type DirectoryStickyLeadEntry,
  type BuildDirectoryStickyColumnsCssOptions,
  type StickyLeftMode,
} from "./table/directory-sticky-columns";
export {
  useHubDirectoryStickyColumns,
  type HubDirectoryStickyColumn,
  type UseHubDirectoryStickyColumnsOptions,
  type UseHubDirectoryStickyColumnsResult,
} from "./table/useHubDirectoryStickyColumns";
export {
  DirectoryTableBodyCell,
  type DirectoryTableBodyCellProps,
} from "./table/DirectoryTableBodyCell";
export {
  applyChromeRemDirectoryColWidths,
  buildChromeRemDirectoryColgroup,
  buildDirectoryColgroup,
  buildDirectoryColgroupForShell,
  buildDirectoryColumns,
  scaleDirectoryColumnWidths,
  validateDirectoryColumns,
  hubDirectoryTableClass,
  hubDirectoryFrameTableClass,
  HUB_DIRECTORY_FRAME_CLASS,
  HUB_DIRECTORY_FRAME_TABLE_CLASS,
  HUB_DIRECTORY_TABLE_BASE_CLASS,
  HUB_DIRECTORY_TABLE_WRAP_CLASS,
  HUB_DIRECTORY_USER_TABLE_WRAP_CLASS,
  HUB_DIRECTORY_SELECT_COL_WIDTH,
  HUB_DIRECTORY_SELECT_COLGROUP_WIDTH,
  HUB_MODAL_DIRECTORY_TABLE_WRAP_CLASS,
  type DirectoryColgroupOptions,
  type DirectoryColgroupForShellOptions,
  type HubDirectoryColumnDef,
  type HubDirectoryColumnKind,
  type HubDirectoryColumnMetaInput,
  type HubDirectoryTableVariant,
  resolveDirectoryPanelFillRows,
  shouldPadDirectoryBodyToFixedRows,
  shouldPadDirectoryBodyToPageSize,
  type HubDirectoryPartialPagePad,
} from "./table/hub-directory-table-meta";
export {
  buildDirectoryFixedColumnTabularSelectors,
  generateDirectoryFixedColumnCss,
  verifyDirectoryColumnMetaKeys,
  verifyDirectoryColumnWidths,
  verifyDirectoryFixedColumnCss,
  type DirectoryColumnWidthEntry,
  type DirectoryFixedColumnEntry,
  type GenerateDirectoryFixedColumnCssOptions,
} from "./table/directory-fixed-column-css";
export {
  HUB_DIRECTORY_COLUMN_WIDTH_REGISTRY,
  HUB_DIRECTORY_FIXED_COL_WIDTH_BANDS,
  HUB_DIRECTORY_NOTE_COL_WIDTH,
  HUB_DIRECTORY_LOG_COL_WIDTH,
  HUB_DIRECTORY_PROFILE_COL_WIDTH,
  HUB_DIRECTORY_USAGE_COL_WIDTH,
  HUB_DIRECTORY_USAGE_EXPIRED_COL_WIDTH,
  HUB_DIRECTORY_PLAN_LEFT_COL_WIDTH,
  HUB_DIRECTORY_OWNERSHIP_COL_WIDTH,
  HUB_DIRECTORY_ACCOUNT_STATUS_COL_WIDTH,
  HUB_DIRECTORY_SUBSCRIPTION_STATUS_COL_WIDTH,
  HUB_DIRECTORY_PLAN_DATE_COL_WIDTH,
  HUB_DIRECTORY_PLAN_DUE_COL_WIDTH,
  HUB_DIRECTORY_PASSWORD_COL_WIDTH,
  HUB_DIRECTORY_MAIL_RECOVER_COL_WIDTH,
  HUB_DIRECTORY_FULL_INFO_COL_WIDTH,
  HUB_DIRECTORY_PLAN_PACKAGE_COL_WIDTH,
  HUB_DIRECTORY_SELECT_WIDTH_SPEC,
  isFixedDirectoryColumnRole,
  isFixedDirectoryColumnWidth,
  isFluidDirectoryColumnWidth,
  resolveDirectoryColumnWidthSpec,
  validateDirectoryColumnWidthMeta,
  type HubDirectoryColumnWidthKind,
  type HubDirectoryColumnWidthSpec,
} from "./table/hub-directory-column-width-registry";
export { buildSharedDirectoryWidthMap } from "./table/hub-directory-width-groups";
export {
  HUB_ROUTE_ACCESS_TABLE_CLASS,
  HUB_ROUTE_ACCESS_TABLE_WRAP_CLASS,
  HUB_ROUTE_ACCESS_MODAL_TABLE_CLASS,
  HUB_ROUTE_ACCESS_MODAL_TABLE_WRAP_CLASS,
  HUB_ROUTE_ACCESS_COL,
  HUB_ROUTE_ACCESS_HEADER_LABEL_ALWAYS,
  HUB_ROUTE_ACCESS_MODAL_COLUMN_DEFS,
  HUB_ROUTE_ACCESS_SKELETON_WRAP_CLASS,
  buildHubRouteAccessModalColumns,
  hubRouteAccessModalColumnCount,
  hubRouteAccessModalTableClass,
  type HubRouteAccessColumnKey,
  type HubRouteAccessColumnLayout,
  type HubRouteAccessModalColumnOptions,
  type HubRouteAccessSortKey,
} from "./table/hub-route-access-table-meta";
export {
  HubRouteAccessDirectoryTable,
  type HubRouteAccessDirectoryTableProps,
} from "./table/HubRouteAccessDirectoryTable";
export {
  hubRouteAccessFilterDefs,
  type HubRouteAccessFilterScope,
} from "./table/hub-route-access-filter-defs";
export {
  HubUserToolsDirectoryTable,
  type HubUserToolsDirectoryTableProps,
} from "./table/HubUserToolsDirectoryTable";
export {
  HubUserToolsDirectoryTableSkeleton,
  type HubUserToolsDirectoryTableSkeletonProps,
} from "./table/HubUserToolsDirectoryTableSkeleton";
export {
  HUB_USER_TOOLS_COL,
  HUB_USER_TOOLS_MODAL_TABLE_CLASS,
  HUB_USER_TOOLS_MODAL_TABLE_WRAP_CLASS,
  HUB_USER_TOOLS_DIRECTORY_TABLE_CLASS,
  HUB_USER_TOOLS_MODAL_COLUMN_DEFS,
  HUB_USER_TOOLS_SKELETON_WRAP_CLASS,
  buildHubUserToolsModalColumns,
  hubUserToolsModalColumnCount,
} from "./table/hub-user-tools-table-meta";
export {
  HubRouteAccessDirectoryTableSkeleton,
  type HubRouteAccessDirectoryTableSkeletonProps,
} from "./table/HubRouteAccessDirectoryTableSkeleton";
export {
  HUB_UI_TEMPLATE_META,
  resolveHubUiTemplateBadge,
  resolveHubUiTemplateMeta,
  type HubUiTemplateMeta,
} from "./table/hub-ui-template-meta";
export {
  HUB_APP_TAB_GROUP_META,
  resolveHubAppTabGroupBadge,
  type HubAppTabGroup,
  type HubAppTabGroupMeta,
} from "./table/hub-app-tab-group-meta";
export { HubUiTemplateBadge, HubAppTabGroupBadge } from "./shell/HubUiTemplateBadge";
export {
  HubSidebarFooterButton,
  HUB_SIDEBAR_FOOTER_BTN_CLASS,
  type HubSidebarFooterButtonProps,
} from "./shell/HubSidebarFooterButton";
export {
  HUB_SIDEBAR_NEW_ACTION_ICON_CLASS,
  HUB_SIDEBAR_NEW_ACTION_LABEL,
} from "./shell/hub-sidebar-new-action";
export {
  HubSidebarNewFooterButton,
  type HubSidebarNewFooterButtonProps,
} from "./shell/HubSidebarNewFooterButton";
export {
  HubSemanticGlyph,
} from "./shell/HubSemanticGlyph";
export {
  HubBrandIcon,
} from "./shell/HubBrandIcon";
export {
  HubTabTitleIcon,
} from "./shell/HubTabTitleIcon";
export type { HubBrandIconProps } from "./shell/HubBrandIcon";
export {
  HubNavIcon,
} from "./shell/HubNavIcon";
export type { HubNavIconProps } from "./shell/HubNavIcon";
export {
  listHubBrandIconIds,
  resolveHubBrandIcon,
  resolveHubBrandIconByMatch,
  resolveHubBrandFamilyHits,
  resolveHubBrandFallbackGlyph,
  clearHubBrandIconMatchCache,
} from "./lib/resolve-hub-brand-icon";
export { useHubBrandImageGate } from "./lib/use-hub-brand-image-gate";
export type { HubBrandIconId, HubBrandIconMeta } from "./lib/resolve-hub-brand-icon";
export {
  HubSidebarNavGroup,
  HubSidebarNavGroupHeader,
  NavGroupSubNav,
} from "./shell/HubSidebarNavGroup";
export {
  HubSystemTabSubNav,
  HUB_SYSTEM_TAB_SUBNAV_CLASS,
} from "./shell/HubSystemTabSubNav";
export type {
  HubSidebarNavGroupHeaderProps,
  HubSidebarNavGroupProps,
  NavGroupSubNavItem,
  NavGroupSubNavProps,
} from "./shell/HubSidebarNavGroup";
export {
  HubSidebarNavList,
} from "./shell/HubSidebarNavList";
export type { HubSidebarNavListProps } from "./shell/HubSidebarNavList";
export {
  HubSidebarNavScreenButton,
} from "./shell/HubSidebarNavScreenButton";
export type { HubSidebarNavScreenButtonProps } from "./shell/HubSidebarNavScreenButton";
export {
  HubSidebarShell,
  HUB_SIDEBAR_SHELL_ASIDE_CLASS,
  HUB_SIDEBAR_SHELL_BRAND_TAGLINE_CLASS,
  HUB_SIDEBAR_SHELL_BRAND_TITLE_CLASS,
  HUB_SIDEBAR_SHELL_FOOTER_CLASS,
  HUB_SIDEBAR_SHELL_NAV_CLASS,
  type HubSidebarShellProps,
} from "./shell/HubSidebarShell";
export {
  HubSidebarBrandIcon,
  HUB_SIDEBAR_BRAND_ICON_CLASS,
  type HubSidebarBrandIconProps,
} from "./shell/HubSidebarBrandIcon";
export {
  hubMainShellClassFromManifest,
  hubMainShellClassName,
  type HubMainShellClassOptions,
  type HubMainShellMode,
  type ToolManifestUiShell,
  type ToolManifestUiShellInput,
  hubAppShellClassName,
} from "./shell/hub-main-shell-class";
export { applyHubEmbedDocumentClass, isHubEmbedMode } from "./shell/hub-embed-mode";
export {
  setHubHostVersionOverride,
  getHubHostVersionOverride,
  setHubHostVersionPublishedAtOverride,
  getHubHostVersionPublishedAtOverride,
  setHubHostCodeOverride,
  getHubHostCodeOverride,
  readHubEmbedHostVersion,
  readHubEmbedHostCode,
  readHubEmbedHostZoom,
  resolveHubDisplayAppVersion,
} from "./shell/hub-embed-mode";
export { HUB_EMBED_HOST_MAIN_FLEX_EXTRA } from "./shell/hub-embed-host-main-extra";
export { useNavGroupOpenState } from "./shell/useNavGroupOpenState";
export {
  applyFirstVisitNavGroupDefaults,
  HUB_NAV_DENSITY_INIT_SUFFIX,
  type ApplyFirstVisitNavGroupDefaultsOptions,
  type NavGroupDensityContext,
} from "./shell/applyFirstVisitNavGroupDefaults";
export {
  flatMapNavScreenItems,
  isNavGroupActive,
  isNavScreenGroup,
  isNavViewGroup,
  navGroupSubnavOpenKey,
  navScreenGroupSubNavItems,
  navViewGroupSubNavItems,
} from "./shell/nav-sidebar-structure";
export type {
  NavGroupBase,
  NavGroupChildBase,
  NavGroupConfig,
  NavScreenGroupChild,
  NavScreenGroupConfig,
  NavScreenNavItem,
  NavStructureEntry,
  NavViewGroupChild,
  NavViewGroupConfig,
} from "./shell/nav-sidebar-structure";
export {
  NAV_ICON_TONES,
  navActiveBarClass,
  navActiveBgClass,
  navActiveTextClass,
  navBadgeIconClass,
  navBadgeVariantClass,
  navChartColor,
  navDotClass,
  navIconClass,
  navKpiTone,
  navMetaTextClass,
  navRailClass,
  navToneStyle,
  type NavIconTone,
  type NavToneStyle,
} from "./shell/sidebar-nav-tones";
export { HubToolAvatar, type HubToolAvatarProps, type HubToolAvatarSize } from "./shell/HubToolAvatar";
export { HubDesignTemplateEmpty, type HubDesignTemplateEmptyProps } from "./content/HubDesignTemplateEmpty";
export {
  HUB_TABLE_PAGE_SIZE,
  hubPageAllSelected,
  hubPageAllSelectedByPredicate,
  hubDirectoryListResetKey,
  hubTablePaginationResetKey,
  hubTogglePageSelectAll,
  hubTogglePageSelectAllByPredicate,
  paginateHubTableItems,
  useHubTablePagination,
  type HubServerPaginationControl,
  type HubTablePaginationState,
} from "./table/hub-table-pagination";
export {
  HUB_TABLE_PAGE_SIZE_DEFAULT,
  TABLE_PAGE_SIZE_OPTIONS,
  patchHubTablePageSizeValue,
  readHubTablePageSize,
  useHubTablePageSize,
} from "./table/hub-table-page-size";
export {
  HUB_LARGE_DIRECTORY_MAX_PAGE,
  HUB_LARGE_DIRECTORY_PAGE_THRESHOLD,
  resolveLargeDirectoryPageSize,
} from "./table/hub-directory-page-size";
export {
  HUB_TABLE_COLUMN_META,
  resolveHubTableColumnMeta,
  type HubTableColumnMeta,
  type HubTableColumnRole,
} from "./table/hub-table-column-meta";
export { HubPanel } from "./content/HubPanel";
export { HubRuntimeChannelBadge, type HubRuntimeChannelBadgeProps } from "./shell/HubRuntimeChannelBadge";
export {
  classifyHubConsoleLine,
  hubConsoleCmd,
  hubConsoleMeta,
  hubConsoleOk,
  stripHubConsoleHostStamp,
  tokenizeHubConsoleLine,
  type HubConsoleLineKind,
  type HubConsoleSegment,
  type HubConsoleSegmentKind,
} from "./runtime/hub-console-crt";
export { HubConsoleCrtLine } from "./runtime/HubConsoleCrtLine";
export {
  HubRuntimeConsoleTerm,
  HubRuntimeConsoleLine,
  HubRuntimeConsoleDuration,
} from "./content/HubRuntimeConsoleTerm";
export {
  HubRuntimeConsoleContent,
  HUB_RUNTIME_CONSOLE_RENDER_LIMIT,
  type HubRuntimeConsoleEntry,
} from "./content/HubRuntimeConsoleContent";
export {
  HubRuntimeHistoryList,
  type HubRuntimeHistoryRow,
} from "./content/HubRuntimeHistoryList";
export {
  formatHubRuntimeLogTime,
  hubRuntimeConsoleLineClass,
} from "./lib/hub-runtime-format";
export {
  groupHubRuntimeConsoleLogs,
  formatHubRuntimeConsoleGroupMessage,
  type HubRuntimeConsoleLogLike,
  type HubRuntimeConsoleDisplayRow,
} from "./lib/hub-runtime-group";
export { HubDirectoryCard } from "./content/HubDirectoryCard";
export {
  HubDirectoryCardShell,
  HubDirectoryInteractiveCard,
  HubDirectoryCardCheckbox,
  HubDirectoryCardCornerRail,
  HubDirectoryCardPinButton,
  HUB_DIRECTORY_CARD_SURFACE,
  HUB_DIRECTORY_CARD_SELECTED,
  type HubDirectoryCardShellVariant,
  type HubDirectoryCardShellProps,
  type HubDirectoryInteractiveCardProps,
  type HubDirectoryCardCheckboxProps,
  type HubDirectoryCardPinButtonProps,
} from "./content/HubDirectoryCardShell";
export {
  HubDirectoryCardMetaRow,
  type HubDirectoryCardMetaRowProps,
} from "./content/HubDirectoryCardMetaRow";
export {
  HubDirectoryCardHeader,
  type HubDirectoryCardHeaderProps,
} from "./content/HubDirectoryCardHeader";
export {
  HubDirectoryCardLeadingIcon,
  HUB_DIRECTORY_CARD_ICON_BOX_PX,
  HUB_DIRECTORY_CARD_ICON_GLYPH_PX,
  type HubDirectoryCardLeadingIconProps,
} from "./content/HubDirectoryCardLeadingIcon";
export {
  HubDirectoryCardLeadingTile,
  type HubDirectoryCardLeadingTileProps,
} from "./content/HubDirectoryCardLeadingTile";
export { HubTabScreenBody } from "./content/HubTabScreenBody";
export {
  HubAnalyticsBandReserve,
  HubChartCardReserve,
  type HubAnalyticsReserveChrome,
  type HubAnalyticsReserveChart,
  type HubAnalyticsReserveKpi,
} from "./content/HubAnalyticsBandReserve";
export {
  HubDirectoryEmptyFrame,
  type HubDirectoryEmptyFrameProps,
} from "./content/HubDirectoryEmptyFrame";
export { HubDirectoryScreen, type HubDirectoryScreenProps } from "./templates/HubDirectoryScreen";
export {
  HubWorkspaceDirectoryScreen,
  type HubWorkspaceDirectoryScreenProps,
} from "./templates/HubWorkspaceDirectoryScreen";
export {
  HubSplitWorkspaceScreen,
  type HubSplitWorkspaceScreenProps,
} from "./templates/HubSplitWorkspaceScreen";
export { HubDashboardScreen, type HubDashboardScreenProps } from "./templates/HubDashboardScreen";
export {
  HUB_UI_TEMPLATES,
  GOLDEN_SOURCES,
  isHubUiTemplate,
  type HubUiTemplate,
  type UiScreenEntry,
} from "./ui-template-types";
export {
  configureFilterIcons,
  mergeFilterIconResolver,
  resolveFilterAllIcon,
  defaultFilterAllIcon,
  semanticFilterAllIcon,
  FILTER_BAR_SEMANTIC_KEY,
  DEFAULT_FILTER_ALL_ICONS,
  resolveFilterOptionIcon,
  type FilterIconMeta,
  type HubGlyphComponent,
  type FilterIconResolver,
} from "./shell/filter-icons";
export { countryCodeForLocale, flagCdnUrl, flagsApiUrl, localeFlagIconSrc, type FlagsApiSize, type FlagsApiStyle } from "./lib/locale-flag";
export {
  HUB_COUNTRY_BY_CODE,
  HUB_COUNTRY_CATALOG,
  normalizeHubCountryCode,
  resolveHubCountry,
  type HubCountryEntry,
} from "./lib/country-catalog";
export {
  buildHubCountryFilterOptions,
  hubCountryFilterOption,
  hubLocaleFlagFilterOption,
} from "./lib/country-filter-options";
export { HUB_NONE_EMOJI, HUB_NONE_LABEL, hubNoneFilterOption } from "./lib/hub-none-option";
export { HubCountryFlagBadge, HubCountryInline, type HubCountryInlineProps } from "./shell/HubCountryInline";
export {
  AGENT_KIND_SEMANTIC,
  AGENT_SCOPE_SEMANTIC,
  buildSemanticTocIcon,
  configureSemanticIcons,
  normalizeSemanticIconKey,
  resolveSemanticIcon,
  SEMANTIC_ICON_ALIASES,
  semanticFilterMeta,
  semanticHeaderStat,
  semanticKpiIcon,
  semanticDirectoryColumnIcon,
} from "./lib/semantic-icon-registry";
export {
  createDirectoryColumnMetaHelpers,
  type DirectoryColumnHeaderMeta,
} from "./lib/directory-column-meta-helpers";
export {
  applyStandardDirectoryColumnHints,
  applyStandardDirectoryColumnHintsToDefs,
  attachDirectoryColumnHints,
  buildDirectoryColumnHintsFromMeta,
  colHint,
  HUB_ACTIVITY_AGE_HINT_LINES,
  inferDirectoryColumnDescription,
  inferDirectoryColumnHintLines,
  isActivityAgeDirectoryColumn,
  withDirectoryColumnHints,
  withDirectoryColumnLabelHints,
  withDirectoryColumnStickers,
  withFilterLabelHints,
  withFilterOptionTips,
  withFilterOptionLabelHints,
  withSortPriorityHintLines,
} from "./lib/directory-column-hint-helpers";
export type {
  DeprecatedSemanticIconKey,
  SemanticIconKey,
  SemanticIconLookupKey,
  SemanticIconMeta,
} from "./types/semantic-icon";
export {
  CHART_LEGEND_SLOT_COUNT,
  CHART_OTHERS_EMOJI,
  CHART_OTHERS_LABEL,
  CHART_TOP_N,
  configureChartLegend,
  prepareChartItems,
  topChartItems,
  withChartLegendIcon,
  type ChartLegendIcon,
  type ChartRow,
} from "./chart-items";
export {
  chartBreakdownFromLabels,
  chartBreakdownFromPicker,
  type ChartBreakdownOptions,
} from "./lib/chart-breakdown";
export { createChartLegendResolver } from "./lib/chart-legend";
export { ChartLegendLabelContent } from "./lib/chart-legend-label-content";
export { buildSearchHaystackIndex, normalizeSearchText } from "./lib/search-haystack-index";
export {
  CHART_OTHERS_BAR_COLOR,
  CHART_RANK_COLORS,
  chartRankBarColor,
  DEFAULT_CHART_PALETTE,
  isChartOthersLabel,
} from "./lib/chart-palette";
export { usePageSessionSeconds } from "./hooks/usePageSessionSeconds";
export {
  HUB_SHORTCUT_LEGEND,
  configureHubPageShortcuts,
  getHubActiveScreen,
  isHubTypingTarget,
  registerHubPageShortcuts,
  registerHubSearchClear,
  registerHubSearchFocus,
  registerHubSettingsOpen,
  triggerHubSettingsOpen,
  setHubActiveScreen,
  type HubPageShortcutHandlers,
  type HubShortcutId,
} from "./keyboard/hub-keyboard-shortcuts";
export {
  HUB_MODAL_SEARCH_ATTR,
  HUB_MODAL_SEARCH_SELECTOR,
  focusHubModalSearch,
} from "./keyboard/hub-modal-search";
export { useHubAccountDetailSearchShortcuts } from "./keyboard/useHubAccountDetailSearchShortcuts";
export type { UseHubAccountDetailSearchShortcutsProps } from "./keyboard/useHubAccountDetailSearchShortcuts";
export { useHubPageShortcuts } from "./keyboard/useHubPageShortcuts";
export {
  hubSystemShortcutScope,
  resolveHubActiveScreenId,
  useHubActiveScreenSync,
} from "./keyboard/useHubActiveScreenSync";
export { HubKeyboardHints } from "./keyboard/HubKeyboardHints";
export { HubKeyboardShortcutsPanel } from "./keyboard/HubKeyboardShortcutsPanel";
export { WorkspaceTabHeader, type WorkspaceTabHeaderProps } from "./shell/WorkspaceTabHeader";
export { buildVersionMetaItems } from "./shell/workspace-tab-header-meta";
export { HubModalCloseButton, type HubModalCloseButtonProps } from "./shell/HubModalCloseButton";
export { HubScrambleText, type HubScrambleTextProps } from "./shell/HubScrambleText";
export { HubModalFrame, type HubModalFrameProps } from "./shell/HubModalFrame";
export { HubDetailModal, type HubDetailModalProps, type HubDetailModalSize } from "./shell/HubDetailModal";
export {
  acquireHubDetailModalStackLayer,
  hubDetailModalPendingLayer,
  hubDetailModalStackBackdropStyle,
  hubDetailModalStackDepth,
  isTopHubDetailModalStackLayer,
  releaseHubDetailModalStackLayer,
  resetHubDetailModalStackForTests,
} from "./shell/hub-detail-modal-stack";
export {
  HubToolDetailSplitLayout,
  HubToolDetailPanel,
  HubToolDetailRail,
} from "./shell/HubToolDetailSplitLayout";
export {
  HubToolDetailModal,
  type HubToolDetailModalProps,
} from "./shell/HubToolDetailModal";
export {
  HubToolDetailModalPrimaryAction,
  HubToolDetailModalSecondaryAction,
  type HubToolDetailModalSecondaryActionProps,
  type HubToolDetailModalSecondaryTone,
  type HubToolDetailModalPrimaryActionProps,
} from "./shell/HubToolDetailModalActions";
export {
  HubToolDetailModalTocLayout,
  type HubToolDetailModalTocLayoutProps,
} from "./shell/HubToolDetailModalTocLayout";
export {
  HUB_TOOL_DETAIL_BODY_SCROLL_CLASS,
  HUB_TOOL_DETAIL_SCROLL_CLASS,
  HUB_TOOL_DETAIL_SCROLL_ROOT,
  HUB_TOOL_DETAIL_TITLE_ID,
} from "./shell/hubToolDetailModalChrome";
export { HUB_TOOL_DETAIL_MODAL_ADD_ACTION_TONE } from "./shell/hub-tool-detail-modal-action-tones";
export {
  formatVaultIdForDisplay,
  isDraftVaultSentinelId,
  isUuidVaultId,
  vaultIdFromStringKey,
} from "./lib/vault-id-from-key";
export {
  HubConfirmDialog,
  type HubConfirmDialogProps,
  type HubConfirmTone,
} from "./shell/HubConfirmDialog";
export { HubPromptDialog, type HubPromptDialogProps } from "./shell/HubPromptDialog";
export {
  HubCloneConfirmDialog,
  type HubCloneConfirmDialogProps,
  type HubCloneConfirmOptions,
} from "./shell/HubCloneConfirmDialog";
export {
  HubToolDetailModalFooterActions,
  type HubToolDetailModalFooterActionsProps,
} from "./shell/HubToolDetailModalFooterActions";
export {
  HubToolDetailModalAccountFooter,
  type HubToolDetailModalAccountFooterProps,
} from "./shell/HubToolDetailModalAccountFooter";
export {
  HUB_DETAIL_MODAL_CANCEL_LABEL,
  HUB_DETAIL_MODAL_CLOSE_LABEL,
  HUB_DETAIL_MODAL_SAVE_LABEL,
  HUB_DETAIL_MODAL_SAVING_LABEL,
  HUB_DETAIL_MODAL_APPLY_LABEL,
  HUB_DETAIL_MODAL_APPLYING_LABEL,
} from "./shell/hubToolDetailModalFooter";
export {
  HUB_ACCOUNT_DETAIL_MODAL_SHELL_CLASS,
  HUB_TWOfA_ACCOUNT_DETAIL_SHELL_CLASS,
  HUB_LAYOUT3_DETAIL_TOKENS,
  HUB_TOOL_MODAL_SIZE_TOKENS,
  HUB_COMPACT_MODAL_CLASS,
  HUB_COMPACT_MODAL_SIZE_TOKENS,
  hubAccountDetailShellClass,
  type HubAccountDetailShellOptions,
  HUB_ADM_FORM_SHELL_CLASS,
  HUB_ADM_FORM_ROW_CODE_LINE_CLASS,
  HUB_ADM_GRID_SLOT_SPACER_CLASS,
  HUB_ADM_GRID_SLOT_SPACER_MID_CLASS,
  HUB_ADM_GRID_SLOT_SPACER_TAIL_CLASS,
  hubAdmGridSlotPadClass,
  HUB_ADM_TYPE_MONO_CLASS,
  HUB_ADM_TYPE_NAV_CLASS,
  HUB_ADM_LOG_MUTED_CLASS,
  HUB_ADM_ACTIVITY_RAIL_TITLE,
  HUB_ADM_ACTIVITY_LOG_EMPTY_MESSAGE,
  HUB_ADM_TYPE_CSS_VARS,
  HUB_ADM_GLOW_SUBTLE_CLASS,
  HUB_ADM_GLOW_CSS_VARS,
  HUB_ACCOUNT_DETAIL_MAIN_SCROLL_CLASS,
  HUB_ACCOUNT_DETAIL_CONTENT_ROOT_CLASS,
  HUB_ACCOUNT_DETAIL_MAIN_SCROLL_ROOT,
} from "./shell/hubAccountDetailModal";
export {
  HUB_LOG_EMPTY_MESSAGE,
  HUB_LOG_SUBTITLE_GLOBAL,
  HUB_LOG_SUBTITLE_TAB,
  HUB_LOG_TITLE,
  HUB_NOTIFY_EMPTY_MESSAGE,
  HUB_REFRESH_LABEL,
  HUB_REFRESHING_LABEL,
  HUB_RELOAD_EMBEDDED_TITLE,
  HUB_SETTINGS_TITLE,
  HUB_WORKSPACE_USER_EMPTY_EMAIL,
  HUB_WORKSPACE_USER_FOOTER_TITLE,
  HUB_WORKSPACE_USER_MODAL_TITLE,
} from "./shell/hub-chrome-messages";
export {
  HubAccountDetailModalFrame,
  type HubAccountDetailModalFrameProps,
} from "./shell/HubAccountDetailModalFrame";
export {
  HubAccountDetailAdmBody,
  HUB_ACCOUNT_DETAIL_ADM_FRAME_CLASS,
  type HubAccountDetailAdmBodyProps,
} from "./shell/HubAccountDetailAdmBody";
export {
  HUB_ACCOUNT_DETAIL_SECTION_META,
  hubAccountDetailSectionIcon,
  hubAccountDetailSectionIconClass,
  type HubAccountDetailSectionKind,
  type HubAccountDetailSectionTone,
} from "./shell/hubAccountDetailSectionIcons";
export { HubAdmSectionLabel } from "./shell/HubAdmSectionLabel";
export { HubAdmSectionBlock, type HubAdmSectionBlockProps } from "./shell/HubAdmSectionBlock";
export {
  HubAccountDetailAdmScaffold,
  type HubAccountDetailAdmScaffoldProps,
} from "./shell/HubAccountDetailAdmScaffold";
export {
  HubAdmRecordMetaRow,
  type HubAdmRecordMetaRowProps,
} from "./shell/HubAdmRecordMetaPanel";
export {
  HUB_RECORD_META_FIELD_HEADERS,
  HUB_RECORD_META_LABELS,
} from "./shell/hubRecordMeta";
export { hubAdmSectionHeader, hubAdmSectionBlockClass, type HubAdmSectionKey } from "./shell/hubAdmSectionHeaders";
export {
  HubAdmClickEditField,
  HubAdmClickMultilineEditField,
  HubAdmClickFilterField,
  HubAdmInlineFieldLabel,
  HubAdmReadonlyField,
  type HubAdmClickEditFieldProps,
  type HubAdmClickEditRenderCtx,
  type HubAdmClickMultilineEditFieldProps,
  type HubAdmClickFilterFieldProps,
  type HubAdmReadonlyFieldProps,
} from "./shell/HubAdmClickEditField";
export {
  HubAdmClickDateField,
  type HubAdmClickDateFieldProps,
} from "./shell/HubAdmClickDateField";
export {
  HubAdmDetailCopyTrailingAction,
  buildHubAdmDetailCopyTrailingAction,
  mergeHubAdmTrailingActions,
  type HubAdmDetailCopyTrailingActionProps,
} from "./shell/hub-adm-detail-copy-action";
export {
  HubBulkDetailField,
  HubBulkDetailRowSpacers,
  HubAdmGridSlotPad,
  HUB_BULK_DETAIL_FIELD_COMPONENT,
  groupHubBulkDetailFieldsForRows,
  resolveHubBulkDetailFieldComponent,
  type HubBulkDetailFieldControl,
  type HubBulkDetailFieldDef,
  type HubBulkDetailFieldProps,
  type HubBulkDetailFieldRowGroup,
  type HubBulkDetailFilterFieldDef,
  type HubBulkDetailDateFieldDef,
  type HubBulkDetailEditFieldDef,
  type HubBulkDetailMultilineFieldDef,
} from "./shell/HubBulkDetailField";
export {
  HubBulkActivityList,
  HUB_BULK_ACTIVITY_PAGE_SIZE,
  type HubBulkActivityAccountBase,
  type HubBulkActivityGroup,
  type HubBulkActivityListProps,
} from "./shell/HubBulkActivityList";
export {
  HubFilterDatePicker,
  HUB_DATE_PICKER_PLACEHOLDER,
  type HubFilterDatePickerProps,
} from "./shell/HubFilterDatePicker";
export {
  HubAccountDetailSearchProvider,
  useHubAccountDetailSearch,
  useHubAccountDetailSearchOptional,
  type HubAccountDetailSearchContextValue,
} from "./shell/hubAccountDetailSearch";
export { HubAccountDetailHeaderSearch } from "./shell/HubAccountDetailHeaderSearch";
export type { HubAccountDetailHeaderSearchProps } from "./shell/HubAccountDetailHeaderSearch";
export { HubAdmSearchHighlightText } from "./shell/HubAdmSearchHighlightText";
export { HubAdmNoteSearchBar, type HubAdmNoteSearchBarProps } from "./shell/HubAdmNoteSearchBar";
export { HubAdmNoteHighlightText } from "./shell/HubAdmNoteHighlightText";
export { HubAdmNoteReadonlyBody, type HubAdmNoteReadonlyBodyProps } from "./shell/HubAdmNoteReadonlyBody";
export { HubAdmNoteEditorField, type HubAdmNoteEditorFieldProps } from "./shell/HubAdmNoteEditorField";
export {
  HubAdmDetailNoteLineField,
  HUB_ADM_DETAIL_NOTE_LINE_CLASS,
  HUB_ADM_DETAIL_NOTE_LINE_CONTROL_CLASS,
  type HubAdmDetailNoteLineFieldProps,
} from "./shell/HubAdmDetailNoteLineField";
export { HubAdmNoteRail, type HubAdmNoteRailEditorProps, type HubAdmNoteRailProps, type HubAdmNoteRailReadonlyProps } from "./shell/HubAdmNoteRail";
export {
  HubAdmNoteLogRails,
  type HubAdmNoteLogRailNoteProps,
  type HubAdmNoteLogRailsProps,
} from "./shell/HubAdmNoteLogRails";
export {
  CRM_DETAIL_CONTROL_CLASS,
  CRM_DETAIL_FORM_STACK_CLASS,
  CRM_DETAIL_FORM_ROW_ALIGNED_3,
  CRM_DETAIL_FORM_ROW_ALIGNED_2,
  CRM_DETAIL_FORM_ROW_DETAIL_LINE,
  type HubCrmDetailTocItem,
} from "./shell/hubCrmDetailChrome";
export { HubCrmDetailTocNav, CrmDetailTocNav } from "./shell/HubCrmDetailTocNav";
export { HubCrmDetailVaultIdBadge, CrmDetailVaultIdBadge } from "./shell/HubCrmDetailVaultIdBadge";
export {
  buildHubCrmDetailFieldKit,
  buildCrmDetailFieldKit,
  hubCrmColumnHeaderProps,
  crmColumnHeaderProps,
  hubCrmColumnHintContent,
  type HubCrmDetailFieldKitOptions,
} from "./shell/buildHubCrmDetailFieldKit";
export { HubAdmBulkFieldCell, type HubAdmBulkFieldCellProps } from "./shell/HubAdmBulkFieldCell";
export {
  buildHubAdmNoteMirrorSegments,
  findHubAdmNoteMatchRanges,
  getHubAccountDetailNoteHighlightTerms,
  useHubAdmNoteSearch,
  type HubAdmNoteMatchRange,
  type HubAdmNoteMirrorSegment,
} from "./shell/hubAdmNoteSearch";
export { HubFormFieldLabel, type HubFormFieldLabelProps } from "./shell/HubFormFieldLabel";
export { HubOpsFormField, type HubOpsFormFieldProps } from "./shell/HubOpsFormField";
export { HubModalFilterField, type HubModalFilterFieldProps } from "./shell/HubModalFilterField";
export {
  HubToolDetailSection,
  HubToolDetailSections,
  HUB_TOOL_DETAIL_SECTIONS_CLASS,
  HUB_TOOL_DETAIL_FORM_GRID_CLASS,
  HUB_TOOL_DETAIL_FORM_GRID_2_CLASS,
  HUB_TOOL_DETAIL_FORM_GRID_3_CLASS,
  type HubToolDetailSectionProps,
} from "./shell/HubToolDetailSection";
export {
  HubModalDirectorySection,
  HubModalDirectoryEmptyFiltered,
  HUB_MODAL_DIRECTORY_SECTION_CLASS,
  HUB_MODAL_DIRECTORY_EMPTY_FILTERED_CLASS,
  type HubModalDirectorySectionProps,
} from "./shell/HubModalDirectorySection";
export {
  HubSplitDirectoryPane,
  HUB_SPLIT_DIRECTORY_PANE_CLASS,
  type HubSplitDirectoryPaneProps,
  type HubSplitDirectoryPaneVariant,
} from "./shell/HubSplitDirectoryPane";
export {
  HubSplitDirectoryFilterBar,
  type HubSplitDirectoryFilterBarProps,
} from "./shell/HubSplitDirectoryFilterBar";
export { HubRouteAboutSummary, type HubRouteAboutSummaryProps } from "./route-detail/HubRouteAboutSummary";
export {
  HubOverviewAdmScaffold,
  HUB_OVERVIEW_ADM_PAGE_CLASS,
  HUB_OVERVIEW_ADM_SHELL_CLASS,
  type HubOverviewAdmScaffoldProps,
} from "./shell/HubOverviewAdmScaffold";
export {
  HubToolDetailIdentityHeader,
  type HubToolDetailIdentityHeaderProps,
} from "./shell/HubToolDetailIdentityHeader";
export {
  HubTocSectionHighlightProvider,
  HubTocHighlightContent,
  useHubTocNavHighlight,
  useHubTocNavActive,
  useHubTocSectionHighlightOptional,
} from "./shell/HubTocSectionHighlight";
export { scrollToHubTocSection, findHubTocScrollContainer } from "./shell/hub-toc-scroll";
export { resolveActiveTocSection, useHubTocSectionSpy } from "./shell/hub-toc-section-spy";
export { HubTocSectionNav, type HubTocNavItem } from "./shell/HubTocSectionNav";
export {
  HubAddModalTocNav,
  type HubAddModalTabItem,
  type HubAddModalTocNavProps,
} from "./shell/HubAddModalTocNav";
export { HubHintTooltip } from "./shell/HubHintTooltip";
export {
  HubHeaderPanelButton,
  HUB_HEADER_PANEL_BTN_CLASS,
  type HubHeaderPanelButtonProps,
} from "./shell/HubHeaderPanelButton";
export {
  HubVersionUpdateStatusIcon,
  HubReleaseUpdateActionButton,
  HubReleaseUpdateAvailableBadge,
  HubReleaseUpdateProgressRing,
  hubDesktopUpdateOwnsTrigger,
  hubDesktopUpdateShouldRecheckOnOpen,
  hubDesktopUpdateActionLabel,
  hubDesktopUpdateActionBulkTone,
  hubDesktopUpdateChromeLabel,
  hubDesktopUpdateHighlightsEntry,
  HUB_DESKTOP_UPDATE_BADGE_LABEL,
  HUB_DESKTOP_UPDATE_INSTALL_TOAST,
  HUB_DESKTOP_UPDATE_INSTALL_TOAST_DURATION_MS,
  type HubVersionUpdateState,
  type HubVersionDesktopUpdate,
  type HubVersionUpdateStatusIconProps,
} from "./shell/HubVersionUpdateStatusIcon";
export { useHubDesktopUpdater } from "./hooks/useHubDesktopUpdater";
export { useStealthDesktopUpdater } from "./hooks/useStealthDesktopUpdater";
export type {
  HubDesktopUpdateBridge,
  HubDesktopUpdateBridgeStatus,
  HubDesktopUpdaterOptions,
} from "./hooks/useHubDesktopUpdater";
export { useHubDesktopUpdateToasts } from "./shell/useHubDesktopUpdateToasts";
export {
  HubVersionReleaseNotes,
  type HubVersionReleaseNotesProps,
} from "./shell/HubVersionReleaseNotes";
export {
  HUB_RELEASE_NOTES_URL,
  HUB_RELEASE_NOTES_FILENAME,
  hubReleaseNotesFetchUrl,
  buildHubReleaseUserSummary,
  ensureHubReleaseNotesIncludeCurrent,
  ensureHubReleaseNotesIncludePendingUpdate,
  hasUnseenHubReleaseNotes,
  hubReleaseNoteActivityAt,
  hubReleaseNotesSeenKey,
  hubReleaseSummaryIsRedundant,
  humanizeHubReleaseBullet,
  humanizeHubReleaseNoteTitle,
  inferHubReleaseNoteKind,
  markHubReleaseNotesSeen,
  normalizeReleaseNotesVersion,
  parseHubReleaseNotesPayload,
  pickNewerReleaseNoteStamp,
  readHubReleaseNotesSeen,
  type HubReleaseNoteEntry,
  type HubReleaseNoteKind,
} from "./lib/hub-version-release-notes-core";
export { HubUsageLogPanel, hubLogEntryToFeedItem, type HubLogEntry, type HubLogQuickAction, type HubLogExtraSection, type HubUsageLogPanelProps } from "./shell/HubUsageLogPanel";
export {
  readPersistedAppLogs,
  writePersistedAppLogs,
  clearPersistedAppLogs,
  sessionLogsNeedActivityHydrate,
  replacePersistedAppLogsByIdPrefix,
  shouldCarryOverSessionLogs,
  mergeSessionLogsById,
  HUB_APP_LOG_REQUEST_HYDRATE_EVENT,
} from "./shell/hub-app-log-persist";
export {
  HubAppLogProvider,
  useHubAppLog,
  HUB_APP_LOG_GLOBAL_SCREEN,
  isHubAppLogVisibleOnTab,
  type HubAppLogBoot,
  type HubAppLogProviderProps,
} from "./shell/HubAppLogProvider";
export { HubLogButton, type HubLogButtonProps, type HubLogButtonVariant } from "./shell/HubLogButton";
export { HubLogRail, type HubLogRailProps } from "./shell/HubLogRail";
export { HubChartsLogSplit, type HubChartsLogSplitProps } from "./shell/HubChartsLogSplit";
export {
  HubNotifyPanel,
  resolveHubNotifyAlertIcon,
  resolveHubNotifyAlertKind,
  type HubNotifyAlert,
  type HubNotifyAlertSeverity,
  type HubNotifyPanelProps,
  type HubNotifyQuickAction,
  type HubNotifySeveritySectionOverride,
} from "./shell/HubNotifyPanel";
export {
  HubActivityFeedRows,
  HubActivityFeedToolbar,
  HubOpsFeedFilterProvider,
  filterHubActivityFeedItems,
  hubActivityKindLabel,
  resolveHubActivityKindMeta,
  useHubActivityFeedFilter,
  useHubOpsFeedFilterOptional,
  type HubActivityFeedItem,
  type HubActivityFeedKind,
  type HubActivityFeedRowsProps,
  type HubActivityFeedToolbarProps,
  type HubActivityKindFilter,
  type HubOpsFeedFilterValue,
} from "./shell/HubActivityFeed";
export {
  HubOpsMarkAllReadButton,
  HubOpsPanelBadge,
  HubOpsPanelSearch,
  HubOpsSearchReadActions,
  HubOpsTitleReadActions,
  HubOpsTypeTocNav,
  HUB_OPS_CRUD_KINDS,
  buildHubOpsTypeTocEntries,
  hubOpsTypeTocIcon,
  hubOpsTypeTocLabel,
  resolveHubOpsTypeTocChrome,
  useHubOpsTypeToc,
  type HubOpsPanelBadgeTone,
  type HubOpsTypeTocChrome,
  type HubOpsTypeTocEntry,
  type HubOpsTypeTocInput,
  type HubOpsTypeTocNavProps,
} from "./shell/HubOpsPanelChrome";
export {
  HUB_NOTIFY_SEEN_MAX_IDS,
  hasUnreadNotifyAlerts,
  hubNotifyScopeKey,
  markAllNotifySeen,
  markNotifySeenId,
  mergeNotifySeenIds,
  pruneNotifySeenIds,
  readNotifySeenIds,
  writeNotifySeenIds,
} from "./shell/hub-notify-seen";
export {
  HUB_TRASH_PURGE_NOTIFY_LIMIT,
  HUB_TRASH_PURGE_NOTIFY_SELECT,
  HUB_TRASH_PURGE_NOTIFY_TYPE,
  formatHubTrashPurgeNotifyLabel,
  hubTrashPurgeNotificationToAlert,
  isHubTrashPurgeNotifyType,
  mapHubTrashPurgeNotifyRows,
  useHubTrashPurgeNotifyAlerts,
  type HubTrashPurgeNotifyRow,
} from "./shell/hub-trash-purge-notify";
export { HubHeaderOpsPanels, type HubHeaderOpsPanelsProps } from "./shell/HubHeaderOpsPanels";
export { HubNotifyButton, type HubNotifyButtonProps } from "./shell/HubNotifyButton";
export { HubFilterRowButton, type HubFilterRowButtonProps, type HubFilterRowTone } from "./shell/HubFilterRowButton";
export {
  HubBulkActionButton,
  HubBulkActionCountBadge,
  HUB_BULK_ACTION_BTN_CLASS,
  type HubBulkActionButtonProps,
  type HubBulkActionCountBadgeProps,
  type HubBulkActionTone,
} from "./shell/HubBulkActionButton";
export {
  HubDirectoryDetailAction,
  type HubDirectoryDetailActionProps,
} from "./shell/HubDirectoryDetailAction";
export {
  HubSharePopover,
  type HubShareAccess,
  type HubSharePopoverProps,
} from "./shell/HubSharePopover";
export {
  HubChatbotBulkActionDropdown,
  HUB_CHATBOT_BULK_OFF_VALUE,
  type HubChatbotBulkActionDropdownProps,
  type HubChatbotBulkPersonalityOption,
  type HubChatbotBulkSelection,
} from "./shell/HubChatbotBulkActionDropdown";
export {
  HubScreensDirectoryBulkActions,
  HubUsersDirectoryBulkActions,
  type HubScreensDirectoryBulkActionsProps,
  type HubUsersDirectoryBulkActionsProps,
} from "./shell/HubDirectoryBulkActions";
export {
  HUB_ANALYTICS_CAPTION_TYPO_CLASS,
  HUB_CHART_PANEL_TITLE_TYPO_SSOT,
  HUB_CHART_ROW_TYPO_SSOT,
  HUB_KPI_STICKER_TYPO_SSOT,
  HUB_DIRECTORY_BODY_VALUE_TYPO_SSOT,
  HUB_DIRECTORY_CARD_META_TYPO_SSOT,
  HUB_DIRECTORY_CARD_METRIC_VALUE_TYPO_SSOT,
  HUB_DIRECTORY_CARD_TITLE_TYPO_SSOT,
  HUB_DIRECTORY_HEADER_LABEL_TYPO_SSOT,
  HUB_DIRECTORY_TOOLBAR_TYPO_CLASS,
  HUB_FILTER_DIRECTORY_HEADER_TYPO_SSOT,
  HUB_FILTER_DIRECTORY_VALUE_TYPO_SSOT,
  HUB_SHELL_LABEL_TYPO_CLASS,
  HUB_SIDEBAR_NAV_LABEL_CLASS,
  HUB_SETTINGS_ICON_CLASS,
} from "./shell/hub-typography";
export {
  chartPanelTitleFromDefs,
  chartPanelTitleFromPrefLabel,
  GOLDEN_CHART_PANEL_TITLES,
} from "./lib/chart-panel-titles";
export { HUB_LINK_HEALTH_POLL_MS } from "./lib/hub-directory-timing";
export {
  HubDirectorySelectAllChip,
  type HubDirectorySelectAllChipProps,
} from "./shell/HubDirectorySelectAllChip";
export {
  HubDirectoryToolbarSelection,
  type HubDirectoryToolbarSelectionProps,
} from "./shell/HubDirectoryToolbarSelection";
export {
  HubDirectoryToolAccessBadge,
  type HubDirectoryToolAccessBadgeKind,
  type HubDirectoryToolAccessBadgeProps,
} from "./shell/HubDirectoryToolAccessBadge";
export { HubEnterpriseBadge } from "./shell/HubEnterpriseBadge";
export { hubModalDirectoryFilterSelection } from "./shell/hub-modal-directory-filter-preset";
export {
  HubDirectorySelectionChromeProvider,
  useHubDirectorySelectionChrome,
} from "./shell/HubDirectorySelectionChromeContext";
export {
  buildHubDirectorySelectionSlots,
  resolveDirectorySearchResultCountGuard,
  shouldShowHubDirectoryResultCount,
  type DirectorySearchResultCountGuardInput,
  type HubDirectorySelectionSlots,
} from "./shell/hubDirectorySelectionSlots";
export {
  HubDirectoryBulkActionBar,
  HUB_DIRECTORY_SELECT_ALL_LABEL_MODE,
  type HubDirectoryBulkActionBarProps,
} from "./shell/HubDirectoryBulkActionBar";
export {
  HubDirectoryBulkMoreMenu,
  type HubDirectoryBulkMoreAction,
  type HubDirectoryBulkMoreMenuProps,
} from "./shell/HubDirectoryBulkMoreMenu";
export {
  HubDirectoryBulkActionRail,
  type HubDirectoryBulkActionRailProps,
} from "./shell/HubDirectoryBulkActionRail";
export {
  HUB_DIRECTORY_NEW_ACTION_LABEL,
  HUB_DIRECTORY_NEW_ACTION_TONE,
} from "./shell/hub-directory-new-action";
export {
  HubDirectoryNewBulkAction,
  type HubDirectoryNewBulkActionProps,
} from "./shell/HubDirectoryNewBulkAction";
export {
  HubDirectoryEditBulkAction,
  type HubDirectoryEditBulkActionProps,
} from "./shell/HubDirectoryEditBulkAction";
export {
  HubDirectoryAdaptiveEditAction,
  type HubDirectoryAdaptiveEditActionProps,
} from "./shell/HubDirectoryAdaptiveEditAction";
export {
  HubDirectoryDeleteBulkAction,
  type HubDirectoryDeleteBulkActionProps,
} from "./shell/HubDirectoryDeleteBulkAction";
export {
  HubDirectoryCrudBulkActions,
  type HubDirectoryCrudBulkActionsProps,
  type HubDirectoryCrudBulkExtraAction,
} from "./shell/HubDirectoryCrudBulkActions";
export { HubAuthGate, type HubAuthGateProps } from "./auth/HubAuthGate";
export { HubAuthGateOverlay, type HubAuthGateOverlayProps } from "./auth/HubAuthGateOverlay";
export { HubAuthGateModal, type HubAuthGateModalProps } from "./auth/HubAuthGateModal";
export { HubAuthSysProgress, type HubAuthSysProgressProps } from "./auth/HubAuthSysProgress";
export { HubAuthPrompt, type HubAuthPromptProps } from "./auth/HubAuthPrompt";
export { HubAuthLogoutChip, type HubAuthLogoutChipProps } from "./auth/HubAuthLogoutChip";
export {
  HubAuthSessionBadge,
  type HubAuthSessionBadgeProps,
  type HubAuthSessionMode,
} from "./auth/HubAuthSessionBadge";
export { HubAuthGateGoldenPreview } from "./auth/HubAuthGateGoldenPreview";
export { HubAuthGateVariantBadge, type HubAuthGateVariantBadgeProps } from "./auth/HubAuthGateVariantBadge";
export {
  HUB_AUTH_GATE_VARIANTS,
  hubAuthGateVariantBadgeText,
  type HubAuthGateVariant,
  type HubAuthGateVariantMeta,
} from "./auth/hub-auth-gate-variant";
export { formatHubAuthToolInfo, type HubAuthToolInfo } from "./auth/hub-auth-tool-info";
export {
  HubWorkspaceUserModal,
  HUB_WORKSPACE_USER_ACCOUNT_TOC,
  type HubWorkspaceUserModalProps,
  type HubWorkspaceUserProfileRow,
} from "./auth/HubWorkspaceUserModal";
export {
  HubUserModalAdmField,
  HubUserModalAdmFields,
  type HubUserModalAdmFieldProps,
} from "./auth/HubUserModalAdmField";
export {
  HubUserAccountSections,
  HUB_USER_ACCOUNT_META_LABELS,
  HUB_USER_ACCOUNT_IDENTITY_LABELS,
  hubUserAccountSectionId,
  hubUserAccountVisibleSectionIds,
  type HubUserAccountSectionId,
  type HubUserAccountSectionsProps,
  type HubUserAccountRecordMeta,
} from "./auth/HubUserAccountSections";
export {
  HubFullUserAccountModal,
  HUB_FULL_USER_ACCOUNT_TOC,
  type HubFullUserAccountModalProps,
  type HubFullUserAccountResult,
  type HubFullUserAccountTocId,
} from "./auth/HubFullUserAccountModal";
export {
  hubAccountFieldBaseline,
  hubAccountFieldDirty,
  type HubAccountFieldDirtyOptions,
} from "./auth/hub-account-field-baseline";
export {
  readUserAccountLog,
  writeUserAccountLog,
  clearUserAccountLog,
} from "./auth/hub-user-account-log-persist";
export { createHubProfilesActivityLogHandlers } from "./auth/hub-profiles-activity-log";
export {
  HUB_CHANGE_EMAIL_TOC,
  HUB_CHANGE_PASSWORD_TOC,
  HUB_CHANGE_USERNAME_TOC,
  hubUserChangeSectionIcon,
  hubUserChangeTocItems,
  type HubUserChangeTocEntry,
} from "./auth/hub-user-change-toc";
export { HubUserFieldActionButton, type HubUserFieldActionButtonProps } from "./auth/HubUserFieldActionButton";
export {
  HUB_DIRECTORY_HEADER_EMOJI,
  HUB_ROLE_EMOJI,
  HUB_ROLE_FILTER_TRIGGER_EMOJI,
  HUB_USER_STATUS_DOT_COLOR,
  HUB_USER_STATUS_EMOJI,
  hubRoleEmoji,
  hubRoleFilterOptions,
  hubUserStatusEmoji,
  hubUserStatusFilterOptions,
  type HubRoleEmojiKey,
  type HubStickerFilterOption,
} from "./auth/hub-directory-stickers";
export {
  HUB_WORKSPACE_ROLE_ICON,
  normalizeWorkspaceRoleKey,
  resolveWorkspaceRoleIcon,
  resolveWorkspaceRoleKey,
  workspaceRoleEmoji,
  workspaceRoleLabel,
  type HubWorkspaceRoleIconMeta,
  type HubWorkspaceRoleKey,
} from "./auth/hub-workspace-role-icon";
export {
  useWorkspaceRoleKey,
  type UseWorkspaceRoleKeyOptions,
  type WorkspaceRoleState,
} from "./auth/useWorkspaceRoleKey";
export {
  cacheWorkspaceProfileRole,
  cacheWorkspaceProfileRoleForUsers,
  clearWorkspaceProfileRoleCache,
  fetchWorkspaceProfileRole,
  readCachedWorkspaceProfileRole,
  subscribeWorkspaceProfileRole,
  subscribeWorkspaceProfileRoleCache,
  warmWorkspaceProfileRole,
  WORKSPACE_PROFILE_ROLE_UPDATED,
  type FetchWorkspaceProfileRoleOptions,
  type WorkspaceProfileRoleUpdatedDetail,
} from "./lib/workspace-profile-role";
export {
  canHardPurgeTrashForever,
  isHubAdminRole,
} from "./lib/can-hard-purge-trash";
export {
  normalizeHubAuthError,
  type NormalizeHubAuthErrorOptions,
} from "./auth/normalize-hub-auth-error";
export {
  WorkspaceAuthGate,
  createWorkspaceAuthGate,
  createWorkspaceAuthGateConfig,
  type CreateWorkspaceAuthGateOptions,
  type WorkspaceAuthGateConfig,
  type WorkspaceAuthGateProps,
} from "./auth/WorkspaceAuthGate";
export {
  createAuthSessionProvider,
  type AuthSessionProviderBundle,
} from "./auth/createAuthSessionProvider";
export {
  HubWorkspaceUserShell,
  type HubWorkspaceUserModalRenderContext,
  type HubWorkspaceUserShellProps,
} from "./auth/HubWorkspaceUserShell";
export { HubAccessDeniedPanel, type HubAccessDeniedPanelProps } from "./auth/HubAccessDeniedPanel";
export { HubAuthBrandIcon, type HubAuthBrandIconProps } from "./auth/HubAuthBrandIcon";
export { HubAuthBootPanel, type HubAuthBootPanelProps } from "./auth/HubAuthBootPanel";
export { HubSidebarUserFooter, type HubSidebarUserFooterProps } from "./auth/HubSidebarUserFooter";
export { HubWorkspaceUserAvatar, type HubWorkspaceUserAvatarProps } from "./auth/HubWorkspaceUserAvatar";
export { HubAccountAvatarEditor, type HubAccountAvatarEditorProps } from "./auth/HubAccountAvatarEditor";
export { HubAvatarSquareCrop, type HubAvatarSquareCropProps } from "./auth/HubAvatarSquareCrop";
export {
  exportHubAvatarSquareJpeg,
  HUB_AVATAR_CROP_OUTPUT_PX,
  HUB_AVATAR_CROP_SOURCE_MAX_BYTES,
  HUB_AVATAR_CROP_VIEWPORT_PX,
  type HubAvatarCropState,
} from "./auth/hub-avatar-crop";
export {
  buildWorkspaceUserProfileRows,
  resolveHubAuthSessionMode,
  workspaceUserFooterLabel,
  workspaceUserInitials,
  type BuildWorkspaceUserProfileRowsOptions,
} from "./auth/workspace-user-session";
