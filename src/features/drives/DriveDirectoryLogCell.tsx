import {
  DirectoryEmptyDash,
  HubDirectoryLogLabel,
  flattenHubEntityLog,
  formatHubChangeLogRowTooltip,
  formatHubEntityLogActionLabel,
  pickHubEntityLogDirectorySummaryRow,
  type HubEntityLogEntry,
  type HubEntityLogFieldMeta,
} from "@tool-workspace/hub-ui";
import { DIRECTORY_GMAIL_EMOJI, DIRECTORY_STATUS_EMOJI } from "../../lib/folder-sync-directory-column-hints";
import type { DriveAccountLog } from "../../lib/sync-api";

const FIELD_META: Record<string, HubEntityLogFieldMeta> = {
  file: { label: "File", emoji: "📄" },
  name: { label: "Name", emoji: "☁️" },
  status: { label: "Status", emoji: DIRECTORY_STATUS_EMOJI },
  email: { label: "Gmail", emoji: DIRECTORY_GMAIL_EMOJI },
};

function fieldMeta(field: string): HubEntityLogFieldMeta {
  return FIELD_META[field] ?? { label: field };
}

function toEntries(rows: DriveAccountLog[] | undefined): HubEntityLogEntry[] {
  return (rows ?? []).map((entry) => ({
    at: entry.at,
    message: entry.message,
    changes: entry.changes,
    actor: entry.actor?.label
      ? {
          label: entry.actor.label,
          source: entry.actor.source === "hub" || entry.actor.source === "store" ? entry.actor.source : "system",
        }
      : undefined,
  }));
}

function fileName(path: string) {
  const parts = path.split("/");
  return parts[parts.length - 1] || path;
}

function changePath(change: { before?: string; after?: string } | undefined) {
  const after = change?.after?.trim() || "";
  const before = change?.before?.trim() || "";
  if (after && after !== "previous" && !/^\d+ B$/.test(after)) return after;
  return before || after;
}

function isBackupPath(filePath: string) {
  return filePath
    .replace(/\\/g, "/")
    .split("/")
    .some((part) => part === "_FolderSyncBackups" || part === ".folder-sync-backup");
}

/** Directory chip shows the file name, not only "File updated". */
function fileNote(row: { change?: { field?: string; before?: string; after?: string } } | undefined): string | null {
  const change = row?.change;
  if (!change || change.field !== "file") return null;
  const before = change.before?.trim() || "";
  const after = change.after?.trim() || "";
  const name = fileName(after || before || "File");
  if (after && !before) return `${name} added`;
  if (before && !after) return `${name} removed`;
  return `${name} updated`;
}

/** Directory Log chip — one file change, same row pattern as P0005 Order. */
export function DriveDirectoryLogCell({ entries }: { entries?: DriveAccountLog[] }) {
  const rows = flattenHubEntityLog(toEntries(entries), {
    labelFor: (change) => fieldMeta(change.field).label,
  });
  const row =
    rows.find((item) => item.change?.field === "file" && !isBackupPath(changePath(item.change))) ??
    pickHubEntityLogDirectorySummaryRow(rows);
  if (!row) return <DirectoryEmptyDash className="hub-users-directory-body-text hub-users-cell-muted" />;
  const emoji = row.change ? fieldMeta(row.change.field).emoji : undefined;
  return (
    <HubDirectoryLogLabel
      note={fileNote(row) || formatHubEntityLogActionLabel(row)}
      title={formatHubChangeLogRowTooltip(row, fieldMeta)}
      leading={
        emoji ? (
          <span className="hub-users-th-emoji" aria-hidden>
            {emoji}
          </span>
        ) : undefined
      }
    />
  );
}
