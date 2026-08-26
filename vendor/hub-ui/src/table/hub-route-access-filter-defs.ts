import type { FilterDef } from "../shell/FilterBar";

/** single-route = P0020 Cookie route modal; multi-route = P0004 user route directory (future). */
export type HubRouteAccessFilterScope = "single-route" | "multi-route";

const HUB_ROUTE_ACCESS_ROLE_FILTER: FilterDef = {
  key: "role",
  label: "Access",
  showAllLabel: false,
  options: [
    { value: "owner", label: "Owner", color: "#a78bfa" },
    { value: "load", label: "Load", color: "#38bdf8" },
    { value: "sync", label: "Sync", color: "#818cf8" },
  ],
};

/** Publish state per route — only meaningful when multiple routes are listed. */
const HUB_ROUTE_ACCESS_PUBLISH_FILTER: FilterDef = {
  key: "status",
  label: "Publish",
  showAllLabel: false,
  options: [
    { value: "published", label: "Published", color: "#818cf8" },
    { value: "missing", label: "Missing", color: "#f59e0b" },
  ],
};

export function hubRouteAccessFilterDefs(scope: HubRouteAccessFilterScope): FilterDef[] {
  if (scope === "multi-route") {
    return [HUB_ROUTE_ACCESS_ROLE_FILTER, HUB_ROUTE_ACCESS_PUBLISH_FILTER];
  }
  return [HUB_ROUTE_ACCESS_ROLE_FILTER];
}
