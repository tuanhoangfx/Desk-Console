import { useMemo } from "react";
import { CheckCircle2, History, Loader2, XCircle } from "lucide-react";
import {
  HubDirectoryProfileBadge,
  HubPanel,
  HubRuntimeHistoryCountBadge,
  HubRuntimeHistoryList,
  type HubRuntimeHistoryRow,
} from "@tool-workspace/hub-ui";
import { formatJobLiveProgressBadge, formatJobLiveProgressTooltip } from "../../lib/job-mode";
import type { SyncJob } from "../../lib/sync-api";

type Props = {
  jobs: SyncJob[];
  focusedId: string;
  onSelect: (id: string) => void;
};

function stamp(job: SyncJob): number {
  const raw = job.lastRunAt || job.updatedAt || job.createdAt || "";
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : 0;
}

function isRunning(job: SyncJob) {
  return job.status === "running" || job.status === "analyzing";
}

function formatShortTime(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/** History rail — P0019 CommentRail / P0003 Runtime History SSOT parity. */
export function JobsHistoryRail({ jobs, focusedId, onSelect }: Props) {
  const rows = useMemo<HubRuntimeHistoryRow[]>(
    () =>
      [...jobs]
        .filter((j) => j.lastRunAt || j.lastResult)
        .sort((a, b) => stamp(b) - stamp(a))
        .slice(0, 40)
        .map((job) => {
          const ok = job.lastResult?.ok;
          const running = isRunning(job);
          const at = job.lastRunAt || job.updatedAt || job.createdAt || "";
          const timeStr = formatShortTime(at);
          const codeLabel = job.code || "JOB";
          const leadingIcon = running ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-400" aria-hidden />
          ) : ok === false ? (
            <XCircle className="h-3.5 w-3.5 text-rose-400" aria-hidden />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
          );
          return {
            id: job.id,
            active: job.id === focusedId,
            titleAttr: `${codeLabel} · ${job.name} (${job.remote})`,
            onClick: () => onSelect(job.id),
            leading: leadingIcon,
            primaryRow: (
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <HubDirectoryProfileBadge value={codeLabel} />
                <span className="truncate">{job.name}</span>
              </span>
            ),
            primaryTrailing: (
              <span className="inline-flex items-center gap-2 font-mono text-[10px] text-[var(--text-muted)]">
                {running ? (
                  <span
                    className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] text-sky-300"
                    title={formatJobLiveProgressTooltip(job.liveProgress) || "Sync in progress"}
                  >
                    ⚡ {formatJobLiveProgressBadge(job.liveProgress) || "syncing"}
                  </span>
                ) : ok === false ? (
                  <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] text-rose-300">
                    ✗ fail
                  </span>
                ) : job.treeCounts?.synced != null ? (
                  <span
                    className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-300"
                    title={`Synced files: ${job.treeCounts.synced}`}
                  >
                    ✓ {job.treeCounts.synced}
                  </span>
                ) : (
                  <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-300">
                    ✓ ok
                  </span>
                )}
                {timeStr ? <span>{timeStr}</span> : null}
              </span>
            ),
            metaRow: `${job.remote} · ${job.localPath}`,
          };
        }),
    [focusedId, jobs, onSelect],
  );

  return (
    <HubPanel
      className="stealth-runtime-history"
      titleIcon={<History className="h-3.5 w-3.5" aria-hidden />}
      title="History"
      actions={<HubRuntimeHistoryCountBadge count={rows.length} />}
    >
      <div className="stealth-runtime-history__body min-h-0 flex-1 overflow-auto pr-0.5">
        <HubRuntimeHistoryList rows={rows} emptyMessage="No completed sync runs yet." />
      </div>
    </HubPanel>
  );
}
