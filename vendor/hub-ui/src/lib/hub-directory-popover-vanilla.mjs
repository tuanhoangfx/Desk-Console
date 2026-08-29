/**
 * Portable directory column header popover — parity HubDirectoryColumnHint.
 * Fan-out: node Tool/scripts/sync-hub-vanilla-e0001.mjs
 */

import { renderDirectoryColumnHintPopoverHtml } from "./hub-directory-column-hint-vanilla.mjs";

export const HUB_DIRECTORY_POPOVER_OFFSET_PX = 6;
export const HUB_DIRECTORY_POPOVER_VIEWPORT_MARGIN_PX = 8;

/**
 * @param {DOMRect} rect
 * @param {number} [popoverWidth]
 * @param {number} [viewportWidth]
 * @param {number} [popoverHeight]
 * @param {number} [viewportHeight]
 */
export function hubDirectoryPopoverPosition(
  rect,
  popoverWidth = 0,
  viewportWidth = typeof window !== "undefined" ? window.innerWidth : 0,
  popoverHeight = 0,
  viewportHeight = typeof window !== "undefined" ? window.innerHeight : 0,
) {
  const margin = HUB_DIRECTORY_POPOVER_VIEWPORT_MARGIN_PX;
  const gap = HUB_DIRECTORY_POPOVER_OFFSET_PX;
  const vpH = viewportHeight || (typeof window !== "undefined" ? window.innerHeight : 0);
  let top = rect.bottom + gap;
  if (popoverHeight > 0 && vpH > 0) {
    const spaceBelow = vpH - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    if (spaceBelow < popoverHeight && spaceAbove > spaceBelow) {
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

/** @param {HTMLElement | null} anchor @param {HTMLElement | null} popover */
export function measureHubDirectoryPopoverPosition(anchor, popover) {
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

/**
 * @param {HTMLElement} th
 * @returns {HTMLElement}
 */
function ensurePopoverAnchor(th) {
  const existing = th.querySelector(".hub-directory-popover-anchor");
  if (existing) return existing;
  const label = th.querySelector(".th-label");
  if (!label) {
    const anchor = document.createElement("span");
    anchor.className = "hub-directory-popover-anchor";
    th.appendChild(anchor);
    return anchor;
  }
  const anchor = document.createElement("span");
  anchor.className = "hub-directory-popover-anchor";
  label.parentNode.insertBefore(anchor, label);
  anchor.appendChild(label);
  return anchor;
}

/**
 * Wire rich column header hints on a directory table head.
 * @param {HTMLElement | null | undefined} tableHead
 * @param {Record<string, import("./hub-directory-column-hint-vanilla.mjs").HubDirectoryColumnHintContent>} hintsByKey
 * @param {{ renderIcon?: (name: string, className?: string) => string }} [options]
 */
export function mountDirectoryColumnHints(tableHead, hintsByKey, options = {}) {
  if (!tableHead) return;
  const { renderIcon } = options;
  /** @type {HTMLElement | null} */
  let openPopover = null;
  /** @type {HTMLElement | null} */
  let openAnchor = null;
  let hideTimer = 0;

  const hidePopover = () => {
    if (hideTimer) window.clearTimeout(hideTimer);
    hideTimer = 0;
    openPopover?.remove();
    openPopover = null;
    openAnchor = null;
  };

  const scheduleHide = () => {
    if (hideTimer) window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(hidePopover, 80);
  };

  const showPopover = (anchor, content) => {
    hidePopover();
    const popover = document.createElement("div");
    popover.className = "hub-directory-popover";
    popover.setAttribute("role", "tooltip");
    popover.innerHTML = renderDirectoryColumnHintPopoverHtml(content, renderIcon);
    document.body.appendChild(popover);
    const pos = measureHubDirectoryPopoverPosition(anchor, popover);
    if (pos) {
      popover.style.top = `${pos.top}px`;
      popover.style.left = `${pos.left}px`;
    }
    popover.addEventListener("mouseenter", () => {
      if (hideTimer) window.clearTimeout(hideTimer);
      hideTimer = 0;
    });
    popover.addEventListener("mouseleave", scheduleHide);
    openPopover = popover;
    openAnchor = anchor;
  };

  for (const th of tableHead.querySelectorAll("th[data-col-hint]")) {
    const key = th.dataset.colHint;
    const content = hintsByKey[key];
    if (!content) continue;
    th.removeAttribute("title");
    const anchor = ensurePopoverAnchor(th);
    const reveal = () => showPopover(anchor, content);
    anchor.addEventListener("mouseenter", reveal);
    anchor.addEventListener("focus", reveal);
    anchor.addEventListener("mouseleave", scheduleHide);
    anchor.addEventListener("blur", scheduleHide);
    if (!anchor.hasAttribute("tabindex")) anchor.setAttribute("tabindex", "0");
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!openAnchor || !openPopover) return;
      const pos = measureHubDirectoryPopoverPosition(openAnchor, openPopover);
      if (pos) {
        openPopover.style.top = `${pos.top}px`;
        openPopover.style.left = `${pos.left}px`;
      }
    },
    true,
  );
}
