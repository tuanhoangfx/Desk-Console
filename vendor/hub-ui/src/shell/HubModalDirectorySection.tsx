import type { ReactNode } from "react";

export const HUB_MODAL_DIRECTORY_SECTION_CLASS = "hub-modal-directory-section space-y-2 min-w-0";

export const HUB_MODAL_DIRECTORY_EMPTY_FILTERED_CLASS =
  "rounded-lg border border-white/5 bg-white/[.02] px-3 py-6 text-center text-[12px] text-[var(--muted)]";

export type HubModalDirectorySectionProps = {
  /** Info/warn strip above filter (registry sync, offline, etc.) */
  banner?: ReactNode;
  /** Inline error — amber/rose box from caller */
  error?: ReactNode;
  /** Replaces filter + table while loading */
  loading?: ReactNode;
  /** When dataset is empty before filtering (no filter bar) */
  empty?: ReactNode;
  /** HubModalDirectoryFilterBar — two-row hub layout, no Active: row */
  filterBar?: ReactNode;
  /** When filters/search yield zero rows */
  emptyFiltered?: ReactNode;
  /** Table shell (`HubPaginatedDataTable` or `HubDirectoryTableShell`) */
  table?: ReactNode;
  className?: string;
};

/** Golden modal section body: HubModalDirectoryFilterBar + table — P0004 User Access · P0020 Cookie Route. */
export function HubModalDirectorySection({
  banner,
  error,
  loading,
  empty,
  filterBar,
  emptyFiltered,
  table,
  className = "",
}: HubModalDirectorySectionProps) {
  return (
    <div className={`${HUB_MODAL_DIRECTORY_SECTION_CLASS}${className ? ` ${className}` : ""}`}>
      {banner}
      {error}
      {loading ?? empty ?? (
        <>
          {filterBar}
          {emptyFiltered ?? table}
        </>
      )}
    </div>
  );
}

export function HubModalDirectoryEmptyFiltered({ children }: { children: ReactNode }) {
  return <p className={HUB_MODAL_DIRECTORY_EMPTY_FILTERED_CLASS}>{children}</p>;
}
