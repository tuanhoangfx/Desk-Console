/** body-only-directory — FilterBar lives on DrivesScreen (split-workspace). */
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  HUB_DIRECTORY_TABLE_PANE_CHROME_SPLIT_CLASS,
  HUB_DIRECTORY_TABLE_SCROLL_FLEX_CLASS,
  HubDirectoryTableShell,
  buildDirectoryColgroupForShell,
  buildDirectoryColumns,
  hubDirectoryFrameTableClass,
  useDirectoryTableSort,
  useHubScopedFreeze,
  type HubDirectoryTableColumn,
  type HubSortDir,
} from "@tool-workspace/hub-ui";
import { compareDriveCodes, sequentialDriveCodeSortRank } from "../../../host/job-code.mjs";
import { DRIVES_COLUMN_META, toDrivesHubDirectoryColumnMeta, type DrivesColumnKey } from "../../lib/drives-directory-meta";
import { DRIVES_DIRECTORY_COLUMNS_CHANGE, drivesTableFreezePrefs, readDrivesDirectoryColumns } from "../../lib/drives-table-prefs";
import type { DriveAccount, SyncJob } from "../../lib/sync-api";
import { renderDrivesDirectoryBodyCell } from "./drives-directory-cells";

const WRAP_CLASS = `${HUB_DIRECTORY_TABLE_SCROLL_FLEX_CLASS} ${HUB_DIRECTORY_TABLE_PANE_CHROME_SPLIT_CLASS}`;
const DRIVES_STICKY_LEAD_CLASS = "p0009-drives-directory-table--sticky-lead";
const HUB_META = toDrivesHubDirectoryColumnMeta(DRIVES_COLUMN_META);
const FREEZE_SELECT = Boolean(1);

type Props = {
  items: DriveAccount[];
  jobsByRemote: Record<string, SyncJob[]>;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  allVisibleSelected: boolean;
  onRowClick: (row: DriveAccount) => void;
  onOpenJob: (jobId: string) => void;
  pageSize?: number;
  resetKey?: string;
  emptyMessage?: string;
};

function sortableValue(row: DriveAccount, key: DrivesColumnKey) {
  if (key === "code") return sequentialDriveCodeSortRank(row.code);
  if (key === "account") return row.displayName || "";
  if (key === "gmail") return row.email || "";
  if (key === "jobs") return String(row.jobCount || 0).padStart(6, "0");
  if (key === "status") return row.authorized ? "signed" : "pending";
  if (key === "storage") return String(row.storage?.usedBytes ?? -1).padStart(16, "0");
  if (key === "files") return String(row.inventory?.fileCount ?? -1).padStart(8, "0");
  if (key === "log") return row.fileLog?.[0]?.at ?? "";
  if (key === "updated") return row.contentUpdatedAt ?? "";
  if (key === "created") return row.createdAt ?? "";
  return "";
}

export const DrivesDirectoryTable = memo(function DrivesDirectoryTable({
  items,
  jobsByRemote,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  allVisibleSelected,
  onRowClick,
  onOpenJob,
  pageSize = 20,
  resetKey,
  emptyMessage = "No Drive accounts — click New to sign in with Google.",
}: Props) {
  const [columnKeys, setColumnKeys] = useState<DrivesColumnKey[]>(() => readDrivesDirectoryColumns());
  useEffect(() => {
    const sync = () => setColumnKeys(readDrivesDirectoryColumns());
    window.addEventListener(DRIVES_DIRECTORY_COLUMNS_CHANGE, sync);
    return () => window.removeEventListener(DRIVES_DIRECTORY_COLUMNS_CHANGE, sync);
  }, []);
  const columns = useMemo(
    () => buildDirectoryColumns(columnKeys, HUB_META) as HubDirectoryTableColumn<DrivesColumnKey>[],
    [columnKeys],
  );
  const colgroup = useMemo(() => buildDirectoryColgroupForShell(columns, { showSelect: true }), [columns]);
  const { rootRef, stickyStyle } = useHubScopedFreeze({
    prefs: drivesTableFreezePrefs,
    columns: columns.map((col) => ({ colClass: col.colClass, width: DRIVES_COLUMN_META[col.key].width })),
    scopeClass: DRIVES_STICKY_LEAD_CLASS,
    includeSelect: FREEZE_SELECT,
    leftMode: "measured",
  });

  const { sorted, sortKey, sortDir, onSort } = useDirectoryTableSort<DrivesColumnKey, DriveAccount>(
    items,
    "code",
    sortableValue,
    "asc",
    (a, b) => compareDriveCodes(a.code || a.name, b.code || b.name),
  );

  const renderRowCells = useCallback(
    (row: DriveAccount) => (
      <>
        {columns.map((col) => renderDrivesDirectoryBodyCell(row, col, jobsByRemote, onOpenJob))}
      </>
    ),
    [columns, jobsByRemote, onOpenJob],
  );

  if (!columns.length) return null;

  return (
    <div ref={rootRef} className="flex min-h-0 min-w-0 flex-1 flex-col">
      {stickyStyle}
      <HubDirectoryTableShell<DriveAccount, DrivesColumnKey>
        items={sorted}
        ariaLabel="Google Drive accounts"
        tableClassName={`${hubDirectoryFrameTableClass("8")} p0009-drives-directory-table ${DRIVES_STICKY_LEAD_CLASS}`}
        wrapClassName={WRAP_CLASS}
        flushWrap
        colgroup={colgroup}
        columns={columns}
        sortKey={sortKey as DrivesColumnKey}
        sortDir={sortDir as HubSortDir}
        onSort={onSort}
        getRowKey={(row) => row.name}
        selectedIds={selectedIds}
        onToggleSelect={onToggleSelect}
        onToggleSelectAll={onToggleSelectAll}
        allVisibleSelected={allVisibleSelected}
        onRowClick={onRowClick}
        selectAllLabel="Select all on this page"
        emptyMessage={emptyMessage}
        pageSize={pageSize}
        resetKey={resetKey}
        hideWhenSinglePage={false}
        padBodyRowsToPageSize
        paginatedShellClassName="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        renderRowCells={renderRowCells}
      />
    </div>
  );
});
