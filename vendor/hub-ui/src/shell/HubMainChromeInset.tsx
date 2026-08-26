import type { ReactNode, RefObject } from "react";
import { useHubMainChromeInset } from "./useHubMainChromeInset";

/** Banners / alerts above tab content — measured for portaled loader vertical center. */
export function HubMainChromeStack({ children }: { children: ReactNode }) {
  return (
    <div className="hub-main-chrome-stack shrink-0" data-hub-main-chrome>
      {children}
    </div>
  );
}

/** Mount beside `HubLoaderRoot`; pass the same `mainRef` as `.hub-main`. */
export function HubMainChromeInsetSync({ mainRef }: { mainRef?: RefObject<HTMLElement | null> }) {
  useHubMainChromeInset(mainRef);
  return null;
}
