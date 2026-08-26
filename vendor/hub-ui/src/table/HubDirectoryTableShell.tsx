import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { resolveHubTableColumnMeta } from "./hub-table-column-meta";
import { HubPaginatedTableShell } from "../content/HubPaginatedTableShell";
import { HUB_DIRECTORY_TABLE_INLINE_WRAP_CLASS } from "./directory-table-scroll";
import { DirectoryInlineTable } from "./DirectoryInlineTable";
import { DirectorySplitScrollTable } from "./DirectorySplitScrollTable";
import { hubPageAllSelected, hubTogglePageSelectAll, type HubServerPaginationControl } from "./hub-table-pagination";
import { useHubTablePageSize } from "./hub-table-page-size";
import { HubTableColumnHeader, type HubTableColumnHeaderProps } from "../content/HubTableColumnHeader";
import {
  HubDirectoryColumnHint,
  type HubDirectoryColumnHintContent,
} from "./HubDirectoryColumnHint";
import type { HubTableColumnRole } from "./hub-table-column-meta";
import { HubSortIndicator, type HubSortDir } from "./HubSortIndicator";

export type HubDirectoryTableColumn<TKey extends string> = {
  key: TKey;
  label: string;
  role: HubTableColumnRole;
  colClass: string;
  sortable?: boolean;
  headerAlign?: "start" | "center";
  headerIcon?: HubTableColumnHeaderProps["icon"];
  headerIconClassName?: string;
  headerBrandIcon?: HubTableColumnHeaderProps["brandIcon"];
  headerEmoji?: string;
  headerImageSrc?: string;
  /** Native title fallback when rich hint is absent. */
  headerTooltip?: string;
  /** Rich multi-line popover with icon rows. */
  headerHint?: HubDirectoryColumnHintContent;
  /** Keep sticker + full header text (no icon-only collapse). Default true. */
  enableFit?: boolean;
};

export type HubDirectoryTableStaticColumn = {
  label: string;
  role: HubTableColumnRole;
  colClass: string;
};

export type HubDirectoryTableShellProps<TItem, TSortKey extends string> = {
  items: TItem[];
  ariaLabel: string;
  tableClassName?: string;
  columns: HubDirectoryTableColumn<TSortKey>[];
  staticColumns?: HubDirectoryTableStaticColumn[];
  sortKey: TSortKey;
  sortDir: HubSortDir;
  onSort: (key: TSortKey) => void;
  getRowKey: (item: TItem) => string;
  onRowClick?: (item: TItem) => void;
  onRowDoubleClick?: (item: TItem) => void;
  onRowMouseEnter?: (item: TItem) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
  allVisibleSelected?: boolean;
  selectAllLabel?: string;
  emptyMessage?: string;
  pageSize?: number;
  /** Reset to page 1 when search/filter/sort changes (share with card grid). */
  resetKey?: string | number | boolean | null;
  wrapClassName?: string;
  /** Inside modal section panel — no outer border/radius on table wrap. */
  flushWrap?: boolean;
  colgroup?: ReactNode;
  getRowClassName?: (item: TItem) => string;
  /** When false, row has no select checkbox (e.g. route owner row). */
  canSelectRow?: (item: TItem) => boolean;
  /** Hide pager when total rows ≤ page size. */
  hideWhenSinglePage?: boolean;
  /** Server-side page slice — see HubPaginatedTableShell.serverPagination. */
  serverPagination?: HubServerPaginationControl;
  /** Pad tbody with empty rows up to page size (stable directory height). */
  padBodyRowsToPageSize?: boolean;
  /** Extra classes on HubPaginatedTableShell root (sheet grid: flex column). */
  paginatedShellClassName?: string;
  renderRowCells: (item: TItem) => ReactNode;
  renderStaticCells?: (item: TItem) => ReactNode;
};

/**
 * Split head/body only in flex-pane (HubSplitDirectoryPane).
 * Standalone directory screens (P0004 Hub/Users/Dashboard) use inline table + sticky thead
 * — see hub-split-scroll.css `.hub-directory-table-scroll:not(.hub-directory-table-split)`.
 */
function useSplitDirectoryScroll(wrapClassName: string) {
  return wrapClassName.includes("hub-directory-table-scroll--flex-pane");
}

function buildDirectoryPadBodyRows<TSortKey extends string>(
  padCount: number,
  columns: HubDirectoryTableColumn<TSortKey>[],
  staticColumns: HubDirectoryTableStaticColumn[],
  showSelect: boolean,
) {
  if (padCount <= 0) return [];
  return Array.from({ length: padCount }, (_, index) => (
    <tr key={`__hub-pad-row-${index}`} className="hub-users-row hub-users-row--pad" aria-hidden>
      {showSelect ? <td className="hub-users-col--select" /> : null}
      {columns.map((col) => (
        <td key={col.key} className={col.colClass} />
      ))}
      {staticColumns.map((col) => (
        <td key={`${col.colClass}-${col.label}`} className={col.colClass} />
      ))}
    </tr>
  ));
}

/** Row event callbacks live in a ref so they never bust DirectoryBodyRow memo. */
type DirectoryRowCallbacks<TItem> = {
  onRowClick?: (item: TItem) => void;
  onRowDoubleClick?: (item: TItem) => void;
  onRowMouseEnter?: (item: TItem) => void;
};

type DirectoryBodyRowProps<TItem> = {
  item: TItem;
  rowKey: string;
  selected: boolean;
  rowCanSelect: boolean;
  showSelect: boolean;
  /** Pre-computed class string (getRowClassName result) so memo compares a primitive. */
  extraClassName: string;
  /** Row opens detail / activates — cursor + affordance. */
  rowClickable: boolean;
  renderRowCells: (item: TItem) => ReactNode;
  renderStaticCells?: (item: TItem) => ReactNode;
  onToggleSelect?: (id: string) => void;
  beginDragSelect: (id: string, selected: boolean) => void;
  extendDragSelect: (id: string, canSelect: boolean) => void;
  callbacksRef: MutableRefObject<DirectoryRowCallbacks<TItem>>;
};

/**
 * Memoized body row — only re-renders when its own item/selected/class change.
 * Keeps a checkbox toggle (or drag-sweep) from re-rendering every other row's
 * (expensive) cells, so click + multi-select feel instant. Row event callbacks
 * are read through `callbacksRef` so unstable parent closures don't bust memo;
 * `renderRowCells` must stay referentially stable across selection changes
 * (wrap it in useCallback keyed to columns/search — not selection).
 */
function DirectoryBodyRowInner<TItem>({
  item,
  rowKey,
  selected,
  rowCanSelect,
  showSelect,
  extraClassName,
  rowClickable,
  renderRowCells,
  renderStaticCells,
  onToggleSelect,
  beginDragSelect,
  extendDragSelect,
  callbacksRef,
}: DirectoryBodyRowProps<TItem>) {
  return (
    <tr
      className={`hub-users-row${selected ? " is-selected" : ""}${
        rowClickable ? " cursor-pointer" : ""
      }${extraClassName ? ` ${extraClassName.trim()}` : ""}`}
      onClick={() => callbacksRef.current.onRowClick?.(item)}
      onDoubleClick={() => callbacksRef.current.onRowDoubleClick?.(item)}
      onMouseEnter={() => {
        if (showSelect) extendDragSelect(rowKey, rowCanSelect);
        callbacksRef.current.onRowMouseEnter?.(item);
      }}
    >
      {showSelect ? (
        <td
          className="hub-users-col--select"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={
            rowCanSelect
              ? (e) => {
                  if (e.button === 0) beginDragSelect(rowKey, selected);
                }
              : undefined
          }
        >
          {rowCanSelect ? (
            <label className="hub-users-select-row">
              <input
                type="checkbox"
                className="hub-checkbox"
                checked={selected}
                onChange={() => onToggleSelect?.(rowKey)}
                aria-label={`Select row ${rowKey}`}
              />
            </label>
          ) : null}
        </td>
      ) : null}
      {renderRowCells(item)}
      {renderStaticCells?.(item)}
    </tr>
  );
}

const DirectoryBodyRow = memo(DirectoryBodyRowInner) as typeof DirectoryBodyRowInner;

/**
 * Golden directory table chrome — select column, sortable headers, pager shell.
 * Golden: P0004 HubToolsDirectoryTable · UserDirectoryTable · DashboardScreensTable.
 */
export function HubDirectoryTableShell<TItem, TSortKey extends string>({
  items,
  ariaLabel,
  tableClassName = "hub-users-table",
  columns,
  staticColumns = [],
  sortKey,
  sortDir,
  onSort,
  getRowKey,
  onRowClick,
  onRowDoubleClick,
  onRowMouseEnter,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  allVisibleSelected = false,
  selectAllLabel = "Select all on this page",
  emptyMessage = "No rows match the current filters.",
  pageSize,
  resetKey,
  wrapClassName = HUB_DIRECTORY_TABLE_INLINE_WRAP_CLASS,
  flushWrap = false,
  colgroup,
  getRowClassName,
  canSelectRow,
  hideWhenSinglePage,
  serverPagination,
  padBodyRowsToPageSize = false,
  paginatedShellClassName,
  renderRowCells,
  renderStaticCells,
}: HubDirectoryTableShellProps<TItem, TSortKey>) {
  const showSelect = Boolean(onToggleSelect);
  const splitScroll = useSplitDirectoryScroll(wrapClassName);
  const resolvedPageSize = useHubTablePageSize(pageSize);

  // Drag-to-select — hold left button on a row's checkbox and sweep over adjacent
  // rows to toggle them all to one target state (P0004 directory parity, shared SSOT).
  const dragRef = useRef<{
    active: boolean;
    target: boolean;
    startId: string;
    startSelected: boolean;
    processed: Set<string>;
  } | null>(null);
  const [dragging, setDragging] = useState(false);
  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;
  const onToggleSelectRef = useRef(onToggleSelect);
  onToggleSelectRef.current = onToggleSelect;

  // Row event handlers live in a ref → stable identity keeps DirectoryBodyRow memo
  // intact even when a parent recreates these closures on every selection toggle.
  const rowCallbacksRef = useRef<DirectoryRowCallbacks<TItem>>({});
  rowCallbacksRef.current = { onRowClick, onRowDoubleClick, onRowMouseEnter };

  const endDragSelect = useCallback(() => {
    if (dragRef.current) dragRef.current = null;
    setDragging(false);
  }, []);

  const applyDragToRow = useCallback((id: string) => {
    const state = dragRef.current;
    if (!state || state.processed.has(id)) return;
    state.processed.add(id);
    const isSelected = selectedIdsRef.current?.has(id) ?? false;
    if (isSelected !== state.target) onToggleSelectRef.current?.(id);
  }, []);

  const beginDragSelect = useCallback((id: string, selected: boolean) => {
    dragRef.current = {
      active: false,
      target: !selected,
      startId: id,
      startSelected: selected,
      processed: new Set(),
    };
  }, []);

  const extendDragSelect = useCallback(
    (id: string, canSelect: boolean) => {
      const state = dragRef.current;
      if (!state) return;
      if (!state.active) {
        // Second row entered while button held → this is a sweep, not a plain click.
        state.active = true;
        setDragging(true);
        applyDragToRow(state.startId);
      }
      if (canSelect) applyDragToRow(id);
    },
    [applyDragToRow],
  );

  useEffect(() => {
    if (!showSelect) return;
    const onUp = () => endDragSelect();
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  }, [showSelect, endDragSelect]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (dragging) {
      const prev = document.body.style.userSelect;
      document.body.style.userSelect = "none";
      window.getSelection?.()?.removeAllRanges();
      return () => {
        document.body.style.userSelect = prev;
      };
    }
    return undefined;
  }, [dragging]);

  const columnHeaderProps = (col: (typeof columns)[number]) => {
    const fit = col.enableFit === false ? { enableFit: false as const } : {};
    return col.headerEmoji
      ? { label: col.label, headerEmoji: col.headerEmoji, ...fit }
      : col.headerImageSrc
        ? { label: col.label, headerImageSrc: col.headerImageSrc, ...fit }
        : col.headerIcon || col.headerBrandIcon
          ? {
              label: col.label,
              icon: col.headerIcon,
              iconClassName: col.headerIconClassName,
              brandIcon: col.headerBrandIcon,
              ...fit,
            }
          : { label: col.label, role: col.role, ...fit };
  };

  const renderThLabel = (
    col: (typeof columns)[number],
    sortIndicator?: ReactNode,
  ) => {
    const labelClass = `hub-users-th-label${col.headerAlign === "start" ? " hub-users-th-label--start" : ""}`;
    const label = (
      <span className={labelClass}>
        <HubTableColumnHeader {...columnHeaderProps(col)} />
        {sortIndicator}
      </span>
    );
    if (col.headerHint) {
      const roleMeta = resolveHubTableColumnMeta(col.role);
      return (
        <HubDirectoryColumnHint
          content={col.headerHint}
          titleGlyph={
            col.headerEmoji
              ? { emoji: col.headerEmoji }
              : col.headerImageSrc
                ? { brandIcon: col.headerBrandIcon }
                : {
                    icon: col.headerIcon ?? roleMeta?.icon,
                    brandIcon: col.headerBrandIcon,
                    toneClass: col.headerIconClassName ?? roleMeta?.iconClassName ?? "hub-users-th-icon--name",
                  }
          }
        >
          {label}
        </HubDirectoryColumnHint>
      );
    }
    return label;
  };

  const headerTitleAttr = (col: (typeof columns)[number]) => col.headerTooltip ?? col.label;

  const wrapBorder = flushWrap ? "" : " rounded-2xl border border-white/5";
  const resolvedWrapClass = `hub-users-table-wrap${splitScroll ? " hub-directory-table-split" : ""} ${wrapClassName}${wrapBorder}`;

  return (
    <HubPaginatedTableShell
      items={items}
      ariaLabel={ariaLabel}
      pageSize={pageSize}
      resetKey={resetKey}
      hideWhenSinglePage={hideWhenSinglePage}
      serverPagination={serverPagination}
      className={paginatedShellClassName}
    >
      {(pageItems) => {
        const allPageSelected = hubPageAllSelected(pageItems, getRowKey, selectedIds, canSelectRow);

        const headRow = (
          <tr>
            {showSelect ? (
              <th className="hub-users-col--select" scope="col">
                <label className="hub-users-select-all">
                  <input
                    type="checkbox"
                    className="hub-checkbox"
                    checked={pageItems.length > 0 && allPageSelected}
                    onChange={() =>
                      hubTogglePageSelectAll(pageItems, getRowKey, selectedIds, onToggleSelect, canSelectRow)
                    }
                    aria-label={selectAllLabel}
                  />
                </label>
              </th>
            ) : null}
            {columns.map((col) => (
              <th key={col.key} className={col.colClass} scope="col" title={headerTitleAttr(col)}>
                {col.sortable === false ? (
                  <span
                    className={`hub-users-th-btn hub-users-th-btn--static${col.headerAlign === "start" ? " hub-users-th-btn--align-start" : ""}`}
                    title={headerTitleAttr(col)}
                  >
                    {renderThLabel(col)}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="hub-users-th-btn"
                    onClick={() => onSort(col.key)}
                    aria-sort={sortKey === col.key ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                    title={headerTitleAttr(col)}
                  >
                    {renderThLabel(
                      col,
                      <HubSortIndicator active={sortKey === col.key} dir={sortDir} />,
                    )}
                  </button>
                )}
              </th>
            ))}
            {staticColumns.map((col) => (
              <th key={col.colClass + col.label} className={col.colClass} scope="col">
                <span className="hub-users-th-btn hub-users-th-btn--static">
                  <span className="hub-users-th-label">
                    <HubTableColumnHeader label={col.label} role={col.role} />
                  </span>
                </span>
              </th>
            ))}
          </tr>
        );

        const bodyRows = pageItems.map((item) => {
          const rowKey = getRowKey(item);
          const selected = selectedIds?.has(rowKey) ?? false;
          const rowCanSelect = canSelectRow?.(item) !== false;
          return (
            <DirectoryBodyRow
              key={rowKey}
              item={item}
              rowKey={rowKey}
              selected={selected}
              rowCanSelect={rowCanSelect}
              showSelect={showSelect}
              extraClassName={getRowClassName?.(item) ?? ""}
              rowClickable={Boolean(onRowClick)}
              renderRowCells={renderRowCells}
              renderStaticCells={renderStaticCells}
              onToggleSelect={onToggleSelect}
              beginDragSelect={beginDragSelect}
              extendDragSelect={extendDragSelect}
              callbacksRef={rowCallbacksRef}
            />
          );
        });

        const padCount = padBodyRowsToPageSize ? Math.max(0, resolvedPageSize - pageItems.length) : 0;
        const padRows =
          padCount > 0
            ? buildDirectoryPadBodyRows(padCount, columns, staticColumns, showSelect)
            : [];

        const allBodyRows = (
          <>
            {bodyRows}
            {padRows}
          </>
        );

        const tableHasRows = pageItems.length > 0 || padRows.length > 0;

        if (splitScroll) {
          return (
            <DirectorySplitScrollTable
              wrapClassName={resolvedWrapClass}
              tableClassName={tableClassName}
              showSelect={showSelect}
              colgroup={colgroup}
              headRow={headRow}
              bodyRows={allBodyRows}
              emptyMessage={emptyMessage}
              hasRows={tableHasRows}
              scrollResetKey={resetKey}
            />
          );
        }

        return (
          <DirectoryInlineTable
            wrapClassName={resolvedWrapClass}
            tableClassName={tableClassName}
            showSelect={showSelect}
            colgroup={colgroup}
            headRow={headRow}
            bodyRows={allBodyRows}
            emptyMessage={emptyMessage}
            hasRows={tableHasRows}
          />
        );
      }}
    </HubPaginatedTableShell>
  );
}

export type { HubTableColumnHeaderProps };
