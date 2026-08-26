/**
 * Portable browser SSOT — extension route status chip (jar probe semantics).
 * Fan-out: node Tool/scripts/sync-hub-vanilla-e0001.mjs
 */

/**
 * @param {string | number | null | undefined} s
 */
export function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * @param {object} [st] bindingStatus entry from GET_STATUS
 * @returns {{ label: string, tone: string, icon: string, title: string }}
 */
export function resolveExtensionRouteStatusDisplay(st) {
  if (st?.ok === false) {
    return {
      label: "Error",
      tone: "error",
      icon: "alertTriangle",
      title: st?.error ? String(st.error) : "Route probe failed",
    };
  }
  if (st?.ok && st?.empty) {
    return {
      label: "0 jar",
      tone: "empty",
      icon: "database",
      title: "No cookies in local jar",
    };
  }
  if (st?.ok) {
    return {
      label: "OK",
      tone: "ok",
      icon: "check",
      title: "Local jar probe passed — cookies are present in this browser profile",
    };
  }
  return {
    label: "Ready",
    tone: "ready",
    icon: "scan",
    title: "Awaiting local jar probe — extension has not probed the local cookie jar yet",
  };
}

/**
 * Map cloud note/vault signals → extension bindingStatus shape (P0020 directory parity).
 * @param {{ syncStatus?: string | null, vaultCookieCount?: number | null, noteSyncedAt?: string | null }} opts
 */
export function mapCloudRouteToExtensionStatus(opts) {
  const raw = String(opts?.syncStatus ?? "pending").toLowerCase();
  if (raw === "error") {
    return { ok: false, error: "Last extension sync failed" };
  }
  const vault = opts?.vaultCookieCount ?? 0;
  const hasSyncedAt = Boolean(String(opts?.noteSyncedAt ?? "").trim());
  if (vault === 0 && raw !== "synced" && !hasSyncedAt) {
    return { ok: true, empty: true };
  }
  if (raw === "synced" || vault > 0 || hasSyncedAt) {
    return { ok: true };
  }
  return {};
}

/**
 * Cloud route health chip — same icon/label SSOT as E0001 popup Status column.
 * @param {{ syncStatus?: string | null, vaultCookieCount?: number | null, noteSyncedAt?: string | null }} opts
 */
export function resolveCloudRouteHealthDisplay(opts) {
  return resolveExtensionRouteStatusDisplay(mapCloudRouteToExtensionStatus(opts));
}

/**
 * @param {{ label: string, tone?: string, icon: string, title?: string }} display
 * @param {(name: string, className?: string) => string} renderIcon
 */
export function renderRouteStatusLabelHtml(display, renderIcon) {
  const tone = display.tone || "neutral";
  const iconHtml =
    typeof renderIcon === "function"
      ? renderIcon(display.icon, "hub-route-status-label__icon ui-icon")
      : "";
  const title = escapeHtml(display.title || display.label);
  return `<span class="hub-route-status-label hub-route-status-label--${tone}" title="${title}">${iconHtml}<span class="hub-route-status-label__text">${escapeHtml(display.label)}</span></span>`;
}

/** @deprecated use renderRouteStatusLabelHtml */
export const renderRouteStatusChipHtml = renderRouteStatusLabelHtml;
