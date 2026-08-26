import type { ReactNode } from "react";
import { HubDataTable } from "../content/HubDataTable";
import { HubTableColumnHeader } from "../content/HubTableColumnHeader";
import { HubTablePager } from "../content/HubTablePager";
import { useHubTablePageSize } from "./hub-table-page-size";
import {
  hubPageAllSelectedByPredicate,
  hubTogglePageSelectAllByPredicate,
  useHubTablePagination,
} from "./hub-table-pagination";
import { HubSortIndicator } from "./HubSortIndicator";
import {
  useDirectoryTableSort,
  type DirectoryTableSortTieBreak,
} from "./useDirectoryTableSort";
import {
  HubDirectoryColumnHint,
  type HubDirectoryColumnHintContent,
} from "./HubDirectoryColumnHint";
import {
  buildHubRouteAccessModalColumns,
  HUB_ROUTE_ACCESS_COL,
  HUB_ROUTE_ACCESS_HEADER_LABEL_ALWAYS,
  HUB_ROUTE_ACCESS_MODAL_TABLE_WRAP_CLASS,
  hubRouteAccessModalTableClass,
  type HubRouteAccessColumnLayout,
  type HubRouteAccessModalColumnOptions,
  type HubRouteAccessSortKey,
} from "./hub-route-access-table-meta";

function columnHeaderTitle(key: string): string | undefined {
  switch (key) {
    case "syncAt":
      return "Last Sync to cloud vault";
    case "loadAt":
      return "Last Load on extension";
    case "planDate":
      return "Plan start date";
    case "planDays":
      return "Plan duration (days)";
    case "planDue":
      return "Plan due date";
    case "planLeft":
      return "Days remaining until Plan Due";
    case "addedAt":
      return "When access was granted";
    case "expires":
      return "Access expiry";
    case "ownership":
      return "Account ownership";
    case "liveStatus":
      return "Account status";
    case "usage":
      return "Completed CRM orders for this account (same service)";
    case "usageExpired":
      return "Usage exceptions — Pending / Guarantee / Cancel / Expired subscription";
    case "profile":
      return "Profile code used for this account";
    case "role":
      return "Team role";
    default:
      return undefined;
  }
}

export type HubRouteAccessDirectoryTableProps<TRow> = {
  items: readonly TRow[];
  resetKey?: string | number | boolean | null;
  getRowKey: (row: TRow) => string;
  getUserDisplay: (row: TRow) => { label: string; title?: string };
  /** Optional user cell override (e.g. search highlight) — defaults to plain `label`. */
  renderUserCell?: (row: TRow, display: { label: string; title?: string }) => ReactNode;
  renderRoleCell: (row: TRow) => ReactNode;
  /** Teams — Profile (Service browser code). */
  renderProfileCell?: (row: TRow) => ReactNode;
  /** Teams — Password from linked Services/Mail account. */
  renderPasswordCell?: (row: TRow) => ReactNode;
  /** Teams — Recovery Mail from linked account. */
  renderMailRecoverCell?: (row: TRow) => ReactNode;
  /** Teams — Full Info from linked account. */
  renderFullInfoCell?: (row: TRow) => ReactNode;
  /** Teams — Ownership/Status/Profile source (Service · Mail · Manual). */
  renderSourceCell?: (row: TRow) => ReactNode;
  /** Expanded layout — Synced timestamp column. */
  renderSyncAtCell?: (row: TRow) => ReactNode;
  /** Expanded layout — Loaded timestamp column. */
  renderLoadAtCell?: (row: TRow) => ReactNode;
  /** Teams — Ownership column. */
  renderOwnershipCell?: (row: TRow) => ReactNode;
  /** Teams — Live Status column. */
  renderLiveStatusCell?: (row: TRow) => ReactNode;
  /** Teams — CRM Usage column (P0005 Order Detail). */
  renderUsageCell?: (row: TRow) => ReactNode;
  /** Teams — CRM Usage Expired column (Subscription Status Expired). */
  renderUsageExpiredCell?: (row: TRow) => ReactNode;
  /** Teams — Plan Date / Duration / Due / Left. */
  renderPlanDateCell?: (row: TRow) => ReactNode;
  renderPlanDaysCell?: (row: TRow) => ReactNode;
  renderPlanDueCell?: (row: TRow) => ReactNode;
  renderPlanLeftCell?: (row: TRow) => ReactNode;
  /** Compact layout — merged activity column. */
  renderActivityCell?: (row: TRow) => ReactNode;
  renderRouteCell?: (row: TRow) => ReactNode;
  /** When access was granted — before Expires column. */
  renderAddedAtCell: (row: TRow) => ReactNode;
  /** Required when `showExpiresColumn` (Cookie access). Teams members omit. */
  renderExpiresCell?: (row: TRow) => ReactNode;
  /** Golden directory sort — one value per column key. */
  getSortValue: (row: TRow, key: HubRouteAccessSortKey) => string | number;
  defaultSortKey?: HubRouteAccessSortKey;
  /** Secondary/tertiary order when primary sort values tie. */
  sortTieBreak?: DirectoryTableSortTieBreak<TRow>;
  /** Rich header hints (SSOT popover) — replaces native `title` when set. */
  columnHeaderHintOverrides?: Partial<Record<HubRouteAccessSortKey, HubDirectoryColumnHintContent>>;
  showSelectColumn?: boolean;
  isSelected?: (row: TRow) => boolean;
  onToggleSelect?: (row: TRow) => void;
  onToggleSelectAll?: () => void;
  allVisibleSelected?: boolean;
  canSelectRow?: (row: TRow) => boolean;
  selectAllLabel?: string;
  rowClassName?: (row: TRow) => string;
  /** Click a row (outside interactive cells) to open detail — SSOT: edit in modal, not inline. */
  onRowActivate?: (row: TRow) => void;
  ariaLabel?: string;
  pageSize?: number;
  /** Hide pager when all rows fit one page (Teams frame embeds). */
  hidePagerWhenSinglePage?: boolean;
  columnLayout?: HubRouteAccessColumnLayout;
  showRouteColumn?: boolean;
  /** Expanded layout — hide Synced/Linked column (default true). */
  showSyncAtColumn?: boolean;
  /** Teams — Profile (Service browser code). */
  showProfileColumn?: boolean;
  /** Teams — Password from linked Services/Mail account. */
  showPasswordColumn?: boolean;
  /** Teams — Recovery Mail from linked account. */
  showMailRecoverColumn?: boolean;
  /** Teams — Full Info from linked account. */
  showFullInfoColumn?: boolean;
  /** Teams — Source column (Service · Mail · Manual). */
  showSourceColumn?: boolean;
  showOwnershipColumn?: boolean;
  showLiveStatusColumn?: boolean;
  /** Teams — CRM Usage after Full Info. */
  showUsageColumn?: boolean;
  /** Teams — CRM Usage Expired after live Usage. */
  showUsageExpiredColumn?: boolean;
  /** Teams — Date / Duration / Due / Left columns. */
  showPlanScheduleColumns?: boolean;
  /** Hide Expires column (Teams remapped Status removed — Role Backup). Default true. */
  showExpiresColumn?: boolean;
  /** Teams schema cards — lock column tracks across stacked sibling tables. */
  stackAlignColumns?: boolean;
  /** Override column header labels (e.g. Synced→Plan, Loaded→Due). */
  columnLabelOverrides?: Partial<Record<HubRouteAccessSortKey, string>>;
  /** Sticker emoji overrides for column headers (Teams SSOT). */
  columnHeaderEmojiOverrides?: Partial<Record<HubRouteAccessSortKey, string>>;
};

/** Golden route-access modal table — P0004 User Access · P0020 Cookie Route. */
export function HubRouteAccessDirectoryTable<TRow>({
  items,
  resetKey,
  getRowKey,
  getUserDisplay,
  renderUserCell,
  renderRoleCell,
  renderProfileCell,
  renderPasswordCell,
  renderMailRecoverCell,
  renderFullInfoCell,
  renderSourceCell,
  renderSyncAtCell,
  renderLoadAtCell,
  renderOwnershipCell,
  renderLiveStatusCell,
  renderUsageCell,
  renderUsageExpiredCell,
  renderPlanDateCell,
  renderPlanDaysCell,
  renderPlanDueCell,
  renderPlanLeftCell,
  renderActivityCell,
  renderRouteCell,
  renderAddedAtCell,
  renderExpiresCell,
  getSortValue,
  defaultSortKey = "user",
  sortTieBreak,
  columnHeaderHintOverrides,
  showSelectColumn = true,
  isSelected,
  onToggleSelect,
  onToggleSelectAll: _onToggleSelectAll,
  allVisibleSelected: _allVisibleSelected = false,
  canSelectRow,
  selectAllLabel = "Select all on this page",
  rowClassName,
  onRowActivate,
  ariaLabel = "Route access table pages",
  pageSize,
  hidePagerWhenSinglePage = false,
  columnLayout = "expanded",
  showRouteColumn,
  showSyncAtColumn = true,
  showProfileColumn = false,
  showPasswordColumn = false,
  showMailRecoverColumn = false,
  showFullInfoColumn = false,
  showSourceColumn = false,
  showOwnershipColumn = false,
  showLiveStatusColumn = false,
  showUsageColumn = false,
  showUsageExpiredColumn = false,
  showPlanScheduleColumns = false,
  showExpiresColumn = true,
  stackAlignColumns = false,
  columnLabelOverrides,
  columnHeaderEmojiOverrides,
}: HubRouteAccessDirectoryTableProps<TRow>) {
  const columnOptions: HubRouteAccessModalColumnOptions = {
    layout: columnLayout,
    showRouteColumn,
    showSyncAtColumn,
    showProfileColumn,
    showPasswordColumn,
    showMailRecoverColumn,
    showFullInfoColumn,
    showSourceColumn,
    showOwnershipColumn,
    showLiveStatusColumn,
    showUsageColumn,
    showUsageExpiredColumn,
    showPlanScheduleColumns,
    showExpiresColumn,
    stackAlignColumns,
  };
  const { sortKey, sortDir, onSort, sorted } = useDirectoryTableSort(
    [...items],
    defaultSortKey,
    getSortValue,
    "asc",
    sortTieBreak,
  );
  const resolvedPageSize = useHubTablePageSize(pageSize);
  const pagination = useHubTablePagination(sorted, { resetKey, pageSize: resolvedPageSize });
  const pageItems = pagination.pageItems;
  const isRowSelected = (row: TRow) => isSelected?.(row) ?? false;
  const allPageSelected = hubPageAllSelectedByPredicate(pageItems, isRowSelected, canSelectRow);
  const showRoute =
    showRouteColumn ?? (columnLayout === "expanded" ? true : false);

  const columns = buildHubRouteAccessModalColumns(showSelectColumn, columnOptions).map((col) => {
    if (col.key === "select") {
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
    }

    const title = columnHeaderTitle(col.key);
    const sortKeyTyped = col.key as HubRouteAccessSortKey;
    const label = columnLabelOverrides?.[sortKeyTyped] ?? col.label;
    const headerEmoji =
      columnHeaderEmojiOverrides?.[sortKeyTyped] ??
      ("headerEmoji" in col ? (col as { headerEmoji?: string }).headerEmoji : undefined);
    const headerHint = columnHeaderHintOverrides?.[sortKeyTyped];
    const labelInner = (
      <span
        className={`hub-users-th-label${col.key === "user" ? " hub-users-th-label--start" : ""}`}
      >
        {col.role || headerEmoji ? (
          <HubTableColumnHeader
            label={label}
            role={col.role}
            headerEmoji={headerEmoji}
            enableFit={!HUB_ROUTE_ACCESS_HEADER_LABEL_ALWAYS.has(sortKeyTyped)}
          />
        ) : (
          <span className="hub-users-th-text">{label}</span>
        )}
        <HubSortIndicator active={sortKey === col.key} dir={sortDir} />
      </span>
    );
    const labelNode = headerHint ? (
      <HubDirectoryColumnHint
        content={headerHint}
        titleGlyph={headerEmoji ? { emoji: headerEmoji } : undefined}
      >
        {labelInner}
      </HubDirectoryColumnHint>
    ) : (
      labelInner
    );

    return {
      ...col,
      header: (
        <button
          type="button"
          className={`hub-users-th-btn${col.key === "user" ? " hub-users-th-btn--align-start" : ""}`}
          title={headerHint ? undefined : title}
          onClick={() => onSort(col.key as HubRouteAccessSortKey)}
          aria-sort={
            sortKey === col.key ? (sortDir === "asc" ? "ascending" : "descending") : "none"
          }
        >
          {labelNode}
        </button>
      ),
    };
  });

  return (
    <>
      <HubDataTable
        columns={columns}
        tableClassName={hubRouteAccessModalTableClass(columnOptions)}
        wrapClassName={HUB_ROUTE_ACCESS_MODAL_TABLE_WRAP_CLASS}
        directorySelect={showSelectColumn}
      >
        {pageItems.map((row) => {
          const key = getRowKey(row);
          const user = getUserDisplay(row);
          const selected = isRowSelected(row);
          const selectable = canSelectRow?.(row) !== false;
          return (
            <tr
              key={key}
              className={`hub-users-row hub-users-row--static${selected ? " is-selected" : ""}${
                onRowActivate ? " cursor-pointer" : ""
              }${rowClassName?.(row) ?? ""}`}
              onClick={onRowActivate ? () => onRowActivate(row) : undefined}
            >
              {showSelectColumn ? (
                <td className={HUB_ROUTE_ACCESS_COL.select} onClick={(e) => e.stopPropagation()}>
                  {selectable ? (
                    <label className="hub-users-select-row">
                      <input
                        type="checkbox"
                        className="hub-checkbox"
                        checked={selected}
                        onChange={() => onToggleSelect?.(row)}
                        aria-label={`Select row ${key}`}
                      />
                    </label>
                  ) : null}
                </td>
              ) : null}
              <td
                className={`${HUB_ROUTE_ACCESS_COL.user} mono text-left`}
                title={user.title ?? user.label}
              >
                {renderUserCell ? renderUserCell(row, user) : user.label}
              </td>
              <td className={HUB_ROUTE_ACCESS_COL.role}>
                <div className="hub-users-role-cell">{renderRoleCell(row)}</div>
              </td>
              {showSourceColumn ? (
                <td className={`${HUB_ROUTE_ACCESS_COL.source} hub-users-cell-muted text-center`}>
                  {renderSourceCell?.(row)}
                </td>
              ) : null}
              {showOwnershipColumn ? (
                <td className={`${HUB_ROUTE_ACCESS_COL.ownership} hub-users-cell-muted text-center`}>
                  {renderOwnershipCell?.(row)}
                </td>
              ) : null}
              {showLiveStatusColumn ? (
                <td className={`${HUB_ROUTE_ACCESS_COL.liveStatus} hub-users-cell-muted text-center`}>
                  {renderLiveStatusCell?.(row)}
                </td>
              ) : null}
              {showPlanScheduleColumns ? (
                <td className={`${HUB_ROUTE_ACCESS_COL.planLeft} hub-users-cell-muted text-center`}>
                  {renderPlanLeftCell?.(row)}
                </td>
              ) : null}
              {showProfileColumn ? (
                <td className={`${HUB_ROUTE_ACCESS_COL.profile} hub-users-cell-muted text-center`}>
                  {renderProfileCell?.(row)}
                </td>
              ) : null}
              {showPasswordColumn ? (
                <td className={`${HUB_ROUTE_ACCESS_COL.password} hub-users-cell-muted text-center`}>
                  {renderPasswordCell?.(row)}
                </td>
              ) : null}
              {showMailRecoverColumn ? (
                <td className={`${HUB_ROUTE_ACCESS_COL.mailRecover} hub-users-cell-muted text-center`}>
                  {renderMailRecoverCell?.(row)}
                </td>
              ) : null}
              {showFullInfoColumn ? (
                <td className={`${HUB_ROUTE_ACCESS_COL.fullInfo} hub-users-cell-muted text-center`}>
                  {renderFullInfoCell?.(row)}
                </td>
              ) : null}
              {showUsageColumn ? (
                <td className={`${HUB_ROUTE_ACCESS_COL.usage} hub-users-cell-muted text-center`}>
                  {renderUsageCell?.(row)}
                </td>
              ) : null}
              {showUsageExpiredColumn ? (
                <td className={`${HUB_ROUTE_ACCESS_COL.usageExpired} hub-users-cell-muted text-center`}>
                  {renderUsageExpiredCell?.(row)}
                </td>
              ) : null}
              {columnLayout === "expanded" ? (
                <>
                  {showSyncAtColumn ? (
                    <td className={`${HUB_ROUTE_ACCESS_COL.syncAt} hub-users-cell-muted text-center`}>
                      {renderSyncAtCell?.(row)}
                    </td>
                  ) : null}
                  <td className={`${HUB_ROUTE_ACCESS_COL.loadAt} hub-users-cell-muted text-center`}>
                    {renderLoadAtCell?.(row)}
                  </td>
                  {showPlanScheduleColumns ? (
                    <>
                      <td className={`${HUB_ROUTE_ACCESS_COL.planDate} hub-users-cell-muted text-center`}>
                        {renderPlanDateCell?.(row)}
                      </td>
                      <td className={`${HUB_ROUTE_ACCESS_COL.planDays} hub-users-cell-muted text-center`}>
                        {renderPlanDaysCell?.(row)}
                      </td>
                      <td className={`${HUB_ROUTE_ACCESS_COL.planDue} hub-users-cell-muted text-center`}>
                        {renderPlanDueCell?.(row)}
                      </td>
                    </>
                  ) : null}
                </>
              ) : (
                <td className={`${HUB_ROUTE_ACCESS_COL.activity} hub-users-cell-muted text-center`}>
                  {renderActivityCell?.(row)}
                </td>
              )}
              {showRoute ? (
                <td className={`${HUB_ROUTE_ACCESS_COL.route} text-center`}>{renderRouteCell?.(row)}</td>
              ) : null}
              <td className={`${HUB_ROUTE_ACCESS_COL.addedAt} hub-users-cell-muted text-center`}>
                {renderAddedAtCell(row)}
              </td>
              {showExpiresColumn ? (
                <td className={`${HUB_ROUTE_ACCESS_COL.expires} hub-users-cell-muted text-center`}>
                  {renderExpiresCell?.(row)}
                </td>
              ) : null}
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
        hideWhenSinglePage={hidePagerWhenSinglePage}
        ariaLabel={ariaLabel}
      />
    </>
  );
}
