import type { LucideIcon } from "lucide-react";
import type { HubGlyphComponent } from "../types/filter-badge";
import type { ReactNode } from "react";
import type { HubTableColumnRole } from "../table/hub-table-column-meta";
import { HubTableColumnHeader } from "./HubTableColumnHeader";

export type HubTableColumn = {
  key: string;
  label: string;
  className?: string;
  role?: HubTableColumnRole;
  /** Widened to HubGlyphComponent — column meta headerIcon may be a memo/forwardRef object. */
  icon?: HubGlyphComponent;
  iconClassName?: string;
  /** Sticker emoji — preferred over Lucide role icon in headers. */
  headerEmoji?: string;
  /** Custom header cell (sort buttons, select-all, etc.) */
  header?: ReactNode;
};

/** First layout class on a column — used for `<col>` so select stays 36px under table-layout:fixed. */
function hubDataTableColClass(className: string | undefined): string | undefined {
  if (!className) return undefined;
  return className.split(/\s+/).find(Boolean);
}

export function HubDataTable({
  columns,
  children,
  empty,
  tableClassName = "hub-users-table",
  wrapClassName = "hub-users-table-wrap hub-scrollbar min-w-0 overflow-x-auto overflow-y-hidden rounded-xl border border-white/5",
  directorySelect = false,
}: {
  columns: HubTableColumn[];
  children: ReactNode;
  empty?: ReactNode;
  tableClassName?: string;
  wrapClassName?: string;
  /** Enables 36px select column + hub-checkbox SSOT (hub-directory-table.css). */
  directorySelect?: boolean;
}) {
  return (
    <div className={wrapClassName}>
      <table className={tableClassName} data-hub-directory-select={directorySelect ? "" : undefined}>
        {directorySelect ? (
          <colgroup>
            {columns.map((col) => (
              <col key={col.key} className={hubDataTableColClass(col.className)} />
            ))}
          </colgroup>
        ) : null}
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={col.className} scope="col">
                {col.header ??
                  (col.role || col.icon || col.headerEmoji ? (
                    <span className="hub-users-th-label">
                      <HubTableColumnHeader
                        label={col.label}
                        role={col.role}
                        icon={col.icon}
                        iconClassName={col.iconClassName}
                        headerEmoji={col.headerEmoji}
                      />
                    </span>
                  ) : (
                    <span className="hub-users-th-text">{col.label}</span>
                  ))}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {empty ?? null}
          {children}
        </tbody>
      </table>
    </div>
  );
}

export function HubTableEmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-10 text-center text-[var(--muted)]">
        {children}
      </td>
    </tr>
  );
}
