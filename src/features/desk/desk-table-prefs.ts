import {
  createDirectoryTableColumnPrefs,
  createDirectoryTableColumnPresetManager,
  type DirectoryTableColumnPrefs,
  type DirectoryTableColumnPresetManager,
} from "@tool-workspace/hub-ui";
import type { AppScreen } from "../../lib/app-screen";

export type DeskCol = "name" | "run" | "status" | "extra" | "updated";

export type DeskDirectoryScreen = Extract<AppScreen, "clips" | "runners" | "tasks">;

export const DESK_DIRECTORY_SCREENS: readonly DeskDirectoryScreen[] = ["clips", "runners", "tasks"];

export const DESK_COL_ITEMS = [
  { key: "name" as const, label: "Name", required: true },
  { key: "run" as const, label: "Start" },
  { key: "status" as const, label: "Status" },
  { key: "extra" as const, label: "Detail" },
  { key: "updated" as const, label: "Updated" },
];

export const DESK_COL_KEYS = DESK_COL_ITEMS.map((item) => item.key);
export const DESK_DEFAULT_COLS = new Set<DeskCol>(DESK_COL_KEYS);
export const DESK_CLIPS_DEFAULT_COLS = new Set<DeskCol>(["name", "status", "extra", "updated"]);

const LEGACY_COLUMNS_KEY = "p0001_desk_directory_columns";
const LEGACY_PRESETS_KEY = "p0001_desk_directory_column_presets";

/** Manifest SSOT — per-tab column scopes (P0003 parity). */
export const DESK_DIRECTORY_DISPLAY_PREFS_MANIFEST = {
  clips: {
    scope: "Clips tab directory table",
    columnStorageKey: "p0001_clips_directory_columns",
    presetsStorageKey: "p0001_clips_directory_column_presets",
    displayPanelVariant: "panel",
    panelFillRows: false,
    partialPagePad: "n/a",
  },
  runners: {
    scope: "Runners split directory — Run/Stop row + ops rail",
    columnStorageKey: "p0001_runners_directory_columns",
    presetsStorageKey: "p0001_runners_directory_column_presets",
    displayPanelVariant: "panel",
    panelFillRows: "pageSize",
    partialPagePad: "invisible",
  },
  tasks: {
    scope: "Tasks split directory — Run/Stop row + console rail",
    columnStorageKey: "p0001_tasks_directory_columns",
    presetsStorageKey: "p0001_tasks_directory_column_presets",
    displayPanelVariant: "panel",
    panelFillRows: "pageSize",
    partialPagePad: "invisible",
  },
} as const;

function defaultColsFor(screen: DeskDirectoryScreen): Set<DeskCol> {
  return screen === "clips" ? DESK_CLIPS_DEFAULT_COLS : DESK_DEFAULT_COLS;
}

function migrateLegacyStorage(storageKey: string, presetsStorageKey: string) {
  if (typeof localStorage === "undefined") return;
  try {
    if (!localStorage.getItem(storageKey) && localStorage.getItem(LEGACY_COLUMNS_KEY)) {
      localStorage.setItem(storageKey, localStorage.getItem(LEGACY_COLUMNS_KEY)!);
    }
    if (!localStorage.getItem(presetsStorageKey) && localStorage.getItem(LEGACY_PRESETS_KEY)) {
      localStorage.setItem(presetsStorageKey, localStorage.getItem(LEGACY_PRESETS_KEY)!);
    }
  } catch {
    /* ignore quota / SSR */
  }
}

const prefsCache = new Map<DeskDirectoryScreen, DirectoryTableColumnPrefs<DeskCol>>();
const presetsCache = new Map<DeskDirectoryScreen, DirectoryTableColumnPresetManager<DeskCol>>();

export function deskDirectoryScreenOrClips(screen: AppScreen): DeskDirectoryScreen {
  return screen === "runners" || screen === "tasks" || screen === "clips" ? screen : "clips";
}

export function deskTablePrefsFor(screen: DeskDirectoryScreen) {
  const hit = prefsCache.get(screen);
  if (hit) return hit;
  const manifest = DESK_DIRECTORY_DISPLAY_PREFS_MANIFEST[screen];
  migrateLegacyStorage(manifest.columnStorageKey, manifest.presetsStorageKey);
  const prefs = createDirectoryTableColumnPrefs<DeskCol>({
    storageKey: manifest.columnStorageKey,
    items: DESK_COL_ITEMS,
    defaultKeys: defaultColsFor(screen),
    changeEvent: `p0001-${screen}-columns`,
  });
  prefsCache.set(screen, prefs);
  return prefs;
}

export function deskColumnPresetsFor(screen: DeskDirectoryScreen) {
  const hit = presetsCache.get(screen);
  if (hit) return hit;
  const manifest = DESK_DIRECTORY_DISPLAY_PREFS_MANIFEST[screen];
  const prefs = deskTablePrefsFor(screen);
  const presets = createDirectoryTableColumnPresetManager<DeskCol>({
    prefs,
    presetsStorageKey: manifest.presetsStorageKey,
    itemKeys: DESK_COL_KEYS,
    defaultVisible: defaultColsFor(screen),
  });
  presetsCache.set(screen, presets);
  return presets;
}

/** @deprecated Use deskTablePrefsFor(screen) — clips scope only. */
export const deskTablePrefs = deskTablePrefsFor("clips");

/** @deprecated Use deskColumnPresetsFor(screen) — clips scope only. */
export const deskColumnPresets = deskColumnPresetsFor("clips");
