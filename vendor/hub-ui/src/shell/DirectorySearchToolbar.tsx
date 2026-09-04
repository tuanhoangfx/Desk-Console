import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { TimeRange } from "../display-prefs/constants";
import type { HubBrandIconId } from "../lib/resolve-hub-brand-icon";
import { useDirectoryTimeRange } from "../lib/directory-time-range";
import { HubResultCount } from "./HubResultCount";
import { useHubDirectorySelectionChrome } from "./HubDirectorySelectionChromeContext";
import {
  resolveDirectorySearchResultCountGuard,
  shouldShowHubDirectoryResultCount,
} from "./hubDirectorySelectionSlots";
import { HubTablePageSizeSelect } from "./HubTablePageSizeSelect";
import { HubTimeRangeSelect } from "./HubTimeRangeSelect";
import { HubWorkspacePeriodSelect, type HubWorkspacePeriodSelectProps } from "./HubWorkspacePeriodSelect";
import { ViewToggle, type HubViewMode } from "./ViewToggle";
import {
  HubDirectoryLifecycleToggle,
  type HubDirectoryLifecycleMode,
} from "./HubDirectoryLifecycleToggle";
import { resolveDirectoryToolbarShowTablePageSize } from "./directory-search-toolbar-page-size";

export type DirectorySearchToolbarProps = {
  /** Workspace period filter — P0020 vault tabs (replaces manual `leading` + `HubWorkspacePeriodSelect`). */
  workspacePeriod?: HubWorkspacePeriodSelectProps;
  /** Slot before view toggle — custom leading when `workspacePeriod` is not used. */
  leading?: ReactNode;
  viewMode?: HubViewMode;
  onViewModeChange?: (mode: HubViewMode) => void;
  /**
   * Soft-delete Live/Trash — **after** Table/Cards (SSOT for every directory table that supports Trash).
   * Omit both props when the table has no soft-delete lifecycle.
   */
  lifecycleMode?: HubDirectoryLifecycleMode;
  onLifecycleModeChange?: (mode: HubDirectoryLifecycleMode) => void;
  /** Replaces default Live/Trash toggle (e.g. P0004 Users adds Waiting). */
  lifecycleToggle?: ReactNode;
  countIcon?: LucideIcon;
  countBrandIcon?: HubBrandIconId;
  shown: number;
  total: number;
  countLabel?: string;
  showViewToggle?: boolean;
  /**
   * Creation-date Period. `false` hides `workspacePeriod` and the legacy time-range
   * picker when the directory has no `createdAt`.
   */
  showPeriod?: boolean;
  /** Filter by `updatedAt` / activity — Hub catalog, System Overview, … */
  showTimeRange?: boolean;
  timeRange?: TimeRange;
  /** Pager rows (`tpage`). Auto-off when `displayBand` is set (page size lives in Display). */
  showTablePageSize?: boolean;
  /** Shell SSOT — when set, passed to `HubTablePageSizeSelect` (table + toolbar stay in sync). */
  tablePageSize?: number;
  /** Optional host callback after URL `tpage` patch (reset pager, side effects). */
  onTablePageSizeChange?: (size: number) => void;
  /** When false, omit shown/total chip (e.g. Todo row-1 period-only). */
  showResultCount?: boolean;
  /** When selection chip shows x/y (toolbar leading or searchTrailing) — omit duplicate shown/total chip. */
  hasSearchSelectionChip?: boolean;
  displayBand?: ReactNode;
  trailing?: ReactNode;
};

/** Shared FilterBar row-1 toolbar — golden P0004 Users search row. */
export function DirectorySearchToolbar({
  workspacePeriod,
  leading,
  viewMode,
  onViewModeChange,
  lifecycleMode,
  onLifecycleModeChange,
  lifecycleToggle,
  countIcon,
  countBrandIcon,
  shown,
  total,
  countLabel = "tools",
  showViewToggle = true,
  showPeriod = true,
  showTimeRange = true,
  timeRange,
  showTablePageSize,
  tablePageSize,
  onTablePageSizeChange,
  showResultCount = true,
  hasSearchSelectionChip = false,
  displayBand,
  trailing,
}: DirectorySearchToolbarProps) {
  const period = useDirectoryTimeRange(timeRange);
  const resolvedShowTablePageSize = resolveDirectoryToolbarShowTablePageSize({
    displayBand,
    showTablePageSize,
  });
  const filterSelectionToolbarActive = useHubDirectorySelectionChrome();
  const resultCountGuard = resolveDirectorySearchResultCountGuard({
    showResultCount,
    hasSearchSelectionChip,
    filterSelectionToolbarActive,
    viewMode,
  });
  const resultCountVisible = shouldShowHubDirectoryResultCount(resultCountGuard);
  const showLifecycle =
    lifecycleToggle != null ||
    (lifecycleMode != null && typeof onLifecycleModeChange === "function");
  return (
    <>
      {leading}
      {showViewToggle && viewMode != null && onViewModeChange ? (
        <ViewToggle value={viewMode} onChange={onViewModeChange} />
      ) : null}
      {showLifecycle ? (
        lifecycleToggle ?? (
          <HubDirectoryLifecycleToggle value={lifecycleMode!} onChange={onLifecycleModeChange!} />
        )
      ) : null}
      {showPeriod && workspacePeriod ? <HubWorkspacePeriodSelect {...workspacePeriod} /> : null}
      {showPeriod && showTimeRange ? <HubTimeRangeSelect value={period} /> : null}
      {resolvedShowTablePageSize ? (
        <HubTablePageSizeSelect value={tablePageSize} onChange={onTablePageSizeChange} />
      ) : null}
      {displayBand}
      {resultCountVisible ? (
        <HubResultCount
          icon={countIcon}
          brandIcon={countBrandIcon}
          shown={shown}
          total={total}
          label={countLabel}
        />
      ) : null}
      {trailing}
    </>
  );
}
