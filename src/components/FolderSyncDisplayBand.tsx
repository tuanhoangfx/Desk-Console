import { RotateCcw } from "lucide-react";
import {
  asDirectoryTableColumnPresetManagerProp,
  DirectoryTableColumnsSettings,
  HubDirectoryDisplayPanel,
  HubDirectoryFreezeColumnsSetting,
  HubToolDetailModalSecondaryAction,
} from "@tool-workspace/hub-ui";
import { DRIVES_COLUMN_KEYS } from "../lib/drives-directory-meta";
import {
  DRIVES_DIRECTORY_COLUMN_ITEMS,
  drivesColumnPresets,
  drivesDirectoryColumnPrefs,
  drivesTableFreezePrefs,
  resetDrivesDirectoryColumns,
} from "../lib/drives-table-prefs";
import { SCREEN_DISPLAY_PREFS } from "../lib/display-prefs-registry";
import { JOBS_COLUMN_KEYS } from "../lib/jobs-directory-meta";
import {
  JOBS_DIRECTORY_COLUMN_ITEMS,
  jobsColumnPresets,
  jobsDirectoryColumnPrefs,
  jobsTableFreezePrefs,
  resetJobsDirectoryColumns,
} from "../lib/jobs-table-prefs";

type Screen = "jobs" | "drives";

/** Search-bar Display — KPIs, Charts, Filters & Table columns SSOT (P0020 Services parity). */
export function FolderSyncDisplayBand({ screen }: { screen: Screen }) {
  const jobs = screen === "jobs";
  const defs = SCREEN_DISPLAY_PREFS[screen];
  return (
    <HubDirectoryDisplayPanel
      kpis={defs?.kpis ?? []}
      charts={defs?.charts ?? []}
      filters={defs?.filters ?? []}
      defaultKpiKeys={new Set(defs?.defaultKpiKeys ?? [])}
      defaultChartKeys={new Set(defs?.defaultChartKeys ?? [])}
      defaultFilterKeys={new Set(defs?.defaultFilterKeys ?? [])}
      filtersFromUrl
      getScreen={() => screen}
      tableColumnPresets={asDirectoryTableColumnPresetManagerProp(jobs ? jobsColumnPresets : drivesColumnPresets)}
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
