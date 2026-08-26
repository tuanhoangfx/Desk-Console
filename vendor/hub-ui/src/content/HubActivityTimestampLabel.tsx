import { HubDirectoryEmptyCell } from "../lib/directory-empty-label";
import { HubUsersStatusLabel } from "../shell/HubUsersStatusLabel";
import { HUB_DIRECTORY_TIMESTAMP_CLASS } from "../lib/hub-directory-timestamp";
import {
  formatHubActivityRelativeAge,
  formatHubActivityStaleLabel,
  hubActivityAgeHubTone,
  hubActivityAgeTone,
  hubActivityAgeUsesCalendarLabel,
  parseHubActivityMs,
} from "../lib/format-hub-activity-time";
import { useRelativeNow } from "../lib/use-relative-now";

export type HubActivityTimestampLabelProps = {
  /** ISO string or epoch ms. */
  at?: string | number | null;
  fallback?: React.ReactNode;
  /** @deprecated Body cells use no hover tooltip — header hints only. */
  title?: string;
  /** When true (default), applies directory timestamp typography SSOT. */
  directoryTypography?: boolean;
  /** Detail meta uses ADM field size; directory tables keep compact 10px chrome. */
  variant?: "compact" | "detail";
  className?: string;
};

/** Activity timestamp — colored dot + relative age (≤24h) or `dd/mm/yy` when older. No cell tooltip. */
export function HubActivityTimestampLabel({
  at,
  fallback = <HubDirectoryEmptyCell />,
  directoryTypography = true,
  variant = "compact",
  className = "",
}: HubActivityTimestampLabelProps) {
  const now = useRelativeNow();
  const ms = parseHubActivityMs(at);
  if (ms == null) return <>{fallback}</>;

  const tone = hubActivityAgeTone(ms, now);
  const label = hubActivityAgeUsesCalendarLabel(tone)
    ? formatHubActivityStaleLabel(ms)
    : formatHubActivityRelativeAge(ms, now);

  const inner = (
    <HubUsersStatusLabel
      label={label}
      tone={hubActivityAgeHubTone(tone)}
      capitalize={false}
      variant={variant}
    />
  );

  if (!directoryTypography) return inner;

  return (
    <span className={`${HUB_DIRECTORY_TIMESTAMP_CLASS}${className ? ` ${className}` : ""}`}>
      {inner}
    </span>
  );
}
