export type HubPortalPanelRect = Pick<DOMRect, "top" | "bottom" | "left" | "width">;

export type HubPortalPanelPositionOpts = {
  /** Preferred panel width in CSS pixels. */
  width: number;
  /** Estimated panel height used to decide flip-above vs open-below. */
  estimatedHeight: number;
  /** Viewport inset from edges (default 8). */
  margin?: number;
  /** Gap between trigger and panel (default 4). */
  gap?: number;
};

export type HubPortalPanelPosition = {
  top: number;
  left: number;
  width: number;
  openUp: boolean;
};

/**
 * Shared fixed-portal placement for Hub filter / date / period dropdowns.
 * Flips above the trigger when the viewport (or modal footer) would clip a
 * downward-opening panel.
 */
export function hubPortalPanelPosition(
  rect: HubPortalPanelRect,
  opts: HubPortalPanelPositionOpts,
  viewport: { innerWidth: number; innerHeight: number } = typeof window !== "undefined"
    ? window
    : { innerWidth: 1280, innerHeight: 720 },
): HubPortalPanelPosition {
  const margin = opts.margin ?? 8;
  const gap = opts.gap ?? 4;
  const width = Math.max(1, opts.width);
  const estimatedHeight = Math.max(1, opts.estimatedHeight);
  const spaceBelow = viewport.innerHeight - rect.bottom - margin;
  const spaceAbove = rect.top - margin;
  const openUp = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;
  const top = openUp
    ? Math.max(margin, rect.top - estimatedHeight - gap)
    : rect.bottom + gap;
  const left = Math.min(
    Math.max(margin, rect.left),
    Math.max(margin, viewport.innerWidth - width - margin),
  );
  return { top, left, width, openUp };
}
