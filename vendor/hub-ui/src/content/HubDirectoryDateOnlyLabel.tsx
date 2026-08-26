import type { ReactNode } from "react";
import { HubDirectoryEmptyCell, isDirectoryEmptyLabel } from "../lib/directory-empty-label";
import { HubUsersStatusLabel } from "../shell/HubUsersStatusLabel";
import { HUB_DIRECTORY_TIMESTAMP_CLASS } from "../lib/hub-directory-timestamp";
import { formatHubTimestampDateOnly } from "../lib/format-hub-timestamp-compact";

export type HubDirectoryDateOnlyLabelProps = {
  /** ISO datetime (or date-only `YYYY-MM-DD` — noon UTC is fine for calendar display). */
  at?: string | null;
  fallback?: ReactNode;
  className?: string;
};

/**
 * Sheet / directory calendar date — compact `dd/mm/yy` + age-stale gray dot.
 * Not relative activity age (use `HubDirectoryTimestampLabel` for that).
 */
export function HubDirectoryDateOnlyLabel({
  at,
  fallback = <HubDirectoryEmptyCell />,
  className = "",
}: HubDirectoryDateOnlyLabelProps) {
  if (!at?.trim()) return <>{fallback}</>;
  const label = formatHubTimestampDateOnly(at);
  if (!label || isDirectoryEmptyLabel(label)) return <>{fallback}</>;
  return (
    <span className={`${HUB_DIRECTORY_TIMESTAMP_CLASS}${className ? ` ${className}` : ""}`}>
      <HubUsersStatusLabel label={label} tone="age-stale" capitalize={false} />
    </span>
  );
}
