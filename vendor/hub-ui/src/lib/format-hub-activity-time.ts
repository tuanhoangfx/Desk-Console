import type { HubUsersStatusTone } from "../shell/HubUsersStatusLabel";
import { formatHubTimestampDateOnly } from "./format-hub-timestamp-compact";

export type HubActivityAgeTone = "fresh" | "recent" | "days" | "week" | "stale";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Activity-age SSOT thresholds — 5 buckets (dot colors in hub-users-table.css). */
export const HUB_ACTIVITY_FRESH_MS = HOUR_MS;
export const HUB_ACTIVITY_RECENT_MS = DAY_MS;
export const HUB_ACTIVITY_DAYS_MS = 3 * DAY_MS;
export const HUB_ACTIVITY_WEEK_MS = 7 * DAY_MS;

/** @deprecated Use {@link HUB_ACTIVITY_RECENT_MS} — recent boundary is 24h. */
export const HUB_ACTIVITY_AGING_MS = HUB_ACTIVITY_RECENT_MS;

/** Parse ISO string or epoch ms to activity timestamp. */
export function parseHubActivityMs(at: string | number | null | undefined): number | null {
  if (at == null) return null;
  if (typeof at === "number") {
    return Number.isFinite(at) && at > 0 ? at : null;
  }
  if (!at.trim()) return null;
  const ms = Date.parse(at);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Fresh ≤1h (red) · Recent ≤24h (orange) · Days ≤3d (blue) · Week ≤7d (teal) · Stale >7d (gray).
 */
export function hubActivityAgeTone(ms: number, now = Date.now()): HubActivityAgeTone {
  // Future stamps (date-only → UTC noon skew) treat as fresh — never calendar "dd/mm/yy".
  if (ms > now) return "fresh";
  const age = now - ms;
  if (age <= HUB_ACTIVITY_FRESH_MS) return "fresh";
  if (age <= HUB_ACTIVITY_RECENT_MS) return "recent";
  if (age <= HUB_ACTIVITY_DAYS_MS) return "days";
  if (age <= HUB_ACTIVITY_WEEK_MS) return "week";
  return "stale";
}

export function hubActivityAgeHubTone(tone: HubActivityAgeTone): HubUsersStatusTone {
  if (tone === "fresh") return "age-recent";
  if (tone === "recent") return "age-aging";
  if (tone === "days") return "age-days";
  if (tone === "week") return "age-week";
  return "age-stale";
}

/** Calendar `dd/mm/yy` for ages past the 24h relative window (days / week / stale). */
export function hubActivityAgeUsesCalendarLabel(tone: HubActivityAgeTone): boolean {
  return tone === "days" || tone === "week" || tone === "stale";
}

/** Stale / days / week calendar label — compact `dd/mm/yy`. */
export function formatHubActivityStaleLabel(ms: number): string {
  return formatHubTimestampDateOnly(new Date(ms).toISOString());
}

/** Relative label within the last 24 hours (also supports Nd ago for >24h callers). */
export function formatHubActivityRelativeAge(ms: number, now = Date.now()): string {
  if (ms > now) return "Just now";
  const ageMs = now - ms;
  const ageSec = Math.floor(ageMs / 1000);
  if (ageSec < 60) return "Just now";
  const ageMin = Math.floor(ageSec / 60);
  if (ageMin < 60) return `${ageMin}m ago`;
  const ageHr = Math.floor(ageMin / 60);
  if (ageHr < 24) return `${ageHr}h ago`;
  const ageDay = Math.floor(ageHr / 24);
  return `${ageDay}d ago`;
}

export function formatHubActivityTime(
  at: string | number | null | undefined,
  now = Date.now(),
): {
  label: string;
  tone: HubActivityAgeTone;
  hubTone: HubUsersStatusTone;
} | null {
  const ms = parseHubActivityMs(at);
  if (ms == null) return null;
  const tone = hubActivityAgeTone(ms, now);
  const label = hubActivityAgeUsesCalendarLabel(tone)
    ? formatHubActivityStaleLabel(ms)
    : formatHubActivityRelativeAge(ms, now);
  return { label, tone, hubTone: hubActivityAgeHubTone(tone) };
}

/** @deprecated Use {@link formatHubActivityRelativeAge}. */
export const formatLastOpenedRelativeAge = formatHubActivityRelativeAge;

/** @deprecated Use {@link formatHubActivityStaleLabel}. */
export const formatLastOpenedStaleDate = formatHubActivityStaleLabel;

/** @deprecated Use {@link hubActivityAgeTone}. */
export const lastOpenedAgeTone = hubActivityAgeTone;

/** @deprecated Use {@link hubActivityAgeHubTone}. */
export const lastOpenedHubTone = hubActivityAgeHubTone;
