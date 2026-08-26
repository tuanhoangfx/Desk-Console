import type { FilterIconMeta } from "../types/filter-badge";

/** Compose chart legend icons from ordered maps (first hit wins). */
export function createChartLegendResolver(
  maps: ReadonlyArray<Readonly<Record<string, FilterIconMeta>>>,
  fallback?: (label: string) => FilterIconMeta | null,
): (label: string) => FilterIconMeta | null {
  return (raw) => {
    const key = raw.trim();
    if (!key || key === "—") return null;
    for (const map of maps) {
      const hit = map[key] ?? map[key.toLowerCase()];
      if (hit) return hit;
    }
    return fallback?.(key) ?? null;
  };
}
