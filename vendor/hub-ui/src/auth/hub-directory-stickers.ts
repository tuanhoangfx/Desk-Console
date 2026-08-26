/**
 * Hub Users directory sticker SSOT.
 *
 * Shared across P0004 Users and every tool-scoped Users / Team directory.
 * Domain-specific columns may add their own stickers, but role, presence and
 * their filter triggers must never fork from this contract.
 */
export const HUB_ROLE_EMOJI = {
  admin: "👑",
  manager: "👨‍💼",
  user: "👤",
} as const;

export type HubRoleEmojiKey = keyof typeof HUB_ROLE_EMOJI;

/** FilterBar trigger sticker for the Role facet. */
export const HUB_ROLE_FILTER_TRIGGER_EMOJI = "🛡️";

/** Users-directory presence values (legacy emoji — prefer `HUB_USER_STATUS_DOT_COLOR` in FilterBar). */
export const HUB_USER_STATUS_EMOJI = {
  online: "🟢",
  active: "🔵",
  idle: "🟡",
  offline: "⚫",
} as const;

/**
 * Presence dot colors — must match `hub-users-status-dot--*` in `hub-users-table.css`
 * and `HubUsersStatusLabel` table/card rendering.
 */
export const HUB_USER_STATUS_DOT_COLOR = {
  online: "#22c55e",
  active: "#06b6d4",
  idle: "#f59e0b",
  offline: "#64748b",
} as const;

/** P0004 Users header contract, reused by tool-scoped directories. */
export const HUB_DIRECTORY_HEADER_EMOJI = {
  username: "👤",
  /** Label tag — do not use 📛 (Name Badge); Windows Segoe often renders it as tofu. */
  displayName: "🏷️",
  email: "📧",
  password: "🔑",
  id: "🆔",
  role: "🛡️",
  status: "🚦",
  tools: "🧰",
  created: "📅",
  lastActive: "⏱️",
} as const;

export type HubStickerFilterOption = {
  value: string;
  label: string;
  emoji?: string;
  /** Colored status/presence dot — preferred over emoji for Status filters. */
  color?: string;
};

export function hubRoleEmoji(role: string | null | undefined): string {
  if (role === "admin" || role === "manager" || role === "user") return HUB_ROLE_EMOJI[role];
  return HUB_ROLE_EMOJI.user;
}

export function hubRoleFilterOptions(opts?: {
  includeNone?: boolean;
  noneLabel?: string;
  noneEmoji?: string;
}): HubStickerFilterOption[] {
  const roles: HubStickerFilterOption[] = [
    { value: "admin", label: "Admin", emoji: HUB_ROLE_EMOJI.admin },
    { value: "manager", label: "Manager", emoji: HUB_ROLE_EMOJI.manager },
    { value: "user", label: "User", emoji: HUB_ROLE_EMOJI.user },
  ];
  if (!opts?.includeNone) return roles;
  return [...roles, { value: "none", label: opts.noneLabel ?? "No access", emoji: opts.noneEmoji ?? "⭕" }];
}

export function hubUserStatusEmoji(status: string | null | undefined): string {
  if (status === "online" || status === "active" || status === "idle" || status === "offline") {
    return HUB_USER_STATUS_EMOJI[status];
  }
  return HUB_USER_STATUS_EMOJI.offline;
}

/** Status FilterBar options — colored dots + labels (table `HubUsersStatusLabel` parity). */
export function hubUserStatusFilterOptions(): HubStickerFilterOption[] {
  return [
    { value: "online", label: "Online", color: HUB_USER_STATUS_DOT_COLOR.online },
    { value: "active", label: "Active", color: HUB_USER_STATUS_DOT_COLOR.active },
    { value: "idle", label: "Idle", color: HUB_USER_STATUS_DOT_COLOR.idle },
    { value: "offline", label: "Offline", color: HUB_USER_STATUS_DOT_COLOR.offline },
  ];
}
