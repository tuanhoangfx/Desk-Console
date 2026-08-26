import type { ReactNode } from "react";
import { HubDirectoryEmptyCell } from "../lib/directory-empty-label";
import { HubDirectoryValuePopover } from "../table/HubDirectoryValuePopover";
import { HubDirectoryDateOnlyLabel } from "./HubDirectoryDateOnlyLabel";
import { HubDirectoryTimestampLabel } from "./HubDirectoryCompactTimestampLabel";
import { formatHubTimestampCompact } from "../lib/format-hub-timestamp-compact";

export type HubDirectoryTimestampTooltipVariant = "date" | "activity";

export type HubDirectoryTimestampTooltipCellProps = {
  /** ISO string or epoch ms. */
  at?: string | number | null;
  /** Popover title — the column label (e.g. `Created`, `Update`). */
  title: string;
  /** `date` → calendar `dd/mm/yy` label; `activity` → relative age label (default). */
  variant?: HubDirectoryTimestampTooltipVariant;
  /** ISO/ms used for the exact hover timestamp; defaults to `at`. */
  tooltipAt?: string | number | null;
  fallback?: ReactNode;
  className?: string;
};

function toIso(at?: string | number | null): string | null {
  if (at == null) return null;
  if (typeof at === "string") return at.trim() || null;
  const d = new Date(at);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Directory timestamp cell + exact hover tooltip (`hh:mm dd/mm/yy`) — SSOT for
 * Created / Update / activity columns across every screen. Wraps the calendar
 * (`date`) or relative-age (`activity`) label in {@link HubDirectoryValuePopover};
 * renders `fallback` when the timestamp is empty/invalid (no popover).
 */
export function HubDirectoryTimestampTooltipCell({
  at,
  title,
  variant = "activity",
  tooltipAt,
  fallback = <HubDirectoryEmptyCell />,
  className = "",
}: HubDirectoryTimestampTooltipCellProps) {
  const tip = formatHubTimestampCompact(toIso(tooltipAt ?? at));
  if (!tip) return <>{fallback}</>;
  const label =
    variant === "date" ? (
      <HubDirectoryDateOnlyLabel at={toIso(at)} fallback={fallback} className={className} />
    ) : (
      <HubDirectoryTimestampLabel at={at} fallback={fallback} className={className} />
    );
  return (
    <HubDirectoryValuePopover value={tip} title={title}>
      {label}
    </HubDirectoryValuePopover>
  );
}
