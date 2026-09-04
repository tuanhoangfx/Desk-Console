import { memo, type ReactNode } from "react";
import type { AppScreen } from "../lib/app-screen";

type Props = {
  tabId: AppScreen;
  active: boolean;
  visited: ReadonlySet<AppScreen>;
  children: ReactNode;
};

/**
 * Keep-alive panel without `hidden`/`display:none` — parking preserves layout so warm
 * tab switches stay snappy (display:none forced ~0.5–1.5s reflow on ~700-node directories).
 */
export const DeskVisitedTabPanel = memo(function DeskVisitedTabPanel({
  tabId,
  active,
  visited,
  children,
}: Props) {  if (!visited.has(tabId)) return null;
  return (
    <div
      className={
        active
          ? "desk-tab-panel desk-tab-panel--active flex min-h-0 min-w-0 flex-1 flex-col"
          : "desk-tab-panel desk-tab-panel--parked"
      }
      aria-hidden={!active}
      data-hub-screen={tabId}
      // @ts-expect-error React 19 inert boolean
      inert={!active ? true : undefined}
    >
      {children}
    </div>
  );
});
