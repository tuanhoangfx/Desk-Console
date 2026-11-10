import {
  countHiddenDirectoryTableColumns,
  createDirectoryFreezePrefs,
  createDirectoryTableColumnPrefs,
  prefIconMapFromHubDirectoryColumnMeta,
  withDirectoryColumnIcons,
  withDirectoryColumnLabelHints,
  type DirectoryTableColumnItem,
} from "@tool-workspace/hub-ui";
import { jobsColumnHintContent } from "./folder-sync-directory-column-hints";
import {
  JOBS_COLUMN_KEYS,
  JOBS_COLUMN_META,
  toJobsHubDirectoryColumnMeta,
  type JobsColumnKey,
} from "./jobs-directory-meta";

const ICONS = prefIconMapFromHubDirectoryColumnMeta(toJobsHubDirectoryColumnMeta(JOBS_COLUMN_META));

const REQUIRED = new Set<JobsColumnKey>(["code", "name"]);

export const JOBS_DIRECTORY_COLUMN_ITEMS: DirectoryTableColumnItem<JobsColumnKey>[] = withDirectoryColumnLabelHints(
  withDirectoryColumnIcons(
    JOBS_COLUMN_KEYS.map((key) => ({
      key,
      label: JOBS_COLUMN_META[key].label,
      required: REQUIRED.has(key),
    })),
    ICONS,
  ),
  jobsColumnHintContent,
);

export const DEFAULT_JOBS_DIRECTORY_COLUMNS = new Set<JobsColumnKey>(
  JOBS_COLUMN_KEYS.filter((key) => key !== "folder"),
);

export const JOBS_DIRECTORY_COLUMNS_CHANGE = "p0009-jobs-directory-columns-change";

/** Frozen lead: select + Job ID + Name. The rest scrolls. */
export const JOBS_FREEZE_CHANGE = "p0009-jobs-directory-freeze-change";
export const jobsTableFreezePrefs = createDirectoryFreezePrefs({
  storageKey: "p0009:jobs-table-freeze-cols:v1",
  changeEvent: JOBS_FREEZE_CHANGE,
  defaultCount: 3,
});

const JOBS_DIRECTORY_COLUMNS_KEY_V5 = "p0009_jobs_directory_columns_v5";
const JOBS_DIRECTORY_COLUMNS_KEY_V4 = "p0009_jobs_directory_columns_v4";

/** v4 stored the Run button inside Status. Keep that visibility and insert Run beside it. */
function migrateJobsDirectoryColumnsV4() {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(JOBS_DIRECTORY_COLUMNS_KEY_V5)) return;
  const raw = window.localStorage.getItem(JOBS_DIRECTORY_COLUMNS_KEY_V4);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as string[] | { visible?: string[]; order?: string[] };
    const visible = Array.isArray(parsed) ? parsed : parsed.visible;
    const order = Array.isArray(parsed) ? parsed : (parsed.order ?? parsed.visible);
    if (!Array.isArray(visible) || !Array.isArray(order)) return;
    const withRun = (keys: string[]) => {
      if (keys.includes("run")) return keys;
      const next = [...keys];
      const at = next.indexOf("status");
      next.splice(at >= 0 ? at + 1 : next.length, 0, "run");
      return next;
    };
    window.localStorage.setItem(
      JOBS_DIRECTORY_COLUMNS_KEY_V5,
      JSON.stringify({ visible: withRun(visible), order: withRun(order) }),
    );
  } catch {
    /* empty v5 falls back to the full default set */
  }
}

migrateJobsDirectoryColumnsV4();

export const jobsDirectoryColumnPrefs = createDirectoryTableColumnPrefs({
  storageKey: "p0009_jobs_directory_columns_v7",
  items: JOBS_DIRECTORY_COLUMN_ITEMS,
  defaultKeys: DEFAULT_JOBS_DIRECTORY_COLUMNS,
  changeEvent: JOBS_DIRECTORY_COLUMNS_CHANGE,
});

/** Visible columns in the order saved from Settings. */
export function readJobsDirectoryColumns(): JobsColumnKey[] {
  const visible = jobsDirectoryColumnPrefs.read();
  return jobsDirectoryColumnPrefs.readOrder().filter((key) => visible.has(key));
}

export function countHiddenJobsDirectoryColumns(): number {
  return countHiddenDirectoryTableColumns(JOBS_DIRECTORY_COLUMN_ITEMS, jobsDirectoryColumnPrefs.read());
}

export function resetJobsDirectoryColumns() {
  jobsDirectoryColumnPrefs.reset();
}
