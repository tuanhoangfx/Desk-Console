import { useEffect, useRef } from "react";
import {
  HUB_DESKTOP_UPDATE_INSTALL_TOAST,
  HUB_DESKTOP_UPDATE_INSTALL_TOAST_DURATION_MS,
  type HubVersionDesktopUpdate,
} from "../lib/hub-desktop-update-ssot";
import { useHubToast } from "../toast/HubToastContext";

/** SSOT toast when electron-updater finishes download — every tool gets this for free. */
export function useHubDesktopUpdateToasts(
  desktopUpdate: HubVersionDesktopUpdate | null | undefined,
): void {
  const toast = useHubToast();
  const prevStateRef = useRef(desktopUpdate?.state ?? null);

  useEffect(() => {
    const next = desktopUpdate?.state ?? null;
    const prev = prevStateRef.current;
    if (next === "downloaded" && prev !== "downloaded") {
      toast?.pushToast(
        HUB_DESKTOP_UPDATE_INSTALL_TOAST,
        "info",
        HUB_DESKTOP_UPDATE_INSTALL_TOAST_DURATION_MS,
      );
    }
    prevStateRef.current = next;
  }, [desktopUpdate?.state, toast]);
}
