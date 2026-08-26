import type { LucideIcon } from "lucide-react";
import { Crown, ShieldCheck, UserRound } from "lucide-react";
import type { HubSessionLike } from "@tool-workspace/hub-identity";
import { hubRoleEmoji } from "./hub-directory-stickers";

export type HubWorkspaceRoleKey = "admin" | "manager" | "user" | "anonymous";

export type HubWorkspaceRoleIconMeta = {
  icon: LucideIcon;
  className: string;
};

/** Canonical workspace role icons — sidebar footer, Users table, modals, filters. */
export const HUB_WORKSPACE_ROLE_ICON: Record<HubWorkspaceRoleKey, HubWorkspaceRoleIconMeta> = {
  admin: { icon: Crown, className: "text-indigo-300" },
  manager: { icon: ShieldCheck, className: "text-purple-300" },
  user: { icon: UserRound, className: "text-emerald-300" },
  anonymous: { icon: UserRound, className: "text-violet-400" },
};

export { normalizeWorkspaceRoleKey } from "../lib/hub-workspace-role-vanilla.mjs";
import { normalizeWorkspaceRoleKey as normalizeRoleKey } from "../lib/hub-workspace-role-vanilla.mjs";

export function workspaceRoleLabel(roleKey: string): string {
  const key = normalizeRoleKey(roleKey);
  if (key === "admin") return "Admin";
  if (key === "manager") return "Manager";
  if (key === "anonymous") return "Anonymous";
  return "User";
}

export function resolveWorkspaceRoleKey(session: HubSessionLike, fallback: HubWorkspaceRoleKey = "user"): string {
  const user = session?.user;
  const raw = String(user?.app_metadata?.role ?? user?.user_metadata?.role ?? fallback);
  return normalizeRoleKey(raw, fallback);
}

export function resolveWorkspaceRoleIcon(roleKey: string): HubWorkspaceRoleIconMeta {
  const key = normalizeRoleKey(roleKey);
  return HUB_WORKSPACE_ROLE_ICON[key];
}

/**
 * Native directory sticker for a workspace role.
 * Use this in data-dense rows; retain `resolveWorkspaceRoleIcon` for chrome
 * controls that deliberately use Lucide icons.
 */
export function workspaceRoleEmoji(roleKey: string): string {
  return hubRoleEmoji(normalizeRoleKey(roleKey));
}
