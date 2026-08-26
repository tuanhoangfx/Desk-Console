import { HubActivityTimestampLabel } from "../content/HubActivityTimestampLabel";
import { parseHubActivityMs } from "../lib/format-hub-activity-time";
import { formatHubTimestampFull } from "../lib/format-hub-timestamp-compact";

export type HubAdmPlainRelativeTimeProps = {
  /** ISO timestamp — activity dot + relative (≤24h) or `dd/mm/yy`. */
  at?: string | null;
  className?: string;
  emptyLabel?: string;
};

/**
 * Detail-record metadata timestamp — Hub activity SSOT.
 * Age-colored status dot (same as directory Update). No Lucide clock.
 * Hover = full timestamp.
 */
export function HubAdmPlainRelativeTime({
  at,
  className = "hub-adm-plain-time",
  emptyLabel = "—",
}: HubAdmPlainRelativeTimeProps) {
  const ms = parseHubActivityMs(at);
  if (ms == null) return <span className={className}>{emptyLabel}</span>;
  const title = formatHubTimestampFull(at) || new Date(ms).toLocaleString();

  return (
    <span className={className} title={title}>
      <HubActivityTimestampLabel
        at={at}
        variant="detail"
        directoryTypography={false}
        fallback={emptyLabel}
      />
    </span>
  );
}
