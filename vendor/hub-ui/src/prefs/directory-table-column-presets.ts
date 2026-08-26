import {
  mergeDirectoryTableColumnOrder,
  type DirectoryTableColumnPrefs,
} from "./directory-table-column-prefs";
import { randomPresetDotColor } from "./preset-dot-color";

export type DirectoryTableColumnPreset<K extends string = string> = {
  id: string;
  name: string;
  visible: K[];
  order: K[];
  /** Random dot color assigned when preset is saved. */
  color?: string;
  /** Optional glyph shown instead of the color dot (builtin frame presets). */
  emoji?: string;
  /** System/frame preset — Hide Delete in menu; tools also no-op deletePreset. */
  builtin?: boolean;
};

type StoredPresetsJson<K extends string> = {
  presets: DirectoryTableColumnPreset<K>[];
};

export type DirectoryTableColumnPresetManager<K extends string = string> = {
  prefs: DirectoryTableColumnPrefs<K>;
  /** Stable id for React key — typically presets storage key. */
  scopeId: string;
  readActiveLabel(): string;
  listPresets(): DirectoryTableColumnPreset<K>[];
  applyDefault(): void;
  applyPreset(id: string): void;
  saveCurrentAs(name: string): void;
  deletePreset(id: string): void;
  changeEvent: string;
};

/** Display / settings props — widens typed column-key managers for TS assignability. */
export type DirectoryTableColumnPresetManagerProp = DirectoryTableColumnPresetManager<string>;

export function asDirectoryTableColumnPresetManagerProp(
  manager: unknown,
): DirectoryTableColumnPresetManagerProp {
  return manager as DirectoryTableColumnPresetManagerProp;
}

export function directoryTableColumnStatesEqual<K extends string>(
  a: { visible: ReadonlySet<K>; order: readonly K[] },
  b: { visible: readonly K[] | ReadonlySet<K>; order: readonly K[] },
  itemKeys: readonly K[],
): boolean {
  const visA = [...a.visible].sort();
  const visB = [...(b.visible instanceof Set ? b.visible : new Set(b.visible))].sort();
  if (visA.length !== visB.length) return false;
  for (let i = 0; i < visA.length; i += 1) {
    if (visA[i] !== visB[i]) return false;
  }
  const ordA = a.order.filter((key) => itemKeys.includes(key));
  const ordB = b.order.filter((key) => itemKeys.includes(key));
  if (ordA.length !== ordB.length) return false;
  for (let i = 0; i < ordA.length; i += 1) {
    if (ordA[i] !== ordB[i]) return false;
  }
  return true;
}

function readCurrentState<K extends string>(
  prefs: DirectoryTableColumnPrefs<K>,
  itemKeys: readonly K[],
): { visible: Set<K>; order: K[] } {
  return {
    visible: prefs.read(),
    order: mergeDirectoryTableColumnOrder(itemKeys, prefs.readOrder()),
  };
}

function defaultState<K extends string>(
  itemKeys: readonly K[],
  defaultVisible: ReadonlySet<K>,
): { visible: Set<K>; order: K[] } {
  return {
    visible: new Set(defaultVisible),
    order: [...itemKeys],
  };
}

function normalizePresetState<K extends string>(
  preset: Pick<DirectoryTableColumnPreset<K>, "visible" | "order">,
  itemKeys: readonly K[],
  defaultVisible: ReadonlySet<K>,
): { visible: Set<K>; order: K[] } {
  const allowed = new Set(itemKeys);
  const visible = new Set(preset.visible.filter((key) => allowed.has(key)));
  if (!visible.size) return defaultState(itemKeys, defaultVisible);
  return {
    visible,
    order: mergeDirectoryTableColumnOrder(itemKeys, preset.order),
  };
}

function readStoredPresets<K extends string>(storageKey: string): DirectoryTableColumnPreset<K>[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredPresetsJson<K>;
    if (!parsed || !Array.isArray(parsed.presets)) return [];
    return parsed.presets.filter(
      (preset): preset is DirectoryTableColumnPreset<K> =>
        Boolean(preset?.id && preset?.name && Array.isArray(preset.visible) && Array.isArray(preset.order)),
    );
  } catch {
    return [];
  }
}

function writeStoredPresets<K extends string>(storageKey: string, presets: DirectoryTableColumnPreset<K>[]) {
  window.localStorage.setItem(storageKey, JSON.stringify({ presets }));
}

function createPresetId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** SSOT localStorage presets for directory table column visibility + order. */
export function createDirectoryTableColumnPresetManager<K extends string>(config: {
  prefs: DirectoryTableColumnPrefs<K>;
  presetsStorageKey: string;
  itemKeys: readonly K[];
  defaultVisible: ReadonlySet<K>;
}): DirectoryTableColumnPresetManager<K> {
  const changeEvent = `${config.presetsStorageKey}:change`;

  function emitChange() {
    window.dispatchEvent(new CustomEvent(changeEvent));
  }

  function readDefaultState() {
    return defaultState(config.itemKeys, config.defaultVisible);
  }

  function readLabelForState(state: { visible: Set<K>; order: K[] }): string {
    const defaults = readDefaultState();
    if (directoryTableColumnStatesEqual(state, defaults, config.itemKeys)) return "Default";

    for (const preset of readStoredPresets<K>(config.presetsStorageKey)) {
      const normalized = normalizePresetState(preset, config.itemKeys, config.defaultVisible);
      if (directoryTableColumnStatesEqual(state, normalized, config.itemKeys)) return preset.name;
    }
    return "Current";
  }

  return {
    prefs: config.prefs,
    scopeId: config.presetsStorageKey,
    changeEvent,
    readActiveLabel() {
      if (typeof window === "undefined") return "Default";
      return readLabelForState(readCurrentState(config.prefs, config.itemKeys));
    },
    listPresets() {
      return readStoredPresets<K>(config.presetsStorageKey);
    },
    applyDefault() {
      config.prefs.reset();
      emitChange();
    },
    applyPreset(id: string) {
      const preset = readStoredPresets<K>(config.presetsStorageKey).find((item) => item.id === id);
      if (!preset) return;
      const normalized = normalizePresetState(preset, config.itemKeys, config.defaultVisible);
      config.prefs.write(normalized.visible, normalized.order);
      emitChange();
    },
    saveCurrentAs(name: string) {
      const trimmed = name.trim();
      if (!trimmed) return;
      const current = readCurrentState(config.prefs, config.itemKeys);
      const presets = readStoredPresets<K>(config.presetsStorageKey);
      const nextPreset: DirectoryTableColumnPreset<K> = {
        id: createPresetId(),
        name: trimmed,
        visible: [...current.visible],
        order: [...current.order],
        color: randomPresetDotColor(presets.map((item) => item.color).filter(Boolean) as string[]),
      };
      writeStoredPresets(config.presetsStorageKey, [...presets, nextPreset]);
      emitChange();
    },
    deletePreset(id: string) {
      const presets = readStoredPresets<K>(config.presetsStorageKey).filter((item) => item.id !== id);
      writeStoredPresets(config.presetsStorageKey, presets);
      emitChange();
    },
  };
}
