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

/** Inline style only when zoom ≠ CSS default — avoids Next.js `<html>` hydration drift. */
export function syncHubUserZoomDom(snapped: HubUserZoomPct): void {
  if (typeof document === "undefined") return;
  if (snapped === HUB_USER_ZOOM_DEFAULT) {
    document.documentElement.style.removeProperty("--hub-user-zoom-pct");
  } else {
    document.documentElement.style.setProperty("--hub-user-zoom-pct", String(snapped));
  }
}

export function applyHubUserZoomPct(pct: number): HubUserZoomPct {
  const snapped = snapToStep(pct);
  syncHubUserZoomDom(snapped);
  try {
    localStorage.setItem(STORAGE_KEY, String(snapped));
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hub-user-zoom-change", { detail: { pct: snapped } }));
  }
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

/**
 * Blocking boot script for Next.js `<html>` — apply stored zoom before React hydrates.
 * Pair with `suppressHydrationWarning` on `<html>` when non-default zoom is possible.
 */
export function hubUserZoomBootScript(): string {
  const steps = HUB_USER_ZOOM_STEPS.join(",");
  const def = HUB_USER_ZOOM_DEFAULT;
  return `(function(){try{var k=${JSON.stringify(STORAGE_KEY)},lk="tool-hub:user-zoom-pct",s=[${steps}],d=${def},r=localStorage.getItem(k),l=localStorage.getItem(lk),n=r?Number(r):l?Number(l):d;if(!Number.isFinite(n))n=d;var b=s[0],bd=1/0;for(var i=0;i<s.length;i++){var t=Math.abs(n-s[i]);if(t<bd){b=s[i];bd=t;}}if(b!==d)document.documentElement.style.setProperty("--hub-user-zoom-pct",String(b));}catch(e){}})();`;
}

export function hubUserZoomStepIndex(pct: HubUserZoomPct): number {
  const i = HUB_USER_ZOOM_STEPS.indexOf(pct);
  return i >= 0 ? i : HUB_USER_ZOOM_STEPS.indexOf(HUB_USER_ZOOM_DEFAULT);
}
