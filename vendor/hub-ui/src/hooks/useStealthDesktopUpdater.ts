import { useHubDesktopUpdater, type HubDesktopUpdateBridge } from "./useHubDesktopUpdater";

/**
 * P0003 Stealth Browser SSOT — auto-download installer updates on `available`.
 * Tools pass `window.stealthApi` (or equivalent preload bridge).
 */
export function useStealthDesktopUpdater(
  bridge: HubDesktopUpdateBridge | null | undefined,
) {
  return useHubDesktopUpdater(bridge, { autoDownloadWhenInstaller: true });
}
