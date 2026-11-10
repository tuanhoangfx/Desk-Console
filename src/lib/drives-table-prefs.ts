import {
  countHiddenDirectoryTableColumns,
  createDirectoryFreezePrefs,
  createDirectoryTableColumnPrefs,
  prefIconMapFromHubDirectoryColumnMeta,
  withDirectoryColumnIcons,
  withDirectoryColumnLabelHints,
  type DirectoryTableColumnItem,
} from "@tool-workspace/hub-ui";
import { drivesColumnHintContent } from "./folder-sync-directory-column-hints";
import {
  DRIVES_COLUMN_KEYS,
  DRIVES_COLUMN_META,
  toDrivesHubDirectoryColumnMeta,
  type DrivesColumnKey,
} from "./drives-directory-meta";

const ICONS = prefIconMapFromHubDirectoryColumnMeta(toDrivesHubDirectoryColumnMeta(DRIVES_COLUMN_META));

const REQUIRED = new Set<DrivesColumnKey>(["code"]);

export const DRIVES_DIRECTORY_COLUMN_ITEMS: DirectoryTableColumnItem<DrivesColumnKey>[] = withDirectoryColumnLabelHints(
  withDirectoryColumnIcons(
    DRIVES_COLUMN_KEYS.map((key) => ({
      key,
      label: DRIVES_COLUMN_META[key].label,
      required: REQUIRED.has(key),
    })),
    ICONS,
  ),
  drivesColumnHintContent,
);

export const DEFAULT_DRIVES_DIRECTORY_COLUMNS = new Set<DrivesColumnKey>(DRIVES_COLUMN_KEYS);

export const DRIVES_DIRECTORY_COLUMNS_CHANGE = "p0009-drives-directory-columns-change";

/** Frozen lead: select + Drive ID. The rest scrolls horizontally. */
export const DRIVES_FREEZE_CHANGE = "p0009-drives-directory-freeze-change";
export const drivesTableFreezePrefs = createDirectoryFreezePrefs({
  storageKey: "p0009:drives-table-freeze-cols:v1",
  changeEvent: DRIVES_FREEZE_CHANGE,
  defaultCount: 2,
});

export const drivesDirectoryColumnPrefs = createDirectoryTableColumnPrefs({
  storageKey: "p0009_drives_directory_columns_v7",
  items: DRIVES_DIRECTORY_COLUMN_ITEMS,
  defaultKeys: DEFAULT_DRIVES_DIRECTORY_COLUMNS,
  changeEvent: DRIVES_DIRECTORY_COLUMNS_CHANGE,
});

export function readDrivesDirectoryColumns(): DrivesColumnKey[] {
  const visible = drivesDirectoryColumnPrefs.read();
  return drivesDirectoryColumnPrefs.readOrder().filter((key) => visible.has(key));
}

export function countHiddenDrivesDirectoryColumns(): number {
  return countHiddenDirectoryTableColumns(DRIVES_DIRECTORY_COLUMN_ITEMS, drivesDirectoryColumnPrefs.read());
}

export function resetDrivesDirectoryColumns() {
  drivesDirectoryColumnPrefs.reset();
}
