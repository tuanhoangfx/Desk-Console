import { useId, useMemo, useState, type HTMLAttributes } from "react";
import { HUB_DIRECTORY_TOOLBAR_TYPO_CLASS } from "./hub-typography";
import {
  createHubTimeSeriesAreaPath,
  createHubTimeSeriesLinePath,
  hubTimeSeriesPlotPoints,
  pickHubTimeSeriesLabelIndexes,
  resolveHubTimeSeriesAxisMax,
  type HubTimeSeriesCurve,
} from "../lib/hub-time-series-line";

export type HubTimeSeriesLinePoint = {
  key: string;
  label: string;
  left: number;
  right?: number;
  leftMark?: boolean;
  rightMark?: boolean;
};

export type HubTimeSeriesLineChartProps = {
  points: readonly HubTimeSeriesLinePoint[];
  caption?: string;
  captionEmoji?: string;
  leftName: string;
  rightName?: string;
  leftColor?: string;
  rightColor?: string;
  leftFloor?: number;
  rightFloor?: number;
  formatLeftTick?: (value: number) => string;
  formatRightTick?: (value: number) => string;
  formatLeftValue?: (value: number) => string;
  formatRightValue?: (value: number) => string;
  hoverTitle?: (point: HubTimeSeriesLinePoint) => string;
  /** `smooth` = Catmull-Rom (P0015 Dashboard Revenue & Cost). Default linear (P0012). */
  curve?: HubTimeSeriesCurve;
  maxLabels?: number;
  className?: string;
  /** Extra attrs on HTML axes (P0012 smoke: `data-p0012-chart-axis`). */
  leftAxisProps?: HTMLAttributes<HTMLDivElement> & Record<`data-${string}`, string | undefined>;
  rightAxisProps?: HTMLAttributes<HTMLDivElement> & Record<`data-${string}`, string | undefined>;
  datesAxisProps?: HTMLAttributes<HTMLDivElement> & Record<`data-${string}`, string | undefined>;
};

const Y_FRACS = [1, 0.75, 0.5, 0.25, 0] as const;
const PLOT_W = 1000;
const PLOT_H = 120;
const AXIS_TYPO = `${HUB_DIRECTORY_TOOLBAR_TYPO_CLASS} tabular-nums leading-none`;

function defaultTick(value: number): string {
  return String(Math.round(value));
}

function defaultValue(value: number): string {
  return Number.isFinite(value) ? String(value) : "0";
}

/**
 * P0012 Performance Chart — HTML Y/X ticks (never SVG text), continuous 0-line, dual series.
 */
export function HubTimeSeriesLineChart({
  points,
  caption,
  captionEmoji = "📈",
  leftName,
  rightName,
  leftColor = "#38bdf8",
  rightColor = "#34d399",
  leftFloor = 1,
  rightFloor = 1,
  formatLeftTick = defaultTick,
  formatRightTick = defaultTick,
  formatLeftValue = defaultValue,
  formatRightValue = defaultValue,
  hoverTitle,
  curve = "linear",
  maxLabels = 8,
  className = "",
  leftAxisProps,
  rightAxisProps,
  datesAxisProps,
}: HubTimeSeriesLineChartProps) {
  const gid = useId().replace(/:/g, "");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const showRight = Boolean(rightName);
  const leftValues = useMemo(() => points.map((p) => p.left), [points]);
  const rightValues = useMemo(() => points.map((p) => p.right ?? 0), [points]);
  const maxLeft = resolveHubTimeSeriesAxisMax(leftValues, leftFloor);
  const maxRight = resolveHubTimeSeriesAxisMax(rightValues, rightFloor);
  const labelIdx = useMemo(
    () => pickHubTimeSeriesLabelIndexes(points.length, maxLabels),
    [maxLabels, points.length],
  );
  const leftPts = hubTimeSeriesPlotPoints(leftValues, PLOT_W, PLOT_H, maxLeft);
  const rightPts = hubTimeSeriesPlotPoints(rightValues, PLOT_W, PLOT_H, maxRight);
  const hover = hoverIdx != null ? points[hoverIdx] : null;
  const hoverX = hoverIdx != null ? leftPts[hoverIdx]?.x : null;

  return (
    <div className={`hub-time-series-line flex min-h-0 w-full min-w-0 flex-1 flex-col ${className}`.trim()}>
      <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2">
        {caption ? (
          <span className={`${HUB_DIRECTORY_TOOLBAR_TYPO_CLASS} inline-flex items-center gap-1.5 text-[var(--text)]`}>
            <span className="leading-none" aria-hidden>
              {captionEmoji}
            </span>
            {caption}
          </span>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-3">
          <span className={`${HUB_DIRECTORY_TOOLBAR_TYPO_CLASS} inline-flex items-center gap-1.5 text-[var(--muted)]`}>
            <span className="inline-block h-0.5 w-2.5 rounded-full" style={{ background: leftColor }} aria-hidden />
            {leftName}
          </span>
          {showRight ? (
            <span className={`${HUB_DIRECTORY_TOOLBAR_TYPO_CLASS} inline-flex items-center gap-1.5 text-[var(--muted)]`}>
              <span className="inline-block h-0.5 w-2.5 rounded-full" style={{ background: rightColor }} aria-hidden />
              {rightName}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex min-h-0 w-full flex-1 flex-col overflow-visible">
        <div className="flex min-h-0 w-full flex-1 items-stretch gap-1.5">
          <div
            data-hub-chart-axis="left"
            className={`flex w-8 shrink-0 flex-col justify-between text-right ${AXIS_TYPO} text-[var(--muted)]`}
            aria-hidden
            {...leftAxisProps}
          >
            {Y_FRACS.map((v) => (
              <span key={`l-${v}`}>{formatLeftTick(v * maxLeft)}</span>
            ))}
          </div>

          <div className="relative min-h-0 min-w-0 flex-1">
            <svg
              viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}
              className="block h-auto w-full"
              role="img"
              aria-label={`${leftName}${showRight ? ` and ${rightName}` : ""} over time`}
            >
              <defs>
                <linearGradient id={`hub-ts-left-${gid}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={leftColor} stopOpacity="0.22" />
                  <stop offset="100%" stopColor={leftColor} stopOpacity="0" />
                </linearGradient>
                {showRight ? (
                  <linearGradient id={`hub-ts-right-${gid}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={rightColor} stopOpacity="0.18" />
                    <stop offset="100%" stopColor={rightColor} stopOpacity="0" />
                  </linearGradient>
                ) : null}
              </defs>
              {Y_FRACS.map((v) => (
                <line
                  key={`grid-${v}`}
                  x1={0}
                  y1={(1 - v) * PLOT_H}
                  x2={PLOT_W}
                  y2={(1 - v) * PLOT_H}
                  stroke="rgba(255,255,255,0.045)"
                  strokeWidth="1"
                />
              ))}
              <path d={createHubTimeSeriesAreaPath(leftPts, PLOT_H, curve)} fill={`url(#hub-ts-left-${gid})`} />
              {showRight ? (
                <path d={createHubTimeSeriesAreaPath(rightPts, PLOT_H, curve)} fill={`url(#hub-ts-right-${gid})`} />
              ) : null}
              <path
                d={createHubTimeSeriesLinePath(leftPts, curve)}
                fill="none"
                stroke={leftColor}
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {showRight ? (
                <path
                  d={createHubTimeSeriesLinePath(rightPts, curve)}
                  fill="none"
                  stroke={rightColor}
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}
              {hoverX != null ? (
                <line
                  x1={hoverX}
                  y1={0}
                  x2={hoverX}
                  y2={PLOT_H}
                  stroke="rgba(148,163,184,0.35)"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
              ) : null}
              {points.map((point, i) => {
                const lp = leftPts[i]!;
                const rp = rightPts[i]!;
                const isActive = hoverIdx === i;
                const step = PLOT_W / Math.max(1, points.length);
                return (
                  <g key={point.key}>
                    {(point.leftMark || point.left > 0 || isActive) && (
                      <circle cx={lp.x} cy={lp.y} r={isActive ? 3.5 : 1.75} fill={leftColor} />
                    )}
                    {showRight && (point.rightMark || (point.right ?? 0) > 0 || isActive) ? (
                      <circle cx={rp.x} cy={rp.y} r={isActive ? 3.5 : 1.75} fill={rightColor} />
                    ) : null}
                    <rect
                      x={lp.x - step / 2}
                      y={0}
                      width={Math.max(step, 4)}
                      height={PLOT_H}
                      fill="transparent"
                      className="cursor-crosshair"
                      onMouseEnter={() => setHoverIdx(i)}
                      onMouseLeave={() => setHoverIdx(null)}
                    />
                  </g>
                );
              })}
            </svg>

            {hover && hoverIdx != null ? (
              <div
                className="pointer-events-none absolute z-50 rounded-lg border border-white/10 bg-[var(--panel)] px-2.5 py-2 shadow-xl backdrop-blur-md"
                style={{
                  left: `${Math.min(88, Math.max(12, (hoverIdx / Math.max(1, points.length - 1)) * 100))}%`,
                  top: "6px",
                  transform: "translateX(-50%)",
                }}
              >
                <p className={`${HUB_DIRECTORY_TOOLBAR_TYPO_CLASS} mb-1.5 border-b border-white/8 pb-1 text-[var(--muted)]`}>
                  {hoverTitle?.(hover) ?? hover.label}
                </p>
                <div className="min-w-[7.5rem] space-y-1">
                  <div className={`${HUB_DIRECTORY_TOOLBAR_TYPO_CLASS} flex items-center justify-between gap-4`}>
                    <span style={{ color: leftColor }}>{leftName}</span>
                    <span className="tabular-nums text-[var(--text)]">{formatLeftValue(hover.left)}</span>
                  </div>
                  {showRight ? (
                    <div className={`${HUB_DIRECTORY_TOOLBAR_TYPO_CLASS} flex items-center justify-between gap-4`}>
                      <span style={{ color: rightColor }}>{rightName}</span>
                      <span className="tabular-nums text-[var(--text)]">{formatRightValue(hover.right ?? 0)}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          {showRight ? (
            <div
              data-hub-chart-axis="right"
              className={`flex w-9 shrink-0 flex-col justify-between ${AXIS_TYPO}`}
              style={{ color: rightColor }}
              aria-hidden
              {...rightAxisProps}
            >
              {Y_FRACS.map((v) => (
                <span key={`r-${v}`}>{formatRightTick(v * maxRight)}</span>
              ))}
            </div>
          ) : (
            <div className="w-2 shrink-0" aria-hidden />
          )}
        </div>

        <div className="mt-1.5 flex gap-1.5">
          <div className="w-8 shrink-0" aria-hidden />
          <div data-hub-chart-axis="dates" className="relative h-4 min-w-0 flex-1" {...datesAxisProps}>
            {points.map((point, i) =>
              labelIdx.has(i) ? (
                <span
                  key={point.key}
                  className={`${AXIS_TYPO} absolute text-[var(--muted)]`}
                  style={{
                    left: `${points.length <= 1 ? 50 : (i / (points.length - 1)) * 100}%`,
                    transform: "translateX(-50%)",
                  }}
                >
                  {point.label}
                </span>
              ) : null,
            )}
          </div>
          <div className={`${showRight ? "w-9" : "w-2"} shrink-0`} aria-hidden />
        </div>
      </div>
    </div>
  );
}
