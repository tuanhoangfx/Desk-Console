import {
  createDirectoryFreezePrefs,
  createDirectoryTableColumnPrefs,
  createDirectoryTableColumnPresetManager,
  type DirectoryFreezePrefs,
  type DirectoryTableColumnPrefs,
  type DirectoryTableColumnPresetManager,
} from "@tool-workspace/hub-ui";
import type { AppScreen } from "../../lib/app-screen";

export type DeskCol =
  | "created"
  | "updated"
  | "name"
  | "format"
  | "run"
  | "version"
  | "account"
  | "ram"
  | "size"
  | "schedule"
  | "status"
  | "extra"
  | "log";

export type DeskDirectoryScreen = Extract<AppScreen, "clips" | "runners" | "cron" | "apps">;

export const DESK_DIRECTORY_SCREENS: readonly DeskDirectoryScreen[] = ["clips", "runners", "cron", "apps"];

export const DESK_COL_ITEMS = [
  { key: "created" as const, label: "Created" },
  { key: "updated" as const, label: "Update" },
  { key: "name" as const, label: "Name", required: true },
  { key: "format" as const, label: "Format" },
  { key: "run" as const, label: "Action" },
  { key: "version" as const, label: "Version" },
  { key: "account" as const, label: "Account" },
  { key: "ram" as const, label: "RAM" },
  { key: "size" as const, label: "Size" },
  { key: "schedule" as const, label: "Schedule" },
  { key: "status" as const, label: "Status" },
  { key: "extra" as const, label: "Detail" },
  { key: "log" as const, label: "Log" },
];

export const DESK_COL_KEYS = DESK_COL_ITEMS.map((item) => item.key);
export const DESK_DEFAULT_COLS = new Set<DeskCol>(["created", "updated", "name", "run", "status", "extra", "log"]);
export const DESK_APPS_DEFAULT_COLS = new Set<DeskCol>([
  "created",
  "updated",
  "name",
  "run",
  "version",
  "account",
  "ram",
  "size",
  "status",
  "extra",
  "log",
]);
export const DESK_CRON_DEFAULT_COLS = new Set<DeskCol>(["created", "updated", "name", "run", "schedule", "status", "extra", "log"]);
export const DESK_CLIPS_DEFAULT_COLS = new Set<DeskCol>(["created", "updated", "name", "format", "status", "extra", "log"]);

const SCREEN_COL_KEYS: Record<DeskDirectoryScreen, readonly DeskCol[]> = {
  clips: ["created", "updated", "name", "format", "status", "extra", "log"],
  runners: ["created", "updated", "name", "run", "status", "extra", "log"],
  cron: ["created", "updated", "name", "run", "schedule", "status", "extra", "log"],
  apps: ["created", "updated", "name", "run", "version", "account", "ram", "size", "status", "extra", "log"],
};

export function deskColumnKeysFor(screen: DeskDirectoryScreen): readonly DeskCol[] {
  return SCREEN_COL_KEYS[screen] ?? SCREEN_COL_KEYS.clips;
}

export function deskColItemsFor(screen: DeskDirectoryScreen) {
  const allowed = new Set(deskColumnKeysFor(screen));
  return DESK_COL_ITEMS.filter((item) => allowed.has(item.key));
}

const LEGACY_COLUMNS_KEY = "p0001_desk_directory_columns";
const LEGACY_PRESETS_KEY = "p0001_desk_directory_column_presets";
const CLIPS_FORMAT_COL_MIGRATION_KEY = "p0001_clips_columns_format_v1";
const CRON_SCHEDULE_COL_MIGRATION_KEY = "p0001_cron_columns_schedule_v1";
const APPS_SIZE_COL_MIGRATION_KEY = "p0001_apps_columns_size_v1";
const APPS_SPLIT_COLS_MIGRATION_KEY = "p0001_apps_columns_split_v2";
const DESK_CREATED_LOG_COL_MIGRATION_KEY = "p0001_desk_columns_created_log_v1";

/** Manifest SSOT — per-tab column scopes (Layout 1 standalone Directory parity with P0020 Services). */
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
    scope: "Runners directory — standalone Layout 1 table",
    columnStorageKey: "p0001_runners_directory_columns",
    presetsStorageKey: "p0001_runners_directory_column_presets",
    displayPanelVariant: "panel",
    panelFillRows: false,
    partialPagePad: "n/a",
  },
  cron: {
    scope: "Cron directory — standalone Layout 1 table",
    columnStorageKey: "p0001_cron_directory_columns",
    presetsStorageKey: "p0001_cron_directory_column_presets",
    displayPanelVariant: "panel",
    panelFillRows: false,
    partialPagePad: "n/a",
  },
  apps: {
    scope: "Apps & Versions directory — standalone Layout 1 table",
    columnStorageKey: "p0001_apps_directory_columns",
    presetsStorageKey: "p0001_apps_directory_column_presets",
    displayPanelVariant: "panel",
    panelFillRows: false,
    partialPagePad: "n/a",
  },
} as const;

export const DESK_STICKY_LEAD_CLASS: Record<DeskDirectoryScreen, string> = {
  clips: "p0001-clips-directory-table--sticky-lead",
  runners: "p0001-runners-directory-table--sticky-lead",
  cron: "p0001-cron-directory-table--sticky-lead",
  apps: "p0001-apps-directory-table--sticky-lead",
};

const COMPACT_COLS_BY_SCREEN: Record<DeskDirectoryScreen, readonly DeskCol[]> = {
  clips: ["created", "updated", "name", "format", "status"],
  runners: ["created", "updated", "name", "run", "status"],
  cron: ["created", "updated", "name", "run", "schedule", "status"],
  apps: ["created", "updated", "name", "run", "status"],
};

export function deskDefaultColsFor(screen: DeskDirectoryScreen): Set<DeskCol> {
  if (screen === "clips") return DESK_CLIPS_DEFAULT_COLS;
  if (screen === "cron") return DESK_CRON_DEFAULT_COLS;
  if (screen === "apps") return DESK_APPS_DEFAULT_COLS;
  return DESK_DEFAULT_COLS;
}

export function deskCompactColsFor(screen: DeskDirectoryScreen): readonly DeskCol[] {
  return COMPACT_COLS_BY_SCREEN[screen] ?? COMPACT_COLS_BY_SCREEN.clips;
}

const freezePrefsCache = new Map<DeskDirectoryScreen, DirectoryFreezePrefs>();

export function deskFreezePrefsFor(screen: DeskDirectoryScreen): DirectoryFreezePrefs {
  const hit = freezePrefsCache.get(screen);
  if (hit) return hit;
  const prefs = createDirectoryFreezePrefs({
    storageKey: `p0001:${screen}-table-freeze-cols:v1`,
    changeEvent: `p0001-${screen}-directory-freeze-change`,
    defaultCount: 3,
  });
  freezePrefsCache.set(screen, prefs);
  return prefs;
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
    if (screen === "apps" && localStorage.getItem(APPS_SPLIT_COLS_MIGRATION_KEY) !== "1") {
      localStorage.setItem(APPS_SPLIT_COLS_MIGRATION_KEY, "1");
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        const addCols: DeskCol[] = ["version", "account", "ram", "size"];
        const insertCols = (list: unknown[]) => {
          const filtered = list.filter((k): k is DeskCol => typeof k === "string" && !addCols.includes(k as DeskCol));
          const runIdx = filtered.indexOf("run");
          const at = runIdx >= 0 ? runIdx + 1 : 0;
          filtered.splice(at, 0, ...addCols);
          return filtered;
        };
        if (Array.isArray(parsed)) {
          localStorage.setItem(storageKey, JSON.stringify(insertCols(parsed)));
        } else if (parsed && typeof parsed === "object" && Array.isArray(parsed.visible)) {
          parsed.visible = insertCols(parsed.visible);
          if (Array.isArray(parsed.order)) {
            parsed.order = insertCols(parsed.order);
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
  return screen === "runners" || screen === "cron" || screen === "clips" || screen === "apps" ? screen : "clips";
}

export function deskTablePrefsFor(screen: DeskDirectoryScreen) {
  const hit = prefsCache.get(screen);
  if (hit) return hit;
  const manifest = DESK_DIRECTORY_DISPLAY_PREFS_MANIFEST[screen];
  migrateLegacyStorage(manifest.columnStorageKey, manifest.presetsStorageKey, screen);
  const items = deskColItemsFor(screen);
  const prefs = createDirectoryTableColumnPrefs<DeskCol>({
    storageKey: manifest.columnStorageKey,
    items,
    defaultKeys: deskDefaultColsFor(screen),
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
    itemKeys: [...deskColumnKeysFor(screen)],
    defaultVisible: deskDefaultColsFor(screen),
  });
  presetsCache.set(screen, presets);
  return presets;
}

/** @deprecated Use deskTablePrefsFor(screen) — clips scope only. */
export const deskTablePrefs = deskTablePrefsFor("clips");

/** @deprecated Use deskColumnPresetsFor(screen) — clips scope only. */
export const deskColumnPresets = deskColumnPresetsFor("clips");
