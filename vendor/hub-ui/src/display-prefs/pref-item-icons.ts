import type { DirectoryColumnHeaderMeta } from "../lib/directory-column-meta-helpers";
import type { HubBrandIconId } from "../lib/resolve-hub-brand-icon";
import type { DirectoryTableColumnItem } from "../prefs/directory-table-column-prefs";
import type { HubDirectoryColumnMetaInput } from "../table/hub-directory-table-meta";
import { resolveHubTableColumnMeta, type HubTableColumnRole } from "../table/hub-table-column-meta";
import type { PrefIcon, PrefItem } from "./types";

export type PrefIconMeta = {
  icon?: PrefIcon;
  iconClassName?: string;
  emoji?: string;
  brandIcon?: HubBrandIconId;
  imageSrc?: string;
};
export type PrefIconMap = Record<string, PrefIconMeta>;

/** Attach per-key Lucide icons to KPI / header / filter pref rows (Display panel SSOT). */
export function withPrefItemIcons<T extends { key: string; label: string; emoji?: string }>(
  items: readonly T[],
  icons: PrefIconMap,
): PrefItem[] {
  return items.map((item) => {
    const meta = icons[item.key];
    return {
      ...item,
      icon: meta?.icon ?? (item as PrefItem).icon,
      iconClassName: meta?.iconClassName ?? (item as PrefItem).iconClassName,
      /** Keep sticker emoji when icon map only supplies Lucide (Hub chart band / Display share defs). */
      emoji: meta?.emoji ?? item.emoji,
      brandIcon: meta?.brandIcon ?? (item as PrefItem).brandIcon,
      imageSrc: meta?.imageSrc ?? (item as PrefItem).imageSrc,
    };
  });
}

/** Attach icons to directory table column toggles (Display → Table columns). */
export function withDirectoryColumnIcons<K extends string>(
  items: readonly DirectoryTableColumnItem<K>[],
  icons: PrefIconMap,
): DirectoryTableColumnItem<K>[] {
  return items.map((item) => ({
    ...item,
    icon: icons[item.key]?.icon,
    iconClassName: icons[item.key]?.iconClassName,
    emoji: icons[item.key]?.emoji,
    brandIcon: icons[item.key]?.brandIcon,
    imageSrc: icons[item.key]?.imageSrc,
  }));
}

/** Display panel icon map from directory table header meta (Lucide glyphs). */
export function prefIconMapFromDirectoryColumnHeaderMeta(
  meta: Record<string, DirectoryColumnHeaderMeta>,
): PrefIconMap {
  return Object.fromEntries(
    Object.entries(meta).map(([key, def]) => {
      if (def.headerEmoji) return [key, { emoji: def.headerEmoji }];
      if (def.headerBrandIcon) return [key, { brandIcon: def.headerBrandIcon }];
      return [key, { icon: def.headerIcon, iconClassName: def.headerIconClassName }];
    }),
  );
}

/** Display panel icon map from hub directory meta (emoji, image, brand, or Lucide). */
export function prefIconMapFromHubDirectoryColumnMeta(
  meta: Record<string, HubDirectoryColumnMetaInput>,
): PrefIconMap {
  return Object.fromEntries(
    Object.entries(meta).map(([key, def]) => {
      if (def.headerEmoji) return [key, { emoji: def.headerEmoji }];
      if (def.headerImageSrc) return [key, { imageSrc: def.headerImageSrc }];
      if (def.headerBrandIcon) return [key, { brandIcon: def.headerBrandIcon }];
      return [key, { icon: def.headerIcon, iconClassName: def.headerIconClassName }];
    }),
  );
}

export type DirectoryColumnRoleDef<K extends string = string> = {
  key: K;
  label: string;
  role: HubTableColumnRole;
  required?: boolean;
};

/** Build Display → Table columns items with icons from hub table column roles. */
export function buildDirectoryColumnItemsFromRoles<K extends string>(
  defs: readonly DirectoryColumnRoleDef<K>[],
): DirectoryTableColumnItem<K>[] {
  return defs.map((def) => {
    const { icon, iconClassName } = resolveHubTableColumnMeta(def.role);
    return {
      key: def.key,
      label: def.label,
      icon,
      iconClassName,
      required: def.required,
    };
  });
}

/** Attach header meta icons to minimal column picker items. */
export function buildDirectoryColumnItemsFromHeaderMeta<K extends string>(
  items: readonly Pick<DirectoryTableColumnItem<K>, "key" | "label" | "required">[],
  meta: Record<string, DirectoryColumnHeaderMeta>,
): DirectoryTableColumnItem<K>[] {
  return withDirectoryColumnIcons(
    items as DirectoryTableColumnItem<K>[],
    prefIconMapFromDirectoryColumnHeaderMeta(meta),
  );
}
