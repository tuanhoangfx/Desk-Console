import type { DirectoryDefaultSortRow } from "@tool-workspace/hub-ui";
import type { AppScreen } from "../../lib/app-screen";
import type { DeskCol } from "./desk-table-prefs";

export type DeskPrimaryDefaultSort = { sortKey: DeskCol; sortDir: "asc" | "desc" };

/** Runners / Tasks — Name A→Z when manual sort is off. */
export const DESK_OPS_PRIMARY_DEFAULT_SORT: DeskPrimaryDefaultSort = {
  sortKey: "name",
  sortDir: "asc",
};

/** Clips — newest activity first (clipboard timeline). */
export const DESK_CLIPS_PRIMARY_DEFAULT_SORT: DeskPrimaryDefaultSort = {
  sortKey: "updated",
  sortDir: "desc",
};

const DESK_OPS_DEFAULT_SORT_ROWS: readonly DirectoryDefaultSortRow[] = [
  {
    id: "name",
    label: "Name",
    directionHint: "A → Z",
    emoji: "📛",
  },
];

const DESK_CLIPS_DEFAULT_SORT_ROWS: readonly DirectoryDefaultSortRow[] = [
  {
    id: "updated",
    label: "Updated",
    directionHint: "newest first",
    emoji: "🕒",
  },
];

/** @deprecated Use deskPrimaryDefaultSort(screen). */
export const DESK_PRIMARY_DEFAULT_SORT = DESK_OPS_PRIMARY_DEFAULT_SORT;

/** @deprecated Use deskDefaultSortRowsFor(screen). */
export const DESK_DEFAULT_SORT_ROWS = DESK_OPS_DEFAULT_SORT_ROWS;

export function deskPrimaryDefaultSort(screen: AppScreen): DeskPrimaryDefaultSort {
  if (screen === "clips") return DESK_CLIPS_PRIMARY_DEFAULT_SORT;
  return DESK_OPS_PRIMARY_DEFAULT_SORT;
}

export function deskDefaultSortRowsFor(screen: AppScreen): readonly DirectoryDefaultSortRow[] {
  if (screen === "clips") return DESK_CLIPS_DEFAULT_SORT_ROWS;
  return DESK_OPS_DEFAULT_SORT_ROWS;
}
