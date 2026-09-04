import type { ReactNode } from "react";

import { AlertTriangle, CheckCircle2, Download, RefreshCw } from "lucide-react";

import { compactIconSize } from "../ui-scale";

import {

  hubDesktopUpdateIsBusy,

  type HubVersionDesktopUpdate,

  type HubVersionUpdateState,

} from "../lib/hub-desktop-update-ssot";



export type {

  HubVersionDesktopUpdate,

  HubVersionUpdateState,

} from "../lib/hub-desktop-update-ssot";



export {

  HUB_DESKTOP_UPDATE_BADGE_LABEL,

  HUB_DESKTOP_UPDATE_INSTALL_TOAST,

  HUB_DESKTOP_UPDATE_INSTALL_TOAST_DURATION_MS,

  hubDesktopUpdateActionLabel,

  hubDesktopUpdateActionBulkTone,

  hubDesktopUpdateActionShouldPulse,

  hubDesktopUpdateActionToneClass,

  hubDesktopUpdateChromeLabel,

  hubDesktopUpdateHighlightsEntry,

  hubDesktopUpdateIsBusy,

  hubDesktopUpdateOwnsTrigger,

  hubDesktopUpdateShouldRecheckOnOpen,

  hubDesktopUpdateTimelineCardClass,

} from "../lib/hub-desktop-update-ssot";



export {

  HubReleaseUpdateActionButton,

  HubReleaseUpdateAvailableBadge,

  HubReleaseUpdateProgressRing,

} from "./HubDesktopUpdateChrome";



export type HubVersionUpdateStatusIconProps = {

  state: HubVersionUpdateState;

  /** 0–100 while downloading. */

  progress?: number;

  title?: string;

  onClick?: () => void;

  disabled?: boolean;

  className?: string;

};



function iconForState(state: HubVersionUpdateState, busy: boolean, progress?: number): ReactNode {

  const size = compactIconSize(13);

  if (state === "latest") {

    return <CheckCircle2 size={size} className="shrink-0 text-emerald-400" aria-hidden />;

  }

  if (state === "error") {

    return <AlertTriangle size={size} className="shrink-0 text-rose-400" aria-hidden />;

  }

  if (state === "available" || state === "downloaded") {

    return <Download size={size} className="shrink-0 text-amber-300" aria-hidden />;

  }

  if (state === "downloading") {

    return (

      <span className="tabular-nums text-[10px] font-semibold text-indigo-200" aria-hidden>

        {Math.round(progress ?? 0)}%

      </span>

    );

  }

  return (

    <RefreshCw

      size={size}

      className={`shrink-0 text-[var(--muted)] ${state === "checking" || busy ? "animate-spin text-indigo-300" : ""}`}

      aria-hidden

    />

  );

}



/**

 * Icon-only version / update status — sits beside header version meta (not next to Notify/Log).

 * Desktop tools wire electron-updater; web tools can map bundle freshness → latest | available.

 */

export function HubVersionUpdateStatusIcon({

  state,

  progress,

  title,

  onClick,

  disabled = false,

  className = "",

}: HubVersionUpdateStatusIconProps) {

  const busy = hubDesktopUpdateIsBusy(state);

  const resolvedTitle =

    title ||

    (state === "latest"

      ? "You are using the latest version"

      : state === "available"

        ? "New version available"

        : state === "error"

          ? "Update check failed"

          : "Version status");

  const interactive = Boolean(onClick) && !disabled && state !== "dev";



  if (interactive) {

    return (

      <button

        type="button"

        onClick={onClick}

        disabled={disabled || busy}

        className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-65 ${className}`}

        title={resolvedTitle}

        aria-label={resolvedTitle}

      >

        {iconForState(state, busy, progress)}

      </button>

    );

  }



  return (

    <span

      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center ${className}`}

      title={resolvedTitle}

      aria-label={resolvedTitle}

    >

      {iconForState(state, busy, progress)}

    </span>

  );

}


