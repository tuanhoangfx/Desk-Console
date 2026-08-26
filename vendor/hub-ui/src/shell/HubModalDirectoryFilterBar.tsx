import type { ReactNode } from "react";
import { FilterBar, type FilterBarProps } from "./FilterBar";

export type HubModalDirectoryFilterBarProps = Omit<
  FilterBarProps,
  "layout" | "trailing" | "pinSticky" | "embedded"
> & {
  /** Scoped keyboard shortcuts (F / Esc) — unique per modal section, e.g. `cookie-route-access`. */
  shortcutScope: string;
  /** Row 1 trailing — HubResultCount, period, row size, view toggle, etc. */
  toolbar?: ReactNode;
  /** Row 2 leading — optional controls before filter dropdowns. */
  row2Leading?: ReactNode;
  /** Row 2 right — bulk actions (Share, Grant filtered, Recheck, …). */
  row2Actions?: ReactNode;
};

/**
 * Golden modal directory FilterBar — two-row hub layout, no Active: pill row.
 * Row 1: search + toolbar · Row 2: filters (left) + row2Actions (right).
 */
export function HubModalDirectoryFilterBar({
  shortcutScope,
  toolbar,
  row2Leading,
  row2Actions,
  ...rest
}: HubModalDirectoryFilterBarProps) {
  return (
    <FilterBar
      layout="hub"
      shortcutScope={shortcutScope}
      toolbar={toolbar}
      row2Leading={row2Leading}
      row2Actions={row2Actions}
      {...rest}
    />
  );
}
