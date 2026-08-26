import { useMemo } from "react";
import type { PrefItem } from "./types";
import { visibleKpiKeysSignature } from "../directory-band/directory-band-sync";

/** Max chart cards per directory row (golden Hub — hub-charts-band 4-col at xl). */
export const MAX_VISIBLE_CHART = 4;

export function defaultChartKeysFromDefs(defs: PrefItem[], count = MAX_VISIBLE_CHART): Set<string> {
  return new Set(defs.map((d) => d.key).slice(0, count));
}

export function resolveVisibleChartKeys(
  stored: Set<string> | null,
  defaults: Set<string>,
  defs: PrefItem[],
  max = MAX_VISIBLE_CHART,
): Set<string> {
  const effective = stored ?? defaults;
  const order = defs.map((d) => d.key);
  return new Set(order.filter((k) => effective.has(k)).slice(0, max));
}

export function enforceChartMaxOnAdd(
  visible: Set<string>,
  defs: PrefItem[],
  addedKey: string,
  max = MAX_VISIBLE_CHART,
): Set<string> {
  if (visible.size <= max) return visible;
  const order = defs.map((d) => d.key);
  const result = new Set(visible);
  let dropped = 0;
  const dropCount = visible.size - max;
  for (const k of order) {
    if (dropped >= dropCount) break;
    if (k === addedKey) continue;
    if (result.has(k)) {
      result.delete(k);
      dropped++;
    }
  }
  return result;
}

export function useResolvedVisibleChartKeys(
  stored: Set<string> | null,
  defaults: Set<string>,
  defs: PrefItem[],
  max = MAX_VISIBLE_CHART,
): Set<string> {
  const storedSig = visibleKpiKeysSignature(stored);
  return useMemo(
    () => resolveVisibleChartKeys(stored, defaults, defs, max),
    [stored, storedSig, defaults, defs, max],
  );
}
