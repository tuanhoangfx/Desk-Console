import type { ReactNode } from "react";
import type { TimeRange } from "../display-prefs/constants";
import { useDirectoryTimeRange } from "../lib/directory-time-range";
import { HubTablePageSizeSelect } from "./HubTablePageSizeSelect";
import { HubTimeRangeSelect } from "./HubTimeRangeSelect";
import { resolveDirectoryToolbarShowTablePageSize } from "./directory-search-toolbar-page-size";

export type HubDirectoryToolbarSlotsProps = {
  showTimeRange?: boolean;
  timeRange?: TimeRange;
  /** Pager rows (`tpage`). Auto-off when `displayBand` is set (page size lives in Display). */
  showTablePageSize?: boolean;
  /** When set, page size is owned by Display — same SSOT as `DirectorySearchToolbar`. */
  displayBand?: ReactNode;
};

/** Period + pager row controls — insert in FilterBar `toolbar` before ViewToggle / count. */
export function HubDirectoryToolbarSlots({
  showTimeRange = true,
  timeRange,
  showTablePageSize,
  displayBand,
}: HubDirectoryToolbarSlotsProps) {
  const period = useDirectoryTimeRange(timeRange);
  const resolvedShowTablePageSize = resolveDirectoryToolbarShowTablePageSize({
    displayBand,
    showTablePageSize,
  });
  return (
    <>
      {showTimeRange ? <HubTimeRangeSelect value={period} /> : null}
      {resolvedShowTablePageSize ? <HubTablePageSizeSelect /> : null}
    </>
  );
}
