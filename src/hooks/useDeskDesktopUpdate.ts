import { useMemo } from "react";
import { useHubDesktopUpdater, type HubDesktopUpdateBridge } from "@tool-workspace/hub-ui";
import { DESK_USER_DOWNLOAD_URL, P0009_SITE_URL } from "../lib/guide-url";

/** Electron-updater / GitHub release status for the single header Update trigger (P0003/P0006 SSOT). */
export function useDeskDesktopUpdate() {
  const bridge = useMemo((): HubDesktopUpdateBridge | null => {
    if (typeof window === "undefined") return null;
    return window.deskConsole ?? null;
  }, []);
  return useHubDesktopUpdater(bridge, {
    autoDownloadWhenInstaller: true,
    userDownloadUrl: DESK_USER_DOWNLOAD_URL,
    introUrl: P0009_SITE_URL,
  });
}
