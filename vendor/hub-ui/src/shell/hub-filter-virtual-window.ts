/** ClickFilter / FilterBar list window — avoid mounting every option as a DOM node. */

export const HUB_FILTER_VIRTUAL_ROW_PX = 36;
export const HUB_FILTER_VIRTUAL_THRESHOLD = 40;
export const HUB_FILTER_VIRTUAL_OVERSCAN = 8;

export function hubFilterVirtualWindow(opts: {
  count: number;
  scrollTop: number;
  viewportPx: number;
  rowPx?: number;
  overscan?: number;
  headerPx?: number;
}): { start: number; end: number; padTop: number; padBottom: number } {
  const rowPx = opts.rowPx ?? HUB_FILTER_VIRTUAL_ROW_PX;
  const overscan = opts.overscan ?? HUB_FILTER_VIRTUAL_OVERSCAN;
  const headerPx = Math.max(0, opts.headerPx ?? 0);
  const count = Math.max(0, opts.count);
  if (count === 0 || rowPx <= 0) {
    return { start: 0, end: 0, padTop: 0, padBottom: 0 };
  }
  const adjScroll = Math.max(0, opts.scrollTop - headerPx);
  const viewport = Math.max(opts.viewportPx, rowPx);
  const start = Math.min(count, Math.max(0, Math.floor(adjScroll / rowPx) - overscan));
  const visible = Math.ceil(viewport / rowPx) + overscan * 2;
  const end = Math.min(count, start + visible);
  return {
    start,
    end,
    padTop: start * rowPx,
    padBottom: Math.max(0, (count - end) * rowPx),
  };
}

export function hubFilterShouldVirtualize(count: number, threshold = HUB_FILTER_VIRTUAL_THRESHOLD): boolean {
  return count > threshold;
}
