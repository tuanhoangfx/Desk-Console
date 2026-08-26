import type { HubEntityLogFieldMeta } from "../lib/hub-entity-log";

/** Shared User Account / User Directory Detail Log labels and emoji glyphs. */
export const HUB_USER_LOG_FIELD_META: Record<string, HubEntityLogFieldMeta> = {
  username: { label: "Username", emoji: "👤" },
  name: { label: "Display name", emoji: "🏷️" },
  fullName: { label: "Display name", emoji: "🏷️" },
  email: { label: "Email", emoji: "✉️" },
  password: { label: "Password", emoji: "🔑" },
  role: { label: "Role", emoji: "🛡️" },
  phone: { label: "Phone", emoji: "📱" },
  zalo: { label: "Zalo", emoji: "💬" },
  telegram: { label: "Tele", emoji: "✈️" },
  meta: { label: "Meta", emoji: "🔵" },
  note: { label: "Note", emoji: "📝" },
  session: { label: "Session", emoji: "🟢" },
  tools: { label: "Tool", emoji: "🛠️" },
  jobTitle: { label: "Position", emoji: "💼" },
  team: { label: "Team", emoji: "🤝" },
};

/** User-field metadata for `HubChangeLogList`; unknown fields retain a visible user glyph. */
export function hubUserLogFieldMeta(field: string): HubEntityLogFieldMeta {
  if (field.startsWith("enterprise:")) {
    return { label: `${field.slice("enterprise:".length)} enterprise`, emoji: "🏢" };
  }
  return HUB_USER_LOG_FIELD_META[field] ?? { label: field || "User", emoji: "👤" };
}
