import type { PrefIcon } from "../display-prefs/types";
import type { HubBrandIconId } from "../lib/resolve-hub-brand-icon";
import type { HubDirectoryColumnHintContent } from "../table/HubDirectoryColumnHint";

export type DirectoryTableColumnItem<K extends string = string> = {
  key: K;
  label: string;
  icon?: PrefIcon;
  iconClassName?: string;
  /** Native emoji — sheet-parity headers when Lucide icon is absent. */
  emoji?: string;
  brandIcon?: HubBrandIconId;
  imageSrc?: string;
  /** Rich label hint — hover label text (same SSOT as directory column headers). */
  labelHint?: HubDirectoryColumnHintContent;
  /** Cannot be hidden in Settings. */
  required?: boolean;
};

export type DirectoryTableColumnPrefs<K extends string> = {
  read: () => Set<K>;
  readOrder: () => K[];
  write: (columns: Set<K>, order?: readonly K[]) => void;
  writeOrder: (order: readonly K[]) => void;
  reset: () => void;
  changeEvent: string;
};

type StoredColumnPrefsJson = { visible: string[]; order: string[] };

export function mergeDirectoryTableColumnOrder<K extends string>(
  itemKeys: readonly K[],
  preferred: readonly K[] | null | undefined,
): K[] {
  const seen = new Set<K>();
  const out: K[] = [];
  for (const key of preferred ?? []) {
    if (itemKeys.includes(key) && !seen.has(key)) {
      out.push(key);
      seen.add(key);
    }
  }
  for (const key of itemKeys) {
    if (!seen.has(key)) out.push(key);
  }
  return out;
}

export function parseDirectoryTableColumnPrefsStorage<K extends string>(
  raw: string | null,
  itemKeys: readonly K[],
  normalizeVisible: (parsed: string[]) => Set<K>,
  defaultVisible: ReadonlySet<K>,
): { visible: Set<K>; order: K[] } {
  if (!raw) {
    // Order SSOT = itemKeys (canonical defs). Never use Set(defaultVisible) insertion order —
    // that put Mail Sub before Profile in Display when storage was empty.
    return { visible: new Set(defaultVisible), order: [...itemKeys] };
  }
  try {
    const parsed = JSON.parse(raw) as string[] | StoredColumnPrefsJson;
    if (Array.isArray(parsed)) {
      const visible = normalizeVisible(parsed);
      const order = mergeDirectoryTableColumnOrder(itemKeys, parsed as K[]);
      return { visible, order };
    }
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.visible)) {
      const visible = normalizeVisible(parsed.visible);
      const order = mergeDirectoryTableColumnOrder(itemKeys, (parsed.order ?? parsed.visible) as K[]);
      return { visible, order };
    }
  } catch {
    /* fall through */
  }
  return { visible: new Set(defaultVisible), order: [...itemKeys] };
}

export function serializeDirectoryTableColumnPrefsStorage<K extends string>(
  visible: Set<K>,
  order: readonly K[],
): string {
  return JSON.stringify({ visible: [...visible], order: [...order] });
}

export function countHiddenDirectoryTableColumns<K extends string>(
  items: readonly DirectoryTableColumnItem<K>[],
  visible: Set<K>,
): number {
  return items.filter((c) => !visible.has(c.key)).length;
}

/** SSOT localStorage + CustomEvent for directory table column visibility + order. */
export function createDirectoryTableColumnPrefs<K extends string>(config: {
  storageKey: string;
  items: readonly DirectoryTableColumnItem<K>[];
  defaultKeys: ReadonlySet<K>;
  changeEvent: string;
  legacyAliases?: Partial<Record<string, K>>;
}): DirectoryTableColumnPrefs<K> {
  const itemKeys = config.items.map((c) => c.key);
  const allKeys = new Set(itemKeys);
  const requiredKeys = config.items.filter((c) => c.required).map((c) => c.key);

  function normalizeKeys(parsed: string[]): Set<K> {
    const next = new Set(
      parsed
        .map((k) => config.legacyAliases?.[k] ?? k)
        .filter((k): k is K => allKeys.has(k as K)),
    );
    for (const key of requiredKeys) next.add(key);
    return next.size ? next : new Set(config.defaultKeys);
  }

  function readState(): { visible: Set<K>; order: K[] } {
    if (typeof window === "undefined") {
      const order = mergeDirectoryTableColumnOrder(itemKeys, [...config.defaultKeys]);
      return { visible: new Set(config.defaultKeys), order };
    }
    return parseDirectoryTableColumnPrefsStorage(
      window.localStorage.getItem(config.storageKey),
      itemKeys,
      normalizeKeys,
      config.defaultKeys,
    );
  }

  function read(): Set<K> {
    return readState().visible;
  }

  function readOrder(): K[] {
    return readState().order;
  }

  function persist(visible: Set<K>, order: readonly K[]) {
    const nextVisible = new Set(visible);
    for (const key of requiredKeys) nextVisible.add(key);
    const nextOrder = mergeDirectoryTableColumnOrder(itemKeys, order);
    window.localStorage.setItem(
      config.storageKey,
      serializeDirectoryTableColumnPrefsStorage(nextVisible, nextOrder),
    );
    window.dispatchEvent(new CustomEvent(config.changeEvent));
  }

  function write(columns: Set<K>, order?: readonly K[]) {
    persist(columns, order ?? readOrder());
  }

  function writeOrder(order: readonly K[]) {
    persist(read(), order);
  }

  function reset() {
    window.localStorage.removeItem(config.storageKey);
    window.dispatchEvent(new CustomEvent(config.changeEvent));
  }

  return {
    read,
    readOrder,
    write,
    writeOrder,
    reset,
    changeEvent: config.changeEvent,
  };
}
