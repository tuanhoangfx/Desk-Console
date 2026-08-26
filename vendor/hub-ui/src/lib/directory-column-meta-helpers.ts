import type { HubGlyphComponent } from "../types/filter-badge";
import type { HubBrandIconId } from "./resolve-hub-brand-icon";
import type { HubDirectoryColumnHintContent } from "../table/HubDirectoryColumnHint";
import type { HubDirectoryColumnMetaInput } from "../table/hub-directory-table-meta";
import type { HubTableColumnRole } from "../table/hub-table-column-meta";
import { semanticDirectoryColumnIcon } from "./semantic-icon-registry";
import type { SemanticIconLookupKey } from "../types/semantic-icon";

export type DirectoryColumnMetaOptions = {
  /** Native tooltip when rich hint is absent. */
  headerTooltip?: string;
  /** Rich multi-line popover — icon rows for enum / source types. */
  headerHint?: HubDirectoryColumnHintContent;
  /** Sheet-parity emoji sticker — takes precedence over Lucide in table headers. */
  headerEmoji?: string;
  /** Tool catalog SVG / asset URL — preferred over Lucide for P00xx product columns. */
  headerImageSrc?: string;
  /** Predictable cell shape — header align via buildDirectoryColumns (code→left, date/compact→center). */
  columnKind?: "code" | "date" | "compact";
  /** Override buildDirectoryColumns default header align (code→start, date→center). */
  headerAlign?: "start" | "center";
  /** Prefer Display-pref / product icon over semantic registry (P0004 Users Tools / P000x). */
  headerIcon?: HubGlyphComponent;
  headerIconClassName?: string;
};

export type DirectoryColumnHeaderMeta = {
  label: string;
  colClass: string;
  role: HubTableColumnRole;
  width: string;
  headerIcon: HubGlyphComponent;
  headerIconClassName: string;
  headerBrandIcon?: HubBrandIconId;
  headerEmoji?: string;
  headerImageSrc?: string;
  headerTooltip?: string;
  headerHint?: HubDirectoryColumnHintContent;
  columnKind?: "code" | "date" | "compact";
  headerAlign?: "start" | "center";
};

/** SSOT helper — per-tool column defs call `col()` then `toHubDirectoryColumnMeta()`. */
export function createDirectoryColumnMetaHelpers() {
  function col(
    label: string,
    colClass: string,
    role: HubTableColumnRole,
    semanticKey: SemanticIconLookupKey,
    width: string,
    options?: DirectoryColumnMetaOptions,
  ): DirectoryColumnHeaderMeta {
    const icon = semanticDirectoryColumnIcon(semanticKey);
    const useImage = Boolean(options?.headerImageSrc);
    const useLucideOverride = Boolean(options?.headerIcon) && !useImage;
    return {
      label,
      colClass,
      role,
      width,
      headerIcon: options?.headerIcon ?? icon.headerIcon,
      headerIconClassName: options?.headerIconClassName ?? icon.headerIconClassName,
      headerBrandIcon: useImage || useLucideOverride ? undefined : icon.headerBrandIcon,
      headerEmoji: options?.headerEmoji,
      headerImageSrc: options?.headerImageSrc,
      headerTooltip: options?.headerTooltip,
      headerHint: options?.headerHint,
      columnKind: options?.columnKind,
      headerAlign: options?.headerAlign,
    };
  }

  function toHubDirectoryColumnMeta(
    meta: Record<string, DirectoryColumnHeaderMeta>,
  ): Record<string, HubDirectoryColumnMetaInput> {
    return Object.fromEntries(
      Object.entries(meta).map(([key, def]) => [
        key,
        {
          label: def.label,
          colClass: def.colClass,
          role: def.role,
          width: def.width,
          headerIcon: def.headerIcon,
          headerIconClassName: def.headerIconClassName,
          headerBrandIcon: def.headerBrandIcon,
          headerEmoji: def.headerEmoji,
          headerImageSrc: def.headerImageSrc,
          headerTooltip: def.headerTooltip,
          headerHint: def.headerHint,
          columnKind: def.columnKind,
          headerAlign: def.headerAlign,
        },
      ]),
    );
  }

  return { col, toHubDirectoryColumnMeta };
}
