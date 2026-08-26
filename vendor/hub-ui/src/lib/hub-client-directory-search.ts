/**
 * Client directory search SSOT — debounced filter + transition for large catalogs.
 * @see Tool/docs/ssot/hub-shell-ssot.md
 */
import {
  useDirectorySearchQuery,
  type UseDirectorySearchQueryOptions,
} from "../hooks/useDirectorySearchQuery";
import { DIRECTORY_SEARCH_CLIENT_FILTER_OPTS } from "./directory-search-contract";

/** P0020 / P0005 / P0004 client catalogs — never `live: true` on large vaults unless opts override. */
export function useHubClientDirectorySearchQuery(opts?: UseDirectorySearchQueryOptions) {
  return useDirectorySearchQuery(opts ?? DIRECTORY_SEARCH_CLIENT_FILTER_OPTS);
}

export function isHubClientDirectorySearchActive(query: string): boolean {
  return query.trim().length > 0;
}
