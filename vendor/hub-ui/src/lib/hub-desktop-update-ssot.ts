import { normalizeReleaseNotesVersion } from "./hub-version-release-notes-core";

/** Desktop electron-updater lifecycle — shared by every hub tool release modal. */
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

/** Wire from electron-updater (or mock) into `HubVersionReleaseNotes.desktopUpdate`. */
export type HubVersionDesktopUpdate = {
  state: HubVersionUpdateState;
  /** 0–100 while downloading. */
  progress?: number;
  title?: string;
  disabled?: boolean;
  onAction: () => void;
  /** Remote version from GitHub — drives timeline badge + card highlight. */
  availableVersion?: string | null;
};

export const HUB_DESKTOP_UPDATE_BADGE_LABEL = "Update available";

export const HUB_DESKTOP_UPDATE_INSTALL_TOAST =
  "Update downloaded — open Update Release, tap Install, then restart the app.";

export const HUB_DESKTOP_UPDATE_INSTALL_TOAST_DURATION_MS = 8000;

const DESKTOP_UPDATE_TRIGGER_STATES: ReadonlySet<HubVersionUpdateState> = new Set([
  "available",
  "downloaded",
  "downloading",
  "installing",
  "checking",
  "error",
]);

const DESKTOP_UPDATE_FEED_HIGHLIGHT_STATES: ReadonlySet<HubVersionUpdateState> = new Set([
  "available",
  "downloading",
  "downloaded",
  "installing",
]);

/** True when the desktop updater must own the single header trigger (Download / %). */
export function hubDesktopUpdateOwnsTrigger(state: HubVersionUpdateState): boolean {
  return DESKTOP_UPDATE_TRIGGER_STATES.has(state);
}

/** Opening Update Release should re-query GitHub — changelog "current" ≠ feed latest. */
export function hubDesktopUpdateShouldRecheckOnOpen(
  state: HubVersionUpdateState | null | undefined,
): boolean {
  return state === "latest" || state === "idle" || state === "error";
}

/** Modal header CTA label — Check · Download · Install · Checking · … */
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
      return "Latest";
    case "idle":
    case "dev":
      return state === "dev" ? "Dev" : "Check";
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

export function hubDesktopUpdateIsBusy(state: HubVersionUpdateState): boolean {
  return state === "checking" || state === "downloading" || state === "installing";
}

export function hubDesktopUpdateActionShouldPulse(state: HubVersionUpdateState): boolean {
  return (
    state === "downloaded" ||
    state === "available" ||
    state === "checking" ||
    state === "installing"
  );
}

/** Directory bulk tones — Update modal CTA uses HubBulkActionButton (P0010 Checking SSOT). */
export function hubDesktopUpdateActionBulkTone(
  state: HubVersionUpdateState,
): "indigo" | "amber" | "emerald" | "rose" | "sky" {
  switch (state) {
    case "downloaded":
      return "emerald";
    case "available":
      return "amber";
    case "error":
      return "rose";
    case "checking":
    case "installing":
    case "downloading":
      return "indigo";
    default:
      return "sky";
  }
}

export function hubDesktopUpdateActionToneClass(state: HubVersionUpdateState): string {
  switch (state) {
    case "downloaded":
      return "hub-release-update-action--install";
    case "available":
      return "hub-release-update-action--download";
    case "checking":
    case "installing":
      return "hub-release-update-action--busy";
    case "downloading":
      return "hub-release-update-action--progress";
    case "error":
      return "hub-release-update-action--error";
    case "latest":
      return "hub-release-update-action--latest";
    case "dev":
      return "hub-release-update-action--dev";
    default:
      return "hub-release-update-action--check";
  }
}

/** Timeline row badge + card glow when this feed entry is the pending update. */
export function hubDesktopUpdateHighlightsEntry(
  entryVersion: string,
  entryIndex: number,
  currentVersion: string,
  update: HubVersionDesktopUpdate | null | undefined,
): boolean {
  if (!update || !DESKTOP_UPDATE_FEED_HIGHLIGHT_STATES.has(update.state)) return false;
  const entry = normalizeReleaseNotesVersion(entryVersion);
  const target = normalizeReleaseNotesVersion(update.availableVersion);
  if (target) return entry === target;
  if (entryIndex !== 0) return false;
  const current = normalizeReleaseNotesVersion(currentVersion);
  return Boolean(current && entry && entry !== current);
}

export function hubDesktopUpdateTimelineCardClass(
  entryVersion: string,
  entryIndex: number,
  currentVersion: string,
  update: HubVersionDesktopUpdate | null | undefined,
): string {
  return hubDesktopUpdateHighlightsEntry(entryVersion, entryIndex, currentVersion, update)
    ? " hub-release-timeline-card--update-available"
    : "";
}
