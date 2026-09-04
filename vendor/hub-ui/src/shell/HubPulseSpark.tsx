import { useId } from "react";
import {
  createHubTimeSeriesAreaPath,
  createHubTimeSeriesLinePath,
  hubTimeSeriesGaussianSmooth,
  hubTimeSeriesPlotPoints,
  resolveHubTimeSeriesAxisMax,
} from "../lib/hub-time-series-line";

type Props = {
  values: readonly number[];
  /** P0015 Revenue pulse — cyan. */
  color?: string;
  title?: string;
  className?: string;
  showPeak?: boolean;
};

const W = 120;
const H = 28;
const PAD = { l: 3, r: 4, t: 5, b: 3 };

/** Compact glow pulse spark — P0015 KPI / Revenue & Cost line, not MiniSparkline bars. */
export function HubPulseSpark({
  values,
  color = "#22d3ee",
  title,
  className = "",
  showPeak = true,
}: Props) {
  const gid = useId().replace(/:/g, "");
  const series = hubTimeSeriesGaussianSmooth(values.length ? values : [0]);
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const max = resolveHubTimeSeriesAxisMax(series, 1);
  const innerPts = hubTimeSeriesPlotPoints(series, innerW, innerH, max);
  const pts = innerPts.map((p) => ({ x: p.x + PAD.l, y: p.y + PAD.t }));
  const line = createHubTimeSeriesLinePath(pts, "smooth");
  const area = createHubTimeSeriesAreaPath(pts, H - PAD.b, "smooth");
  const peakAt = series.reduce((best, value, index) => (value > series[best]! ? index : best), 0);
  const peak = pts[peakAt];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={`hub-pulse-spark block h-full w-full overflow-visible ${className}`.trim()}
      preserveAspectRatio="none"
      role="img"
      aria-label={title ?? "Pulse"}
    >
      <title>{title}</title>
      <defs>
        <linearGradient id={`hub-pulse-fill-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="55%" stopColor={color} stopOpacity="0.08" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`hub-pulse-line-${gid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
        <filter id={`hub-pulse-glow-${gid}`} x="-20%" y="-40%" width="140%" height="180%">
          <feGaussianBlur stdDeviation="0.7" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {area ? <path d={area} fill={`url(#hub-pulse-fill-${gid})`} /> : null}
      {line ? (
        <>
          <path
            d={line}
            fill="none"
            stroke={`url(#hub-pulse-line-${gid})`}
            strokeWidth="1.65"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity="0.22"
            filter={`url(#hub-pulse-glow-${gid})`}
          />
          <path
            d={line}
            fill="none"
            stroke={`url(#hub-pulse-line-${gid})`}
            strokeWidth="1.15"
            strokeLinejoin="round"
            strokeLinecap="round"
            filter={`url(#hub-pulse-glow-${gid})`}
          />
        </>
      ) : null}
      {showPeak && peak ? (
        <circle
          cx={peak.x}
          cy={peak.y}
          r="1.85"
          fill="#ecfeff"
          stroke={color}
          strokeWidth="0.9"
        />
      ) : null}
    </svg>
  );
}
