/** Hub catalog tool mark — SSOT path synced by Tool/scripts/sync-hub-tool-icons.mjs */
export function resolveHubToolIconSrc(toolCode: string): string {
  const code = toolCode.trim().toUpperCase();
  if (!/^[PE]\d{4}$/.test(code)) return "/icons/tools/P0004.svg";
  return `/icons/tools/${code}.svg`;
}

/**
 * Prefix a catalog public path with Vite `import.meta.env.BASE_URL`.
 * Packaged Electron uses `base: './'` — bare `/icons/...` resolves to `file:///icons/...` (broken).
 */
export function resolveVitePublicPath(catalogPath: string): string {
  const normalized = catalogPath.replace(/^\//, "");
  const base = import.meta.env.BASE_URL || "/";
  return `${base}${normalized}`.replace(/([^:])\/{2,}/g, "$1/");
}

/** Hub tool mark safe for Vite web (`/`) and packaged Electron (`./`). */
export function resolveHubToolIconSrcForVite(toolCode: string): string {
  return resolveVitePublicPath(resolveHubToolIconSrc(toolCode));
}

export function hubToolLoadingAriaLabel(toolName: string): string {
  const name = toolName.trim();
  return name ? `Loading ${name}` : "Loading";
}
