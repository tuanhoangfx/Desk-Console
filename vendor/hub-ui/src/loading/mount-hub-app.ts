import { hideBootLoader } from "./hub-loader-dom";

export function mountHubApp(rootEl: HTMLElement, render: () => void) {
  try {
    render();
    // requestAnimationFrame never fires while the tab is in the background, so a tool opened
    // in a background tab mounted fine but left __hubBootReady false forever — and the boot
    // fallback then declared a fully working app "did not finish loading" at its 120s timeout.
    // hideBootLoader is idempotent, so arm a timer alongside the frame.
    requestAnimationFrame(() => hideBootLoader());
    setTimeout(() => hideBootLoader(), 1500);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    hideBootLoader();
    rootEl.innerHTML =
      '<div style="max-width:32rem;margin:2rem auto;padding:1.25rem;border-radius:0.75rem;border:1px solid rgba(244,63,94,0.35);background:rgba(244,63,94,0.08);color:#fecdd3;font:13px/1.5 Inter,system-ui,sans-serif">' +
      "<strong>App failed to mount</strong><br/>" +
      message +
      "</div>";
    console.error("[hub-boot]", error);
  }
}
