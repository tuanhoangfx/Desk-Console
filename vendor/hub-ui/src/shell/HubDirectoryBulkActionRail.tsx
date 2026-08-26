import type { ReactNode } from "react";

export type HubDirectoryBulkActionRailProps = {
  children: ReactNode;
  className?: string;
};

/** Filter row 2 bulk CTA rail — pairs with `hub-directory-bulk-rail.css` (no `display` override). */
export function HubDirectoryBulkActionRail({ children, className }: HubDirectoryBulkActionRailProps) {
  return <div className={["hub-directory-bulk-rail flex flex-wrap", className].filter(Boolean).join(" ")}>{children}</div>;
}
