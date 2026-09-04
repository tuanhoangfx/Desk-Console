import type { LucideIcon } from "lucide-react";
import { CheckCircle2, Download, RefreshCw } from "lucide-react";
import { compactIconSize } from "../ui-scale";
import { HUB_RELEASE_CHIP_CLASS } from "../lib/hub-release-chip-ssot";
import {
  HUB_DESKTOP_UPDATE_BADGE_LABEL,
  hubDesktopUpdateActionShouldPulse,
  hubDesktopUpdateActionToneClass,
  hubDesktopUpdateIsBusy,
  type HubVersionUpdateState,
} from "../lib/hub-desktop-update-ssot";

/** Circular download progress — release modal header CTA SSOT. */
export function HubReleaseUpdateProgressRing({ progress }: { progress: number }) {
  const pct = Math.min(100, Math.max(0, Math.round(progress)));
  const radius = 7;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  return (
    <span className="hub-release-update-progress-ring" aria-hidden>
      <svg viewBox="0 0 18 18" width={14} height={14} className="hub-release-update-progress-ring__svg">
        <circle className="hub-release-update-progress-ring__track" cx="9" cy="9" r={radius} />
        <circle
          className="hub-release-update-progress-ring__fill"
          cx="9"
          cy="9"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="hub-release-update-progress-ring__label tabular-nums">{pct}</span>
    </span>
  );
}

/** Timeline card badge when GitHub has a newer build than the running app. */
export function HubReleaseUpdateAvailableBadge() {
  return (
    <span className={`${HUB_RELEASE_CHIP_CLASS} hub-release-update-available-badge`}>
      <Download size={compactIconSize(12)} className="shrink-0" aria-hidden />
      <span>{HUB_DESKTOP_UPDATE_BADGE_LABEL}</span>
    </span>
  );
}

function resolveReleaseUpdateIcon(state: HubVersionUpdateState, Icon: LucideIcon): LucideIcon {
  if (state === "available" || state === "downloaded") return Icon;
  if (state === "latest") return CheckCircle2;
  return RefreshCw;
}

/** Release modal header CTA — compact chip (P0010 SSOT, same scale as kind badge). */
export function HubReleaseUpdateActionButton({
  state,
  label,
  icon: Icon,
  progress = 0,
  disabled = false,
  onClick,
}: {
  state: HubVersionUpdateState;
  label: string;
  icon: LucideIcon;
  progress?: number;
  disabled?: boolean;
  onClick: () => void;
}) {
  const busy = hubDesktopUpdateIsBusy(state);
  const pulse = hubDesktopUpdateActionShouldPulse(state) && state !== "downloading";
  const showRing = state === "downloading";
  const Glyph = resolveReleaseUpdateIcon(state, Icon);
  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`${HUB_RELEASE_CHIP_CLASS} hub-release-update-action ${hubDesktopUpdateActionToneClass(state)}${
        pulse ? " is-pulse" : ""
      }${busy ? " is-busy" : ""}${showRing ? " has-progress-ring" : ""}`}
    >
      {showRing ? (
        <HubReleaseUpdateProgressRing progress={progress} />
      ) : (
        <Glyph size={compactIconSize(12)} className="hub-release-update-action__icon shrink-0" aria-hidden />
      )}
      <span className="hub-release-update-action__label">{label}</span>
    </button>
  );
}
