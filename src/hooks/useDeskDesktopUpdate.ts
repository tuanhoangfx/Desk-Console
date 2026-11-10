import { useMemo } from "react";
import { useHubDesktopUpdater, type HubDesktopUpdateBridge } from "@tool-workspace/hub-ui";

/** Electron-updater / GitHub release status for the single header Update trigger (P0003/P0006 SSOT). */
export function useDeskDesktopUpdate() {
  const bridge = useMemo((): HubDesktopUpdateBridge | null => {
    if (typeof window === "undefined") return null;
    return window.deskConsole ?? null;
  }, []);
  return useHubDesktopUpdater(bridge, { autoDownloadWhenInstaller: true });
}
