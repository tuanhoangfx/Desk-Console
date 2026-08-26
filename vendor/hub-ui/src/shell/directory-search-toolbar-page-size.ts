/**
 * Directory toolbar page-size SSOT — page size lives in Display when `displayBand` is set.
 * @see packages/hub-ui/UI_PATTERNS.md § Directory toolbar row 1
 */
export function resolveDirectoryToolbarShowTablePageSize(opts: {
  displayBand?: unknown;
  showTablePageSize?: boolean;
}): boolean {
  if (opts.displayBand) return false;
  return opts.showTablePageSize ?? true;
}
