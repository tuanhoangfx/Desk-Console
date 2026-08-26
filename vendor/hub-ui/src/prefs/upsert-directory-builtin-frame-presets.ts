import { mergeDirectoryTableColumnOrder } from "./directory-table-column-prefs";

/** Detail-TOC frame preset seed — names/emoji match Detail sections (Mail golden). */
export type DirectoryBuiltinFrameSpec<K extends string = string> = {
  id: string;
  name: string;
  visible: readonly K[];
  color: string;
  emoji: string;
};

type FramePresetCore<K extends string> = {
  id: string;
  name: string;
  visible: K[];
  order: K[];
  color?: string;
  emoji?: string;
};

/**
 * Idempotent upsert of builtin frame presets into a Display preset list.
 * Skips seed when a user custom already owns the same name.
 * Refresh runs only when name/visible/emoji/color drift; `mergeExtras` fills blank analytics on that write.
 */
export function upsertDirectoryBuiltinFramePresets<K extends string, P extends FramePresetCore<K>>(opts: {
  existing: readonly P[];
  builtins: readonly DirectoryBuiltinFrameSpec<K>[];
  itemKeys: readonly K[];
  /** Extra fields for newly seeded presets (kpi / charts / hubFilters / …). */
  seedExtras: () => Omit<P, keyof FramePresetCore<K>>;
  /** When refreshing chrome, fill blank analytics from `seedExtras()` (optional). */
  mergeExtras?: (cur: P, defaults: Omit<P, keyof FramePresetCore<K>>) => Partial<P>;
}): { presets: P[]; changed: boolean } {
  const defaults = opts.seedExtras();
  let changed = false;
  const next = [...opts.existing];

  for (const builtin of opts.builtins) {
    const visible = [...builtin.visible] as K[];
    const order = mergeDirectoryTableColumnOrder(opts.itemKeys, visible);
    const idx = next.findIndex((item) => item.id === builtin.id);
    if (idx >= 0) {
      const cur = next[idx]!;
      const sameVisible =
        cur.visible.length === visible.length && cur.visible.every((key, i) => key === visible[i]);
      if (
        !sameVisible ||
        cur.emoji !== builtin.emoji ||
        cur.color !== builtin.color ||
        cur.name !== builtin.name
      ) {
        next[idx] = {
          ...cur,
          ...(opts.mergeExtras?.(cur, defaults) ?? {}),
          name: builtin.name,
          visible,
          order,
          color: builtin.color,
          emoji: builtin.emoji,
        };
        changed = true;
      }
      continue;
    }
    if (next.some((item) => item.name === builtin.name)) continue;
    next.push({
      id: builtin.id,
      name: builtin.name,
      visible,
      order,
      ...defaults,
      color: builtin.color,
      emoji: builtin.emoji,
    } as P);
    changed = true;
  }

  return { presets: next, changed };
}
