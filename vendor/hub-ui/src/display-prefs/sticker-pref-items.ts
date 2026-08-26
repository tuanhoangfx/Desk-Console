import type { PrefItem } from "./types";
import { type PrefIconMap, withPrefItemIcons } from "./pref-item-icons";

/** Emoji sticker map → Display pref icon metadata (KPI / Chart / Filter SSOT). */
export function stickerPrefIconMap(stickers: Record<string, string | undefined>): PrefIconMap {
  return Object.fromEntries(
    Object.entries(stickers)
      .filter((entry): entry is [string, string] => Boolean(entry[1]))
      .map(([key, emoji]) => [key, { emoji }]),
  );
}

/** Attach sticker emojis to KPI / chart / filter pref rows. */
export function buildStickerPrefItems<T extends { key: string; label: string }>(
  items: readonly T[],
  stickers: Record<string, string | undefined>,
): PrefItem[] {
  return withPrefItemIcons(items, stickerPrefIconMap(stickers));
}
