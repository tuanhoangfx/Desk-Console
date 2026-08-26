import {
  HUB_USER_TOOLS_COL,
  HUB_USER_TOOLS_MODAL_TABLE_CLASS,
  HUB_USER_TOOLS_SKELETON_WRAP_CLASS,
  hubUserToolsModalColumnCount,
} from "./hub-user-tools-table-meta";

export type HubUserToolsDirectoryTableSkeletonProps = {
  rows?: number;
  showSelect?: boolean;
  showEnterprise?: boolean;
  ariaLabel?: string;
};

/** Placeholder while User Access tools table loads. */
export function HubUserToolsDirectoryTableSkeleton({
  rows = 5,
  showSelect = false,
  showEnterprise = false,
  ariaLabel = "Loading tools table",
}: HubUserToolsDirectoryTableSkeletonProps) {
  const colCount = hubUserToolsModalColumnCount(showSelect, showEnterprise);
  return (
    <div className={HUB_USER_TOOLS_SKELETON_WRAP_CLASS} aria-busy="true" aria-label={ariaLabel}>
      <table className={HUB_USER_TOOLS_MODAL_TABLE_CLASS}>
        <thead>
          <tr>
            {Array.from({ length: colCount }, (_, i) => (
              <th key={i} scope="col">
                <span className="skeleton mx-auto block h-3.5 w-[70%] max-w-[4.5rem]" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, row) => (
            <tr key={row} className="hub-users-row hub-users-row--static">
              {showSelect ? (
                <td className={HUB_USER_TOOLS_COL.select}>
                  <span className="skeleton mx-auto block h-4 w-4 rounded" />
                </td>
              ) : null}
              <td className={HUB_USER_TOOLS_COL.code}>
                <span className="skeleton block h-3.5 w-14 font-mono" />
              </td>
              <td className={HUB_USER_TOOLS_COL.name}>
                <span className="skeleton block h-3.5 w-[85%] max-w-[12rem]" />
              </td>
              {showEnterprise ? (
                <td className={HUB_USER_TOOLS_COL.enterprise}>
                  <span className="skeleton mx-auto block h-3.5 w-12" />
                </td>
              ) : null}
              <td className={HUB_USER_TOOLS_COL.category}>
                <span className="skeleton mx-auto block h-3.5 w-16" />
              </td>
              <td className={HUB_USER_TOOLS_COL.access}>
                <span className="skeleton mx-auto block h-4 w-4 rounded-full" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
