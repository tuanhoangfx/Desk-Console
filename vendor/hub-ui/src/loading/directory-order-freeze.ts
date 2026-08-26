/**
 * Directory order freeze — keep row slots stable after search/filter is applied.
 *
 * Recapture incoming sorted order when:
 * - the freeze key changes (sort / search / facet / period)
 * - membership changes (add / delete / sync / late hydrate)
 * - first paint, or F5 (module state)
 *
 * Same-id field edits (Own, Status, realtime) keep the frozen slots.
 */

function sameDirectoryMembership(
  frozenIds: readonly string[],
  incomingIds: readonly string[],
): boolean {
  if (frozenIds.length !== incomingIds.length) return false;
  const frozen = new Set(frozenIds);
  if (frozen.size !== incomingIds.length) return false;
  for (const id of incomingIds) {
    if (!frozen.has(id)) return false;
  }
  return true;
}

type DirectoryOrderFreezeState = {
  freezeKey: string;
  orderIds: string[];
};

/** In-memory row order per scope — survives data edits until reload. */
const frozenOrderByScope = new Map<string, DirectoryOrderFreezeState>();

/** @internal Test/reset hook — simulates F5 / scope reset. */
export function clearDirectoryOrderFreeze(scope?: string): void {
  if (scope) frozenOrderByScope.delete(scope);
  else frozenOrderByScope.clear();
}

/** Join freeze-invalidating parts (sort/search/facet/period) into a stable key. */
export function buildDirectoryOrderFreezeKey(
  parts: ReadonlyArray<string | number | boolean | null | undefined>,
): string {
  return parts.map((part) => String(part ?? "")).join("::");
}

/**
 * Reorder freshly-sorted rows back into the frozen slot order for `scope`.
 * Key or membership change (or first paint) captures the incoming sorted order.
 */
export function applyDirectoryOrderFreeze<T>(
  sortedRows: readonly T[],
  freezeKey: string,
  scope: string,
  getId: (row: T) => string,
): T[] {
  const incomingIds = sortedRows.map(getId);
  const existing = frozenOrderByScope.get(scope);
  if (
    !existing ||
    existing.freezeKey !== freezeKey ||
    !sameDirectoryMembership(existing.orderIds, incomingIds)
  ) {
    frozenOrderByScope.set(scope, { freezeKey, orderIds: incomingIds });
    return [...sortedRows];
  }

  const byId = new Map(sortedRows.map((row) => [getId(row), row]));
  const next: T[] = [];
  for (const id of existing.orderIds) {
    const row = byId.get(id);
    if (row !== undefined) next.push(row);
  }
  return next;
}
