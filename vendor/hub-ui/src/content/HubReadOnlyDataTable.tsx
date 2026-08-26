import type { ReactNode } from "react";
import { HubPaginatedDataTable } from "./HubPaginatedDataTable";
import { hubDirectoryListResetKey } from "../table/hub-table-pagination";
import type { HubTableColumn } from "./HubDataTable";

export type HubReadOnlyDataTableProps<T> = {
  items: readonly T[];
  columns: HubTableColumn[];
  renderRow: (item: T, index: number) => ReactNode;
  resetParts?: readonly (string | number | boolean | null | undefined)[];
  ariaLabel?: string;
  empty?: ReactNode;
  tableClassName?: string;
};

/** Read-only paginated table — no sort/checkbox shell (logs, results, modal lists). */
export function HubReadOnlyDataTable<T>({
  items,
  columns,
  renderRow,
  resetParts = [],
  ariaLabel = "Data table",
  empty,
  tableClassName = "hub-users-table hub-users-table--directory",
}: HubReadOnlyDataTableProps<T>) {
  return (
    <HubPaginatedDataTable
      items={items}
      columns={columns}
      renderRow={renderRow}
      resetKey={hubDirectoryListResetKey(...resetParts)}
      ariaLabel={ariaLabel}
      tableClassName={tableClassName}
      empty={empty}
    />
  );
}
