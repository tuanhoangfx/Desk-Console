/** Golden shell control label — filter triggers, analytics row labels. */
export const HUB_SHELL_LABEL_TYPO_CLASS = "text-sm font-medium";

/**
 * Sidebar nav — top-level rows + group headers + tree subnav (same size).
 * Size from CSS token `--hub-sidebar-chrome-size` (0.875rem ≡ text-sm → 12.6px @ 90% zoom).
 */
export const HUB_SIDEBAR_NAV_LABEL_CLASS = "hub-sidebar-chrome-type";

/** Settings trigger + modal header icon — titanium gray (not amber). */
export const HUB_SETTINGS_ICON_CLASS = "text-zinc-400";

/** Directory toolbar CTAs — Display panel, bulk actions, time range, page size. */
export const HUB_DIRECTORY_TOOLBAR_TYPO_CLASS = "text-xs font-medium";

/** KPI tile labels — micro caption, semibold uppercase, muted. */
export const HUB_ANALYTICS_CAPTION_TYPO_CLASS = "hub-analytics-caption uppercase tracking-wider";

/**
 * KPI tile sticker (emoji + Lucide/brand SVG). Size from `--hub-kpi-sticker-size` (1.25rem).
 * Do not inherit `--hub-analytics-caption-size`.
 */
export const HUB_KPI_STICKER_TYPO_SSOT = "hub-kpi-tile__emoji";

/**
 * Chart panel titles (STATUS / PRIORITY…) — 80% of directory header size, 600 / `--text`.
 * Title text: `--hub-chart-panel-title-size`. Title emoji: `--hub-chart-label-size` (legend rows).
 */
export const HUB_CHART_PANEL_TITLE_TYPO_SSOT = "hub-chart-panel-title";

/** Chart row label/value — typography from hub-shell-layout.css only; do not add text-sm here. */
export const HUB_CHART_ROW_TYPO_SSOT = "hub-chart-legend-label";

/**
 * Directory table body primary value — service name, account label (12px / 400 / lh 1.45).
 * CSS: `.hub-directory-body-value` in hub-directory-frame-table.css
 */
export const HUB_DIRECTORY_BODY_VALUE_TYPO_SSOT = "hub-directory-body-value";

/**
 * Directory table header label — column title (12px / 600 / ls 0.02em).
 * CSS: `.hub-directory-header-label` ≡ `.hub-users-th-text` in hub-directory-frame-table.css
 */
export const HUB_DIRECTORY_HEADER_LABEL_TYPO_SSOT = "hub-directory-header-label";

/**
 * Directory card metric strip value — Hours / Sales / Shifts (12px / 600 / tabular-nums).
 * Keeps card tiles on the same size tier as the directory table body.
 * CSS: `.hub-directory-card-metric-value` in hub-shell-layout.css
 */
export const HUB_DIRECTORY_CARD_METRIC_VALUE_TYPO_SSOT = "hub-directory-card-metric-value";

/**
 * Directory card metadata rows — table body tier (12px / 400 / muted).
 * Use for card descriptions and field rows; badge labels retain their dedicated compact tier.
 * CSS: `.hub-directory-card-meta` in hub-shell-layout.css
 */
export const HUB_DIRECTORY_CARD_META_TYPO_SSOT = "hub-directory-card-meta";

/**
 * Directory card title — table header tier (12px / 600).
 * Used by HubDirectoryCardHeader string titles; matches Todo Kanban card titles.
 * CSS: `.hub-directory-card-title` in hub-shell-layout.css
 */
export const HUB_DIRECTORY_CARD_TITLE_TYPO_SSOT = "hub-directory-card-title";

/** Filter option/trigger value when it must mirror directory table body (P0020 twofa vault). */
export const HUB_FILTER_DIRECTORY_VALUE_TYPO_SSOT = HUB_DIRECTORY_BODY_VALUE_TYPO_SSOT;

/** Filter trigger facet label (Service, Status…) — mirror directory table header. */
export const HUB_FILTER_DIRECTORY_HEADER_TYPO_SSOT = HUB_DIRECTORY_HEADER_LABEL_TYPO_SSOT;
