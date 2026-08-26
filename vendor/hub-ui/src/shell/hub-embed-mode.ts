/**
 * Host iframe mode (P0015 Enzy Portal Phase B): `?embed=1` hides the embedded
 * tool's sidebar so only the attached screen content shows inside the host chrome.
 *
 * Optional query: `hostVersion` / `hostCode` — display the **host** portal semver
 * in AppTabHeader instead of each embedded tool's own package version.
 */

/** In-process host (local ENZY embed) — set by portal shell, not by URL. */
let hostVersionOverride: string | null = null;
let hostCodeOverride: string | null = null;
let hostVersionPublishedAtOverride: string | null = null;

export function setHubHostVersionOverride(version: string | null): void {
  hostVersionOverride = version ? String(version).replace(/^v/i, "").trim() || null : null;
}

export function getHubHostVersionOverride(): string | null {
  return hostVersionOverride;
}

/** In-process host release/build timestamp for embedded tab header version meta. */
export function setHubHostVersionPublishedAtOverride(publishedAt: string | null): void {
  hostVersionPublishedAtOverride = publishedAt ? String(publishedAt).trim() || null : null;
}

export function getHubHostVersionPublishedAtOverride(): string | null {
  return hostVersionPublishedAtOverride;
}

/** In-process host tool code (e.g. P0015) — mirrors `?hostCode=` for local embeds. */
export function setHubHostCodeOverride(code: string | null): void {
  hostCodeOverride = code ? String(code).trim().toUpperCase() || null : null;
}

export function getHubHostCodeOverride(): string | null {
  return hostCodeOverride;
}

export function isHubEmbedMode(search = typeof window !== "undefined" ? window.location.search : ""): boolean {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  const value = new URLSearchParams(raw).get("embed");
  return value === "1" || value === "true";
}

export function readHubEmbedHostVersion(
  search = typeof window !== "undefined" ? window.location.search : "",
): string | null {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  const value = new URLSearchParams(raw).get("hostVersion");
  if (!value) return null;
  const semver = value.replace(/^v/i, "").trim();
  return semver || null;
}

export function readHubEmbedHostCode(
  search = typeof window !== "undefined" ? window.location.search : "",
): string | null {
  if (hostCodeOverride) return hostCodeOverride;
  const raw = search.startsWith("?") ? search.slice(1) : search;
  const value = new URLSearchParams(raw).get("hostCode");
  return value?.trim().toUpperCase() || null;
}

/**
 * Version shown in tab chrome: host portal (P0015) when embedding, else tool package.
 */
export function resolveHubDisplayAppVersion(toolVersion: string): string {
  const fromUrl = readHubEmbedHostVersion();
  if (fromUrl) return fromUrl;
  if (hostVersionOverride) return hostVersionOverride;
  return String(toolVersion).replace(/^v/i, "").trim();
}

export function readHubEmbedHostZoom(
  search = typeof window !== "undefined" ? window.location.search : "",
): number | null {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  const value = new URLSearchParams(raw).get("hostZoom");
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Sync document tokens used by hub-boot pane offset when sidebar is omitted. */
export function applyHubEmbedDocumentClass(enabled: boolean): () => void {
  const root = document.documentElement;
  if (!enabled) {
    return () => undefined;
  }
  root.classList.add("hub-embed");
  root.style.setProperty("--hub-sidebar-width", "0px");
  // Match host Size slider via hostZoom query (do not write localStorage).
  const hostZoom = readHubEmbedHostZoom();
  const prevZoom = root.style.getPropertyValue("--hub-user-zoom-pct");
  root.style.setProperty("--hub-user-zoom-pct", String(hostZoom ?? 100));
  return () => {
    root.classList.remove("hub-embed");
    root.style.removeProperty("--hub-sidebar-width");
    if (prevZoom) root.style.setProperty("--hub-user-zoom-pct", prevZoom);
    else root.style.removeProperty("--hub-user-zoom-pct");
  };
}
