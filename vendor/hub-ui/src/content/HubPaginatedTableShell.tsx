import { useCallback, useLayoutEffect, useRef, type ReactNode } from "react";
import { HubTablePager } from "./HubTablePager";
import { useHubTablePagination, type HubServerPaginationControl } from "../table/hub-table-pagination";
import { useHubTablePageSize } from "../table/hub-table-page-size";

/** Nearest scrollable ancestor of `el` (overflow auto/scroll with real overflow). */
function findScrollableAncestor(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  while (node) {
    const overflowY = getComputedStyle(node).overflowY;
    if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight + 1) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

export type HubPaginatedTableShellProps<T> = {
  items: readonly T[];
  resetKey?: string | number | boolean | null;
  pageSize?: number;
  ariaLabel?: string;
  className?: string;
  /** Hide pager when total rows ≤ page size (rail / compact lists). */
  hideWhenSinglePage?: boolean;
  /** Pre-sliced page rows + SQL total — pager uses host pageIndex (P0003 profiles). */
  serverPagination?: HubServerPaginationControl;
  children: (pageItems: readonly T[]) => ReactNode;
};

/** Pager + slice wrapper for custom hub-users-table markup. */
export function HubPaginatedTableShell<T>({
  items,
  resetKey,
  pageSize,
  ariaLabel,
  className,
  hideWhenSinglePage,
  serverPagination,
  children,
}: HubPaginatedTableShellProps<T>) {
  const resolvedPageSize = useHubTablePageSize(pageSize);
  const pagination = useHubTablePagination(items, {
    resetKey,
    pageSize: resolvedPageSize,
    server: serverPagination,
  });

  // Keep the scroll thumb still across manual page turns: row-height variance
  // (wrapped cells) makes pages differ in height, so preserve scrollTop instead
  // of letting the browser reflow the viewport (Customers-tab parity).
  const shellRef = useRef<HTMLDivElement>(null);
  const restoreScrollTopRef = useRef<number | null>(null);
  const lastPageIndexRef = useRef(pagination.pageIndex);

  const captureScrollTop = useCallback(() => {
    const scroller = findScrollableAncestor(shellRef.current);
    restoreScrollTopRef.current = scroller ? scroller.scrollTop : null;
  }, []);

  useLayoutEffect(() => {
    if (lastPageIndexRef.current === pagination.pageIndex) return;
    lastPageIndexRef.current = pagination.pageIndex;
    const target = restoreScrollTopRef.current;
    restoreScrollTopRef.current = null;
    if (target == null) return;
    const scroller = findScrollableAncestor(shellRef.current);
    if (scroller && scroller.scrollTop !== target) scroller.scrollTop = target;
  }, [pagination.pageIndex]);

  const handlePrev = useCallback(() => {
    captureScrollTop();
    pagination.goPrev();
  }, [captureScrollTop, pagination]);

  const handleNext = useCallback(() => {
    captureScrollTop();
    pagination.goNext();
  }, [captureScrollTop, pagination]);

  return (
    <div
      ref={shellRef}
      className={
        className
          ? `hub-paginated-table-shell min-h-0 min-w-0 ${className}`
          : "hub-paginated-table-shell min-h-0 min-w-0"
      }
    >
      {children(pagination.pageItems)}
      <HubTablePager
        pageIndex={pagination.pageIndex}
        totalPages={pagination.totalPages}
        rangeStart={pagination.rangeStart}
        rangeEnd={pagination.rangeEnd}
        totalCount={pagination.totalCount}
        onPrev={handlePrev}
        onNext={handleNext}
        pageSize={resolvedPageSize}
        ariaLabel={ariaLabel}
        hideWhenSinglePage={hideWhenSinglePage}
      />
    </div>
  );
}
