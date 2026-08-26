import type { ReactNode } from "react";
import { HubDataTable } from "../content/HubDataTable";
import { HubTablePager } from "../content/HubTablePager";
import { useHubTablePageSize } from "./hub-table-page-size";
import {
  hubPageAllSelectedByPredicate,
  hubTogglePageSelectAllByPredicate,
  useHubTablePagination,
} from "./hub-table-pagination";
import {
  buildHubUserToolsModalColumns,
  HUB_USER_TOOLS_COL,
  HUB_USER_TOOLS_MODAL_TABLE_CLASS,
  HUB_USER_TOOLS_MODAL_TABLE_WRAP_CLASS,
} from "./hub-user-tools-table-meta";

export type HubUserToolsDirectoryTableProps<TRow> = {
  items: readonly TRow[];
  resetKey?: string | number | boolean | null;
  getRowKey: (row: TRow) => string;
  getToolCode: (row: TRow) => string;
  getToolName: (row: TRow) => string;
  renderCategoryCell: (row: TRow) => ReactNode;
  renderAccessCell: (row: TRow) => ReactNode;
  /** Tool owning brand (Hub enterprise) — optional column. */
  renderEnterpriseCell?: (row: TRow) => ReactNode;
  /** Override Tool code cell (e.g. catalog icon + code). */
  renderToolCode?: (row: TRow) => ReactNode;
  renderCodeSuffix?: (row: TRow) => ReactNode;
  showSelectColumn?: boolean;
  isSelected?: (row: TRow) => boolean;
  onToggleSelect?: (row: TRow) => void;
  canSelectRow?: (row: TRow) => boolean;
  onRowClick?: (row: TRow) => void;
  selectAllLabel?: string;
  selectAriaLabel?: (row: TRow) => string;
  rowClassName?: (row: TRow) => string;
  ariaLabel?: string;
  pageSize?: number;
};

/** Golden User Access tools table — P0004 modal Tool access section. */
export function HubUserToolsDirectoryTable<TRow>({
  items,
  resetKey,
  getRowKey,
  getToolCode,
  getToolName,
  renderCategoryCell,
  renderAccessCell,
  renderEnterpriseCell,
  renderToolCode,
  renderCodeSuffix,
  showSelectColumn = false,
  isSelected,
  onToggleSelect,
  canSelectRow,
  onRowClick,
  selectAllLabel = "Select all on this page",
  selectAriaLabel,
  rowClassName,
  ariaLabel = "Tool access table pages",
  pageSize,
}: HubUserToolsDirectoryTableProps<TRow>) {
  const resolvedPageSize = useHubTablePageSize(pageSize);
  const pagination = useHubTablePagination(items, { resetKey, pageSize: resolvedPageSize });
  const pageItems = pagination.pageItems;
  const isRowSelected = (row: TRow) => isSelected?.(row) ?? false;
  const allPageSelected = hubPageAllSelectedByPredicate(pageItems, isRowSelected, canSelectRow);

  const showEnterprise = Boolean(renderEnterpriseCell);
  const columns = buildHubUserToolsModalColumns(showSelectColumn, showEnterprise).map((col) => {
    if (col.key !== "select") return col;
    return {
      ...col,
      header: onToggleSelect ? (
        <label className="hub-users-select-all">
          <input
            type="checkbox"
            className="hub-checkbox"
            checked={pageItems.length > 0 && allPageSelected}
            onChange={() =>
              hubTogglePageSelectAllByPredicate(pageItems, isRowSelected, onToggleSelect, canSelectRow)
            }
            aria-label={selectAllLabel}
          />
        </label>
      ) : (
        <span aria-hidden />
      ),
    };
  });

  return (
    <>
      <HubDataTable
        columns={columns}
        tableClassName={HUB_USER_TOOLS_MODAL_TABLE_CLASS}
        wrapClassName={HUB_USER_TOOLS_MODAL_TABLE_WRAP_CLASS}
        directorySelect={showSelectColumn}
      >
        {pageItems.map((row) => {
          const key = getRowKey(row);
          const selected = isRowSelected(row);
          const selectable = canSelectRow?.(row) !== false;
          const clickable = Boolean(onRowClick);
          return (
            <tr
              key={key}
              className={`hub-users-row${selected ? " is-selected" : ""}${clickable ? " cursor-pointer" : ""}${
                rowClassName?.(row) ?? ""
              }`}
              onClick={clickable ? () => onRowClick?.(row) : undefined}
            >
              {showSelectColumn ? (
                <td className={HUB_USER_TOOLS_COL.select} onClick={(e) => e.stopPropagation()}>
                  {selectable ? (
                    <label className="hub-users-select-row">
                      <input
                        type="checkbox"
                        className="hub-checkbox"
                        checked={selected}
                        onChange={() => onToggleSelect?.(row)}
                        aria-label={selectAriaLabel?.(row) ?? `Select ${getToolCode(row)}`}
                      />
                    </label>
                  ) : null}
                </td>
              ) : null}
              <td className={`${HUB_USER_TOOLS_COL.code} font-mono text-indigo-200/90`}>
                {renderToolCode ? (
                  renderToolCode(row)
                ) : (
                  <>
                    <span className="block truncate" title={getToolCode(row)}>
                      {getToolCode(row)}
                    </span>
                    {renderCodeSuffix?.(row)}
                  </>
                )}
              </td>
              <td className={`${HUB_USER_TOOLS_COL.name} font-medium`}>
                <span className="block truncate" title={getToolName(row)}>
                  {getToolName(row)}
                </span>
              </td>
              {showEnterprise ? (
                <td className={HUB_USER_TOOLS_COL.enterprise}>
                  <div className="min-w-0 truncate">{renderEnterpriseCell?.(row)}</div>
                </td>
              ) : null}
              <td className={HUB_USER_TOOLS_COL.category}>
                <div className="min-w-0 truncate">{renderCategoryCell(row)}</div>
              </td>
              <td className={`${HUB_USER_TOOLS_COL.access} text-center`}>{renderAccessCell(row)}</td>
            </tr>
          );
        })}
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
}
