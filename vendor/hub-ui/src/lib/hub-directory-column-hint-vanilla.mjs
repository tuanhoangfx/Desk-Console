/**
 * Portable directory column header hints — Cookie Bridge route table SSOT.
 * Fan-out: node Tool/scripts/sync-hub-vanilla-e0001.mjs
 */

/** Activity-age dot legend — parity directory-column-hint-helpers HUB_ACTIVITY_AGE_HINT_LINES. */
export const HUB_ACTIVITY_AGE_HINT_LINES = [
  { statusDot: "age-recent", label: "Fresh", detail: "Sort priority 1 — ≤ 1 hour — e.g. just now, 45m ago" },
  { statusDot: "age-aging", label: "Recent", detail: "Sort priority 2 — ≤ 24 hours — e.g. 5h ago" },
  { statusDot: "age-days", label: "1–3 days", detail: "Sort priority 3 — ≤ 3 days — dd/mm/yy date" },
  { statusDot: "age-week", label: "4–7 days", detail: "Sort priority 4 — ≤ 7 days — dd/mm/yy date" },
  { statusDot: "age-stale", label: "Stale", detail: "Sort priority 5 — > 7 days — dd/mm/yy date" },
];

/** @param {string | number | null | undefined} s */
export function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * @typedef {{ label: string, detail?: string, emoji?: string, statusDot?: string, icon?: string, toneClass?: string }} HubDirectoryColumnHintLine
 * @typedef {{ title?: string, description?: string, optionsLabel?: string, lines?: HubDirectoryColumnHintLine[] }} HubDirectoryColumnHintContent
 */

/** Column header `data-icon` keys — SSOT for E0001 routes table thead. */
export const COOKIE_BRIDGE_ROUTE_TABLE_HEADER_ICONS = {
  route: "route",
  cookies: "database",
  user: "user",
  synced: "sync",
  loaded: "download",
  status: "status",
  actions: "bolt",
};

/** Column header emoji stickers — HubTableColumnHeader `headerEmoji` SSOT. */
export const COOKIE_BRIDGE_ROUTE_TABLE_HEADER_EMOJI = {
  route: "🌐",
  actions: "⚡",
  synced: "🔄",
  loaded: "📥",
  status: "🚦",
  user: "👤",
  cookies: "🍪",
};

/** E0001 popup routes table — column header hints (English UI). */
export const COOKIE_BRIDGE_ROUTE_TABLE_COLUMN_HINTS = {
  route: {
    title: "Route",
    description: "Site icon, domain, and route label from Cookie Bridge.",
    lines: [],
  },
  cookies: {
    title: "Cookies",
    description: "Local browser jar and cloud vault reference for this route.",
    lines: [
      { emoji: "🫙", label: "Jar", detail: "Cookies stored in this browser profile" },
      { emoji: "🔐", label: "Vault", detail: "Encrypted cloud snapshot from last Sync" },
    ],
  },
  user: {
    title: "User",
    description: "Route owner email and your last Sync on this route.",
    lines: HUB_ACTIVITY_AGE_HINT_LINES,
  },
  synced: {
    title: "Synced",
    description: "Last time Sync now pushed cookies for this route.",
    lines: HUB_ACTIVITY_AGE_HINT_LINES,
  },
  loaded: {
    title: "Loaded",
    description: "Last time Load cookies applied the vault to the browser.",
    lines: HUB_ACTIVITY_AGE_HINT_LINES,
  },
  status: {
    title: "Status",
    description: "Local jar probe — whether cookies are ready to load.",
    lines: [
      { icon: "scan", toneClass: "hint-tone-ready", label: "Ready", detail: "Awaiting local jar probe" },
      { icon: "check", toneClass: "hint-tone-ok", label: "OK", detail: "Local jar probe passed — cookies present" },
      { icon: "database", toneClass: "hint-tone-empty", label: "0 jar", detail: "No cookies in local jar" },
      { icon: "alertTriangle", toneClass: "hint-tone-error", label: "Error", detail: "Route probe failed" },
    ],
  },
  actions: {
    title: "Actions",
    description: "Sync snapshots the local jar to cloud vault; Load applies vault to browser.",
    lines: [
      { icon: "sync", toneClass: "hint-tone-accent", label: "Sync", detail: "Push local cookies to vault" },
      { icon: "download", toneClass: "hint-tone-accent", label: "Load", detail: "Apply vault cookies to browser" },
    ],
  },
};

/**
 * @param {HubDirectoryColumnHintLine} line
 * @param {(name: string, className?: string) => string} [renderIcon]
 */
function renderHintLineGlyphHtml(line, renderIcon) {
  const imageSrc = typeof line.imageSrc === "string" ? line.imageSrc.trim() : "";
  if (imageSrc) {
    return `<img class="hub-directory-popover__image" src="${escapeHtml(imageSrc)}" alt="" width="12" height="12" draggable="false" />`;
  }
  if (line.brandIcon) {
    return `<span class="hub-directory-popover__brand" data-brand="${escapeHtml(String(line.brandIcon))}" aria-hidden="true"></span>`;
  }
  if (line.statusDot) {
    return `<span class="hub-users-status-dot hub-users-status-dot--${escapeHtml(line.statusDot)}" aria-hidden="true"></span>`;
  }
  if (line.dotClassName) {
    return `<span class="${escapeHtml(line.dotClassName)}" aria-hidden="true"></span>`;
  }
  if (line.icon && typeof renderIcon === "function") {
    return renderIcon(line.icon, `hub-directory-popover__glyph ui-icon ${line.toneClass ?? ""}`.trim());
  }
  if (line.emoji) {
    return `<span class="hub-directory-popover__emoji">${escapeHtml(line.emoji)}</span>`;
  }
  return `<span class="hub-directory-popover__emoji" aria-hidden="true">⭕</span>`;
}

/**
 * @param {HubDirectoryColumnHintContent} content
 * @param {(name: string, className?: string) => string} [renderIcon]
 */
export function renderDirectoryColumnHintPopoverHtml(content, renderIcon) {
  const lines = content.lines ?? [];
  const titleHtml = content.title
    ? `<p class="hub-directory-popover__title">${escapeHtml(content.title)}</p>`
    : "";
  const descHtml = content.description
    ? `<p class="hub-directory-popover__desc">${escapeHtml(content.description)}</p>`
    : "";
  const sectionHtml =
    lines.length > 0
      ? `<p class="hub-directory-popover__heading hub-directory-popover__heading--section"><span class="hub-directory-popover__heading-text">${escapeHtml(content.optionsLabel ?? "Option")}</span></p>`
      : "";
  const listHtml = lines.length
    ? `<ul class="hub-directory-popover__list">${lines
        .map((line) => {
          const text = line.detail ? `${line.label} · ${line.detail}` : line.label;
          return `<li class="hub-directory-popover__row"><span class="hub-directory-popover__icon" aria-hidden="true">${renderHintLineGlyphHtml(line, renderIcon)}</span><span class="hub-directory-popover__line">${escapeHtml(text)}</span></li>`;
        })
        .join("")}</ul>`
    : "";
  return `${titleHtml}${descHtml}${sectionHtml}${listHtml}`;
}
