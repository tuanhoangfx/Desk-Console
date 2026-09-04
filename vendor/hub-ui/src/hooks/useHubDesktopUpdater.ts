import { useCallback, useEffect, useMemo, useState } from "react";
import {
  hubDesktopUpdateActionLabel,
  type HubVersionDesktopUpdate,
  type HubVersionUpdateState,
} from "../lib/hub-desktop-update-ssot";

const UPDATE_STATES: ReadonlySet<HubVersionUpdateState> = new Set([
  "idle",
  "dev",
  "checking",
  "latest",
  "available",
  "downloading",
  "downloaded",
  "installing",
  "error",
]);

export type HubDesktopUpdateBridgeStatus = {
  state?: string;
  message?: string;
  updateVersion?: string;
  /** Stealth / installer runtime — enables auto-download when `autoDownloadWhenInstaller` is set. */
  runtime?: string;
  progress?: { percent?: number } | null;
};

export type HubDesktopUpdaterOptions = {
  /** Stealth SSOT: download immediately when `state=available` and `runtime=installer`. */
  autoDownloadWhenInstaller?: boolean;
};

/** Minimal preload bridge every desktop tool exposes to the renderer. */
export type HubDesktopUpdateBridge = {
  getUpdateStatus?: () => Promise<HubDesktopUpdateBridgeStatus>;
  checkForUpdates?: () => Promise<HubDesktopUpdateBridgeStatus | void>;
  downloadUpdate?: () => Promise<HubDesktopUpdateBridgeStatus | void>;
  installUpdate?: () => Promise<HubDesktopUpdateBridgeStatus | void>;
  onUpdateStatus?: (callback: (status: HubDesktopUpdateBridgeStatus) => void) => () => void;
};

function normalizeUpdateState(raw: string | undefined): HubVersionUpdateState {
  if (raw && UPDATE_STATES.has(raw as HubVersionUpdateState)) {
    return raw as HubVersionUpdateState;
  }
  return "idle";
}

/**
 * SSOT renderer hook — maps electron preload bridge → `HubVersionReleaseNotes.desktopUpdate`.
 * Tools only supply `bridge` (e.g. `window.videoLab`); UI/toast/badge stay in hub-ui.
 */
export function useHubDesktopUpdater(
  bridge: HubDesktopUpdateBridge | null | undefined,
  options?: HubDesktopUpdaterOptions,
): HubVersionDesktopUpdate | null {
  const autoDownloadWhenInstaller = Boolean(options?.autoDownloadWhenInstaller);
  const [status, setStatus] = useState<HubDesktopUpdateBridgeStatus | null>(null);
  const [hasBridge, setHasBridge] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const api = bridge;
    setHasBridge(Boolean(api?.getUpdateStatus));
    if (!api?.getUpdateStatus) return;

    const applyStatus = (next: HubDesktopUpdateBridgeStatus) => {
      setStatus(next);
      if (
        autoDownloadWhenInstaller &&
        next.state === "available" &&
        next.runtime === "installer" &&
        api.downloadUpdate
      ) {
        void api.downloadUpdate().then((next) => {
          if (next) setStatus(next);
        }).catch(() => {});
      }
    };

    void api.getUpdateStatus().then(applyStatus).catch(() => {});
    return api.onUpdateStatus?.(applyStatus);
  }, [autoDownloadWhenInstaller, bridge]);

  const currentState = normalizeUpdateState(status?.state);
  const progress = Math.round(status?.progress?.percent ?? 0);
  const availableVersion = status?.updateVersion?.trim() || null;
  const title =
    status?.message ||
    (currentState === "available"
      ? "New version available"
      : currentState === "latest"
        ? "You are using the latest version"
        : hubDesktopUpdateActionLabel(currentState) || "Check for updates");

  const disabled =
    busy ||
    currentState === "checking" ||
    currentState === "downloading" ||
    currentState === "installing" ||
    currentState === "dev";

  const onAction = useCallback(async () => {
    const api = bridge;
    if (!api || disabled) return;
    setBusy(true);
    try {
      const next =
        currentState === "available"
          ? await api.downloadUpdate?.()
          : currentState === "downloaded"
            ? await api.installUpdate?.()
            : await api.checkForUpdates?.();
      if (next && typeof next === "object") setStatus(next);
    } finally {
      if (currentState !== "downloaded") setBusy(false);
    }
  }, [bridge, currentState, disabled]);

  return useMemo(() => {
    if (!hasBridge) return null;
    return {
      state: currentState,
      progress,
      title,
      disabled,
      availableVersion,
      onAction,
    };
  }, [availableVersion, currentState, disabled, hasBridge, onAction, progress, title]);
}
