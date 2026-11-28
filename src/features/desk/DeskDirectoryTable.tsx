/** body-only-directory · table-only-directory · no-read-only-table · no-form-directory — FilterBar / toolbar live on DeskDirectoryScreen (HubDirectoryScreen). */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HubDirectoryTableShell,
  HUB_DIRECTORY_ROW_PINNED_CLASS,
  HUB_DIRECTORY_TABLE_INLINE_WRAP_CLASS,
  buildDirectoryColgroup,
  buildDirectoryColumns,
  hubDirectoryFrameTableClass,
  useHubScopedFreeze,
  type HubSortDir,
} from "@tool-workspace/hub-ui";
import type { AppScreen } from "../../lib/app-screen";
import { getDeskColumnMeta } from "./desk-column-meta";
import {
  renderDeskDirectoryBodyCell,
  type DeskOpsAction,
  type DeskOpsCellHandlers,
  type DeskRow,
} from "./desk-directory-cells";
import {
  DESK_STICKY_LEAD_CLASS,
  deskColumnKeysFor,
  deskDirectoryScreenOrClips,
  deskFreezePrefsFor,
  deskTablePrefsFor,
  type DeskCol,
} from "./desk-table-prefs";

export type { DeskOpsAction, DeskOpsCellHandlers, DeskRow };

type Props = {
  screen: AppScreen;
  rows: DeskRow[];
  resetKey?: string | number | boolean | null;
  sortKey: DeskCol;
  sortDir: HubSortDir;
  onSort: (key: DeskCol) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  allVisibleSelected: boolean;
  opsHandlers?: DeskOpsCellHandlers;
  onPinToggle?: (id: string, nextPinned: boolean) => void;
  onRowClick?: (row: DeskRow) => void;
  pageSize: number;
  /** Display manual sort OFF — non-interactive headers (P0005 / P0020 SSOT). */
  defaultSortOnly?: boolean;
};

export function DeskDirectoryTable({
  screen,
  rows,
  resetKey,
  sortKey,
  sortDir,
  onSort,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  allVisibleSelected,
  opsHandlers,
  onPinToggle,
  onRowClick,
  pageSize,
  defaultSortOnly = false,
}: Props) {
  const tableScreen = deskDirectoryScreenOrClips(screen);
  const tablePrefs = deskTablePrefsFor(tableScreen);
  const freezePrefs = deskFreezePrefsFor(tableScreen);
  const [columnTick, setColumnTick] = useState(0);
  useEffect(() => {
    const sync = () => setColumnTick((n) => n + 1);
    window.addEventListener(tablePrefs.changeEvent, sync);
    return () => window.removeEventListener(tablePrefs.changeEvent, sync);
  }, [tablePrefs.changeEvent]);

  const { visible, ordered } = useMemo(() => {
    void columnTick;
    return {
      visible: tablePrefs.read(),
      ordered: tablePrefs.readOrder(),
    };
  }, [columnTick, tablePrefs]);
  const keys = useMemo(() => {
    const allowed = new Set(deskColumnKeysFor(tableScreen));
    const baseOrder = ordered.length > 0 ? ordered : [...allowed];
    return baseOrder.filter(
      (key) => allowed.has(key) && ((Boolean(opsHandlers) && key === "run") || key === "name" || visible.has(key)),
    );
  }, [opsHandlers, ordered, tableScreen, visible]);
  const columns = useMemo(
    () =>
      buildDirectoryColumns(keys, getDeskColumnMeta(tableScreen)).map((col) => ({
        ...col,
        sortable: defaultSortOnly ? false : col.sortable !== false,
      })),
    [defaultSortOnly, keys, tableScreen],
  );
  const colgroup = useMemo(
    () => buildDirectoryColgroup(columns, { includeSelect: true }),
    [columns],
  );
  const colByKey = useMemo(() => new Map(columns.map((c) => [c.key, c])), [columns]);
  const getRowKey = useCallback((row: DeskRow) => row.id, []);
  const getRowClassName = useCallback(
    (row: DeskRow) => (row.pinned ? ` ${HUB_DIRECTORY_ROW_PINNED_CLASS}` : ""),
    [],
  );

  const renderRowCells = useCallback(
    (row: DeskRow) => (
      <>
        {keys.map((key) => {
          const col = colByKey.get(key);
          if (!col) return null;
          return renderDeskDirectoryBodyCell(row, key, col, opsHandlers, onPinToggle);
        })}
      </>
    ),
    [colByKey, keys, onPinToggle, opsHandlers],
  );

  const { rootRef, stickyStyle, scrollWrapClassName, stickyScopeClass } = useHubScopedFreeze({
    prefs: freezePrefs,
    columns,
    scopeClass: DESK_STICKY_LEAD_CLASS[tableScreen],
    leftMode: "measured",
  });

  return (
    <div ref={rootRef} className="min-w-0">
      {stickyStyle}
      <HubDirectoryTableShell
        items={rows}
        ariaLabel="Desk directory"
        tableClassName={`${hubDirectoryFrameTableClass()} hub-users-table--desk-directory ${stickyScopeClass}`}
        wrapClassName={scrollWrapClassName || HUB_DIRECTORY_TABLE_INLINE_WRAP_CLASS}
        colgroup={colgroup}
        columns={columns}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={onSort}
        getRowKey={getRowKey}
        getRowClassName={getRowClassName}
        selectedIds={selectedIds}
        onToggleSelect={onToggleSelect}
        onToggleSelectAll={onToggleSelectAll}
        allVisibleSelected={allVisibleSelected}
        selectAllLabel="Select all on this page"
        emptyMessage="No rows match the current filters."
        pageSize={pageSize}
        resetKey={resetKey}
        onRowClick={onRowClick}
        renderRowCells={renderRowCells}
      />
    </div>
  );
}
