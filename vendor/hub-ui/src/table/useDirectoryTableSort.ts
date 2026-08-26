import { useCallback, useMemo, useReducer, useRef } from "react";
import type { HubSortDir } from "./HubSortIndicator";

type SortState<TKey extends string> = { sortKey: TKey; sortDir: HubSortDir };

export function directoryTableSortReducer<TKey extends string>(
  state: SortState<TKey>,
  key: TKey,
): SortState<TKey> {
  if (state.sortKey === key) {
    return { sortKey: key, sortDir: state.sortDir === "asc" ? "desc" : "asc" };
  }
  return { sortKey: key, sortDir: "asc" };
}

export type DirectoryTableSortTieBreak<TItem> = (a: TItem, b: TItem) => number;

export function useDirectoryTableSort<TKey extends string, TItem>(
  items: TItem[],
  defaultKey: TKey,
  sortableValue: (item: TItem, key: TKey) => string | number,
  defaultDir: HubSortDir = "asc",
  /** Stable secondary/tertiary order when primary values tie (e.g. Role → Ownership → Joined). */
  tieBreak?: DirectoryTableSortTieBreak<TItem>,
) {
  const [{ sortKey, sortDir }, dispatch] = useReducer(directoryTableSortReducer<TKey>, {
    sortKey: defaultKey,
    sortDir: defaultDir,
  });

  const onSort = useCallback((key: TKey) => {
    dispatch(key);
  }, []);

  // SSOT stability contract: `sortableValue` / `tieBreak` are pure projections whose behavior
  // is constant across renders. Read them through refs so the (O(n log n)) sort memo depends
  // only on the data + sort state (`items` / `sortKey` / `sortDir`) — never on a caller's inline
  // callback identity. Keeps directory sort from re-running every render in every tool without a
  // per-consumer useCallback. (Guarded by useDirectoryTableSort.test.ts.)
  const sortableValueRef = useRef(sortableValue);
  sortableValueRef.current = sortableValue;
  const tieBreakRef = useRef(tieBreak);
  tieBreakRef.current = tieBreak;

  const sorted = useMemo(() => {
    const copy = [...items];
    copy.sort((a, b) => {
      const av = sortableValueRef.current(a, sortKey);
      const bv = sortableValueRef.current(b, sortKey);
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" });
      if (cmp !== 0) return sortDir === "asc" ? cmp : -cmp;
      return tieBreakRef.current?.(a, b) ?? 0;
    });
    return copy;
  }, [items, sortKey, sortDir]);

  return { sortKey, sortDir, onSort, sorted };
}
