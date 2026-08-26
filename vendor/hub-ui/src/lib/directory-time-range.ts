import { useEffect, useState } from "react";
import type { TimeRange } from "../display-prefs/constants";
import { getHubUrlPrefsDefaults, HUB_LIST_PREFS_CHANGE_EVENT, readHubListPrefsCore } from "./hub-url-prefs";

function dayBounds(offsetDays = 0) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + offsetDays);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { start: start.getTime(), end: end.getTime() };
}

/** URL `range` for directory toolbars — explicit prop or live prefs. */
export function resolveDirectoryTimeRange(explicit?: TimeRange): TimeRange {
  if (explicit) return explicit;
  if (typeof window !== "undefined") return readHubListPrefsCore().range;
  return getHubUrlPrefsDefaults().defaultRange;
}

/** Live URL `range` — re-read on popstate / prefs change. */
export function useDirectoryTimeRange(explicit?: TimeRange): TimeRange {
  const [range, setRange] = useState(() => resolveDirectoryTimeRange(explicit));
  useEffect(() => {
    const sync = () => setRange(resolveDirectoryTimeRange(explicit));
    window.addEventListener("popstate", sync);
    window.addEventListener(HUB_LIST_PREFS_CHANGE_EVENT, sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener(HUB_LIST_PREFS_CHANGE_EVENT, sync);
    };
  }, [explicit]);
  return range;
}

/** Normalize API epoch (s or ms) or ISO string for directory period filter. */
export function directoryActivityIso(value: string | number | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) return null;
    const ms = value < 1e12 ? value * 1000 : value;
    return new Date(ms).toISOString();
  }
  const s = value.trim();
  return s || null;
}

/** Filter row by activity timestamp — accepts ISO or epoch (P0016 bots/groups). */
export function matchesDirectoryActivityAt(
  activityAt: string | number | null | undefined,
  range: TimeRange,
  opts?: { staticAlwaysVisible?: boolean },
): boolean {
  return matchesDirectoryTimeRange(directoryActivityIso(activityAt), range, opts);
}

export function matchesDirectoryTimeRange(
  activityAt: string | null | undefined,
  range: TimeRange,
  opts?: { staticAlwaysVisible?: boolean },
): boolean {
  if (range === "all") return true;
  if (!activityAt?.trim()) return opts?.staticAlwaysVisible ?? false;
  const at = new Date(activityAt).getTime();
  if (Number.isNaN(at)) return opts?.staticAlwaysVisible ?? false;

  const now = Date.now();
  if (range === "today") {
    const { start, end } = dayBounds(0);
    return at >= start && at <= end;
  }
  if (range === "yesterday") {
    const { start, end } = dayBounds(-1);
    return at >= start && at <= end;
  }
  const days: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 };
  const d = days[range];
  if (d) return at >= now - d * 86400000;
  return true;
}
