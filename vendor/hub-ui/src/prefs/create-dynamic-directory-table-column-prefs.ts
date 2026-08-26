import {
  mergeDirectoryTableColumnOrder,
  parseDirectoryTableColumnPrefsStorage,
  serializeDirectoryTableColumnPrefsStorage,
  type DirectoryTableColumnItem,
  type DirectoryTableColumnPrefs,
} from "./directory-table-column-prefs";

/** Directory table prefs when column keys/items are runtime-derived (e.g. browser services, sheet grid). */
export function createDynamicDirectoryTableColumnPrefs<K extends string>(config: {
  storageKey: string;
  changeEvent: string;
  getItemKeys: () => readonly K[];
  getItems: () => readonly DirectoryTableColumnItem<K>[];
  getDefaultVisible: (itemKeys: readonly K[]) => ReadonlySet<K>;
  readRaw: () => string | null;
  writeRaw: (raw: string) => void;
  clearRaw: () => void;
}): DirectoryTableColumnPrefs<K> {
  function readState(): { visible: Set<K>; order: K[] } {
    const itemKeys = config.getItemKeys();
    const defaults = config.getDefaultVisible(itemKeys);
    return parseDirectoryTableColumnPrefsStorage(
      config.readRaw(),
      itemKeys,
      (parsed) => {
        const allowed = new Set(itemKeys);
        const visible = new Set(parsed.filter((key) => allowed.has(key as K)) as K[]);
        return visible.size ? visible : new Set(defaults);
      },
      defaults,
    );
  }

  function persist(visible: Set<K>, order: readonly K[]) {
    const itemKeys = config.getItemKeys();
    const required = config.getItems().filter((item) => item.required).map((item) => item.key);
    const nextVisible = new Set(visible);
    for (const key of required) nextVisible.add(key);
    const nextOrder = mergeDirectoryTableColumnOrder(itemKeys, order);
    config.writeRaw(serializeDirectoryTableColumnPrefsStorage(nextVisible, nextOrder));
    window.dispatchEvent(new CustomEvent(config.changeEvent));
  }

  return {
    read: () => readState().visible,
    readOrder: () => readState().order,
    write: (columns, order) => persist(columns, order ?? readState().order),
    writeOrder: (order) => persist(readState().visible, order),
    reset: () => {
      config.clearRaw();
      window.dispatchEvent(new CustomEvent(config.changeEvent));
    },
    changeEvent: config.changeEvent,
  };
}
