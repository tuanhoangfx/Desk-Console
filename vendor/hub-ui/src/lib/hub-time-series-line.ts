/** P0012 Performance Chart plot math — continuous 0-line, HTML axis labels. */

export function pickHubTimeSeriesLabelIndexes(len: number, maxLabels = 8): Set<number> {
  if (len <= 0) return new Set();
  if (len <= maxLabels) return new Set(Array.from({ length: len }, (_, i) => i));
  const out = new Set<number>([0, len - 1]);
  const step = (len - 1) / (maxLabels - 1);
  for (let i = 1; i < maxLabels - 1; i++) out.add(Math.round(i * step));
  return out;
}

export function resolveHubTimeSeriesAxisMax(values: readonly number[], floor = 1): number {
  return Math.max(floor, ...values.map((n) => (Number.isFinite(n) ? n : 0)));
}

export type HubTimeSeriesCurve = "linear" | "smooth";

/** Continuous polyline through every bucket — empty slots stay 0 (P0012). */
export function createHubTimeSeriesPath(points: readonly { x: number; y: number }[]): string {
  return points.length ? `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")}` : "";
}

/** Catmull-Rom → cubic Bézier — Dashboard Revenue & Cost wave (not gaussian). */
export function createHubTimeSeriesSmoothPath(points: readonly { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length <= 2) return createHubTimeSeriesPath(points);
  let d = `M ${points[0]!.x} ${points[0]!.y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[i + 2] ?? p2;
    d += ` C ${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6}, ${p2.x - (p3.x - p1.x) / 6} ${p2.y - (p3.y - p1.y) / 6}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export function createHubTimeSeriesLinePath(
  points: readonly { x: number; y: number }[],
  curve: HubTimeSeriesCurve = "linear",
): string {
  return curve === "smooth" ? createHubTimeSeriesSmoothPath(points) : createHubTimeSeriesPath(points);
}

export function createHubTimeSeriesAreaPath(
  points: readonly { x: number; y: number }[],
  plotH: number,
  curve: HubTimeSeriesCurve = "linear",
): string {
  if (points.length <= 1) return "";
  return `${createHubTimeSeriesLinePath(points, curve)} L ${points[points.length - 1]!.x},${plotH} L ${points[0]!.x},${plotH} Z`;
}

export function hubTimeSeriesPlotPoints(
  values: readonly number[],
  plotW: number,
  plotH: number,
  max: number,
): { x: number; y: number }[] {
  const scale = max || 1;
  return values.map((value, i) => ({
    x: values.length <= 1 ? plotW / 2 : (i / (values.length - 1)) * plotW,
    y: plotH - ((Number.isFinite(value) ? value : 0) / scale) * plotH,
  }));
}
