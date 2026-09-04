/** body-only-directory · table-only-directory · no-read-only-table · no-form-directory — FilterBar / toolbar live on DeskDirectoryScreen (HubDirectoryScreen). */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HubDirectoryTableShell,
  HUB_DIRECTORY_TABLE_INLINE_WRAP_CLASS,
  HUB_DIRECTORY_TABLE_PANE_WRAP_CLASS,
  applyChromeRemDirectoryColWidths,
  buildDirectoryColgroup,
  buildDirectoryColumns,
  hubDirectoryFrameTableClass,
  type HubSortDir,
} from "@tool-workspace/hub-ui";
import type { AppScreen } from "../../lib/app-screen";
import { DESK_COLUMN_META } from "./desk-column-meta";
import { renderDeskDirectoryBodyCell, type DeskOpsCellHandlers, type DeskRow } from "./desk-directory-cells";
import { deskDirectoryScreenOrClips, deskTablePrefsFor, type DeskCol } from "./desk-table-prefs";

export type { DeskRow };

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
  onRowClick?: (row: DeskRow) => void;
  pageSize: number;
  /** Inside HubSplitDirectoryPane — pane supplies rounded chrome; catalog uses table wrap. */
  flushWrap?: boolean;
  /** P0003 Profiles parity — equal-height rows; pane wrap overflow-y hidden (no thead color seam). */
  panelFill?: boolean;
  /** Display manual sort OFF — non-interactive headers (P0005 / P0020 SSOT). */
  defaultSortOnly?: boolean;
};

const BASE_KEYS: DeskCol[] = ["name", "status", "extra", "updated"];
const OPS_KEYS: DeskCol[] = ["name", "run", "status", "extra", "updated"];
/** Rem-locked chrome — Detail (`extra`) stays fluid (CSS absorber). */
const DESK_PINNED_COL_KEYS = new Set<DeskCol>(["name", "run", "status", "updated"]);

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
  onRowClick,
  pageSize,
  flushWrap = false,
  panelFill = false,
  defaultSortOnly = false,
}: Props) {
  const tableScreen = deskDirectoryScreenOrClips(screen);
  const tablePrefs = deskTablePrefsFor(tableScreen);
  const [columnTick, setColumnTick] = useState(0);
  useEffect(() => {
    const sync = () => setColumnTick((n) => n + 1);
    window.addEventListener(tablePrefs.changeEvent, sync);
    return () => window.removeEventListener(tablePrefs.changeEvent, sync);
  }, [tablePrefs.changeEvent]);

  const visible = useMemo(() => {
    void columnTick;
    return tablePrefs.read();
  }, [columnTick, tablePrefs]);
  const keys = useMemo(() => {
    const order = opsHandlers ? OPS_KEYS : BASE_KEYS;
    return order.filter((key) => key === "run" || visible.has(key));
  }, [opsHandlers, visible]);
  const columns = useMemo(
    () =>
      buildDirectoryColumns(keys, DESK_COLUMN_META).map((col) => ({
        ...col,
        sortable: defaultSortOnly ? false : col.sortable !== false,
      })),
    [defaultSortOnly, keys],
  );
  const colgroup = useMemo(
    () =>
      buildDirectoryColgroup(
        applyChromeRemDirectoryColWidths(
          columns,
          keys.filter((key) => DESK_PINNED_COL_KEYS.has(key)),
        ),
        { includeSelect: true },
      ),
    [columns, keys],
  );

  const renderRowCells = useCallback(
    (row: DeskRow) => (
      <>
        {keys.map((key) => {
          const col = columns.find((c) => c.key === key);
          if (!col) return null;
          return renderDeskDirectoryBodyCell(row, key, col, opsHandlers);
        })}
      </>
    ),
    [columns, keys, opsHandlers],
  );

  const paneChrome = Boolean(panelFill || flushWrap);

  return (
    <HubDirectoryTableShell
      items={rows}
      ariaLabel="Desk directory"
      tableClassName={`${hubDirectoryFrameTableClass()} hub-users-table--desk-directory`}
      wrapClassName={paneChrome ? HUB_DIRECTORY_TABLE_PANE_WRAP_CLASS : HUB_DIRECTORY_TABLE_INLINE_WRAP_CLASS}
      paginatedShellClassName={paneChrome ? "flex min-h-0 min-w-0 flex-1 flex-col" : undefined}
      flushWrap={flushWrap}
      colgroup={colgroup}
      columns={columns}
      sortKey={sortKey}
      sortDir={sortDir}
      onSort={onSort}
      getRowKey={(row) => row.id}
      selectedIds={selectedIds}
      onToggleSelect={onToggleSelect}
      onToggleSelectAll={onToggleSelectAll}
      allVisibleSelected={allVisibleSelected}
      selectAllLabel="Select all on this page"
      emptyMessage="No rows."
      pageSize={pageSize}
      resetKey={resetKey}
      onRowClick={onRowClick}
      padBodyRowsToPageSize={panelFill}
      renderRowCells={renderRowCells}
    />
  );
}
