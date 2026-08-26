import { resolveHubTableColumnMeta, type HubTableColumnRole } from "../table/hub-table-column-meta";
import type { FilterIconMeta } from "./filter-icons";

let directoryFilterColumnRoles: Partial<Record<string, HubTableColumnRole>> = {};

/** Map FilterBar `filter.key` → directory table column role (P0020 twofa vault). */
export function configureDirectoryFilterColumnRoles(map: Partial<Record<string, HubTableColumnRole>>) {
  directoryFilterColumnRoles = { ...map };
}

/** Filter facet icon — same Lucide + `hub-users-th-icon--*` as table header when parity is on. */
export function resolveDirectoryFilterColumnIcon(filterKey: string): FilterIconMeta | null {
  const role = directoryFilterColumnRoles[filterKey];
  if (!role) return null;
  const meta = resolveHubTableColumnMeta(role);
  if (!meta?.icon) return null;
  return {
    icon: meta.icon,
    className: `hub-users-th-icon ${meta.iconClassName ?? "hub-users-th-icon--name"}`,
  };
}
