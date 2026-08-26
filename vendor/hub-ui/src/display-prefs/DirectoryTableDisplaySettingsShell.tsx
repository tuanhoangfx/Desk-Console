import type { ReactNode } from "react";
import { SettingsSubsection } from "./primitives";
import { buildSemanticTocIcon } from "../lib/semantic-icon-registry";
import type { HubDirectoryColumnHintContent } from "../table/HubDirectoryColumnHint";

export type DirectoryTableDisplaySettingsShellProps = {
  /** Field Display Limit + Allow manual column sort (and optional footnotes). */
  toggles?: ReactNode;
  /** Fixed default order / Default sort body — wrapped in SettingsSubsection. */
  sort?: ReactNode;
  /** Full sort subsection (already includes SettingsSubsection) — skips shell wrap. */
  sortSection?: ReactNode;
  /** Subsection label — "Fixed default order" when manual OFF, "Default sort" when ON. */
  sortLabel?: string;
  sortIcon?: ReactNode;
  sortLabelHint?: HubDirectoryColumnHintContent;
  sortHeaderActions?: ReactNode;
  /** Password / domain extras body — wrapped when `extrasSection` is unset. */
  extras?: ReactNode;
  /** Full extras subsection — skips shell wrap. */
  extrasSection?: ReactNode;
  extrasLabel?: string;
  extrasIcon?: ReactNode;
  extrasLabelHint?: HubDirectoryColumnHintContent;
  /** Columns body — freeze control + DirectoryTableColumnsSettings. */
  columns: ReactNode;
  columnsLabel?: string;
  columnsIcon?: ReactNode;
  columnsLabelHint?: HubDirectoryColumnHintContent;
  className?: string;
};

/**
 * Directory Display panel skeleton SSOT (P0020 Service/2FA):
 * toggles → sort → extras/password → columns (freeze inside columns).
 *
 * Domain field-limit caps, password toggles, and sort-rule defs stay per-tool;
 * this shell only locks section order.
 */
export function DirectoryTableDisplaySettingsShell({
  toggles,
  sort,
  sortSection,
  sortLabel = "Fixed default order",
  sortIcon,
  sortLabelHint,
  sortHeaderActions,
  extras,
  extrasSection,
  extrasLabel = "Password",
  extrasIcon,
  extrasLabelHint,
  columns,
  columnsLabel = "Columns",
  columnsIcon,
  columnsLabelHint,
  className = "space-y-3",
}: DirectoryTableDisplaySettingsShellProps) {
  const resolvedSortIcon = sortIcon ?? buildSemanticTocIcon("settings.filters");
  const resolvedColumnsIcon = columnsIcon ?? buildSemanticTocIcon("settings.table");

  const sortNode =
    sortSection ??
    (sort ? (
      <SettingsSubsection
        label={sortLabel}
        icon={resolvedSortIcon}
        labelHint={sortLabelHint}
        headerActions={sortHeaderActions}
      >
        {sort}
      </SettingsSubsection>
    ) : null);

  const extrasNode =
    extrasSection ??
    (extras ? (
      <SettingsSubsection label={extrasLabel} icon={extrasIcon} labelHint={extrasLabelHint}>
        {extras}
      </SettingsSubsection>
    ) : null);

  return (
    <div className={className}>
      {toggles ? <div className="space-y-0.5">{toggles}</div> : null}
      {sortNode}
      {extrasNode}
      <SettingsSubsection
        label={columnsLabel}
        icon={resolvedColumnsIcon}
        labelHint={columnsLabelHint}
      >
        {columns}
      </SettingsSubsection>
    </div>
  );
}
