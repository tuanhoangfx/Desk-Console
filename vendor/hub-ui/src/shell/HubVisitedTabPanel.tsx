import type { ReactNode } from "react";

type VisitedKey = string | number | symbol;

/** `visited` = mount on first visit, hide inactive (default). `active` = unmount when inactive. */
export type HubVisitedTabMountMode = "visited" | "active";

type Props<T extends VisitedKey> = {
  tabId: T;
  active: boolean;
  visited: ReadonlySet<T>;
  children: ReactNode;
  className?: string;
  dataScreen?: string;
  mountMode?: HubVisitedTabMountMode;
};

/** Tab panel — default keep-mounted; use mountMode="active" to free inactive tab CPU (P0020 Mail perf). */
export function HubVisitedTabPanel<T extends VisitedKey>({
  tabId,
  active,
  visited,
  children,
  className,
  dataScreen,
  mountMode = "visited",
}: Props<T>) {
  const panelClass = className ?? "flex min-h-0 min-w-0 flex-1 flex-col";

  if (mountMode === "active") {
    if (!active) return null;
    return (
      <div className={panelClass} data-hub-screen={dataScreen}>
        {children}
      </div>
    );
  }

  if (!visited.has(tabId)) return null;
  return (
    <div
      hidden={!active}
      className={active ? panelClass : `hidden ${className ?? ""}`.trim()}
      aria-hidden={!active}
      data-hub-screen={dataScreen}
    >
      {children}
    </div>
  );
}
