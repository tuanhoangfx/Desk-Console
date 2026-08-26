import { useEffect, type RefObject } from "react";
import { ensureHubTabLoaderRoot } from "../loading/hub-loader-dom";
import { useHubMainChromeInset } from "./useHubMainChromeInset";

export { ensureHubTabLoaderRoot, HUB_TAB_LOADER_ROOT_ID } from "../loading/hub-loader-dom";

/** Mounts loader portal on document.body (keeps orb centered in main pane). */
export function HubLoaderRoot({ mainRef }: { mainRef?: RefObject<HTMLElement | null> }) {
  useEffect(() => {
    ensureHubTabLoaderRoot();
  }, []);
  useHubMainChromeInset(mainRef);
  return null;
}
