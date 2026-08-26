import { useEffect, useRef, useState } from "react";
import {
  applyDirectorySplitHorizontalScrollSync,
  applyDirectorySplitScrollbarSync,
} from "./directory-split-scrollbar-sync";

/** Keep split thead/body columns aligned (vertical scrollbar pad + horizontal scrollLeft). */
export function useDirectorySplitScrollbarSync(enabled: boolean) {
  const headRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [scrollbarPad, setScrollbarPad] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const body = bodyRef.current;
    const head = headRef.current;
    if (!body || !head) return;

    const sync = () => {
      setScrollbarPad(applyDirectorySplitScrollbarSync(head, body));
      applyDirectorySplitHorizontalScrollSync(head, body);
    };

    sync();
    const raf1 = requestAnimationFrame(() => requestAnimationFrame(sync));

    const ro = new ResizeObserver(sync);
    ro.observe(body);
    const wrap = head.closest(".hub-directory-table-split");
    if (wrap instanceof HTMLElement) ro.observe(wrap);

    const mo = new MutationObserver(sync);
    mo.observe(body, { childList: true, subtree: true, characterData: true });

    window.addEventListener("resize", sync);
    body.addEventListener("scroll", sync, { passive: true });
    return () => {
      cancelAnimationFrame(raf1);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("resize", sync);
      body.removeEventListener("scroll", sync);
    };
  }, [enabled]);

  return { headRef, bodyRef, scrollbarPad };
}
