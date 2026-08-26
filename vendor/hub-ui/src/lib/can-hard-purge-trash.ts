import { readCachedWorkspaceProfileRole } from "./workspace-profile-role";

/** Hub profiles.role === admin — only Admins may Hard Delete forever from Trash UI. */
export function isHubAdminRole(role: string | null | undefined): boolean {
  return String(role ?? "").trim().toLowerCase() === "admin";
}

/**
 * Hard Delete forever (Trash UI) — Hub Admin only.
 * Automatic 30d purge is DB/cron (`*_hard_purge_trash_all`), not this gate.
 */
export function canHardPurgeTrashForever(input: {
  /** Hub / data-box user ids to read `profiles.role` cache. */
  userIds?: Array<string | null | undefined>;
  /** Pre-resolved role keys (e.g. from useWorkspaceRoleKey). */
  roleKeys?: Array<string | null | undefined>;
}): boolean {
  if ((input.roleKeys ?? []).some(isHubAdminRole)) return true;
  for (const id of input.userIds ?? []) {
    const trimmed = id?.trim();
    if (!trimmed) continue;
    if (isHubAdminRole(readCachedWorkspaceProfileRole(trimmed))) return true;
  }
  return false;
}
