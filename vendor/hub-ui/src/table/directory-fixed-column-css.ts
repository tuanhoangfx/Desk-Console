// @ts-nocheck
import type { HubDirectoryColumnKind } from "./hub-directory-table-meta";

export type { HubDirectoryColumnKind };

/** Manifest row for directory column width SSOT (code/date or full-column tools). */
export type DirectoryColumnWidthEntry = {
  colClass: string;
  width: string;
  kind?: HubDirectoryColumnKind;
  keys?: readonly string[];
};

/** @deprecated Alias â€” use DirectoryColumnWidthEntry */
export type DirectoryFixedColumnEntry = DirectoryColumnWidthEntry & {
  kind: HubDirectoryColumnKind;
};

export type GenerateDirectoryFixedColumnCssOptions = {
  entries: readonly DirectoryColumnWidthEntry[];
  /** Split head/body table selectors â€” pass both variant roots for parity. */
  tableRoots: readonly string[];
  tabularSelectors?: readonly string[];
  banner?: string;
};

export {
  buildDirectoryFixedColumnTabularSelectors,
  generateDirectoryFixedColumnCss,
  verifyDirectoryColumnMetaKeys,
  verifyDirectoryColumnWidths,
  verifyDirectoryFixedColumnCss,
} from "../lib/directory-fixed-column-css.mjs";
