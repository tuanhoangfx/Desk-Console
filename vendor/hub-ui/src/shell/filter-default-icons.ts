import { semanticFilterAllIcon } from "./filter-semantic-keys";
import type { FilterIconMeta } from "./filter-icons";

/**
 * SSOT fallback for FilterBar “All {label}” triggers — delegates to semantic-icon-registry.
 * Golden: P0020 Notes/2FA/Cookie · P0004 Hub/Users directory filters.
 */
export function defaultFilterAllIcon(filterKey: string): FilterIconMeta | null {
  return semanticFilterAllIcon(filterKey);
}

/** @deprecated Use defaultFilterAllIcon — kept for parity grep. */
export const DEFAULT_FILTER_ALL_ICONS = {} as Record<string, FilterIconMeta>;
