/** Hub catalog tool mark — SSOT path synced by Tool/scripts/sync-hub-tool-icons.mjs */
export function resolveHubToolIconSrc(toolCode: string): string {
  const code = toolCode.trim().toUpperCase();
  if (!/^[PE]\d{4}$/.test(code)) return "/icons/tools/P0004.svg";
  return `/icons/tools/${code}.svg`;
}

export function hubToolLoadingAriaLabel(toolName: string): string {
  const name = toolName.trim();
  return name ? `Loading ${name}` : "Loading";
}
