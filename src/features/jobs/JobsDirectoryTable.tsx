/** body-only-directory · table-only-directory · no-form-directory — FilterBar lives on JobsScreen. */
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  HUB_DIRECTORY_TABLE_INLINE_WRAP_CLASS,
  HUB_DIRECTORY_TABLE_PANE_WRAP_CLASS,
  HubDirectoryTableShell,
  buildDirectoryColgroupForShell,
  buildDirectoryColumns,
  hubDirectoryFrameTableClass,
  useDirectoryTableSort,
  useHubScopedFreeze,
  type HubDirectoryTableColumn,
  type HubSortDir,
} from "@tool-workspace/hub-ui";
import { compareJobCodes, sequentialJobCodeSortRank } from "../../../host/job-code.mjs";
import { useDriveAccounts } from "../drives/use-drive-accounts";
import {
  jobModeLabel,
  jobRunAction,
  jobSettleSec,
  jobStatusView,
} from "../../lib/job-mode";
import {
  JOBS_COLUMN_META,
  toJobsHubDirectoryColumnMeta,
  type JobsColumnKey,
} from "../../lib/jobs-directory-meta";
import { JOBS_DIRECTORY_COLUMNS_CHANGE, jobsTableFreezePrefs, readJobsDirectoryColumns } from "../../lib/jobs-table-prefs";
import { remotePathFromSpec } from "../../lib/remote-name";
import type { SyncJob } from "../../lib/sync-api";
import { renderJobsDirectoryBodyCell } from "./jobs-directory-cells";

/** Same wrap as P0005 Orders: one table, scroll on the wrap, not a flex-pane split. */
const WRAP_CLASS = `${HUB_DIRECTORY_TABLE_INLINE_WRAP_CLASS} hub-scrollbar`;
const JOBS_STICKY_LEAD_CLASS = "p0009-jobs-directory-table--sticky-lead";
const HUB_META = toJobsHubDirectoryColumnMeta(JOBS_COLUMN_META);

/** Seconds until a sync could start: live countdown, then saved debounce, then Manual, then Stopped. */
function jobDebounceSortSec(row: SyncJob): number {
  if (row.status === "paused" || row.status === "stopped") return Number.MAX_SAFE_INTEGER;
  const at = row.nextSyncAt ? Date.parse(row.nextSyncAt) : NaN;
  if (Number.isFinite(at)) return Math.max(0, (at - Date.now()) / 1000);
  const sec = jobSettleSec(row.settleSec);
  return sec === 0 ? Number.MAX_SAFE_INTEGER - 1 : sec;
}

function sortableValue(row: SyncJob, key: JobsColumnKey): string | number {
  if (key === "code") return sequentialJobCodeSortRank(row.code);
  if (key === "name") return row.name.toLowerCase();
  if (key === "local") return row.localPath.toLowerCase();
  if (key === "remote" || key === "folder") return remotePathFromSpec(row.remote).toLowerCase();
  if (key === "status") return jobStatusView(row).label;
  if (key === "run") return jobRunAction(row, false).label;
  if (key === "next") return jobDebounceSortSec(row);
  if (key === "mode") return jobModeLabel(row.mode).toLowerCase();
  if (key === "log") return row.activityLog?.[0]?.at ?? "";
  if (key === "updated") return row.updatedAt ?? "";
  if (key === "created") return row.createdAt ?? "";
  return row.updatedAt || row.createdAt || "";
}

type Props = {
  items: SyncJob[];
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
  allVisibleSelected?: boolean;
  /** Modal slice: same columns, no checkbox, no padded blank rows. */
  embedded?: boolean;
  /** Fixed column set. The Jobs screen keeps the saved column prefs. */
  visibleKeys?: JobsColumnKey[];
  onRowClick?: (row: SyncJob) => void;
  onStart?: (id: string) => void;
  onPause?: (id: string) => void;
  onStop?: (id: string) => void;
  busyId?: string | null;
  pageSize?: number;
  resetKey?: string;
  emptyMessage?: string;
};

export const JobsDirectoryTable = memo(function JobsDirectoryTable({
  items,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  allVisibleSelected = false,
  embedded = false,
  visibleKeys,
  onRowClick,
  onStart,
  onPause,
  onStop,
  busyId = null,
  pageSize = 20,
  resetKey,
  emptyMessage = "No jobs — click New to create a sync job.",
}: Props) {
  const { accounts } = useDriveAccounts();
  const selectable = Boolean(onToggleSelect);
  const [columnKeys, setColumnKeys] = useState<JobsColumnKey[]>(() => visibleKeys ?? readJobsDirectoryColumns());
  useEffect(() => {
    if (visibleKeys) {
      setColumnKeys(visibleKeys);
      return;
    }
    const sync = () => setColumnKeys(readJobsDirectoryColumns());
    sync();
    window.addEventListener(JOBS_DIRECTORY_COLUMNS_CHANGE, sync);
    return () => window.removeEventListener(JOBS_DIRECTORY_COLUMNS_CHANGE, sync);
  }, [visibleKeys]);
  const columns = useMemo(
    () => buildDirectoryColumns(columnKeys, HUB_META) as HubDirectoryTableColumn<JobsColumnKey>[],
    [columnKeys],
  );
  const colgroup = useMemo(
    () =>
      selectable
        ? buildDirectoryColgroupForShell(columns, { showSelect: true })
        : buildDirectoryColgroupForShell(columns, { showSelect: false }),
    [columns, selectable],
  );
  const { rootRef, stickyStyle } = useHubScopedFreeze({
    prefs: jobsTableFreezePrefs,
    columns: columns.map((col) => ({ colClass: col.colClass, width: JOBS_COLUMN_META[col.key].width })),
    scopeClass: JOBS_STICKY_LEAD_CLASS,
    includeSelect: selectable,
    leftMode: "measured",
  });

  const { sorted, sortKey, sortDir, onSort } = useDirectoryTableSort<JobsColumnKey, SyncJob>(
    items,
    "name",
    sortableValue,
    "asc",
    (a, b) => compareJobCodes(a.code, b.code),
  );

  const renderRowCells = useCallback(
    (row: SyncJob) => (
      <>
        {columns.map((col) =>
          renderJobsDirectoryBodyCell(row, col, {
            accounts,
            busyId,
            onStart,
            onPause,
            onStop,
          }),
        )}
      </>
    ),
    [accounts, busyId, columns, onPause, onStart, onStop],
  );

  if (!columns.length) return null;

  return (
    <div ref={rootRef} className="flex min-h-0 min-w-0 flex-1 flex-col">
      {stickyStyle}
      <HubDirectoryTableShell<SyncJob, JobsColumnKey>
        items={sorted}
        ariaLabel="Sync jobs directory"
        tableClassName={`${hubDirectoryFrameTableClass("8")} p0009-jobs-directory-table ${JOBS_STICKY_LEAD_CLASS}`}
        wrapClassName={embedded ? WRAP_CLASS : HUB_DIRECTORY_TABLE_PANE_WRAP_CLASS}
        flushWrap
        colgroup={colgroup}
        columns={columns}
        sortKey={sortKey as JobsColumnKey}
        sortDir={sortDir as HubSortDir}
        onSort={onSort}
        getRowKey={(r) => r.id}
        selectedIds={selectable ? selectedIds : undefined}
        onToggleSelect={selectable ? onToggleSelect : undefined}
        onToggleSelectAll={selectable ? onToggleSelectAll : undefined}
        allVisibleSelected={selectable ? allVisibleSelected : false}
        selectAllLabel="Select all on this page"
        emptyMessage={emptyMessage}
        pageSize={embedded ? Math.max(items.length, 1) : pageSize}
        resetKey={resetKey}
        hideWhenSinglePage={embedded}
        padBodyRowsToPageSize={!embedded}
        paginatedShellClassName={embedded ? "min-w-0" : "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"}
        onRowClick={onRowClick}
        renderRowCells={renderRowCells}
      />
    </div>
  );
});
