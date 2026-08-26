import type { ReactNode } from "react";

export type HubRuntimeHistoryRow = {
  id: string;
  active?: boolean;
  titleAttr?: string;
  onClick?: () => void;
  leading: ReactNode;
  /** Top line — ID, entity name, task label (truncates). */
  primaryRow: ReactNode;
  /** Optional trailing status — omit when leading already shows status. */
  primaryTrailing?: ReactNode;
  /** Optional second line — omit for single-line rows. */
  metaRow?: ReactNode;
};

export function HubRuntimeHistoryList({
  rows,
  emptyMessage = "No completed runs yet.",
  className = "",
}: {
  rows: HubRuntimeHistoryRow[];
  emptyMessage?: string;
  className?: string;
}) {
  return (
    <ul className={`hub-runtime-history-list hub-scrollbar max-h-full space-y-0 overflow-auto ${className}`.trim()}>
      {rows.length === 0 ? (
        <li className="hub-runtime-history-list__empty">{emptyMessage}</li>
      ) : (
        rows.map((row) => {
          const hasMeta = row.metaRow != null && row.metaRow !== false && row.metaRow !== "";
          return (
            <li key={row.id}>
              <button
                type="button"
                className={`hub-runtime-history-list__row${row.active ? " is-active" : ""}${
                  hasMeta ? "" : " hub-runtime-history-list__row--single"
                }`}
                title={row.titleAttr}
                onClick={row.onClick}
              >
                <span className="hub-runtime-history-list__icon">{row.leading}</span>
                <div className="hub-runtime-history-list__body">
                  <div className="hub-runtime-history-list__primary">
                    <span className="hub-runtime-history-list__title">{row.primaryRow}</span>
                    {row.primaryTrailing ? (
                      <span className="hub-runtime-history-list__status">{row.primaryTrailing}</span>
                    ) : null}
                  </div>
                  {hasMeta ? <div className="hub-runtime-history-list__meta">{row.metaRow}</div> : null}
                </div>
              </button>
            </li>
          );
        })
      )}
    </ul>
  );
}
