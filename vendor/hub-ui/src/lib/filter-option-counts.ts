import type { FilterDef, FilterOption, FilterValues } from "../shell/FilterBar";

/**
 * Above this option count, per-row `matchesOption` scans freeze large directories
 * (P0005 Orders: ~5.6k rows × ~1.8k Customer options). Prefer `optionValuesOf`.
 */
export const ENRICH_FILTER_OPTION_SCAN_CAP = 256;

/** Return this item's facet value(s) for `filterKey`, or `null` to use `matchesOption`. */
export type EnrichFilterOptionValuesOf<T> = (
  item: T,
  filterKey: string,
) => readonly string[] | null | undefined;

/** Faceted counts: apply query + all filters except the current filter key, then count per option. */
export function enrichFilterDefs<T>(
  items: T[],
  defs: FilterDef[],
  query: string,
  values: FilterValues,
  matches: (item: T, query: string, filters: FilterValues) => boolean,
  matchesOption: (item: T, filterKey: string, optionValue: string) => boolean,
  optionValuesOf?: EnrichFilterOptionValuesOf<T>,
): FilterDef[] {
  type FacetState = {
    def: FilterDef;
    other: FilterValues;
    counts: Map<string, number>;
    total: number;
    scanOptions: boolean;
  };

  const states: FacetState[] = defs.map((def) => {
    const other: FilterValues = { ...values };
    delete other[def.key];
    return {
      def,
      other,
      counts: new Map(def.options.map((opt) => [opt.value, 0])),
      total: 0,
      scanOptions: def.options.length <= ENRICH_FILTER_OPTION_SCAN_CAP,
    };
  });

  for (const item of items) {
    for (const state of states) {
      if (!matches(item, query, state.other)) continue;
      state.total += 1;
      const keyed = optionValuesOf?.(item, state.def.key);
      if (keyed) {
        for (const key of keyed) {
          if (!key || !state.counts.has(key)) continue;
          state.counts.set(key, (state.counts.get(key) ?? 0) + 1);
        }
        continue;
      }
      // High-cardinality + no key fn: keep totalCount only (do not O(n×options)).
      if (!state.scanOptions) continue;
      for (const opt of state.def.options) {
        if (matchesOption(item, state.def.key, opt.value)) {
          state.counts.set(opt.value, (state.counts.get(opt.value) ?? 0) + 1);
        }
      }
    }
  }

  return states.map(({ def, counts, total }) => ({
    ...def,
    totalCount: total,
    options: def.options.map((opt) => ({
      ...opt,
      count: counts.get(opt.value) ?? 0,
    })),
  }));
}

/**
 * Drop zero-count facet options while keeping currently selected values.
 * Remaining options sort by descending frequency, then value.
 */
export function refineSparseFacetOptions(
  def: FilterDef,
  counts: Map<string, number>,
  selectedValues: readonly string[] = [],
): FilterOption[] {
  const selected = new Set(selectedValues);
  return def.options
    .filter((opt) => (counts.get(opt.value) ?? 0) > 0 || selected.has(opt.value))
    .map((opt) => ({
      ...opt,
      count: counts.get(opt.value) ?? 0,
    }))
    .sort((a, b) => {
      const ca = a.count ?? 0;
      const cb = b.count ?? 0;
      if (cb !== ca) return cb - ca;
      return a.value.localeCompare(b.value);
    });
}
