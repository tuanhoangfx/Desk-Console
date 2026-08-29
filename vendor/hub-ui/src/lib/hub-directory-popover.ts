/** Gap between anchor and popover (px) — same family as Hub filter dropdown. */
export const HUB_DIRECTORY_POPOVER_OFFSET_PX = 6;

/** Minimum inset from viewport edges when clamping popover position. */
export const HUB_DIRECTORY_POPOVER_VIEWPORT_MARGIN_PX = 8;

/**
 * Shared fixed-portal placement for directory hints / value popovers.
 * Flips above the trigger when the viewport would clip a downward panel
 * (Hub filter dropdown SSOT — `hubPortalPanelPosition`).
 */
export function hubDirectoryPopoverPosition(
  rect: DOMRect,
  popoverWidth = 0,
  viewportWidth = typeof window !== "undefined" ? window.innerWidth : 0,
  popoverHeight = 0,
  viewportHeight = typeof window !== "undefined" ? window.innerHeight : 0,
): { top: number; left: number } {
  const margin = HUB_DIRECTORY_POPOVER_VIEWPORT_MARGIN_PX;
  const gap = HUB_DIRECTORY_POPOVER_OFFSET_PX;
  const vpH = viewportHeight || (typeof window !== "undefined" ? window.innerHeight : 0);

  let top = rect.bottom + gap;
  if (popoverHeight > 0 && vpH > 0) {
    const spaceBelow = vpH - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    // Prefer flip when the panel would sit in the bottom strip (taskbar / board edge).
    const crampedBelow = spaceBelow < popoverHeight || spaceBelow < 160;
    if (crampedBelow && spaceAbove > spaceBelow) {
      top = Math.max(margin, rect.top - popoverHeight - gap);
    } else {
      top = Math.min(top, Math.max(margin, vpH - margin - popoverHeight));
    }
  }

  let left = rect.left;
  if (popoverWidth > 0 && viewportWidth > 0) {
    const maxLeft = viewportWidth - margin - popoverWidth;
    if (left + popoverWidth > viewportWidth - margin) {
      left = rect.right - popoverWidth;
    }
    left = Math.max(margin, Math.min(left, maxLeft));
  } else {
    left = Math.max(margin, left);
  }

  return { top, left };
}

export function measureHubDirectoryPopoverPosition(
  anchor: HTMLElement | null,
  popover: HTMLElement | null,
): { top: number; left: number } | null {
  if (!anchor) return null;
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 0;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 0;
  return hubDirectoryPopoverPosition(
    anchor.getBoundingClientRect(),
    popover?.offsetWidth ?? 0,
    viewportWidth,
    popover?.offsetHeight ?? 0,
    viewportHeight,
  );
}

export function sameHubDirectoryPopoverPos(
  a: { top: number; left: number },
  b: { top: number; left: number },
): boolean {
  return a.top === b.top && a.left === b.left;
}
