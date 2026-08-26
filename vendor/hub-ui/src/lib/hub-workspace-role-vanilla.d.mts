/** Type declarations for hub-workspace-role-vanilla.mjs (portable browser/Node SSOT). */

export type HubWorkspaceRoleKey = "admin" | "manager" | "user" | "anonymous";

export const ROLE_ICON_ALIASES: Record<string, HubWorkspaceRoleKey>;

export function normalizeWorkspaceRoleKey(
  raw: string | null | undefined,
  fallback?: HubWorkspaceRoleKey,
): HubWorkspaceRoleKey;

export const HUB_WORKSPACE_ROLE_ICON_VANILLA: Record<
  HubWorkspaceRoleKey,
  { icon: string; className: string }
>;

/** @deprecated alias — extension modal/chip */
export const ROLE_ICON_META: typeof HUB_WORKSPACE_ROLE_ICON_VANILLA;

export const WORKSPACE_ROLE_LABEL: Record<HubWorkspaceRoleKey, string>;

export function workspaceRoleLabel(roleKey: string): string;

export function resolveWorkspaceRoleIconVanilla(roleKey: string): { icon: string; className: string };
