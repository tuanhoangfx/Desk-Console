import {
  HubDirectoryCardCheckbox,
  HubDirectoryCardCornerRail,
  HubDirectoryCardHeader,
  HubDirectoryInteractiveCard,
  HubUsersStatusLabel,
} from "@tool-workspace/hub-ui";
import { useDriveAccounts } from "../drives/use-drive-accounts";
import {
  formatJobLiveProgressBadge,
  formatJobLiveProgressTooltip,
  jobModeEmoji,
  jobModeLabel,
  jobNextText,
  jobStatusLive,
  jobStatusView,
} from "../../lib/job-mode";
import { formatDrivePath } from "../../lib/remote-name";
import type { SyncJob } from "../../lib/sync-api";

type Props = {
  items: SyncJob[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onOpen: (job: SyncJob) => void;
  busyId?: string | null;
  emptyMessage?: string;
};

export function JobsDirectoryCards({
  items,
  selectedIds,
  onToggleSelect,
  onOpen,
  busyId,
  emptyMessage = "No jobs",
}: Props) {
  const { accounts } = useDriveAccounts();
  if (!items.length) {
    return <p className="px-3 py-6 text-sm text-[var(--muted)]">{emptyMessage}</p>;
  }
  return (
    <div className="hub-scrollbar grid min-h-0 flex-1 auto-rows-fr grid-cols-[repeat(auto-fill,minmax(240px,1fr))] content-start gap-3 overflow-auto p-3">
      {items.map((job) => {
        const status = jobStatusView({ ...job, busy: busyId === job.id });
        const driveLabel = formatDrivePath(job.remote, accounts);
        const next = jobNextText(job, Date.now());
        const progressBadge = formatJobLiveProgressBadge(job.liveProgress);
        const progressTip = formatJobLiveProgressTooltip(job.liveProgress);
        return (
          <HubDirectoryInteractiveCard
            key={job.id}
            ariaLabel={job.name}
            selected={selectedIds.has(job.id)}
            onActivate={() => onOpen(job)}
          >
            <HubDirectoryCardCornerRail>
              <HubDirectoryCardCheckbox
                corner
                checked={selectedIds.has(job.id)}
                label={job.name}
                onChange={() => onToggleSelect(job.id)}
              />
            </HubDirectoryCardCornerRail>
            <div className="flex min-h-[var(--hub-card-min-h,140px)] flex-col p-3 pr-10">
              <HubDirectoryCardHeader title={job.name} subtitle={job.code || job.id} />
              <p className="mt-2 truncate text-xs text-[var(--muted)]" title={job.localPath}>
                💻 {job.localPath}
              </p>
              <p className="truncate text-xs text-[var(--muted)]" title={driveLabel}>
                ☁️ {driveLabel}
              </p>
              {progressBadge ? (
                <p className="mt-1 truncate font-mono text-xs text-sky-300" title={progressTip || progressBadge}>
                  ⚡ {progressBadge}
                </p>
              ) : null}
              <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                <span className="truncate text-xs text-[var(--muted)]">
                  {jobModeEmoji(job.mode)} {jobModeLabel(job.mode)} · ⏱ {next.label}
                </span>
                <HubUsersStatusLabel
                  label={
                    (status.label === "Syncing" || status.label === "Analyzing") && job.liveProgress?.percent != null
                      ? `${status.label} ${job.liveProgress.percent}%`
                      : status.label
                  }
                  tone={status.tone}
                  capitalize={false}
                  live={jobStatusLive({ ...job, busy: busyId === job.id })}
                  title={progressTip || undefined}
                />
              </div>
            </div>
          </HubDirectoryInteractiveCard>
        );
      })}
    </div>
  );
}
