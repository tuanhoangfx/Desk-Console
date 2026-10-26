import { useEffect, useState, type ReactNode } from "react";
import {
  DIRECTORY_CELL_TRUNCATE,
  DirectoryEmptyDash,
  DirectoryTableBodyCell,
  formatHubTimestampCompact,
  HubDirectoryCopyText,
  HubDirectoryRunToggle,
  HubDirectoryTimestampTooltipCell,
  HubDirectoryValuePopover,
  HubUsersStatusLabel,
  type HubDirectoryTableColumn,
} from "@tool-workspace/hub-ui";
import {
  formatJobLiveProgressTooltip,
  jobModeEmoji,
  jobModeLabel,
  jobNextText,
  jobRunAction,
  jobStatusLive,
  jobStatusView,
} from "../../lib/job-mode";
import type { JobsColumnKey } from "../../lib/jobs-directory-meta";
import { formatDrivePath, remotePathFromSpec } from "../../lib/remote-name";
import type { DriveAccount, SyncJob } from "../../lib/sync-api";
import { JobDirectoryLogCell } from "./JobDirectoryLogCell";
import { JobPathCell } from "./JobPathCell";

const clockListeners = new Set<() => void>();
let clockTimer: number | null = null;
let sharedNow = Date.now();

function subscribeSecondClock(fn: () => void) {
  const wasEmpty = clockListeners.size === 0;
  clockListeners.add(fn);
  if (wasEmpty && typeof window !== "undefined") {
    sharedNow = Date.now();
    clockTimer = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      sharedNow = Date.now();
      for (const listener of clockListeners) listener();
    }, 1000);
  }
  return () => {
    clockListeners.delete(fn);
    if (clockListeners.size === 0 && clockTimer != null && typeof window !== "undefined") {
      window.clearInterval(clockTimer);
      clockTimer = null;
    }
  };
}

function JobNextCell({ job }: { job: SyncJob }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!job.nextSyncAt) return undefined;
    setNow(Date.now());
    return subscribeSecondClock(() => setNow(sharedNow));
  }, [job.nextSyncAt]);
  const next = jobNextText(job, now);
  if (next.live) {
    return <HubUsersStatusLabel label={next.label} tone="active" capitalize={false} live />;
  }
  return (
    <span className="hub-users-directory-body-text hub-users-directory-body-text--center">{next.label}</span>
  );
}

function JobRunCell({
  job,
  busy,
  onStart,
  onPause,
  onStop,
}: {
  job: SyncJob;
  busy: boolean;
  onStart?: (id: string) => void;
  onPause?: (id: string) => void;
  onStop?: (id: string) => void;
}) {
  const action = jobRunAction(job, busy);
  const stopChrome = action.kind === "stop" || action.kind === "pause";
  const title =
    action.pending
      ? "Starting sync"
      : action.kind === "stop"
        ? "Stop this sync pass"
        : action.kind === "pause"
          ? "Stop 24/7 sync"
          : action.kind === "retry"
            ? "Run this sync again"
            : job.status === "paused" || job.status === "stopped"
              ? "Resume 24/7 sync"
              : "Start one sync";
  const enabled = action.kind === "stop" ? Boolean(onStop) : action.kind === "pause" ? Boolean(onPause) : Boolean(onStart);
  return (
    <HubDirectoryRunToggle
      kind={stopChrome ? "stop" : action.kind === "retry" ? "retry" : "start"}
      pending={action.pending}
      label={action.label}
      ariaLabel={`${action.label} ${job.name}`}
      title={title}
      disabled={action.pending || !enabled}
      onClick={(event) => {
        event.stopPropagation();
        if (action.kind === "stop") onStop?.(job.id);
        else if (action.kind === "pause") onPause?.(job.id);
        else onStart?.(job.id);
      }}
    />
  );
}

export type JobsDirectoryCellContext = {
  accounts: DriveAccount[];
  busyId: string | null;
  onStart?: (id: string) => void;
  onPause?: (id: string) => void;
  onStop?: (id: string) => void;
};

export function renderJobsDirectoryBodyCell(
  row: SyncJob,
  col: HubDirectoryTableColumn<JobsColumnKey>,
  ctx: JobsDirectoryCellContext,
): ReactNode {
  const { accounts, busyId, onStart, onPause, onStop } = ctx;
  if (col.key === "code") {
    const code = row.code || "";
    const created = formatHubTimestampCompact(row.createdAt);
    const popoverLines = [
      `Job ID: ${code}`,
      created ? `Created: ${created}` : "",
      `UUID: ${row.id}`,
    ].filter(Boolean);
    return (
      <DirectoryTableBodyCell key={col.key} colClass={col.colClass} onClick={(e) => e.stopPropagation()}>
        {code ? (
          <HubDirectoryValuePopover value={popoverLines.join("\n")} title="🆔 Job ID">
            <HubDirectoryCopyText value={code} copyToastLabel="Job ID copied" />
          </HubDirectoryValuePopover>
        ) : (
          <DirectoryEmptyDash className="hub-users-directory-body-text hub-users-cell-muted" />
        )}
      </DirectoryTableBodyCell>
    );
  }
  if (col.key === "name") {
    return (
      <DirectoryTableBodyCell key={col.key} colClass={col.colClass}>
        <span className={`hub-users-name-title ${DIRECTORY_CELL_TRUNCATE}`}>{row.name}</span>
      </DirectoryTableBodyCell>
    );
  }
  if (col.key === "local") {
    return (
      <DirectoryTableBodyCell key={col.key} colClass={col.colClass}>
        <JobPathCell kind="local" path={row.localPath} />
      </DirectoryTableBodyCell>
    );
  }
  if (col.key === "remote") {
    return (
      <DirectoryTableBodyCell key={col.key} colClass={col.colClass}>
        <JobPathCell kind="remote" path={row.remote} label={formatDrivePath(row.remote, accounts)} />
      </DirectoryTableBodyCell>
    );
  }
  if (col.key === "folder") {
    const folder = remotePathFromSpec(row.remote);
    return (
      <DirectoryTableBodyCell key={col.key} colClass={col.colClass}>
        <JobPathCell kind="remote" path={row.remote} label={folder || "/"} />
      </DirectoryTableBodyCell>
    );
  }
  if (col.key === "status") {
    const view = jobStatusView({ ...row, busy: busyId === row.id });
    const live = jobStatusLive({ ...row, busy: busyId === row.id });
    const progressTip = formatJobLiveProgressTooltip(row.liveProgress);
    const statusLabel =
      (view.label === "Syncing" || view.label === "Analyzing") && row.liveProgress?.percent != null
        ? `${view.label} ${row.liveProgress.percent}%`
        : view.label;
    const detail =
      progressTip
        ? progressTip
        : view.label === "Failed"
          ? row.lastResult?.stderr || "Last sync pass failed — click Retry to run again."
          : view.label === "Syncing" || view.label === "Analyzing"
            ? "Rclone pass is actively transferring/checking files."
            : view.label === "Waiting"
              ? "Debounce armed — sync starts automatically when countdown settles."
              : view.label === "Stopped"
                ? "24/7 watch is paused — click Start to resume."
                : live
                  ? "24/7 watcher armed — waiting for local or Drive changes."
                  : "Manual mode — click Start to run a sync pass.";
    return (
      <DirectoryTableBodyCell key={col.key} colClass={col.colClass}>
        <HubUsersStatusLabel
          label={statusLabel}
          tone={view.tone}
          live={live}
          title={detail}
          popoverTitle="Sync status"
        />
      </DirectoryTableBodyCell>
    );
  }
  if (col.key === "run") {
    return (
      <DirectoryTableBodyCell key={col.key} colClass={col.colClass} onClick={(e) => e.stopPropagation()}>
        {onStart || onPause || onStop ? (
          <JobRunCell job={row} busy={busyId === row.id} onStart={onStart} onPause={onPause} onStop={onStop} />
        ) : (
          <DirectoryEmptyDash className="hub-users-directory-body-text hub-users-cell-muted" />
        )}
      </DirectoryTableBodyCell>
    );
  }
  if (col.key === "next") {
    return (
      <DirectoryTableBodyCell key={col.key} colClass={col.colClass}>
        <JobNextCell job={row} />
      </DirectoryTableBodyCell>
    );
  }
  if (col.key === "mode") {
    return (
      <DirectoryTableBodyCell key={col.key} colClass={col.colClass}>
        <span className="hub-users-directory-body-text hub-users-directory-body-text--center inline-flex items-center justify-center gap-1">
          <span aria-hidden>{jobModeEmoji(row.mode)}</span>
          {jobModeLabel(row.mode)}
        </span>
      </DirectoryTableBodyCell>
    );
  }
  if (col.key === "log") {
    return (
      <DirectoryTableBodyCell key={col.key} colClass={col.colClass}>
        <JobDirectoryLogCell job={row} />
      </DirectoryTableBodyCell>
    );
  }
  if (col.key === "updated" || col.key === "created") {
    const at = col.key === "updated" ? row.updatedAt : row.createdAt;
    return (
      <DirectoryTableBodyCell key={col.key} colClass={col.colClass}>
        <HubDirectoryTimestampTooltipCell
          at={at}
          title={col.key === "updated" ? "Update" : "Created"}
          fallback={<DirectoryEmptyDash className="hub-users-directory-body-text hub-users-cell-muted" />}
        />
      </DirectoryTableBodyCell>
    );
  }
  return (
    <DirectoryTableBodyCell key={col.key} colClass={col.colClass}>
      —
    </DirectoryTableBodyCell>
  );
}
