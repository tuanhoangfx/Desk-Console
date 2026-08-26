/** Sentinel for missing directory cell text — blank, not em dash. */
export const DIRECTORY_EMPTY_LABEL = "";

export function isDirectoryEmptyLabel(label: string | null | undefined): boolean {
  const trimmed = label?.trim();
  return !trimmed || trimmed === "—";
}

/** Golden empty directory table cell — blank (aria-hidden). */
export function HubDirectoryEmptyCell({ className }: { className?: string } = {}) {
  return <span className={className} aria-hidden />;
}

/** @deprecated Use {@link HubDirectoryEmptyCell} — P0020 alias kept during migration. */
export const DirectoryEmptyDash = HubDirectoryEmptyCell;
