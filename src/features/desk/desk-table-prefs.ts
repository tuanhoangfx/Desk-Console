import { createDirectoryTableColumnPrefs, createDirectoryTableColumnPresetManager } from "@tool-workspace/hub-ui";

export type DeskCol = "name" | "status" | "extra" | "updated";

export const DESK_COL_ITEMS = [
  { key: "name" as const, label: "Name", required: true },
  { key: "status" as const, label: "Status" },
  { key: "extra" as const, label: "Detail" },
  { key: "updated" as const, label: "Updated" },
];

export const DESK_COL_KEYS = DESK_COL_ITEMS.map((item) => item.key);
export const DESK_DEFAULT_COLS = new Set<DeskCol>(DESK_COL_KEYS);

export const deskTablePrefs = createDirectoryTableColumnPrefs<DeskCol>({
  storageKey: "p0001_desk_directory_columns",
  items: DESK_COL_ITEMS,
  defaultKeys: DESK_DEFAULT_COLS,
  changeEvent: "p0001-desk-columns",
});

export const deskColumnPresets = createDirectoryTableColumnPresetManager<DeskCol>({
  prefs: deskTablePrefs,
  presetsStorageKey: "p0001_desk_directory_column_presets",
  itemKeys: DESK_COL_KEYS,
  defaultVisible: DESK_DEFAULT_COLS,
});
