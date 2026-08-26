import type { ReactNode } from "react";
import { HubPaginatedTableShell } from "./HubPaginatedTableShell";

/** Golden directory card grid — 1/2/3/4 columns by breakpoint. */
export const HUB_DIRECTORY_CARD_GRID_CLASS =
  "grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

export type HubPaginatedCardGridProps<T> = {
  items: readonly T[];
  resetKey?: string | number | boolean | null;
  pageSize?: number;
  ariaLabel?: string;
  className?: string;
  children: (pageItems: readonly T[]) => ReactNode;
};

/** Card/grid directory view with bottom pager — same 25-row contract as table shells. */
export function HubPaginatedCardGrid<T>({
  items,
  resetKey,
  pageSize,
  ariaLabel = "Card pages",
  className = HUB_DIRECTORY_CARD_GRID_CLASS,
  children,
}: HubPaginatedCardGridProps<T>) {
  return (
    <HubPaginatedTableShell items={items} resetKey={resetKey} pageSize={pageSize} ariaLabel={ariaLabel}>
      {(pageItems) => <div className={className}>{children(pageItems)}</div>}
    </HubPaginatedTableShell>
  );
}
