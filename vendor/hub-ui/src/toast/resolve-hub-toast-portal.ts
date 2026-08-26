/** Class on the portal host — child of modal backdrop or `body` fallback (P0020 / HubToast SSOT). */
export const HUB_TOAST_PORTAL_HOST_CLASS = "hub-toast-portal-host";

const HOST_SELECTOR = `:scope > .${HUB_TOAST_PORTAL_HOST_CLASS}`;

function ensurePortalHost(parent: HTMLElement): HTMLElement {
  let host = parent.querySelector<HTMLElement>(HOST_SELECTOR);
  if (!host) {
    host = document.createElement("div");
    host.className = HUB_TOAST_PORTAL_HOST_CLASS;
    host.setAttribute("data-hub-toast-portal", "true");
    parent.appendChild(host);
  }
  return host;
}

/**
 * Portal target for copy/toast — inside the topmost tool-detail modal backdrop when open
 * (same layer as the dialog; not dimmed by backdrop-filter on the overlay). Otherwise body host.
 */
export function resolveHubToastPortalTarget(): HTMLElement {
  if (typeof document === "undefined") {
    return globalThis.document?.body ?? (null as unknown as HTMLElement);
  }

  const backdrops = document.querySelectorAll<HTMLElement>(
    ".modal-backdrop.modal-backdrop--tool-detail, .modal-backdrop--tool-detail",
  );
  if (backdrops.length > 0) {
    return ensurePortalHost(backdrops[backdrops.length - 1]!);
  }

  return ensurePortalHost(document.body);
}
