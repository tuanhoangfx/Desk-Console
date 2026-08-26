import { HubDirectoryEmptyCell, isDirectoryEmptyLabel } from "../lib/directory-empty-label";
import { HubUsersStatusLabel } from "../shell/HubUsersStatusLabel";
import { HUB_DIRECTORY_TIMESTAMP_CLASS } from "../lib/hub-directory-timestamp";
import {
  hubActivityAgeHubTone,
  hubActivityAgeTone,
  parseHubActivityMs,
} from "../lib/format-hub-activity-time";
import {
  formatHubDirectoryDateCompact,
} from "../lib/format-hub-timestamp-compact";
import { useRelativeNow } from "../lib/use-relative-now";
import { HubActivityTimestampLabel } from "./HubActivityTimestampLabel";

export type HubDirectoryCompactTimestampLabelProps = {
  /** ISO string or epoch ms. */
  at?: string | number | null;
  fallback?: React.ReactNode;
  /** @deprecated Body cells use no hover tooltip — header hints only. */
  title?: string;
  className?: string;
};

/** Directory date column — age dot + compact `dd/mm hh:mm` + typography SSOT. No cell tooltip. */
export function HubDirectoryCompactTimestampLabel({
  at,
  fallback = <HubDirectoryEmptyCell />,
  className = "",
}: HubDirectoryCompactTimestampLabelProps) {
  const now = useRelativeNow();
  const ms = parseHubActivityMs(at);
  if (ms == null) return <>{fallback}</>;

  const tone = hubActivityAgeTone(ms, now);
  const iso = typeof at === "string" ? at : new Date(ms).toISOString();
  const label = formatHubDirectoryDateCompact(iso) || "";
  if (isDirectoryEmptyLabel(label)) return <>{fallback}</>;

  return (
    <span className={`${HUB_DIRECTORY_TIMESTAMP_CLASS}${className ? ` ${className}` : ""}`}>
      <HubUsersStatusLabel
        label={label}
        tone={hubActivityAgeHubTone(tone)}
        capitalize={false}
      />
    </span>
  );
}

/** Directory table timestamp — relative age + dot (no cell tooltip). */
export const HubDirectoryTimestampLabel = HubActivityTimestampLabel;
