import type { HubSortDir } from "@tool-workspace/hub-ui";
import type { DeskRow } from "./DeskDirectoryTable";
import type { DeskCol } from "./desk-table-prefs";

const DESK_BASE_COLLATOR = new Intl.Collator(undefined, { sensitivity: "base" });

/** ISO `updated` strings sort lexically; name/extra use locale compare. */
export function compareDeskDirectoryRows(
  a: DeskRow,
  b: DeskRow,
  sortKey: DeskCol,
  sortDir: HubSortDir,
): number {
  if (Boolean(a.pinned) !== Boolean(b.pinned)) {
    return a.pinned ? -1 : 1;
  }
  const resolveVal = (row: DeskRow): string => {
    if (sortKey === "format") return String(row.clipFormat || "");
    if (sortKey === "created") return String(row.createdAt || row.updated || "");
    if (sortKey === "log") return String(row.activityLog?.[0]?.at || row.log || row.updated || "");
    if (sortKey === "run") return String(row.status || "");
    return String(row[sortKey] || "");
  };
  const av = resolveVal(a);
  const bv = resolveVal(b);
  const cmp =
    sortKey === "updated" || sortKey === "created"
      ? av.localeCompare(bv)
      : DESK_BASE_COLLATOR.compare(av, bv);
  return sortDir === "asc" ? cmp : -cmp;
}
