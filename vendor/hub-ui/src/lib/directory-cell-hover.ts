/** Golden truncate class — directory table body cells (P0004 / hub-ui SSOT). */
export const DIRECTORY_CELL_TRUNCATE = "block max-w-full truncate";

/** Hover title helper — copy toast labels; body truncate prefers portal exceptions (hub-tooltip-ssot). */
export function directoryCellHoverTitle(value: string, display?: string): string {
  const v = String(value ?? "").trim();
  const d = display != null ? String(display).trim() : v;
  return d || v;
}

/** @deprecated Prefer explicit `hoverPopover` / TimestampTooltipCell — always false. */
export function directoryCellNeedsRichTooltip(_value: string): boolean {
  return false;
}

/** @deprecated Kept for import stability. */
export const DIRECTORY_CELL_RICH_TOOLTIP_MIN_LEN = 0;
