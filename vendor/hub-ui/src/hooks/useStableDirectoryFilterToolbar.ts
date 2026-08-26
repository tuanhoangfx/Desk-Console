import { useMemo, type DependencyList, type ReactNode } from "react";

export type StableDirectoryFilterToolbarCounts = {
  /** When false, shown/total are omitted from memo deps (counts live in header stats). */
  showResultCount: boolean;
  shown: number;
  total: number;
};

/**
 * Memoizes directory `filterToolbar` / workspace `toolbar` so FilterBar row-1 stays
 * mounted during search when `showResultCount` is false.
 * @see HubTabLoadingContract.md — syncKey vs statsKey
 */
export function useStableDirectoryFilterToolbar(
  counts: StableDirectoryFilterToolbarCounts,
  render: () => ReactNode,
  deps: DependencyList,
): ReactNode {
  const { showResultCount, shown, total } = counts;
  return useMemo(
    () => render(),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- counts gated by showResultCount
    showResultCount ? [...deps, shown, total] : deps,
  );
}
