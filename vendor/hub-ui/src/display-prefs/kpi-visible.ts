import { useMemo } from "react";
import type { PrefItem } from "./types";
import { visibleKpiKeysSignature } from "../directory-band/directory-band-sync";

/** Max KPI tiles per tab row (golden Hub / directory). */
export const MAX_VISIBLE_KPI = 8;

/** Default KPI count when tab does not pass an explicit `count`. */
export const DEFAULT_KPI_ON_COUNT = 4;

export function defaultKpiKeysFromDefs(defs: PrefItem[], count = DEFAULT_KPI_ON_COUNT): Set<string> {
  return new Set(defs.map((d) => d.key).slice(0, count));
}

export function defaultKpiKeysExcluding(
  defs: PrefItem[],
  exclude: string[],
  count = DEFAULT_KPI_ON_COUNT,
): Set<string> {
  const keys = defs.map((d) => d.key).filter((k) => !exclude.includes(k));
  return new Set(keys.slice(0, count));
}

/** Resolve stored/default KPI keys in pref order, capped at `max`. */
export function resolveVisibleKpiKeys(
  stored: Set<string> | null,
  defaults: Set<string>,
  defs: PrefItem[],
  max = MAX_VISIBLE_KPI,
): Set<string> {
  const effective = stored ?? defaults;
  const order = defs.map((d) => d.key);
  return new Set(order.filter((k) => effective.has(k)).slice(0, max));
}

/** When enabling a KPI would exceed max, drop earliest visible keys (pref order), keep `addedKey`. */
export function enforceKpiMaxOnAdd(
  visible: Set<string>,
  defs: PrefItem[],
  addedKey: string,
  max = MAX_VISIBLE_KPI,
): Set<string> {
  if (visible.size <= max) return visible;
  const dropCount = visible.size - max;
  const order = defs.map((d) => d.key);
  const result = new Set(visible);
  let dropped = 0;
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

/** Stable visible KPI set for React effects (avoids new Set() each render). */
export function useResolvedVisibleKpiKeys(
  stored: Set<string> | null,
  defaults: Set<string>,
  defs: PrefItem[],
  max = MAX_VISIBLE_KPI,
): Set<string> {
  const storedSig = visibleKpiKeysSignature(stored);
  return useMemo(
    () => resolveVisibleKpiKeys(stored, defaults, defs, max),
    [stored, storedSig, defaults, defs, max],
  );
}
