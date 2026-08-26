import type { HubTableColumnRole } from "./hub-table-column-meta";

/** Fixed (px/rem) vs fluid (%) directory column width tier — bulk tables use CSS tokens, not inline colgroup %. */
export type HubDirectoryColumnWidthKind = "fixed" | "fluid";

export type HubDirectoryColumnWidthSpec = {
  kind: HubDirectoryColumnWidthKind;
  /** CSS width token for variant stylesheets (`col` / `th` / `td`). */
  token: string;
};

/**
 * SSOT: every directory track is rem/px. Narrow view = wrap overflow-x (never %).
 * Bulk tables (`showSelect: true`): apply via variant CSS — never inline % in colgroup.
 */
export const HUB_DIRECTORY_COLUMN_WIDTH_REGISTRY: Partial<
  Record<HubTableColumnRole, HubDirectoryColumnWidthSpec>
> = {
  status: { kind: "fixed", token: "6.5rem" },
  drift: { kind: "fixed", token: "3.75rem" },
  created: { kind: "fixed", token: "6.25rem" },
  activity: { kind: "fixed", token: "6.25rem" },
  updated: { kind: "fixed", token: "6.25rem" },
  expires: { kind: "fixed", token: "6.25rem" },
  role: { kind: "fixed", token: "5rem" },
  tools: { kind: "fixed", token: "3.75rem" },
  version: { kind: "fixed", token: "5.5rem" },
  category: { kind: "fixed", token: "5.5rem" },
  access: { kind: "fixed", token: "5.5rem" },
  type: { kind: "fixed", token: "5.5rem" },
  kind: { kind: "fixed", token: "4.5rem" },
  layer: { kind: "fixed", token: "5rem" },
  lines: { kind: "fixed", token: "3.25rem" },
  mode: { kind: "fixed", token: "5rem" },
  period: { kind: "fixed", token: "5rem" },
  sync: { kind: "fixed", token: "5rem" },
  load: { kind: "fixed", token: "5rem" },
  actions: { kind: "fixed", token: "8.5rem" },
  code: { kind: "fixed", token: "4.5rem" },
  /** Profile / 4-digit browser code + header sticker + full “Profile” label. */
  browser: { kind: "fixed", token: "7.5rem" },
  /** Directory audit log — one-line summary + ellipsis (P0020 Log column). */
  log: { kind: "fixed", token: "15rem" },
  bots: { kind: "fixed", token: "3.75rem" },
  members: { kind: "fixed", token: "5rem" },
  active: { kind: "fixed", token: "5rem" },
  session: { kind: "fixed", token: "5rem" },
  synced: { kind: "fixed", token: "5rem" },
};

export const HUB_DIRECTORY_SELECT_WIDTH_SPEC: HubDirectoryColumnWidthSpec = {
  kind: "fixed",
  token: "36px",
};

/**
 * Freeform directory **Note** column width SSOT (P0020 Services/Mail/Teams, P0005 Orders,
 * P0013 Movies, P0003 Profiles, …). Prefer rem lock + generated/theme CSS that beats
 * hub-directory-table neutralize (`th/td max-width:none`). Same rem on Hub system Notes.
 */
export const HUB_DIRECTORY_NOTE_COL_WIDTH = "20rem";

/**
 * Directory **Log** column width SSOT (P0020 Services/Mail audit log cell).
 * Prefer this alias over `HUB_DIRECTORY_COLUMN_WIDTH_REGISTRY.log!.token`.
 */
export const HUB_DIRECTORY_LOG_COL_WIDTH = resolveDirectoryColumnWidthSpec("log").token;

/**
 * Shared directory chrome — Profile / Usage / Day Left.
 * One rem token per semantic column (Services · Mail · Meta · Teams · Quota).
 * Never hand-write 5.5rem / 7.5rem in a product theme or HubRouteAccess CSS.
 */
export const HUB_DIRECTORY_PROFILE_COL_WIDTH = resolveDirectoryColumnWidthSpec("browser").token;
/**
 * Usage — sticker + “Usage”. Wider than hub `activity` 6.25rem.
 */
export const HUB_DIRECTORY_USAGE_COL_WIDTH = "8.75rem";
/**
 * Usage Expired — sticker + full header label (longer than Usage).
 * Own rem so a shared Usage class cannot collapse the header to icon-only.
 */
export const HUB_DIRECTORY_USAGE_EXPIRED_COL_WIDTH = "12rem";
export const HUB_DIRECTORY_PLAN_LEFT_COL_WIDTH = resolveDirectoryColumnWidthSpec("period").token;
/** Own chip — Services / Mail / Teams (🦸‍♂️). Not hub `status` 6.5rem. */
export const HUB_DIRECTORY_OWNERSHIP_COL_WIDTH = "5.5rem";
/**
 * Account live Status — Services theme floor (🚦 + label). Wider than hub `status` 6.5rem.
 * Mail / Team / Meta / Quota Status use this, not a per-screen rem.
 */
export const HUB_DIRECTORY_ACCOUNT_STATUS_COL_WIDTH = "8.75rem";
/**
 * CRM Subscription / Plan Status — ♻️ Active · 🚨 Expiring Soon · 🛑 Expired.
 * P0005 Order `subscription_status` + P0020 Services/Mail/Quota/Teams Plan Status.
 */
export const HUB_DIRECTORY_SUBSCRIPTION_STATUS_COL_WIDTH = "14rem";
export const HUB_DIRECTORY_PLAN_DATE_COL_WIDTH = resolveDirectoryColumnWidthSpec("created").token;
export const HUB_DIRECTORY_PLAN_DUE_COL_WIDTH = resolveDirectoryColumnWidthSpec("updated").token;
/** Password / Recovery / Full Info / Plan Package — Services identity + plan floors. */
export const HUB_DIRECTORY_PASSWORD_COL_WIDTH = "8rem";
export const HUB_DIRECTORY_MAIL_RECOVER_COL_WIDTH = "12.5rem";
export const HUB_DIRECTORY_FULL_INFO_COL_WIDTH = "7rem";
export const HUB_DIRECTORY_PLAN_PACKAGE_COL_WIDTH = "26rem";

/** Playwright / visual regression bands (px) for fixed chrome columns. */
export const HUB_DIRECTORY_FIXED_COL_WIDTH_BANDS = {
  select: { min: 34, max: 40, target: 36 },
  /** rem token + 10px L/R cell pad on hub-tools variant */
  status: { min: 88, max: 135, target: 104 },
  timestamp: { min: 88, max: 130, target: 100 },
} as const;

export function resolveDirectoryColumnWidthSpec(role: HubTableColumnRole): HubDirectoryColumnWidthSpec {
  return HUB_DIRECTORY_COLUMN_WIDTH_REGISTRY[role] ?? { kind: "fluid", token: "auto" };
}

export function isFixedDirectoryColumnRole(role: HubTableColumnRole): boolean {
  return resolveDirectoryColumnWidthSpec(role).kind === "fixed";
}

export function isFluidDirectoryColumnWidth(width: string): boolean {
  const trimmed = width.trim();
  return trimmed.endsWith("%") || trimmed === "auto";
}

export function isFixedDirectoryColumnWidth(width: string): boolean {
  const trimmed = width.trim();
  return /^\d+(\.\d+)?(px|rem)$/.test(trimmed);
}

/**
 * Dev/test: throw (fail fast — parity gates + vitest catch violations).
 * Production: console.error + degrade gracefully — bad column meta must not
 * white-screen the tab at runtime (a module-scope throw kills the whole chunk import).
 */
const DIRECTORY_META_STRICT: boolean =
  typeof import.meta !== "undefined" &&
  Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV);

export function failDirectoryColumnMeta(message: string): void {
  if (DIRECTORY_META_STRICT) throw new Error(message);
  console.error(`[hub-directory] ${message}`);
}

/** Fail when any directory meta still uses % / auto (workspace rem + overflow-x). */
export function validateDirectoryColumnWidthMeta(
  columns: readonly { role: HubTableColumnRole; width: string; key?: string }[],
): void {
  for (const col of columns) {
    if (isFluidDirectoryColumnWidth(col.width)) {
      const spec = resolveDirectoryColumnWidthSpec(col.role);
      const label = col.key ? `"${col.key}" (${col.role})` : col.role;
      failDirectoryColumnMeta(
        `Directory column ${label}: width must be rem/px (got "${col.width}") — role token ${spec.token}`,
      );
    }
  }
}
