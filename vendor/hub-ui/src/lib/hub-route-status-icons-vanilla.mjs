/**
 * Route status + table icon SVG SSOT — path-only glyphs (no circle wraps).
 * Fan-out: node Tool/scripts/sync-hub-vanilla-e0001.mjs
 */

/** @type {Record<string, string>} */
export const HUB_ROUTE_STATUS_ICON_SVGS = {
  check: '<svg viewBox="0 0 24 24"><path d="m5 12 5 5L20 7"/></svg>',
  alertTriangle:
    '<svg viewBox="0 0 24 24"><path d="M12 3 22 21H2Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
  loader:
    '<svg viewBox="0 0 24 24"><path d="M12 2v4"/><path d="M12 18v4"/><path d="m4.93 4.93 2.83 2.83"/><path d="m16.24 16.24 2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="m4.93 19.07 2.83-2.83"/><path d="m16.24 7.76 2.83-2.83"/></svg>',
  scan:
    '<svg viewBox="0 0 24 24"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/></svg>',
  database:
    '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></svg>',
  download:
    '<svg viewBox="0 0 24 24"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>',
};

/**
 * @param {string} name
 * @param {string} [className]
 */
export function renderHubRouteStatusIconHtml(name, className = "ui-icon") {
  const svg = HUB_ROUTE_STATUS_ICON_SVGS[name];
  if (!svg) return "";
  return `<span class="${className}" aria-hidden="true">${svg}</span>`;
}
