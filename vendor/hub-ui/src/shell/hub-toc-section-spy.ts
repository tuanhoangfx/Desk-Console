import { useEffect } from "react";

function readScrollPaddingTop(el: HTMLElement): number {
  const raw = getComputedStyle(el).scrollPaddingTop;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

/** Section whose top has crossed the scroll anchor line (Overview / modal TOC golden). */
export function resolveActiveTocSection(
  sectionIds: readonly string[],
  scrollRoot: HTMLElement,
  offsetPx = 16,
): string | null {
  if (!sectionIds.length) return null;

  const rootRect = scrollRoot.getBoundingClientRect();
  const line = rootRect.top + readScrollPaddingTop(scrollRoot) + offsetPx;

  let active: string = sectionIds[0];
  for (const id of sectionIds) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (el.getBoundingClientRect().top <= line) active = id;
    else break;
  }
  return active;
}

/** Scroll-spy — updates active TOC section while the content column scrolls. */
export function useHubTocSectionSpy(
  sectionIds: readonly string[],
  scrollRootSelector: string | undefined,
  onActiveChange: (id: string | null) => void,
) {
  useEffect(() => {
    if (!scrollRootSelector || sectionIds.length === 0) return;

    const resolveRoot = (): HTMLElement | null => {
      const el = document.querySelector(scrollRootSelector);
      return el instanceof HTMLElement ? el : null;
    };

    let root = resolveRoot();

    const run = () => {
      root = root ?? resolveRoot();
      if (!root) return;
      onActiveChange(resolveActiveTocSection(sectionIds, root));
    };

    run();
    const layoutTimer = window.setTimeout(run, 0);

    root?.addEventListener("scroll", run, { passive: true });
    window.addEventListener("resize", run, { passive: true });

    return () => {
      window.clearTimeout(layoutTimer);
      root?.removeEventListener("scroll", run);
      window.removeEventListener("resize", run);
    };
  }, [sectionIds, scrollRootSelector, onActiveChange]);
}
