import { useMemo, useRef, type DependencyList } from "react";

/**
 * Visited keep-alive perf SSOT — freeze the last row snapshot while the tab is
 * hidden so screen-switch parent re-renders do not re-run O(n) filter / KPI /
 * chart pipelines. Golden: P0020 `analyticsBandActive`, P0005 directory tabs.
 *
 * When `tabActive` flips true again, `compute` runs with the latest deps.
 */
export function useTabFrozenRows<T>(
  tabActive: boolean,
  compute: () => T[],
  deps: DependencyList,
): T[] {
  const frozenRef = useRef<T[]>([]);
  return useMemo(() => {
    if (!tabActive) return frozenRef.current;
    const next = compute();
    frozenRef.current = next;
    return next;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller supplies deps + tabActive
  }, [tabActive, ...deps]);
}
