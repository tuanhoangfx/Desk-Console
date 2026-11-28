import { memo, type ReactNode } from "react";
import { HUB_VISITED_INACTIVE_STYLE } from "@tool-workspace/hub-ui";
import type { AppScreen } from "../lib/app-screen";

type Props = {
  tabId: AppScreen;
  active: boolean;
  visited: ReadonlySet<AppScreen>;
  children: ReactNode;
};

/**
 * Keep-alive panel with `HUB_VISITED_INACTIVE_STYLE` (`content-visibility: hidden`) + `inert`
 * matching P0010 / HubVisitedTabPanel SSOT so parked tabs incur zero layout/paint cost.
 */
export const DeskVisitedTabPanel = memo(function DeskVisitedTabPanel({
  tabId,
  active,
  visited,
  children,
}: Props) {
  if (!visited.has(tabId)) return null;
  return (
    <div
      className={
        active
          ? "desk-tab-panel desk-tab-panel--active flex min-h-0 min-w-0 flex-1 flex-col"
          : "desk-tab-panel desk-tab-panel--parked"
      }
      style={active ? undefined : HUB_VISITED_INACTIVE_STYLE}
      aria-hidden={!active}
      data-hub-screen={tabId}
      inert={!active ? true : undefined}
    >
      {children}
    </div>
  );
});
