import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Download, RefreshCw } from "lucide-react";
import { compactIconSize } from "../ui-scale";

export type HubVersionUpdateState =
  | "idle"
  | "checking"
  | "latest"
  | "available"
  | "downloading"
  | "downloaded"
  | "installing"
  | "error"
  | "dev";

export type HubVersionUpdateStatusIconProps = {
  state: HubVersionUpdateState;
  /** 0–100 while downloading. */
  progress?: number;
  title?: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
};

/** Desktop electron-updater — fold into HubVersionReleaseNotes, never a second header icon. */
export type HubVersionDesktopUpdate = {
  state: HubVersionUpdateState;
  progress?: number;
  title?: string;
  disabled?: boolean;
  onAction: () => void;
};

const DESKTOP_UPDATE_TRIGGER_STATES: ReadonlySet<HubVersionUpdateState> = new Set([
  "available",
  "downloaded",
  "downloading",
  "installing",
  "checking",
  "error",
]);

/** True when the desktop updater must own the single header trigger (Download / %). */
export function hubDesktopUpdateOwnsTrigger(state: HubVersionUpdateState): boolean {
  return DESKTOP_UPDATE_TRIGGER_STATES.has(state);
}

/** Opening Update Release should re-query GitHub — changelog "current" ≠ feed latest. */
export function hubDesktopUpdateShouldRecheckOnOpen(state: HubVersionUpdateState | null | undefined): boolean {
  return state === "latest" || state === "idle" || state === "error";
}

/** Modal / chip action — always visible on desktop (old StealthHeaderUpdateButton). */
export function hubDesktopUpdateActionLabel(
  state: HubVersionUpdateState,
  progress?: number,
): string | null {
  switch (state) {
    case "available":
      return "Download";
    case "downloaded":
      return "Install";
    case "error":
      return "Retry";
    case "downloading":
      return `${Math.round(progress ?? 0)}%`;
    case "checking":
      return "Checking";
    case "installing":
      return "Installing";
    case "latest":
    case "idle":
      return "Check";
    default:
      return null;
  }
}

/** Header chip text — same words as pre-1.1.7 `StealthHeaderUpdateButton`. */
export function hubDesktopUpdateChromeLabel(
  state: HubVersionUpdateState,
  progress?: number,
): string | null {
  if (state === "dev") return "Dev";
  if (state === "latest") return "Latest";
  if (state === "idle") return "Update";
  return hubDesktopUpdateActionLabel(state, progress);
}

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
  const busy = state === "checking" || state === "downloading" || state === "installing";
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
