import type { ReactNode } from "react";
import {
  HubDirectoryToolbarSelection,
  type HubDirectoryToolbarSelectionProps,
} from "./HubDirectoryToolbarSelection";
import type { HubViewMode } from "./ViewToggle";

export type DirectorySearchResultCountGuardInput = {
  showResultCount?: boolean;
  hasSearchSelectionChip?: boolean;
  /** HubDirectoryScreen registered `filterSelectionToolbar`. */
  filterSelectionToolbarActive?: boolean;
  viewMode?: HubViewMode;
};

export type HubDirectorySelectionSlots = {
  /** @deprecated table mode uses `toolbarLeading` (closes desktop grid gap vs ViewToggle). */
  searchTrailing?: ReactNode;
  /** Table mode — leading slot of FilterBar toolbar (immediately before ViewToggle). */
  toolbarLeading?: ReactNode;
  row2Trailing?: ReactNode;
};

/** SSOT — omit `HubResultCount` when selection chip already shows x/y. */
export function shouldShowHubDirectoryResultCount(opts: {
  showResultCount?: boolean;
  hasSearchSelectionChip?: boolean;
}): boolean {
  if (opts.showResultCount === false) return false;
  if (opts.hasSearchSelectionChip) return false;
  return true;
}

/** Auto-guard — registered selection toolbar hides duplicate HubResultCount (table + card). */
export function resolveDirectorySearchResultCountGuard(
  input: DirectorySearchResultCountGuardInput,
): { showResultCount?: boolean; hasSearchSelectionChip: boolean } {
  const autoChip = Boolean(input.filterSelectionToolbarActive);
  return {
    showResultCount: input.showResultCount,
    hasSearchSelectionChip: Boolean(input.hasSearchSelectionChip) || autoChip,
  };
}

/**
 * Route V2 selection chip —
 * table: FilterBar toolbar leading (next to ViewToggle; avoids 1fr gap after search) ·
 * card: search trailing (same x/y slot — no duplicate HubResultCount).
 */
export function buildHubDirectorySelectionSlots(
  props: HubDirectoryToolbarSelectionProps | undefined,
  viewMode: HubViewMode = "table",
): HubDirectorySelectionSlots {
  if (!props) return {};
  const chip = <HubDirectoryToolbarSelection {...props} />;
  if (viewMode === "card") return { searchTrailing: chip };
  return { toolbarLeading: chip };
}
