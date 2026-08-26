import type { ReactNode } from "react";

type HubInactiveTabContentProps = {
  /** Whether this visited keep-alive panel is the active tab. */
  active: boolean;
  children: ReactNode;
  className?: string;
};

/**
 * Visited-tab perf SSOT — keep directory trees mounted while skipping paint/layout
 * when inactive (`content-visibility: hidden`). Replaces `{tabActive ? … : null}`.
 */
export function HubInactiveTabContent({ active, children, className }: HubInactiveTabContentProps) {
  return (
    <div
      className={[
        "hub-inactive-tab-content",
        active ? "hub-inactive-tab-content--active" : "hub-inactive-tab-content--hidden",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden={active ? undefined : true}
      inert={!active}
    >
      {children}
    </div>
  );
}
