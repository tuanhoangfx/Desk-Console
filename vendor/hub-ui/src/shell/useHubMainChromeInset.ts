import { useLayoutEffect, type RefObject } from "react";
import { syncHubMainChromeInset } from "../loading/hub-main-chrome-inset";

/** Keeps `--hub-main-chrome-top` in sync so portaled tab loader centers in the content pane. */
export function useHubMainChromeInset(mainRef?: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const resolveMain = () => mainRef?.current ?? document.querySelector<HTMLElement>(".hub-main");

    const sync = () => syncHubMainChromeInset(resolveMain());

    sync();

    const main = resolveMain();
    if (!main) return;

    const ro = new ResizeObserver(sync);
    ro.observe(main);
    const chrome = main.querySelector("[data-hub-main-chrome]");
    if (chrome) {
      ro.observe(chrome);
      const mo = new MutationObserver(sync);
      mo.observe(chrome, { childList: true, subtree: true, attributes: true });
      window.addEventListener("resize", sync);
      return () => {
        ro.disconnect();
        mo.disconnect();
        window.removeEventListener("resize", sync);
      };
    }

    window.addEventListener("resize", sync);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, [mainRef]);
}
