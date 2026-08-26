import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Golden directory selection — prune hidden rows, card select-all (P0004 Users parity).
 *
 * SSOT stability contract: `idOf` is treated as a pure row→id projection whose *behavior*
 * never changes across renders. We read it through a ref and expose a referentially stable
 * wrapper so the prune effect + selectedRows/allVisibleSelected memos depend only on the
 * actual data (`visibleItems` / `selectedIds`) — NOT on the caller's `idOf` identity. This
 * makes a checkbox toggle (or drag-sweep) snappy in every tool even when the consumer passes
 * an inline `(row) => row.id`, so no consumer needs its own `useCallback`. (Guarded by
 * useHubDirectorySelection.test.tsx "stays stable under an unstable inline idOf".)
 */
export function useHubDirectorySelection<T>(
  visibleItems: readonly T[],
  idOf: (item: T) => string,
) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const idOfRef = useRef(idOf);
  idOfRef.current = idOf;
  const stableIdOf = useCallback((item: T) => idOfRef.current(item), []);

  useEffect(() => {
    const visible = new Set(visibleItems.map(stableIdOf));
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => visible.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [stableIdOf, visibleItems]);

  const selectedRows = useMemo(
    () => visibleItems.filter((item) => selectedIds.has(stableIdOf(item))),
    [stableIdOf, selectedIds, visibleItems],
  );

  const allVisibleSelected = useMemo(
    () => visibleItems.length > 0 && visibleItems.every((item) => selectedIds.has(stableIdOf(item))),
    [stableIdOf, selectedIds, visibleItems],
  );

  const hasSelection = selectedIds.size > 0;

  // Count = visible checked rows, not Set size. Stays in sync with the table even when duplicate
  // ids collapse into one Set entry, so gating/labels never desync from what the user sees.
  const selectionCount = selectedRows.length;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (visibleItems.every((item) => prev.has(stableIdOf(item)))) {
        const next = new Set(prev);
        for (const item of visibleItems) next.delete(stableIdOf(item));
        return next;
      }
      const next = new Set(prev);
      for (const item of visibleItems) next.add(stableIdOf(item));
      return next;
    });
  }, [stableIdOf, visibleItems]);

  return {
    selectedIds,
    setSelectedIds,
    selectedRows,
    selectionCount,
    allVisibleSelected,
    hasSelection,
    toggleSelect,
    toggleSelectAll,
  };
}
