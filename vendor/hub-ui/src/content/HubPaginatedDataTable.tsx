import type { ReactNode } from "react";
import { HubDataTable, type HubTableColumn } from "./HubDataTable";
import { HubTablePager } from "./HubTablePager";
import { useHubTablePagination } from "../table/hub-table-pagination";
import { useHubTablePageSize } from "../table/hub-table-page-size";

export type HubPaginatedDataTableProps<T> = {
  columns: HubTableColumn[];
  items: readonly T[];
  renderRow: (item: T, index: number) => ReactNode;
  resetKey?: string | number | boolean | null;
  pageSize?: number;
  ariaLabel?: string;
  empty?: ReactNode;
  className?: string;
  tableClassName?: string;
  wrapClassName?: string;
};

/** HubDataTable + 25-row pager — default for directory clones and panel tables. */
export function HubPaginatedDataTable<T>({
  columns,
  items,
  renderRow,
  resetKey,
  pageSize,
  ariaLabel,
  empty,
  className,
  tableClassName,
  wrapClassName,
}: HubPaginatedDataTableProps<T>) {
  const resolvedPageSize = useHubTablePageSize(pageSize);
  const pagination = useHubTablePagination(items, { resetKey, pageSize: resolvedPageSize });
  const body = (
    <>
      <HubDataTable
        columns={columns}
        empty={items.length === 0 ? empty : undefined}
        tableClassName={tableClassName}
        wrapClassName={wrapClassName}
      >
        {pagination.pageItems.map((item, index) => renderRow(item, index))}
      </HubDataTable>
      <HubTablePager
        pageIndex={pagination.pageIndex}
        totalPages={pagination.totalPages}
        rangeStart={pagination.rangeStart}
        rangeEnd={pagination.rangeEnd}
        totalCount={pagination.totalCount}
        onPrev={pagination.goPrev}
        onNext={pagination.goNext}
        pageSize={resolvedPageSize}
        ariaLabel={ariaLabel}
      />
    </>
  );

  return className ? <div className={className}>{body}</div> : body;
}
