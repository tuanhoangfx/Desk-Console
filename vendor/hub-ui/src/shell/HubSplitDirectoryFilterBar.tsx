import type { ReactNode } from "react";
import { FilterBar, type FilterBarProps } from "./FilterBar";
import { HubDirectorySelectionChromeProvider } from "./HubDirectorySelectionChromeContext";
import type { HubDirectoryToolbarSelectionProps } from "./HubDirectoryToolbarSelection";
import { buildHubDirectorySelectionSlots } from "./hubDirectorySelectionSlots";
import type { HubViewMode } from "./ViewToggle";

export type HubSplitDirectoryFilterBarProps = Omit<
  FilterBarProps,
  "layout" | "trailing" | "pinSticky" | "embedded" | "frameless"
> & {
  shortcutScope: string;
  toolbar?: ReactNode;
  /** `x/y` selection chip — table: toolbar leading · card: filter row-2 trailing. */
  filterSelectionToolbar?: HubDirectoryToolbarSelectionProps;
  directoryViewMode?: HubViewMode;
  row2Leading?: ReactNode;
  row2Actions?: ReactNode;
  row2Trailing?: ReactNode;
};

/** Frameless FilterBar for `HubSplitDirectoryPane` — parent owns border/bg. */
export function HubSplitDirectoryFilterBar({
  shortcutScope,
  toolbar,
  filterSelectionToolbar,
  directoryViewMode = "table",
  searchTrailing,
  row2Leading,
  row2Actions,
  row2Trailing,
  ...rest
}: HubSplitDirectoryFilterBarProps) {
  const selectionSlots = buildHubDirectorySelectionSlots(filterSelectionToolbar, directoryViewMode);
  const mergedToolbar =
    selectionSlots.toolbarLeading || toolbar ? (
      <>
        {selectionSlots.toolbarLeading}
        {toolbar}
      </>
    ) : undefined;

  return (
    <HubDirectorySelectionChromeProvider active={Boolean(filterSelectionToolbar)}>
      <FilterBar
        layout="hub"
        frameless
        pinSticky={false}
        shortcutScope={shortcutScope}
        toolbar={mergedToolbar}
        searchTrailing={searchTrailing ?? selectionSlots.searchTrailing}
        row2Leading={row2Leading}
        row2Actions={row2Actions}
        row2Trailing={row2Trailing ?? selectionSlots.row2Trailing}
        {...rest}
      />
    </HubDirectorySelectionChromeProvider>
  );
}
