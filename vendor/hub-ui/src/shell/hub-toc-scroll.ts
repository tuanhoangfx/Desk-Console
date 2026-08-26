function isScrollable(el: Element): boolean {
  const { overflowY } = getComputedStyle(el);
  if (overflowY !== "auto" && overflowY !== "scroll" && overflowY !== "overlay") return false;
  return el.scrollHeight > el.clientHeight + 1;
}

function readScrollPaddingTop(el: HTMLElement): number {
  const raw = getComputedStyle(el).scrollPaddingTop;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

export function findHubTocScrollContainer(target: HTMLElement, hintSelector?: string): Element {
  if (hintSelector) {
    const hinted = document.querySelector(hintSelector);
    if (hinted instanceof HTMLElement && hinted.contains(target) && isScrollable(hinted)) {
      return hinted;
    }
  }

  let innermost: HTMLElement | null = null;
  let node: HTMLElement | null = target.parentElement;
  while (node) {
    if (isScrollable(node)) innermost = node;
    node = node.parentElement;
  }
  if (innermost) return innermost;

  const hubMain = document.querySelector(".hub-main");
  if (hubMain instanceof HTMLElement) return hubMain;

  return document.documentElement;
}

/** Smooth-scroll modal/content column to a TOC section id. */
export function scrollToHubTocSection(sectionId: string, scrollRootSelector?: string) {
  const el = document.getElementById(sectionId);
  if (!el) return;

  const root = findHubTocScrollContainer(el, scrollRootSelector);
  if (root === document.documentElement || root === document.body) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const rootEl = root as HTMLElement;
  const rootRect = rootEl.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  const stickyOffset = readScrollPaddingTop(rootEl) + 8;
  const top = rootEl.scrollTop + (elRect.top - rootRect.top) - stickyOffset;
  rootEl.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}
