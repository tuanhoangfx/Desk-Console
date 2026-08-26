/**
 * Portable browser/Node SSOT — workspace role keys + vanilla icon meta.
 * Fan-out: node Tool/scripts/sync-hub-vanilla-e0001.mjs
 */

/** @typedef {"admin" | "manager" | "user" | "anonymous"} HubWorkspaceRoleKey */

/** @type {Record<string, HubWorkspaceRoleKey>} */
export const ROLE_ICON_ALIASES = {
  admin: "admin",
  manager: "manager",
  user: "user",
  employee: "user",
  authenticated: "user",
  anonymous: "anonymous",
};

/**
 * @param {string | null | undefined} raw
 * @param {HubWorkspaceRoleKey} [fallback]
 * @returns {HubWorkspaceRoleKey}
 */
export function normalizeWorkspaceRoleKey(raw, fallback = "user") {
  const key = String(raw ?? "").trim().toLowerCase();
  return ROLE_ICON_ALIASES[key] ?? fallback;
}

/** Vanilla icon names for extension DOM / golden previews. */
export const HUB_WORKSPACE_ROLE_ICON_VANILLA = {
  admin: { icon: "crown", className: "hub-user-icon--indigo" },
  manager: { icon: "shield", className: "hub-user-icon--purple" },
  user: { icon: "userRound", className: "hub-user-icon--emerald" },
  anonymous: { icon: "userRound", className: "hub-user-icon--violet" },
};

/** @deprecated alias — extension modal/chip */
export const ROLE_ICON_META = HUB_WORKSPACE_ROLE_ICON_VANILLA;

export const WORKSPACE_ROLE_LABEL = {
  admin: "Admin",
  manager: "Manager",
  user: "User",
  anonymous: "Anonymous",
};

/**
 * @param {string} roleKey
 * @returns {string}
 */
export function workspaceRoleLabel(roleKey) {
  const key = normalizeWorkspaceRoleKey(roleKey);
  return WORKSPACE_ROLE_LABEL[key] || "User";
}

/**
 * @param {string} roleKey
 * @returns {{ icon: string, className: string }}
 */
export function resolveWorkspaceRoleIconVanilla(roleKey) {
  const key = normalizeWorkspaceRoleKey(roleKey);
  return HUB_WORKSPACE_ROLE_ICON_VANILLA[key] || HUB_WORKSPACE_ROLE_ICON_VANILLA.user;
}
