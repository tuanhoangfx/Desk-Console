import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Cloud, FolderKanban, ScrollText, Terminal } from "lucide-react";
import {
  HubPanel,
  HubRuntimeChannelBadge,
  HubRuntimeConsoleLine,
  HubRuntimeConsoleTerm,
  compactIconSize,
} from "@tool-workspace/hub-ui";
import type { OpsConsoleEntry } from "../../lib/api";
import type { SyncJob } from "../../lib/sync-api";
import { clearDeskOpsLogs, readDeskOpsLogs, subscribeDeskOpsLogs } from "../desk/desk-ops-session-log";
import { JobsConsoleRail } from "./JobsConsoleRail";
import { JobsHistoryRail } from "./JobsHistoryRail";

type Props = {
  jobsPane: ReactNode;
  jobs: SyncJob[];
  focusedId: string;
  consoleLines: string[];
  onSelect: (id: string) => void;
};

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
        const ok = entry.ok !== false;
        out.push({
          id: `job-act-${job.id}-${i}-${at}`,
          at: at ? new Date(at).toLocaleTimeString([], { hour12: false }) : "—",
          level: ok ? "info" : "error",
          channel: "sync",
          message: `${code} · ${entry.action || "sync"}${entry.actor ? ` (${entry.actor})` : ""}${
            entry.summary ? ` — ${entry.summary}` : ok ? " — completed" : " — failed"
          }`,
        });
      }
      if (act.length === 0 && (job.lastRunAt || job.lastResult)) {
        const at = job.lastRunAt || job.updatedAt || "";
        const ts = Date.parse(at);
        if (!clearedAt || !Number.isFinite(ts) || ts > clearedAt) {
          const ok = job.lastResult?.ok !== false;
          out.push({
            id: `job-last-${job.id}-${at}`,
            at: at ? new Date(at).toLocaleTimeString([], { hour12: false }) : "—",
            level: ok ? "info" : "error",
            channel: "drive",
            message: `${code} · ${job.remote} ↔ ${job.localPath} (${job.status})`,
          });
        }
      }
    }

    for (const op of opsRows) {
      out.push({
        id: op.id,
        at: op.at,
        level: op.level,
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

/** Jobs & Drives table | History · Log · Console (3:3:4 split SSOT parity with DeskOpsRuntimeRail). */
export function JobsMainAndRail({ jobsPane, jobs, focusedId, consoleLines, onSelect }: Props) {
  const focusedJob = jobs.find((j) => j.id === focusedId) || null;
  return (
    <div className="stealth-profile-layout flex min-h-0 flex-1 overflow-hidden">
      <div className="stealth-profile-directory-pane">{jobsPane}</div>
      <aside
        className="stealth-workflow-rail desk-ops-three-rail"
        aria-label="Runtime History, Log, and Console rail"
      >
        <JobsHistoryRail jobs={jobs} focusedId={focusedId} onSelect={onSelect} />
        <JobsLogRail jobs={jobs} focusedId={focusedId} />
        <JobsConsoleRail lines={consoleLines} focusedJob={focusedJob} />
      </aside>
    </div>
  );
}
