import type { MouseEvent, ReactNode } from "react";
import { useEffect } from "react";
import { useDirectorySplitScrollbarSync } from "./useDirectorySplitScrollbarSync";

export type DirectorySplitScrollTableProps = {
  wrapClassName: string;
  tableClassName: string;
  showSelect: boolean;
  colgroup?: ReactNode;
  headRow: ReactNode;
  bodyRows: ReactNode;
  emptyMessage: string;
  hasRows: boolean;
  /** Reset tbody scroll when filters/search/page change. */
  scrollResetKey?: string | number | boolean | null;
};

function focusDirectoryBodyScroll(body: HTMLDivElement | null) {
  body?.focus({ preventScroll: true });
}

function onDirectoryBodyPointerDown(e: MouseEvent<HTMLDivElement>) {
  const t = e.target as HTMLElement;
  if (t.closest("tr, button, input, label, a, [role='button']")) return;
  focusDirectoryBodyScroll(e.currentTarget);
}

export function DirectorySplitScrollTable({
  wrapClassName,
  tableClassName,
  showSelect,
  colgroup,
  headRow,
  bodyRows,
  emptyMessage,
  hasRows,
  scrollResetKey,
}: DirectorySplitScrollTableProps) {
  const { headRef, bodyRef } = useDirectorySplitScrollbarSync(true);

  useEffect(() => {
    if (scrollResetKey === undefined) return;
    const body = bodyRef.current;
    if (body) body.scrollTop = 0;
  }, [scrollResetKey, bodyRef]);

  return (
    <div className={wrapClassName}>
      <div className="hub-directory-table-head" ref={headRef}>
        <table className={tableClassName} data-hub-directory-select={showSelect ? "" : undefined}>
          {colgroup}
          <thead>{headRow}</thead>
        </table>
      </div>
      <div
        className="hub-directory-table-body-scroll"
        ref={bodyRef}
        tabIndex={-1}
        data-hub-directory-table-body
        onMouseDown={onDirectoryBodyPointerDown}
      >
        <table className={tableClassName} data-hub-directory-select={showSelect ? "" : undefined}>
          {colgroup}
          <tbody>{bodyRows}</tbody>
        </table>
        {!hasRows ? <div className="hub-users-empty">{emptyMessage}</div> : null}
      </div>
    </div>
  );
}
