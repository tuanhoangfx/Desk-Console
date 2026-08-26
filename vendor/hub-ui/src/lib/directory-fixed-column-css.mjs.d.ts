export type DirectoryFixedColumnKind = "code" | "date";

export type DirectoryFixedColumnEntry = {
  colClass: string;
  width: string;
  kind: DirectoryFixedColumnKind;
  keys?: readonly string[];
};

export type GenerateDirectoryFixedColumnCssOptions = {
  entries: readonly DirectoryFixedColumnEntry[];
  tableRoots: readonly string[];
  tabularSelectors?: readonly string[];
  banner?: string;
};

export function buildDirectoryFixedColumnTabularSelectors(
  tableRoots: readonly string[],
  entries: readonly DirectoryFixedColumnEntry[],
): string[];

export function generateDirectoryFixedColumnCss(
  options: GenerateDirectoryFixedColumnCssOptions,
): string;

export function verifyDirectoryFixedColumnCss(
  css: string,
  entries: readonly DirectoryFixedColumnEntry[],
): string[];

export function verifyDirectoryColumnWidths(
  css: string,
  entries: readonly Pick<DirectoryFixedColumnEntry, "colClass" | "width">[],
): string[];

export function verifyDirectoryColumnMetaKeys(
  metaSource: string,
  entries: readonly DirectoryFixedColumnEntry[],
  options?: { requireColumnKind?: boolean; metaLabel?: string },
): string[];
