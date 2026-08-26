import {
  HUB_ROUTE_ACCESS_COL,
  HUB_ROUTE_ACCESS_SKELETON_WRAP_CLASS,
  hubRouteAccessModalColumnCount,
  hubRouteAccessModalTableClass,
  type HubRouteAccessModalColumnOptions,
} from "./hub-route-access-table-meta";

export type HubRouteAccessDirectoryTableSkeletonProps = {
  rows?: number;
  showSelect?: boolean;
  columnOptions?: HubRouteAccessModalColumnOptions;
  ariaLabel?: string;
};

/** Placeholder while modal route-access table loads — golden User Access parity. */
export function HubRouteAccessDirectoryTableSkeleton({
  rows = 3,
  showSelect = true,
  columnOptions = { layout: "expanded" },
  ariaLabel = "Loading access table",
}: HubRouteAccessDirectoryTableSkeletonProps) {
  const layout = columnOptions.layout ?? "expanded";
  const showRoute = columnOptions.showRouteColumn ?? layout === "expanded";
  const showExpires = columnOptions.showExpiresColumn ?? true;
  const colCount = hubRouteAccessModalColumnCount(showSelect, columnOptions);

  return (
    <div className={HUB_ROUTE_ACCESS_SKELETON_WRAP_CLASS} aria-busy="true" aria-label={ariaLabel}>
      <table className={hubRouteAccessModalTableClass(columnOptions)}>
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
                <td className={HUB_ROUTE_ACCESS_COL.select}>
                  <span className="skeleton mx-auto block h-4 w-4 rounded" />
                </td>
              ) : null}
              <td className={HUB_ROUTE_ACCESS_COL.user}>
                <span className="skeleton block h-3.5 w-[85%] max-w-[12rem]" />
              </td>
              <td className={HUB_ROUTE_ACCESS_COL.role}>
                <span className="skeleton mx-auto block h-5 w-14 rounded-full" />
              </td>
              {layout === "expanded" ? (
                <>
                  <td className={HUB_ROUTE_ACCESS_COL.syncAt}>
                    <span className="skeleton mx-auto block h-3.5 w-14" />
                  </td>
                  <td className={HUB_ROUTE_ACCESS_COL.loadAt}>
                    <span className="skeleton mx-auto block h-3.5 w-14" />
                  </td>
                </>
              ) : (
                <td className={HUB_ROUTE_ACCESS_COL.activity}>
                  <span className="skeleton mx-auto block h-6 w-14" />
                </td>
              )}
              {showRoute ? (
                <td className={HUB_ROUTE_ACCESS_COL.route}>
                  <span className="skeleton mx-auto block h-5 w-16 rounded-full" />
                </td>
              ) : null}
              <td className={HUB_ROUTE_ACCESS_COL.addedAt}>
                <span className="skeleton mx-auto block h-3.5 w-14" />
              </td>
              {showExpires ? (
                <td className={HUB_ROUTE_ACCESS_COL.expires}>
                  <span className="skeleton mx-auto block h-3.5 w-14" />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
