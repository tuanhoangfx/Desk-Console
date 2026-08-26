import type { ReactNode } from "react";

/** Modal / rail directory tables without `hub-directory-table-scroll` — single table, no split head/body. */
export type DirectoryInlineTableProps = {
  wrapClassName: string;
  tableClassName: string;
  showSelect: boolean;
  colgroup?: ReactNode;
  headRow: ReactNode;
  bodyRows: ReactNode;
  emptyMessage: string;
  hasRows: boolean;
};

export function DirectoryInlineTable({
  wrapClassName,
  tableClassName,
  showSelect,
  colgroup,
  headRow,
  bodyRows,
  emptyMessage,
  hasRows,
}: DirectoryInlineTableProps) {
  return (
    <div className={wrapClassName}>
      <table className={tableClassName} data-hub-directory-select={showSelect ? "" : undefined}>
        {colgroup}
        <thead>{headRow}</thead>
        <tbody>{bodyRows}</tbody>
      </table>
      {!hasRows ? <div className="hub-users-empty">{emptyMessage}</div> : null}
    </div>
  );
}
