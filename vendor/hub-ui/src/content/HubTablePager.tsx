import { ChevronLeft, ChevronRight } from "lucide-react";
import { HUB_TABLE_PAGE_SIZE } from "../table/hub-table-pagination";
import { directoryPagerHideWhenSinglePage } from "../table/directory-pager-config";

export type HubTablePagerProps = {
  pageIndex: number;
  totalPages: number;
  rangeStart: number;
  rangeEnd: number;
  totalCount: number;
  onPrev: () => void;
  onNext: () => void;
  /** Hide when total rows ≤ page size. Default: directoryPagerHideWhenSinglePage() → false (always show). */
  hideWhenSinglePage?: boolean;
  pageSize?: number;
  ariaLabel?: string;
};

/** Prev/next pager — E0001 route-table-pager visual parity. */
export function HubTablePager({
  pageIndex,
  totalPages,
  rangeStart,
  rangeEnd,
  totalCount,
  onPrev,
  onNext,
  hideWhenSinglePage = directoryPagerHideWhenSinglePage(),
  pageSize = HUB_TABLE_PAGE_SIZE,
  ariaLabel = "Table pages",
}: HubTablePagerProps) {
  if (hideWhenSinglePage && totalCount <= pageSize) return null;

  const page = pageIndex + 1;

  return (
    <nav className="hub-table-pager" aria-label={ariaLabel}>
      <div className="hub-table-pager-group">
        <button
          type="button"
          className="hub-table-page-btn"
          onClick={onPrev}
          disabled={pageIndex <= 0}
          aria-label="Previous page"
        >
          <ChevronLeft size={14} aria-hidden />
        </button>
        <span className="hub-table-page-label">
          Page {page} of {totalPages} · Showing {rangeStart}-{rangeEnd} of {totalCount}
        </span>
        <button
          type="button"
          className="hub-table-page-btn"
          onClick={onNext}
          disabled={pageIndex >= totalPages - 1}
          aria-label="Next page"
        >
          <ChevronRight size={14} aria-hidden />
        </button>
      </div>
    </nav>
  );
}
