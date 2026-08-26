import type { ReactNode } from "react";
import { DirectoryEmptyDash } from "../lib/directory-empty-label";
import type { HubEntityLogChange, HubEntityLogEntry, HubEntityLogFieldMeta } from "../lib/hub-entity-log";
import {
  flattenHubEntityLog,
  formatHubEntityLogActionLabel,
  pickHubEntityLogDirectorySummaryRow,
  type FlattenHubEntityLogOptions,
  type HubEntityLogRow,
} from "../lib/hub-entity-log-rows";
import { formatHubChangeLogRowTooltip } from "./HubChangeLogList";
import { HubDirectoryLogLabel } from "./HubDirectoryLogLabel";

export type HubDirectoryLogCellProps = {
  entries: readonly HubEntityLogEntry[];
  parseMessage?: FlattenHubEntityLogOptions["parseMessage"];
  isNoOpChange?: FlattenHubEntityLogOptions["isNoOpChange"];
  fieldMeta?: (field: string) => HubEntityLogFieldMeta;
  className?: string;
  /** Override empty state. `null` renders nothing (P0020 directory chip). */
  empty?: ReactNode;
  /** Action-label fallback for change rows. Default `Updated`. */
  actionFallback?: string;
  /** Override leading glyph (Lucide / brand). Defaults to fieldMeta.emoji. */
  renderLeading?: (row: HubEntityLogRow) => ReactNode;
};

/**
 * Directory Log chip — flatten + `pickHubEntityLogDirectorySummaryRow`
 * (credential wins, else top rail row) + `HubDirectoryLogLabel`.
 */
export function HubDirectoryLogCell({
  entries,
  parseMessage,
  isNoOpChange,
  fieldMeta,
  className,
  empty,
  actionFallback,
  renderLeading,
}: HubDirectoryLogCellProps) {
  const rows = flattenHubEntityLog([...entries], {
    parseMessage,
    isNoOpChange,
    labelFor: fieldMeta ? (change) => fieldMeta(change.field).label : undefined,
  });
  const row = pickHubEntityLogDirectorySummaryRow(rows);
  if (!row) {
    if (empty !== undefined) return empty;
    return <DirectoryEmptyDash className="hub-users-directory-body-text hub-users-cell-muted" />;
  }
  const emoji = row.change && fieldMeta ? fieldMeta(row.change.field).emoji : undefined;
  const title = fieldMeta ? formatHubChangeLogRowTooltip(row, fieldMeta) : undefined;
  return (
    <HubDirectoryLogLabel
      className={className}
      note={formatHubEntityLogActionLabel(row, actionFallback)}
      title={title}
      leading={
        renderLeading ? (
          renderLeading(row)
        ) : emoji ? (
          <span className="hub-users-th-emoji" aria-hidden>
            {emoji}
          </span>
        ) : undefined
      }
    />
  );
}
