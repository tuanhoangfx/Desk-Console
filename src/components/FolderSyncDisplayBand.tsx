import { RotateCcw } from "lucide-react";
import {
  DirectoryTableColumnsSettings,
  HubDirectoryDisplayPanel,
  HubDirectoryFreezeColumnsSetting,
  HubToolDetailModalSecondaryAction,
} from "@tool-workspace/hub-ui";
import { DRIVES_COLUMN_KEYS } from "../lib/drives-directory-meta";
import {
  DRIVES_DIRECTORY_COLUMN_ITEMS,
  drivesDirectoryColumnPrefs,
  drivesTableFreezePrefs,
  resetDrivesDirectoryColumns,
} from "../lib/drives-table-prefs";
import { JOBS_COLUMN_KEYS } from "../lib/jobs-directory-meta";
import {
  JOBS_DIRECTORY_COLUMN_ITEMS,
  jobsDirectoryColumnPrefs,
  jobsTableFreezePrefs,
  resetJobsDirectoryColumns,
} from "../lib/jobs-table-prefs";

type Screen = "jobs" | "drives";

/** Search-bar Display — table columns + freeze settings live here, not in header Settings. */
export function FolderSyncDisplayBand({ screen }: { screen: Screen }) {
  const jobs = screen === "jobs";
  return (
    <HubDirectoryDisplayPanel
      getScreen={() => screen}
      tableSectionLabel="Table columns"
      tableSectionActions={
        <HubToolDetailModalSecondaryAction
          label="Reset columns"
          icon={RotateCcw}
          onClick={() => (jobs ? resetJobsDirectoryColumns() : resetDrivesDirectoryColumns())}
        />
      }
      tablePanel={
        jobs ? (
          <div className="space-y-3">
            <HubDirectoryFreezeColumnsSetting prefs={jobsTableFreezePrefs} max={JOBS_COLUMN_KEYS.length} />
            <DirectoryTableColumnsSettings items={JOBS_DIRECTORY_COLUMN_ITEMS} prefs={jobsDirectoryColumnPrefs} />
          </div>
        ) : (
          <div className="space-y-3">
            <HubDirectoryFreezeColumnsSetting prefs={drivesTableFreezePrefs} max={DRIVES_COLUMN_KEYS.length} />
            <DirectoryTableColumnsSettings items={DRIVES_DIRECTORY_COLUMN_ITEMS} prefs={drivesDirectoryColumnPrefs} />
          </div>
        )
      }
    />
  );
}
