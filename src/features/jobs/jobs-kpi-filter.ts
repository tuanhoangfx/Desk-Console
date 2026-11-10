import { jobMatchesStatusLabel, jobStatusView } from "../../lib/job-row-chrome.mjs";
import type { SyncJob } from "../../lib/sync-api";

/** Domain KPI tiles write the Status filter. Date tiles use the shared Created / Updated facets. */
export const JOB_STATUS_KPI_FILTERS: Record<string, { status: string[] }> = {
  synced: { status: ["Synced"] },
  syncing: { status: ["Syncing"] },
  failed: { status: ["Failed"] },
  stopped: { status: ["Stopped"] },
};
const JOB_STATUS_LABELS = ["Idle", "Waiting", "Analyzing", "Syncing", "Synced", "Failed", "Stopped"] as const;

type StatusJob = Pick<SyncJob, "status" | "lastResult" | "lastSuccessfulSyncAt" | "nextSyncAt" | "settleSec"> & {
  busy?: boolean;
};

/** Selected values are the pill labels. */
export function jobMatchesStatusFilter(job: StatusJob, selected: string[] | undefined): boolean {
  return jobMatchesStatusLabel(job, selected);
}

export function jobStatusCounts(jobs: readonly StatusJob[]): Record<string, number> {
  const counts = Object.fromEntries(JOB_STATUS_LABELS.map((label) => [label, 0]));
  for (const job of jobs) {
    const label = jobStatusView(job).label;
    if (label in counts) counts[label] += 1;
  }
  return counts;
}
