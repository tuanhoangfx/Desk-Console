export const HUB_TAB_LOADER_ROOT_ID = "hub-tab-loader-root";
export const HUB_BOOT_LOADER_ID = "hub-boot-loader";

/** Portal mount on body — avoids flex/transform ancestors shifting fixed loaders (e.g. Cookie tab). */
export function ensureHubTabLoaderRoot(): HTMLElement {
  let el = document.getElementById(HUB_TAB_LOADER_ROOT_ID);
  if (!el) {
    el = document.createElement("div");
    el.id = HUB_TAB_LOADER_ROOT_ID;
    el.className = "pointer-events-none";
    document.body.appendChild(el);
  }
  return el;
}

declare global {
  interface Window {
    __hubBootReady?: boolean;
  }
}

/** Signal index.html boot fallback + remove overlay once React shell is ready. */
export function hideBootLoader() {
  if (typeof window !== "undefined") {
    window.__hubBootReady = true;
    window.dispatchEvent(new Event("hub-boot-ready"));
  }
  document.getElementById(HUB_BOOT_LOADER_ID)?.remove();
}
