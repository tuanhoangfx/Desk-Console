/**
 * Hub directory search SSOT — P0003 split model (live input, debounced expensive path).
 * @see Tool/docs/ssot/hub-shell-ssot.md
 */

/** FilterBar / HubSearchField — input must update immediately (never debounce UI). */
export const DIRECTORY_SEARCH_UI_DEBOUNCE_MS = 0 as const;

/** Client filter, facet counts, haystack scan — default for `useDirectorySearchQuery`. */
export const DIRECTORY_SEARCH_FILTER_DEBOUNCE_MS = 140;

/** P0020 large client vaults — slightly tighter than default; still batches keystrokes safely. */
export const DIRECTORY_SEARCH_CLIENT_FILTER_DEBOUNCE_MS = 100;

/**
 * P0020 client catalogs — debounced filter + transition apply; input UI stays live via `queryInput`.
 * Never `live: true` on large vaults (Mail ~10k rows) — sync filter per keystroke freezes/crashes.
 */
export const DIRECTORY_SEARCH_CLIENT_FILTER_OPTS = {
  debounceMs: DIRECTORY_SEARCH_CLIENT_FILTER_DEBOUNCE_MS,
} as const;

/** @deprecated Use `DIRECTORY_SEARCH_CLIENT_FILTER_OPTS` — live filter is not safe on large client vaults. */
export const DIRECTORY_SEARCH_CLIENT_FILTER_LIVE_OPTS = DIRECTORY_SEARCH_CLIENT_FILTER_OPTS;

/** Server-paginated directory fetch (SQL/API) — P0003 Profiles golden. */
export const DIRECTORY_SEARCH_FETCH_DEBOUNCE_MS = 200;

/**
 * Hard invariant — FilterBar / HubDirectoryScreen `query={…}` must bind the **input** stream
 * (`queryInput` / `fieldQuery`), never the debounced/transition filter stream
 * (`filterQuery` / `search.query`). Binding filterQuery causes Vietnamese IME caret jump.
 */
export const DIRECTORY_SEARCH_FILTERBAR_QUERY_FORBIDDEN = [
  "filterQuery",
  "search.query",
  "effectiveFilterQuery",
] as const;

/**
 * Facet dropdown count query SSOT — always empty.
 * Search narrows rows client-side; passing debounced search text into facet count
 * builders remounts FilterBar row-2 on every keystroke (visible jump on small catalogs).
 * @see useStableDirectoryFilterToolbar — toolbar row-1 stability when showResultCount=false
 */
export function directoryFacetCountQuery(): string {
  return "";
}
