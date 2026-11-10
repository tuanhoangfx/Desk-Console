import {
  DirectoryEmptyDash,
  HubDirectoryLogCell,
  type HubEntityLogEntry,
  type HubEntityLogFieldMeta,
} from "@tool-workspace/hub-ui";
import type { SyncJob } from "../../lib/sync-api";

const FIELD_META: Record<string, HubEntityLogFieldMeta> = {
  code: { label: "Job ID", emoji: "🆔" },
  name: { label: "Name", emoji: "📁" },
  localPath: { label: "Local", emoji: "💻" },
  remote: { label: "Remote", emoji: "☁️" },
  mode: { label: "Mode", emoji: "⇄" },
  note: { label: "Note", emoji: "📝" },
};

function fieldMeta(field: string): HubEntityLogFieldMeta {
  return FIELD_META[field] ?? { label: field };
}

function entries(job: SyncJob): HubEntityLogEntry[] {
  return (job.activityLog ?? []).map((entry) => ({
    at: entry.at,
    message: entry.message,
    changes: entry.changes,
    actor: entry.actor?.label
      ? {
          label: entry.actor.label,
          source:
            entry.actor.source === "hub" || entry.actor.source === "store" || entry.actor.source === "system"
              ? entry.actor.source
              : "system",
        }
      : undefined,
  }));
}

/** Directory Log chip — same flatten + summary row as P0005 Order. */
export function JobDirectoryLogCell({ job }: { job: SyncJob }) {
  return (
    <HubDirectoryLogCell
      entries={entries(job)}
      fieldMeta={fieldMeta}
      empty={<DirectoryEmptyDash className="hub-users-directory-body-text hub-users-cell-muted" />}
    />
  );
}
