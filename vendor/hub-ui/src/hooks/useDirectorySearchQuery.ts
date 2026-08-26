import { useEffect, useMemo, useState, useTransition } from "react";
import { DIRECTORY_SEARCH_FILTER_DEBOUNCE_MS } from "../lib/directory-search-contract";
import { useDebouncedValue } from "./useDebouncedValue";

export type UseDirectorySearchQueryOptions = {
  initialQuery?: string;
  debounceMs?: number;
  /** Immediate filter query — shell pass-through (no debounce lag). Unsafe on large client vaults. */
  live?: boolean;
};

/** Shared search input contract — immediate typing + debounced query for directory filtering. */
export function useDirectorySearchQuery(opts: UseDirectorySearchQueryOptions = {}) {
  const { initialQuery = "", debounceMs = DIRECTORY_SEARCH_FILTER_DEBOUNCE_MS, live = false } = opts;
  const [queryInput, setQueryInput] = useState(initialQuery);
  const debouncedQuery = useDebouncedValue(queryInput, live ? 0 : debounceMs);
  const resolvedQuery = live ? queryInput : debouncedQuery;
  const [query, setQuery] = useState(resolvedQuery);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (resolvedQuery === query) return;
    // `live` is the only sync path — a live consumer renders `query` as the field value,
    // so transition lag would clobber Vietnamese IME drafts. Debounced consumers
    // (including debounceMs 0 with upstream HubSearchField debounce) bind the field to
    // `queryInput`/fieldQuery, never `query` (DIRECTORY_SEARCH_FILTERBAR_QUERY_FORBIDDEN),
    // so the heavy filter apply must stay interruptible on large catalogs.
    if (live) {
      setQuery(resolvedQuery);
      return;
    }
    startTransition(() => setQuery(resolvedQuery));
  }, [query, resolvedQuery, live]);

  return useMemo(
    () => ({
      queryInput,
      setQueryInput,
      /** Debounced filter query — applied via transition so typing stays responsive on large catalogs. */
      query,
      debouncedQuery: query,
      queryPending: live ? false : queryInput !== debouncedQuery || isPending,
    }),
    [debouncedQuery, isPending, query, queryInput, live],
  );
}

export type DirectorySearchQuery = ReturnType<typeof useDirectorySearchQuery>;
