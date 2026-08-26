import { useEffect, useMemo, useState } from "react";
import {
  applyHubUserZoomPct,
  HUB_USER_ZOOM_MAX,
  HUB_USER_ZOOM_MIN,
  HUB_USER_ZOOM_STEPS,
  hubUserZoomStepIndex,
  readHubUserZoomPct,
} from "../hub-user-zoom";
/** Sidebar footer — one row: label + slider + %. Steps 90 / 100 / 110 / 120 only. */
export function HubUiZoomControl() {
  const [pct, setPct] = useState(readHubUserZoomPct);

  useEffect(() => {
    const sync = () => setPct(readHubUserZoomPct());
    window.addEventListener("hub-user-zoom-change", sync);
    return () => window.removeEventListener("hub-user-zoom-change", sync);
  }, []);

  const fillPct = useMemo(() => {
    const maxIdx = HUB_USER_ZOOM_STEPS.length - 1;
    const idx = hubUserZoomStepIndex(pct);
    return maxIdx > 0 ? (idx / maxIdx) * 100 : 0;
  }, [pct]);

  return (
    <div
      className="hub-ui-zoom-row rounded-lg border border-white/5 bg-white/[0.02] px-2 py-1.5"
      title="Display size: 90%, 100%, 110%, or 120% (saved in this browser)"
    >
      <span className="hub-ui-zoom-row__label shrink-0 text-xs text-[var(--muted)]">Size</span>
      <input
        type="range"
        min={HUB_USER_ZOOM_MIN}
        max={HUB_USER_ZOOM_MAX}
        step={10}
        value={pct}
        aria-label={`Display size ${pct} percent`}
        className="hub-ui-zoom-slider min-w-0 flex-1"
        style={{ ["--hub-zoom-fill" as string]: `${fillPct}%` }}
        onChange={(e) => {
          const next = applyHubUserZoomPct(Number(e.target.value));
          setPct(next);
        }}
      />
      <span className="hub-ui-zoom-row__pct shrink-0 font-mono text-xs tabular-nums text-indigo-200/90">
        {pct}%
      </span>
    </div>
  );
}
