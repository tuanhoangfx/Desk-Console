import {
  createDirectoryTableColumnPrefs,
  createDirectoryTableColumnPresetManager,
  type DirectoryTableColumnPrefs,
  type DirectoryTableColumnPresetManager,
} from "@tool-workspace/hub-ui";
import type { AppScreen } from "../../lib/app-screen";

export type DeskCol = "created" | "updated" | "name" | "format" | "run" | "schedule" | "status" | "extra" | "log";

export type DeskDirectoryScreen = Extract<AppScreen, "clips" | "runners" | "cron">;

export const DESK_DIRECTORY_SCREENS: readonly DeskDirectoryScreen[] = ["clips", "runners", "cron"];

export const DESK_COL_ITEMS = [
  { key: "created" as const, label: "Created" },
  { key: "updated" as const, label: "Update" },
  { key: "name" as const, label: "Name", required: true },
  { key: "format" as const, label: "Format" },
  { key: "run" as const, label: "Start" },
  { key: "schedule" as const, label: "Schedule" },
  { key: "status" as const, label: "Status" },
  { key: "extra" as const, label: "Detail" },
  { key: "log" as const, label: "Log" },
];

export const DESK_COL_KEYS = DESK_COL_ITEMS.map((item) => item.key);
export const DESK_DEFAULT_COLS = new Set<DeskCol>(["created", "updated", "name", "run", "status", "extra", "log"]);
export const DESK_CRON_DEFAULT_COLS = new Set<DeskCol>(["created", "updated", "name", "run", "schedule", "status", "extra", "log"]);
export const DESK_CLIPS_DEFAULT_COLS = new Set<DeskCol>(["created", "updated", "name", "format", "status", "extra", "log"]);

const LEGACY_COLUMNS_KEY = "p0001_desk_directory_columns";
const LEGACY_PRESETS_KEY = "p0001_desk_directory_column_presets";
const CLIPS_FORMAT_COL_MIGRATION_KEY = "p0001_clips_columns_format_v1";
const CRON_SCHEDULE_COL_MIGRATION_KEY = "p0001_cron_columns_schedule_v1";
const DESK_CREATED_LOG_COL_MIGRATION_KEY = "p0001_desk_columns_created_log_v1";

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
  cron: {
    scope: "Cron split directory — Run/Stop row + ops rail",
    columnStorageKey: "p0001_cron_directory_columns",
    presetsStorageKey: "p0001_cron_directory_column_presets",
    displayPanelVariant: "panel",
    panelFillRows: "pageSize",
    partialPagePad: "invisible",
  },
} as const;

function defaultColsFor(screen: DeskDirectoryScreen): Set<DeskCol> {
  if (screen === "clips") return DESK_CLIPS_DEFAULT_COLS;
  if (screen === "cron") return DESK_CRON_DEFAULT_COLS;
  return DESK_DEFAULT_COLS;
}

function migrateLegacyStorage(storageKey: string, presetsStorageKey: string, screen: DeskDirectoryScreen) {
  if (typeof localStorage === "undefined") return;
  try {
    if (!localStorage.getItem(storageKey) && localStorage.getItem(LEGACY_COLUMNS_KEY)) {
      localStorage.setItem(storageKey, localStorage.getItem(LEGACY_COLUMNS_KEY)!);
    }
    if (!localStorage.getItem(presetsStorageKey) && localStorage.getItem(LEGACY_PRESETS_KEY)) {
      localStorage.setItem(presetsStorageKey, localStorage.getItem(LEGACY_PRESETS_KEY)!);
    }
    const createdLogKey = `${DESK_CREATED_LOG_COL_MIGRATION_KEY}_${screen}`;
    if (localStorage.getItem(createdLogKey) !== "1") {
      localStorage.setItem(createdLogKey, "1");
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          if (!parsed.includes("created")) parsed.unshift("created");
          if (!parsed.includes("log")) parsed.push("log");
          localStorage.setItem(storageKey, JSON.stringify(parsed));
        } else if (parsed && typeof parsed === "object" && Array.isArray(parsed.visible)) {
          if (!parsed.visible.includes("created")) parsed.visible.unshift("created");
          if (!parsed.visible.includes("log")) parsed.visible.push("log");
          if (Array.isArray(parsed.order)) {
            if (!parsed.order.includes("created")) parsed.order.unshift("created");
            if (!parsed.order.includes("log")) parsed.order.push("log");
          }
          localStorage.setItem(storageKey, JSON.stringify(parsed));
        }
      }
    }
    if (screen === "cron" && localStorage.getItem(CRON_SCHEDULE_COL_MIGRATION_KEY) !== "1") {
      localStorage.setItem(CRON_SCHEDULE_COL_MIGRATION_KEY, "1");
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && !parsed.includes("schedule")) {
          const runIdx = parsed.indexOf("run");
          if (runIdx >= 0) parsed.splice(runIdx + 1, 0, "schedule");
          else parsed.push("schedule");
          localStorage.setItem(storageKey, JSON.stringify(parsed));
        } else if (parsed && typeof parsed === "object" && Array.isArray(parsed.visible) && !parsed.visible.includes("schedule")) {
          parsed.visible.push("schedule");
          if (Array.isArray(parsed.order) && !parsed.order.includes("schedule")) {
            const runIdx = parsed.order.indexOf("run");
            if (runIdx >= 0) parsed.order.splice(runIdx + 1, 0, "schedule");
            else parsed.order.push("schedule");
          }
          localStorage.setItem(storageKey, JSON.stringify(parsed));
        }
      }
    }
    if (screen === "clips" && localStorage.getItem(CLIPS_FORMAT_COL_MIGRATION_KEY) !== "1") {
      localStorage.setItem(CLIPS_FORMAT_COL_MIGRATION_KEY, "1");
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && !parsed.includes("format")) {
          const nameIdx = parsed.indexOf("name");
          if (nameIdx >= 0) parsed.splice(nameIdx + 1, 0, "format");
          else parsed.unshift("format");
          localStorage.setItem(storageKey, JSON.stringify(parsed));
        } else if (parsed && typeof parsed === "object" && Array.isArray(parsed.visible) && !parsed.visible.includes("format")) {
          parsed.visible.push("format");
          if (Array.isArray(parsed.order) && !parsed.order.includes("format")) {
            const nameIdx = parsed.order.indexOf("name");
            if (nameIdx >= 0) parsed.order.splice(nameIdx + 1, 0, "format");
            else parsed.order.unshift("format");
          }
          localStorage.setItem(storageKey, JSON.stringify(parsed));
        }
      }
    }
  } catch {
    /* ignore quota / SSR */
  }
}

const prefsCache = new Map<DeskDirectoryScreen, DirectoryTableColumnPrefs<DeskCol>>();
const presetsCache = new Map<DeskDirectoryScreen, DirectoryTableColumnPresetManager<DeskCol>>();

export function deskDirectoryScreenOrClips(screen: AppScreen): DeskDirectoryScreen {
  return screen === "runners" || screen === "cron" || screen === "clips" ? screen : "clips";
}

export function deskTablePrefsFor(screen: DeskDirectoryScreen) {
  const hit = prefsCache.get(screen);
  if (hit) return hit;
  const manifest = DESK_DIRECTORY_DISPLAY_PREFS_MANIFEST[screen];
  migrateLegacyStorage(manifest.columnStorageKey, manifest.presetsStorageKey, screen);
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
