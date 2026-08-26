const STORAGE_KEY = "tool-workspace:user-zoom-pct";
const ZOOM_MIGRATION_KEY = "tool-workspace:zoom-migrated-v2";

/** Discrete UI scale steps only — no values in between. */
export const HUB_USER_ZOOM_STEPS = [90, 100, 110, 120] as const;

export type HubUserZoomPct = (typeof HUB_USER_ZOOM_STEPS)[number];

/** 90% = golden default hub density (P0004); 100% = standard 16px root. */
export const HUB_USER_ZOOM_DEFAULT: HubUserZoomPct = 90;

export const HUB_USER_ZOOM_MIN = HUB_USER_ZOOM_STEPS[0];
export const HUB_USER_ZOOM_MAX = HUB_USER_ZOOM_STEPS[HUB_USER_ZOOM_STEPS.length - 1];

function snapToStep(value: number): HubUserZoomPct {
  let best: HubUserZoomPct = HUB_USER_ZOOM_DEFAULT;
  let bestDist = Infinity;
  for (const step of HUB_USER_ZOOM_STEPS) {
    const d = Math.abs(value - step);
    if (d < bestDist) {
      best = step;
      bestDist = d;
    }
  }
  return best;
}

export function readHubUserZoomPct(): HubUserZoomPct {
  if (typeof window === "undefined") return HUB_USER_ZOOM_DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const legacy = localStorage.getItem("tool-hub:user-zoom-pct");
    const n = raw ? Number(raw) : legacy ? Number(legacy) : HUB_USER_ZOOM_DEFAULT;
    return Number.isFinite(n) ? snapToStep(n) : HUB_USER_ZOOM_DEFAULT;
  } catch {
    return HUB_USER_ZOOM_DEFAULT;
  }
}

export function applyHubUserZoomPct(pct: number): HubUserZoomPct {
  const snapped = snapToStep(pct);
  if (typeof document !== "undefined") {
    document.documentElement.style.setProperty("--hub-user-zoom-pct", String(snapped));
  }
  try {
    localStorage.setItem(STORAGE_KEY, String(snapped));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent("hub-user-zoom-change", { detail: { pct: snapped } }));
  return snapped;
}

/** One-shot: old default 100% (or unset) → golden 90% after HUB_USER_ZOOM_DEFAULT change. */
function migrateZoomDefaultOnce(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem(ZOOM_MIGRATION_KEY) === "1") return false;
    const raw = localStorage.getItem(STORAGE_KEY);
    const legacy = localStorage.getItem("tool-hub:user-zoom-pct");
    const stored = raw ? Number(raw) : legacy ? Number(legacy) : NaN;
    const shouldReset = !Number.isFinite(stored) || stored === 100;
    localStorage.setItem(ZOOM_MIGRATION_KEY, "1");
    if (shouldReset) {
      applyHubUserZoomPct(HUB_USER_ZOOM_DEFAULT);
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

/** Call once on app boot (before paint if possible). */
export function initHubUserZoom() {
  if (!migrateZoomDefaultOnce()) {
    applyHubUserZoomPct(readHubUserZoomPct());
  }
}

export function hubUserZoomStepIndex(pct: HubUserZoomPct): number {
  const i = HUB_USER_ZOOM_STEPS.indexOf(pct);
  return i >= 0 ? i : HUB_USER_ZOOM_STEPS.indexOf(HUB_USER_ZOOM_DEFAULT);
}
