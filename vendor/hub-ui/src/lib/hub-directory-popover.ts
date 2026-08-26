/** Gap between anchor bottom and popover top (px) — column header hints SSOT. */

export const HUB_DIRECTORY_POPOVER_OFFSET_PX = 6;



/** Minimum inset from viewport edges when clamping popover position. */

export const HUB_DIRECTORY_POPOVER_VIEWPORT_MARGIN_PX = 8;



export function hubDirectoryPopoverPosition(

  rect: DOMRect,

  popoverWidth = 0,

  viewportWidth = typeof window !== "undefined" ? window.innerWidth : 0,

): { top: number; left: number } {

  const margin = HUB_DIRECTORY_POPOVER_VIEWPORT_MARGIN_PX;

  const top = rect.bottom + HUB_DIRECTORY_POPOVER_OFFSET_PX;



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

  return hubDirectoryPopoverPosition(anchor.getBoundingClientRect(), popover?.offsetWidth ?? 0);

}

