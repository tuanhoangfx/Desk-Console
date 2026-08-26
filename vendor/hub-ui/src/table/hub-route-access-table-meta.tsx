import type { HubTableColumn } from "../content/HubDataTable";
import { HUB_DIRECTORY_ID_EMOJI } from "../lib/directory-id-emoji";

/** Modal route-access table — same shell as User Access tools table. */
export const HUB_ROUTE_ACCESS_MODAL_TABLE_CLASS = "hub-users-table hub-users-table--route-access-modal";

export const HUB_ROUTE_ACCESS_MODAL_TABLE_WRAP_CLASS =
  "hub-users-table-wrap hub-scrollbar min-w-0 overflow-x-auto rounded-xl border border-white/5";

/** Full-width directory variant (non-modal). */
export const HUB_ROUTE_ACCESS_TABLE_CLASS = "hub-users-table hub-users-table--route-access";

export const HUB_ROUTE_ACCESS_TABLE_WRAP_CLASS = "hub-scrollbar min-w-0 overflow-x-auto";

export type HubRouteAccessColumnLayout = "expanded" | "compact";

/**
 * Services directory chrome — always paint the header label (no icon-only collapse).
 * Rem tokens are already sized for sticker + full title (Usage Expired, Left, …).
 */
export const HUB_ROUTE_ACCESS_HEADER_LABEL_ALWAYS = new Set<HubRouteAccessSortKey>([
  "profile",
  "usage",
  "usageExpired",
  "planLeft",
  "planDays",
  "planDate",
  "planDue",
  "ownership",
  "liveStatus",
  "password",
  "mailRecover",
  "fullInfo",
  "source",
  "loadAt",
  "syncAt",
]);

export const HUB_ROUTE_ACCESS_COL = {
  select: "hub-users-col--select",
  user: "hub-route-access-col--user",
  role: "hub-route-access-col--role",
  profile: "hub-route-access-col--profile",
  password: "hub-route-access-col--password",
  mailRecover: "hub-route-access-col--mail-recover",
  fullInfo: "hub-route-access-col--full-info",
  source: "hub-route-access-col--source",
  syncAt: "hub-route-access-col--sync-at",
  loadAt: "hub-route-access-col--load-at",
  ownership: "hub-route-access-col--ownership",
  liveStatus: "hub-route-access-col--live-status",
  usage: "hub-route-access-col--usage",
  usageExpired: "hub-route-access-col--usage-expired",
  planDate: "hub-route-access-col--plan-date",
  planDays: "hub-route-access-col--plan-days",
  planDue: "hub-route-access-col--plan-due",
  planLeft: "hub-route-access-col--plan-left",
  perm: "hub-route-access-col--perm",
  activity: "hub-route-access-col--activity",
  rights: "hub-route-access-col--rights",
  route: "hub-route-access-col--route",
  addedAt: "hub-route-access-col--added-at",
  expires: "hub-route-access-col--expires",
} as const;

export type HubRouteAccessModalColumnOptions = {
  layout?: HubRouteAccessColumnLayout;
  showRouteColumn?: boolean;
  /** Expanded layout only — hide Synced/Linked column (Teams temporary). */
  showSyncAtColumn?: boolean;
  /** Teams members — Profile (Service browser / profile code). */
  showProfileColumn?: boolean;
  /** Teams members — Password from linked Services/Mail account. */
  showPasswordColumn?: boolean;
  /** Teams members — Recovery Mail from linked account. */
  showMailRecoverColumn?: boolean;
  /** Teams members — Full Info from linked account. */
  showFullInfoColumn?: boolean;
  /** Teams members — Ownership/Status/Profile source (Service · Mail · Manual). */
  showSourceColumn?: boolean;
  /** Teams members — sheet Ownership column. */
  showOwnershipColumn?: boolean;
  /** Teams members — sheet Live Status column. */
  showLiveStatusColumn?: boolean;
  /** Teams members — CRM Usage (P0005 Order Detail mentions, same service). */
  showUsageColumn?: boolean;
  /** Teams members — CRM Usage Expired (Subscription Status Expired). */
  showUsageExpiredColumn?: boolean;
  /** Teams members — Date / Duration / Due / Left after Tier. */
  showPlanScheduleColumns?: boolean;
  /** Hide Expires / remapped Status column (Teams — Role Backup replaces Status). Default true. */
  showExpiresColumn?: boolean;
  /**
   * Stacked card embeds (Teams schema) — `table-layout:fixed` + rem tracks +
   * `width: max-content` so sibling tables share edges without shrinking cols
   * to the card (`width: 100%` scales Usage below Services 6.25rem).
   */
  stackAlignColumns?: boolean;
};

export const HUB_ROUTE_ACCESS_MODAL_COLUMN_DEFS = {
  user: {
    key: "user",
    label: "User",
    className: HUB_ROUTE_ACCESS_COL.user,
    role: "user" as const,
  },
  role: {
    key: "role",
    label: "Access",
    className: HUB_ROUTE_ACCESS_COL.role,
    role: "access" as const,
  },
  profile: {
    key: "profile",
    label: "Profile",
    className: HUB_ROUTE_ACCESS_COL.profile,
    role: "browser" as const,
    headerEmoji: "📡",
  },
  password: {
    key: "password",
    label: "Password",
    className: HUB_ROUTE_ACCESS_COL.password,
    role: "password" as const,
    headerEmoji: "🔑",
  },
  mailRecover: {
    key: "mailRecover",
    label: "Recovery Mail",
    className: HUB_ROUTE_ACCESS_COL.mailRecover,
    role: "email" as const,
    headerEmoji: "📨",
  },
  fullInfo: {
    key: "fullInfo",
    label: "Full Info",
    className: HUB_ROUTE_ACCESS_COL.fullInfo,
    role: "notes" as const,
    headerEmoji: HUB_DIRECTORY_ID_EMOJI,
  },
  syncAt: {
    key: "syncAt",
    label: "Synced",
    className: HUB_ROUTE_ACCESS_COL.syncAt,
    role: "synced" as const,
  },
  loadAt: {
    key: "loadAt",
    label: "Loaded",
    className: HUB_ROUTE_ACCESS_COL.loadAt,
    role: "load" as const,
  },
  source: {
    key: "source",
    label: "Source",
    className: HUB_ROUTE_ACCESS_COL.source,
    role: "links" as const,
    headerEmoji: "🔗",
  },
  ownership: {
    key: "ownership",
    label: "Ownership",
    className: HUB_ROUTE_ACCESS_COL.ownership,
    role: "user" as const,
    headerEmoji: "🦸‍♂️",
  },
  liveStatus: {
    key: "liveStatus",
    label: "Status",
    className: HUB_ROUTE_ACCESS_COL.liveStatus,
    role: "status" as const,
    headerEmoji: "🚦",
  },
  usage: {
    key: "usage",
    label: "Usage",
    className: HUB_ROUTE_ACCESS_COL.usage,
    role: "activity" as const,
    headerEmoji: "🧮",
  },
  usageExpired: {
    key: "usageExpired",
    label: "Usage Expired",
    className: HUB_ROUTE_ACCESS_COL.usageExpired,
    role: "activity" as const,
    headerEmoji: "⏳",
  },
  planDate: {
    key: "planDate",
    label: "Date",
    className: HUB_ROUTE_ACCESS_COL.planDate,
    role: "created" as const,
    headerEmoji: "📅",
  },
  planDays: {
    key: "planDays",
    label: "Duration",
    className: HUB_ROUTE_ACCESS_COL.planDays,
    role: "period" as const,
    headerEmoji: "⏱️",
  },
  planDue: {
    key: "planDue",
    label: "Due",
    className: HUB_ROUTE_ACCESS_COL.planDue,
    role: "expires" as const,
    headerEmoji: "📆",
  },
  planLeft: {
    key: "planLeft",
    label: "Left",
    className: HUB_ROUTE_ACCESS_COL.planLeft,
    role: "period" as const,
    headerEmoji: "⏳",
  },
  permLoad: {
    key: "permLoad",
    label: "Load",
    className: HUB_ROUTE_ACCESS_COL.perm,
    role: "load" as const,
  },
  permSync: {
    key: "permSync",
    label: "Sync",
    className: HUB_ROUTE_ACCESS_COL.perm,
    role: "sync" as const,
  },
  activity: {
    key: "activity",
    label: "Act.",
    className: HUB_ROUTE_ACCESS_COL.activity,
    role: "activity" as const,
  },
  rights: {
    key: "rights",
    label: "Shared",
    className: HUB_ROUTE_ACCESS_COL.rights,
    role: "access" as const,
  },
  route: {
    key: "route",
    label: "Route",
    className: HUB_ROUTE_ACCESS_COL.route,
    role: "route" as const,
  },
  addedAt: {
    key: "addedAt",
    label: "Add",
    className: HUB_ROUTE_ACCESS_COL.addedAt,
    role: "created" as const,
  },
  expires: {
    key: "expires",
    label: "Expires",
    className: HUB_ROUTE_ACCESS_COL.expires,
    role: "expires" as const,
  },
} satisfies Record<string, HubTableColumn>;

export function buildHubRouteAccessModalColumns(
  showSelect: boolean,
  options: HubRouteAccessModalColumnOptions = {},
): HubTableColumn[] {
  const layout = options.layout ?? "expanded";
  const showRouteColumn = options.showRouteColumn ?? layout === "expanded";
  const showSyncAtColumn = options.showSyncAtColumn ?? true;
  const showProfileColumn = options.showProfileColumn ?? false;
  const showPasswordColumn = options.showPasswordColumn ?? false;
  const showMailRecoverColumn = options.showMailRecoverColumn ?? false;
  const showFullInfoColumn = options.showFullInfoColumn ?? false;
  const showSourceColumn = options.showSourceColumn ?? false;
  const showOwnershipColumn = options.showOwnershipColumn ?? false;
  const showLiveStatusColumn = options.showLiveStatusColumn ?? false;
  const showUsageColumn = options.showUsageColumn ?? false;
  const showUsageExpiredColumn = options.showUsageExpiredColumn ?? false;
  const showPlanScheduleColumns = options.showPlanScheduleColumns ?? false;
  const showExpiresColumn = options.showExpiresColumn ?? true;

  if (layout === "compact") {
    return [
      ...(showSelect ? [{ key: "select", label: "", className: HUB_ROUTE_ACCESS_COL.select }] : []),
      HUB_ROUTE_ACCESS_MODAL_COLUMN_DEFS.user,
      HUB_ROUTE_ACCESS_MODAL_COLUMN_DEFS.role,
      HUB_ROUTE_ACCESS_MODAL_COLUMN_DEFS.activity,
      ...(showRouteColumn ? [HUB_ROUTE_ACCESS_MODAL_COLUMN_DEFS.route] : []),
      HUB_ROUTE_ACCESS_MODAL_COLUMN_DEFS.addedAt,
      ...(showExpiresColumn ? [HUB_ROUTE_ACCESS_MODAL_COLUMN_DEFS.expires] : []),
    ];
  }

  return [
    ...(showSelect ? [{ key: "select", label: "", className: HUB_ROUTE_ACCESS_COL.select }] : []),
    HUB_ROUTE_ACCESS_MODAL_COLUMN_DEFS.user,
    // Status band (Teams Member detail SSOT): Role → Source → Own → Live Status → Left
    HUB_ROUTE_ACCESS_MODAL_COLUMN_DEFS.role,
    ...(showSourceColumn ? [HUB_ROUTE_ACCESS_MODAL_COLUMN_DEFS.source] : []),
    ...(showOwnershipColumn ? [HUB_ROUTE_ACCESS_MODAL_COLUMN_DEFS.ownership] : []),
    ...(showLiveStatusColumn ? [HUB_ROUTE_ACCESS_MODAL_COLUMN_DEFS.liveStatus] : []),
    ...(showPlanScheduleColumns ? [HUB_ROUTE_ACCESS_MODAL_COLUMN_DEFS.planLeft] : []),
    // Identity band: Profile → Password → Recovery → Full Info
    ...(showProfileColumn ? [HUB_ROUTE_ACCESS_MODAL_COLUMN_DEFS.profile] : []),
    ...(showPasswordColumn ? [HUB_ROUTE_ACCESS_MODAL_COLUMN_DEFS.password] : []),
    ...(showMailRecoverColumn ? [HUB_ROUTE_ACCESS_MODAL_COLUMN_DEFS.mailRecover] : []),
    ...(showFullInfoColumn ? [HUB_ROUTE_ACCESS_MODAL_COLUMN_DEFS.fullInfo] : []),
    ...(showUsageColumn ? [HUB_ROUTE_ACCESS_MODAL_COLUMN_DEFS.usage] : []),
    ...(showUsageExpiredColumn ? [HUB_ROUTE_ACCESS_MODAL_COLUMN_DEFS.usageExpired] : []),
    ...(showSyncAtColumn ? [HUB_ROUTE_ACCESS_MODAL_COLUMN_DEFS.syncAt] : []),
    HUB_ROUTE_ACCESS_MODAL_COLUMN_DEFS.loadAt,
    ...(showPlanScheduleColumns
      ? [
          HUB_ROUTE_ACCESS_MODAL_COLUMN_DEFS.planDate,
          HUB_ROUTE_ACCESS_MODAL_COLUMN_DEFS.planDays,
          HUB_ROUTE_ACCESS_MODAL_COLUMN_DEFS.planDue,
        ]
      : []),
    ...(showRouteColumn ? [HUB_ROUTE_ACCESS_MODAL_COLUMN_DEFS.route] : []),
    HUB_ROUTE_ACCESS_MODAL_COLUMN_DEFS.addedAt,
    ...(showExpiresColumn ? [HUB_ROUTE_ACCESS_MODAL_COLUMN_DEFS.expires] : []),
  ];
}

export function hubRouteAccessModalColumnCount(
  showSelect: boolean,
  options: HubRouteAccessModalColumnOptions = {},
) {
  const layout = options.layout ?? "expanded";
  const showRouteColumn = options.showRouteColumn ?? layout === "expanded";
  const showSyncAtColumn = options.showSyncAtColumn ?? true;
  const showProfileColumn = options.showProfileColumn ?? false;
  const showPasswordColumn = options.showPasswordColumn ?? false;
  const showMailRecoverColumn = options.showMailRecoverColumn ?? false;
  const showFullInfoColumn = options.showFullInfoColumn ?? false;
  const showSourceColumn = options.showSourceColumn ?? false;
  const showOwnershipColumn = options.showOwnershipColumn ?? false;
  const showLiveStatusColumn = options.showLiveStatusColumn ?? false;
  const showUsageColumn = options.showUsageColumn ?? false;
  const showUsageExpiredColumn = options.showUsageExpiredColumn ?? false;
  const showPlanScheduleColumns = options.showPlanScheduleColumns ?? false;
  const showExpiresColumn = options.showExpiresColumn ?? true;

  if (layout === "compact") {
    let dataCols = showRouteColumn ? 6 : 5;
    if (!showExpiresColumn) dataCols -= 1;
    return showSelect ? dataCols + 1 : dataCols;
  }

  let dataCols = showRouteColumn ? 7 : 6;
  if (!showSyncAtColumn) dataCols -= 1;
  if (showProfileColumn) dataCols += 1;
  if (showPasswordColumn) dataCols += 1;
  if (showMailRecoverColumn) dataCols += 1;
  if (showFullInfoColumn) dataCols += 1;
  if (showSourceColumn) dataCols += 1;
  if (showOwnershipColumn) dataCols += 1;
  if (showLiveStatusColumn) dataCols += 1;
  if (showUsageColumn) dataCols += 1;
  if (showUsageExpiredColumn) dataCols += 1;
  if (showPlanScheduleColumns) dataCols += 4;
  if (!showExpiresColumn) dataCols -= 1;
  return showSelect ? dataCols + 1 : dataCols;
}

export function hubRouteAccessModalTableClass(options: HubRouteAccessModalColumnOptions = {}) {
  const layout = options.layout ?? "expanded";
  const showRouteColumn = options.showRouteColumn ?? layout === "expanded";
  const showSyncAtColumn = options.showSyncAtColumn ?? true;
  const showPlanScheduleColumns = options.showPlanScheduleColumns ?? false;
  const stackAlignColumns = options.stackAlignColumns ?? false;
  const modifiers = [
    layout === "expanded" ? "hub-users-table--route-access-modal--expanded" : "",
    layout === "compact" && showRouteColumn ? "hub-users-table--route-access-modal--with-route" : "",
    layout === "expanded" && !showSyncAtColumn ? "hub-users-table--route-access-modal--no-sync" : "",
    layout === "expanded" && showPlanScheduleColumns
      ? "hub-users-table--route-access-modal--plan-schedule"
      : "",
    layout === "expanded" && stackAlignColumns
      ? "hub-users-table--route-access-modal--stack-align"
      : "",
  ]
    .filter(Boolean)
    .join(" ");
  return modifiers ? `${HUB_ROUTE_ACCESS_MODAL_TABLE_CLASS} ${modifiers}` : HUB_ROUTE_ACCESS_MODAL_TABLE_CLASS;
}

export const HUB_ROUTE_ACCESS_SKELETON_WRAP_CLASS = HUB_ROUTE_ACCESS_MODAL_TABLE_WRAP_CLASS;

/** @deprecated Use modal col defs — kept for HubDirectoryTableShell callers. */
export type HubRouteAccessColumnKey = "user" | "role";

export type HubRouteAccessSortKey =
  | "user"
  | "role"
  | "profile"
  | "password"
  | "mailRecover"
  | "fullInfo"
  | "source"
  | "ownership"
  | "liveStatus"
  | "usage"
  | "usageExpired"
  | "syncAt"
  | "loadAt"
  | "planDate"
  | "planDays"
  | "planDue"
  | "planLeft"
  | "activity"
  | "route"
  | "addedAt"
  | "expires";
