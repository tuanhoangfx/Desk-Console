import type { FilterDef, FilterValues } from "../shell/FilterBar";

/** Hidden / pinned KPI facet value — P0005 Orders Revenue, Index has_revenue, Users created_week. */
export const HUB_KPI_YES_FILTER_VALUE = "yes";
/** Period KPI facet value — P0005 Update today / Created today. */
export const HUB_KPI_TODAY_FILTER_VALUE = "today";

export function sameFilterValues(current: FilterValues, key: string, values: string[]): boolean {
  return JSON.stringify([...(current[key] ?? [])].sort()) === JSON.stringify([...values].sort());
}

export function kpiSetOrClear(current: FilterValues, key: string, values: string[]): FilterValues {
  if (sameFilterValues(current, key, values)) {
    const next = { ...current };
    delete next[key];
    return next;
  }
  return { ...current, [key]: values };
}

export function kpiClearAllIfAny(current: FilterValues): FilterValues | null {
  return Object.keys(current).length ? {} : null;
}

export function isKpiPatchActive(probe: FilterValues | null, current: FilterValues): boolean {
  if (!probe || !Object.keys(probe).length) return false;
  for (const [key, values] of Object.entries(probe)) {
    if (!sameFilterValues(current, key, values as string[])) return false;
  }
  return true;
}

export function matchesKpiYesFilter(selected: string[] | undefined, pred: boolean): boolean {
  if (!selected?.length) return true;
  return selected.includes(HUB_KPI_YES_FILTER_VALUE) ? pred : false;
}

export function matchesKpiTodayFilter(selected: string[] | undefined, pred: boolean): boolean {
  if (!selected?.length) return true;
  return selected.includes(HUB_KPI_TODAY_FILTER_VALUE) ? pred : false;
}

export function hubKpiYesFilterDef(key: string, label: string, emoji: string): FilterDef {
  return {
    key,
    label,
    triggerEmoji: emoji,
    options: [{ value: HUB_KPI_YES_FILTER_VALUE, label, emoji }],
  };
}

export function hubKpiTodayFilterDef(key: string, label: string, emoji: string): FilterDef {
  return {
    key,
    label,
    triggerEmoji: emoji,
    options: [{ value: HUB_KPI_TODAY_FILTER_VALUE, label: "Today", emoji }],
  };
}

/** Pin hidden KPI facets when their values are set (FilterBar Clear + chip). */
export function withPinnedFilterDefs<T extends { key: string }>(
  counted: readonly T[],
  visible: readonly T[],
  values: FilterValues,
  pinKeys: readonly string[],
): T[] {
  const next = [...visible];
  const have = new Set(next.map((def) => def.key));
  for (const key of pinKeys) {
    const selected = values[key] ?? [];
    if (selected.length === 0 || have.has(key)) continue;
    if (selected.length === 1 && selected[0] === "all") continue;
    const extra = counted.find((def) => def.key === key);
    if (!extra) continue;
    next.push(extra);
    have.add(key);
  }
  return next;
}

/** Hover + click on directory KPI tiles — tile becomes a button in `KpiStrip`. */
export function attachDirectoryKpiClicks<T extends { prefKey?: string }>(
  items: readonly T[],
  filterValues: FilterValues,
  setFilterValues: (next: FilterValues) => void,
  patch: (prefKey: string, current: FilterValues) => FilterValues | null,
  isActive: (prefKey: string, current: FilterValues) => boolean,
): T[] {
  return items.map((item) => {
    const key = item.prefKey;
    if (!key) return item;
    const next = patch(key, filterValues);
    const active = isActive(key, filterValues);
    if (next == null && !active) return item;
    return {
      ...item,
      active,
      onClick: () => {
        const applied = patch(key, filterValues);
        if (applied == null) return;
        setFilterValues(applied);
      },
    };
  });
}
