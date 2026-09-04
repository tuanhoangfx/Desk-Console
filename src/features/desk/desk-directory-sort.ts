import type { HubSortDir } from "@tool-workspace/hub-ui";
import type { DeskRow } from "./DeskDirectoryTable";
import type { DeskCol } from "./desk-table-prefs";

/** ISO `updated` strings sort lexically; name/extra use locale compare. */
export function compareDeskDirectoryRows(
  a: DeskRow,
  b: DeskRow,
  sortKey: DeskCol,
  sortDir: HubSortDir,
): number {
  const av = String(a[sortKey] || "");
  const bv = String(b[sortKey] || "");
  const cmp =
    sortKey === "updated"
      ? av.localeCompare(bv)
      : av.localeCompare(bv, undefined, { sensitivity: "base" });
  return sortDir === "asc" ? cmp : -cmp;
}
