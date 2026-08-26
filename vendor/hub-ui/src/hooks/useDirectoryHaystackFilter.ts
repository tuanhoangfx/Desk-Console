import { useCallback, useMemo, useRef } from "react";
import { buildSearchHaystackIndex, type SearchRowKey } from "../lib/search-haystack-index";

/**
 * Precomputed haystack lookup for directory filter functions.
 *
 * SSOT stability contract: `keyOf` / `haystackOf` are pure row projections whose behavior is
 * constant across renders. We read them through refs and depend the index memo only on `rows`,
 * so the (O(n)) haystack index is rebuilt when the data changes — never when a consumer passes
 * a fresh inline `(row) => row.id` on every render. Keeps directory search + selection snappy in
 * every tool without per-consumer `useCallback`. (Guarded by useDirectoryHaystackFilter.test.ts.)
 */
export function useDirectoryHaystackFilter<Row>(
  rows: readonly Row[],
  keyOf: (row: Row) => SearchRowKey,
  haystackOf: (row: Row) => string | null | undefined,
) {
  const keyOfRef = useRef(keyOf);
  keyOfRef.current = keyOf;
  const haystackOfRef = useRef(haystackOf);
  haystackOfRef.current = haystackOf;

  const stableKeyOf = useCallback((row: Row) => keyOfRef.current(row), []);
  const stableHaystackOf = useCallback((row: Row) => haystackOfRef.current(row), []);

  const index = useMemo(
    () => buildSearchHaystackIndex(rows, stableKeyOf, stableHaystackOf),
    [rows, stableKeyOf, stableHaystackOf],
  );

  const haystackOfRow = useCallback((row: Row) => index.get(stableKeyOf(row)) ?? "", [index, stableKeyOf]);

  return { index, haystackOf: haystackOfRow };
}
