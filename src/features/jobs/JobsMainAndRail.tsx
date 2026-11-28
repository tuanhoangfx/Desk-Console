import { useEffect, useMemo, useState } from "react";
import { Cloud, FolderKanban, ScrollText, Terminal } from "lucide-react";
import {
  HubPanel,
  HubRuntimeChannelBadge,
  HubRuntimeConsoleLine,
  HubRuntimeConsoleTerm,
  compactIconSize,
} from "@tool-workspace/hub-ui";
import type { OpsConsoleEntry } from "../../lib/api";
import { formatJobLiveProgressTooltip } from "../../lib/job-mode";
import type { SyncJob } from "../../lib/sync-api";
import { clearDeskOpsLogs, readDeskOpsLogs, subscribeDeskOpsLogs } from "../desk/desk-ops-session-log";
import { JobsConsoleRail } from "./JobsConsoleRail";
import { JobsHistoryRail } from "./JobsHistoryRail";

export function buildJobConsoleLines(job: SyncJob | null | undefined, error?: string | null): string[] {
  const head = error ? [`API error: ${error}`] : [];
  if (!job?.lastResult && !job?.liveProgress) return head;
  const progressLine = job?.liveProgress ? `# ${formatJobLiveProgressTooltip(job.liveProgress)}` : "";
  if (!job?.lastResult) {
    return [...head, `# ${job?.name || "Job"} · ${job?.status || "running"}`, progressLine].filter(Boolean);
  }
  return [
    ...head,
    `# ${job.name} · ${job.lastResult.action || "—"} · ${job.status}`,
    progressLine,
    job.lastResult.backupDir ? `backup: ${job.lastResult.backupDir}` : "",
    job.lastResult.conflictDir ? `conflicts: ${job.lastResult.conflictDir}` : "",
    job.lastResult.trashPolicy ? `trash: ${job.lastResult.trashPolicy}` : "",
    "--- stdout ---",
    job.lastResult.stdout || "(empty)",
    "--- stderr ---",
    job.lastResult.stderr || "(empty)",
  ].filter(Boolean);
}

type SyncLogRow = {
  id: string;
  at: string;
  level: "info" | "warn" | "error";
  channel: "sync" | "drive" | "ops";
  message: string;
};

function JobsLogRail({ jobs, focusedId }: { jobs: SyncJob[]; focusedId: string }) {
  const [opsRows, setOpsRows] = useState<OpsConsoleEntry[]>(() => readDeskOpsLogs());
  const [clearedAt, setClearedAt] = useState<number>(0);

  useEffect(() => subscribeDeskOpsLogs(() => setOpsRows(readDeskOpsLogs())), []);

  const rows = useMemo<SyncLogRow[]>(() => {
    const out: SyncLogRow[] = [];
    const targetJobs = focusedId ? jobs.filter((j) => j.id === focusedId) : jobs;
    const pool = targetJobs.length > 0 ? targetJobs : jobs;

    for (const job of pool) {
      const code = job.code || job.name || "JOB";
      const act = Array.isArray(job.activityLog) ? job.activityLog : [];
      for (let i = 0; i < act.length; i += 1) {
        const entry = act[i]!;
        const at = entry.at || job.lastRunAt || job.updatedAt || "";
        const ts = Date.parse(at);
        if (clearedAt && Number.isFinite(ts) && ts <= clearedAt) continue;
        const msgText = String(entry.message || "").trim();
        const ok = !/\b(failed|error)\b/i.test(msgText);
        const actorLabel = entry.actor?.label ? ` (${entry.actor.label})` : "";
        out.push({
          id: `job-act-${job.id}-${i}-${at}`,
          at: at ? new Date(at).toLocaleTimeString([], { hour12: false }) : "",
          level: ok ? "info" : "error",
          channel: "sync",
          message: `${code}${actorLabel} — ${msgText || (ok ? "completed" : "failed")}`,
        });
      }
      if (act.length === 0 && (job.lastRunAt || job.lastResult)) {
        const at = job.lastRunAt || job.updatedAt || "";
        const ts = Date.parse(at);
        if (!clearedAt || !Number.isFinite(ts) || ts > clearedAt) {
          const ok = job.lastResult?.ok !== false;
          out.push({
            id: `job-last-${job.id}-${at}`,
            at: at ? new Date(at).toLocaleTimeString([], { hour12: false }) : "",
            level: ok ? "info" : "error",
            channel: "drive",
            message: `${code} · ${job.remote} ↔ ${job.localPath} (${job.status})`,
          });
        }
      }
    }

    for (const op of opsRows) {
      const normalizedLevel: SyncLogRow["level"] =
        op.level === "error" || op.level === "warn" ? op.level : "info";
      out.push({
        id: op.id,
        at: op.at,
        level: normalizedLevel,
        channel: "ops",
        message: op.message,
      });
    }

    return out.slice(-150);
  }, [clearedAt, focusedId, jobs, opsRows]);

  return (
    <HubPanel
      title="Log"
      titleIcon={<ScrollText size={compactIconSize(14)} className="text-sky-300/90" aria-hidden />}
      className="desk-runtime-log stealth-runtime-console h-full min-h-0 overflow-hidden"
      actions={
        <button
          type="button"
          className="hub-btn hub-btn--ghost text-xs"
          onClick={() => {
            setClearedAt(Date.now());
            clearDeskOpsLogs();
          }}
        >
          Clear
        </button>
      }
    >
      <HubRuntimeConsoleTerm className="desk-runtime-log__body stealth-console-log hub-runtime-rail-surface">
        {rows.length === 0 ? (
          <div className="text-hub-muted">Sync & Drive activity logs will appear here…</div>
        ) : (
          rows.map((row) => {
            const Icon = row.channel === "drive" ? Cloud : row.channel === "sync" ? FolderKanban : Terminal;
            const label = row.channel === "drive" ? "Drive" : row.channel === "sync" ? "Sync" : "Ops";
            const variant = row.channel === "drive" ? "api" : row.channel === "sync" ? "job" : "ops";
            return (
              <HubRuntimeConsoleLine
                key={row.id}
                level={row.level}
                time={row.at}
                channelBadge={
                  <HubRuntimeChannelBadge
                    variant={variant}
                    label={label}
                    icon={<Icon size={10} aria-hidden />}
                    compact
                  />
                }
                source=""
                message={row.message}
              />
            );
          })
        )}
      </HubRuntimeConsoleTerm>
    </HubPanel>
  );
}

/** Embedded Console, History & Log section for JobDetailModal / DriveDetailModal (Layout 3 SSOT). */
export function JobsRuntimeDetailPanel({
  jobs,
  focusedId,
  onSelect,
}: {
  jobs: SyncJob[];
  focusedId: string;
  onSelect?: (id: string) => void;
}) {
  const focusedJob = jobs.find((j) => j.id === focusedId) || jobs[0] || null;
  const consoleLines = useMemo(() => buildJobConsoleLines(focusedJob), [focusedJob]);
  return (
    <div className="flex flex-col gap-3">
      <div className="grid h-[210px] min-h-0 grid-cols-1 gap-3 md:grid-cols-2">
        <JobsHistoryRail
          jobs={jobs}
          focusedId={focusedJob?.id || ""}
          onSelect={onSelect || (() => undefined)}
        />
        <JobsLogRail jobs={jobs} focusedId={focusedJob?.id || ""} />
      </div>
      <div className="h-[250px] min-h-0">
        <JobsConsoleRail lines={consoleLines} focusedJob={focusedJob} />
      </div>
    </div>
  );
}
