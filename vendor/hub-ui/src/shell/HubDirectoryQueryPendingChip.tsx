import { Search } from "lucide-react";
import { colHint } from "../lib/directory-column-hint-helpers";
import { HubDirectoryColumnHint } from "../table/HubDirectoryColumnHint";
import { MetaChip } from "./CopyMetaChip";
import { useHubDirectoryFieldQueryPending } from "./HubDirectoryFieldQueryPending";

const HINT_SEARCH = colHint(
  "Searching",
  "Directory list is catching up with the search box. Live/Sync stays as-is — this chip is not a vault sync.",
);

const HINT_FILTER = colHint(
  "Filtering",
  "Directory list is catching up with FilterBar facets. Live/Sync stays as-is — this chip is not a vault sync.",
);

const HINT_FILTERED = colHint(
  "Filtered",
  "Directory list is narrowed by search or FilterBar facets. Live/Sync stays as-is — this chip is not a vault sync.",
);

export type HubDirectoryQueryPendingChipProps = {
  /**
   * Debounce / transition / window fetch pending.
   * `visible` is a legacy alias.
   */
  queryPending?: boolean;
  /** @deprecated Use `queryPending`. */
  visible?: boolean;
  /** Non-empty → Searching… while pending; keeps Filtered when idle. */
  query?: string;
  /** Facets / KPI keys (sticky defaults ignored). Search text is `query`. */
  filterActive?: boolean;
};

function resolvePending(queryPending?: boolean, visible?: boolean) {
  return queryPending ?? visible ?? false;
}

/** Header status chip beside Sync/Live — pending Searching…/Filtering…, then muted Filtered. */
export function HubDirectoryQueryPendingChip({
  queryPending,
  visible,
  query = "",
  filterActive = false,
}: HubDirectoryQueryPendingChipProps) {
  const fieldPending = useHubDirectoryFieldQueryPending();
  const pending = resolvePending(queryPending, visible) || fieldPending;
  const hasQuery = Boolean(query.trim());
  const idleNarrowed = !pending && (hasQuery || filterActive);
  if (!pending && !idleNarrowed) return null;

  const searching = pending && (hasQuery || fieldPending);
  const mode = pending ? (searching ? "search" : "filter") : "filtered";
  const label = pending ? (searching ? "Searching…" : "Filtering…") : "Filtered";
  const hint = mode === "search" ? HINT_SEARCH : mode === "filter" ? HINT_FILTER : HINT_FILTERED;

  return (
    <span data-hub-directory-query-pending-chip={mode} role="status">
      <HubDirectoryColumnHint content={hint}>
        <MetaChip
          icon={
            <Search
              size={11}
              className={pending ? "hub-search-field__glyph--pending" : undefined}
            />
          }
          label={label}
          tone={pending ? "indigo" : "muted"}
        />
      </HubDirectoryColumnHint>
    </span>
  );
}
