import { useMemo } from "react";
import {
  HUB_DIRECTORY_ID_EMOJI,
  HubDirectoryColumnHint,
  HubDirectoryMetricBadge,
  type HubDirectoryColumnHintContent,
} from "@tool-workspace/hub-ui";
import { DIRECTORY_STATUS_EMOJI } from "../../lib/folder-sync-directory-column-hints";
import { jobStatusView } from "../../lib/job-mode";
import type { SyncJob } from "../../lib/sync-api";

const USAGE_COLUMNS = [
  `${HUB_DIRECTORY_ID_EMOJI} Job ID`,
  "📁 Name",
  `${DIRECTORY_STATUS_EMOJI} Status`,
  "💻 Local",
  "☁️ Remote",
].join(" • ");

function statusLabel(job: SyncJob) {
  return jobStatusView(job).label;
}

/** Same popover shape as P0020 Service Usage: title, column line, one row per job. */
export function buildDriveJobsUsageHint(jobs: readonly SyncJob[]): HubDirectoryColumnHintContent {
  const rows = [...jobs].sort((a, b) => String(a.code || a.name).localeCompare(String(b.code || b.name)));
  const count = rows.length;
  return {
    title: count === 0 ? "No jobs" : count === 1 ? "1 job" : `${count} jobs`,
    titleGlyph: { emoji: "📁" },
    optionsLabel: USAGE_COLUMNS,
    optionsLabelGlyph: null,
    lines: rows.slice(0, 8).map((job) => {
      const code = job.code?.trim() || "";
      return {
        label: [statusLabel(job), job.name, job.localPath || "—", job.remote || "—"].join(" • "),
        tokens: [
          { text: statusLabel(job) },
          { text: job.name || "—" },
          { text: job.localPath || "—" },
          { text: job.remote || "—" },
        ],
        copyLead: code ? { label: code, value: code, toastLabel: "Job ID copied" } : undefined,
        actionKey: job.id,
      };
    }),
  };
}

export function DriveJobsUsageCell({
  jobs,
  onOpenJob,
}: {
  jobs: readonly SyncJob[];
  onOpenJob?: (jobId: string) => void;
}) {
  const content = useMemo(() => buildDriveJobsUsageHint(jobs), [jobs]);
  return (
    <div onClick={(event) => event.stopPropagation()}>
      <HubDirectoryColumnHint content={content} onLineAction={onOpenJob}>
        <HubDirectoryMetricBadge count={jobs.length} />
      </HubDirectoryColumnHint>
    </div>
  );
}
