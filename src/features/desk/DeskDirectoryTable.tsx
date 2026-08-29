/** body-only-directory — FilterBar / toolbar live on DeskDirectoryScreen (HubDirectoryScreen). */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HubDirectoryTableShell,
  buildDirectoryColgroupForShell,
  buildDirectoryColumns,
  hubDirectoryTableClass,
  type HubSortDir,
} from "@tool-workspace/hub-ui";
import { DESK_COLUMN_META } from "./desk-column-meta";
import { renderDeskDirectoryBodyCell, type DeskOpsCellHandlers, type DeskRow } from "./desk-directory-cells";
import { deskTablePrefs, type DeskCol } from "./desk-table-prefs";

export type { DeskRow };

type Props = {
  rows: DeskRow[];
  sortKey: DeskCol;
  sortDir: HubSortDir;
  onSort: (key: DeskCol) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  allVisibleSelected: boolean;
  opsHandlers?: DeskOpsCellHandlers;
  onRowClick?: (row: DeskRow) => void;
};

const KEYS: DeskCol[] = ["name", "status", "extra", "updated"];

export function DeskDirectoryTable({
  rows,
  sortKey,
  sortDir,
  onSort,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  allVisibleSelected,
  opsHandlers,
  onRowClick,
}: Props) {
  const [columnTick, setColumnTick] = useState(0);
  useEffect(() => {
    const sync = () => setColumnTick((n) => n + 1);
    window.addEventListener(deskTablePrefs.changeEvent, sync);
    return () => window.removeEventListener(deskTablePrefs.changeEvent, sync);
  }, []);

  const visible = useMemo(() => {
    void columnTick;
    return deskTablePrefs.read();
  }, [columnTick]);
  const keys = useMemo(() => KEYS.filter((k) => visible.has(k)), [visible]);
  const columns = useMemo(() => buildDirectoryColumns(keys, DESK_COLUMN_META), [keys]);
  const colgroup = useMemo(() => buildDirectoryColgroupForShell(columns, { showSelect: true }), [columns]);

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

  return (
    <HubDirectoryTableShell
      items={rows}
      ariaLabel="Desk directory"
      tableClassName={hubDirectoryTableClass("default")}
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
      onRowClick={onRowClick}
      renderRowCells={renderRowCells}
    />
  );
}
