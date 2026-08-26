import {
  formatHubActivityRelativeAge,
  formatHubActivityStaleLabel,
  hubActivityAgeHubTone,
  hubActivityAgeTone,
  hubActivityAgeUsesCalendarLabel,
  parseHubActivityMs,
} from "../lib/format-hub-activity-time";
import { formatHubTimestampFull } from "../lib/format-hub-timestamp-compact";
import { useRelativeNow } from "../lib/use-relative-now";

function metaActivityDotClass(hubTone: ReturnType<typeof hubActivityAgeHubTone>): string {
  if (hubTone === "age-fresh") return "bg-[var(--hub-activity-age-fresh)]";
  if (hubTone === "age-recent") return "bg-[var(--hub-activity-age-recent)]";
  if (hubTone === "age-aging") return "bg-[var(--hub-activity-age-aging)]";
  if (hubTone === "age-days") return "bg-[var(--hub-activity-age-days)]";
  if (hubTone === "age-week") return "bg-[var(--hub-activity-age-week)]";
  return "bg-[var(--hub-activity-age-stale)]";
}

export type HubChromeActivityAgeProps = {
  /** ISO string or epoch ms. */
  at: string | number;
  className?: string;
};

/**
 * Hub header chrome activity age — same scale as version meta (`vX.Y.Z` · dot · `2h ago`).
 * SSOT for AppTabHeader + Update Release modal. Never use HubUsersStatusLabel (10px table).
 */
export function HubChromeActivityAge({ at, className = "" }: HubChromeActivityAgeProps) {
  const now = useRelativeNow();
  const ms = parseHubActivityMs(at);
  if (ms == null) return null;

  const ageTone = hubActivityAgeTone(ms, now);
  const hubTone = hubActivityAgeHubTone(ageTone);
  const label = hubActivityAgeUsesCalendarLabel(ageTone)
    ? formatHubActivityStaleLabel(ms)
    : formatHubActivityRelativeAge(ms, now);
  const resolvedTitle =
    formatHubTimestampFull(typeof at === "string" ? at : new Date(ms).toISOString()) ||
    new Date(ms).toLocaleString();

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`.trim()}>
      <span
        className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${metaActivityDotClass(hubTone)}`}
        aria-hidden
      />
      <span className="tabular-nums text-[var(--text)]/90" title={resolvedTitle}>
        {label}
      </span>
    </span>
  );
}
