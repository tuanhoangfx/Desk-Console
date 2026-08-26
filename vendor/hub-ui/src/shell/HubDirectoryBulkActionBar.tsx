import type { ReactNode } from "react";
import {
  HubDirectorySelectAllChip,
  type HubDirectorySelectAllChipProps,
} from "./HubDirectorySelectAllChip";

/** SSOT — bulk row Select / Unselect (fixed label width). */
export const HUB_DIRECTORY_SELECT_ALL_LABEL_MODE = "select-unselect" as const;

export type HubDirectoryBulkActionBarProps = {
  /** Card-view select-all chip — `x/y` count uses `filterSelectionToolbar` + `directoryViewMode="card"`. */
  selectAll?: HubDirectorySelectAllChipProps | null;
  children?: ReactNode;
};

function withSelectAllSsot(
  selectAll: HubDirectorySelectAllChipProps | null | undefined,
): HubDirectorySelectAllChipProps | null {
  if (selectAll == null) return null;
  return {
    ...selectAll,
    labelMode: selectAll.labelMode ?? HUB_DIRECTORY_SELECT_ALL_LABEL_MODE,
  };
}

/** Golden filter row 2 — bulk CTAs only (`filterRowActions`; selection count lives in toolbar row-1). */
export function HubDirectoryBulkActionBar({ selectAll, children }: HubDirectoryBulkActionBarProps) {
  const resolvedSelectAll = withSelectAllSsot(selectAll);
  const showSelectAll = resolvedSelectAll != null && resolvedSelectAll.visibleCount > 0;
  if (!showSelectAll && !children) return null;
  return (
    <>
      {showSelectAll ? <HubDirectorySelectAllChip {...resolvedSelectAll} /> : null}
      {children}
    </>
  );
}
