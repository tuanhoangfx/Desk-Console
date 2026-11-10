/** Directory row chrome for a Folder Sync job. Status and Run stay separate. */
import { formatHubDebounce, formatHubDebounceCountdown } from "@tool-workspace/hub-ui/lib/hub-debounce-vanilla";

export function jobIsLive(status) {
  return status === "running" || status === "analyzing";
}

/**
 * Pulse the Status dot while a pass is running, or while 24/7 sync is on.
 * Manual, Failed, and Stopped stay still. Synced keeps its label — the dot
 * shows the watcher is armed.
 */
export function jobStatusLive(job) {
  if (job?.status === "analyzing" || job?.status === "running" || job?.busy) return true;
  if (job?.status === "error" || job?.status === "stopped" || job?.status === "paused") return false;
  if (job?.lastResult?.ok === false) return false;
  return settleSec(job?.settleSec) > 0;
}

/**
 * Read-only state. A finished sync is Synced or Failed — never disguised as the Start button.
 * `busy` covers the gap before the host poll reports `running`.
 * @param {object} job
 * @returns {{ label: string, tone: "online" | "offline" | "idle" | "active" }}
 */
export function jobStatusView(job) {
  if (job?.status === "analyzing") return { label: "Analyzing", tone: "active" };
  if (job?.status === "running" || job?.busy) return { label: "Syncing", tone: "active" };
  if (job?.status === "error" || job?.lastResult?.ok === false) return { label: "Failed", tone: "offline" };
  if (job?.status === "paused" || job?.status === "stopped") return { label: "Stopped", tone: "idle" };
  if (job?.nextSyncAt) return { label: "Waiting", tone: "active" };
  if (job?.lastSuccessfulSyncAt) return { label: "Synced", tone: "online" };
  return { label: "Idle", tone: "idle" };
}

/** Filter and KPI use the pill label, not the stored status word. */
export function jobMatchesStatusLabel(job, selected) {
  if (!selected?.length) return true;
  return selected.includes(jobStatusView(job).label);
}

/**
 * Rejected option: one cell that is both the state and the button.
 * A completed, failed, or armed job all paint "Start", which is why the click looks like it did nothing.
 */
export function mergedRunLabel(job, busy) {
  const running = jobIsLive(job?.status);
  if (busy && !running) return "Syncing";
  if (running) return "Stop";
  return "Start";
}

/**
 * Stop aborts the rclone pass, or turns off 24/7 watch (kind pause, same Stop label as P0003).
 * Retry runs a failed pass again. Start resumes a paused job, or runs one pass when Manual.
 * @param {object} job
 * @param {boolean} busy
 * @returns {{ kind: "start" | "pause" | "retry" | "stop", label: "Start" | "Retry" | "Stop", pending: boolean }}
 */
export function jobRunAction(job, busy) {
  const running = jobIsLive(job?.status);
  if (running) return { kind: "stop", label: "Stop", pending: false };
  if (busy) return { kind: "stop", label: "Stop", pending: true };
  if (job?.status === "paused" || job?.status === "stopped") return { kind: "start", label: "Start", pending: false };
  if (job?.status === "error" || job?.lastResult?.ok === false) return { kind: "retry", label: "Retry", pending: false };
  if (settleSec(job?.settleSec) > 0) return { kind: "pause", label: "Stop", pending: false };
  return { kind: "start", label: "Start", pending: false };
}

function settleSec(value) {
  const n = Number(value);
  return n === 0 || n === 20 || n === 60 || n === 300 ? n : 20;
}

/** Armed debounce countdown. The saved setting uses `jobScheduleLabel`, not this. */
export function formatArmedCountdown(at, now) {
  return formatHubDebounceCountdown(at, now);
}

/** Saved debounce: wait this long after the last change. Not a cycle, not a live timer. */
export function jobScheduleLabel(value) {
  return formatHubDebounce(settleSec(value), { zeroLabel: "Manual" });
}

export function jobNextText(job, now) {
  if (job?.status === "paused" || job?.status === "stopped") return { label: "Stopped", live: false };
  if (job?.nextSyncAt) return { label: formatArmedCountdown(job.nextSyncAt, now), live: true };
  return { label: jobScheduleLabel(job?.settleSec), live: false };
}

/**
 * Compact badge text for live rclone transfer progress (e.g. `27% · 4.1 MiB/s`).
 * @param {{ percent?: number | null, speed?: string | null } | null | undefined} progress
 */
export function formatJobLiveProgressBadge(progress) {
  if (!progress) return "";
  const hasPct = typeof progress.percent === "number" && Number.isFinite(progress.percent);
  const speed = String(progress.speed || "").trim();
  const hasSpeed = Boolean(speed && speed !== "0 B/s" && speed !== "0B/s");
  if (hasPct && hasSpeed) return `${progress.percent}% · ${speed}`;
  if (hasPct) return `${progress.percent}%`;
  if (hasSpeed) return speed;
  return "";
}

/**
 * Tooltip summary for live rclone transfer progress.
 * @param {{ percent?: number | null, transferred?: string | null, total?: string | null, speed?: string | null, eta?: string | null, filesDone?: number | null, filesTotal?: number | null } | null | undefined} progress
 */
export function formatJobLiveProgressTooltip(progress) {
  if (!progress) return "";
  const parts = [];
  if (progress.transferred && progress.total) {
    const pct = typeof progress.percent === "number" ? ` (${progress.percent}%)` : "";
    parts.push(`Transferred: ${progress.transferred} / ${progress.total}${pct}`);
  } else if (typeof progress.percent === "number") {
    parts.push(`Progress: ${progress.percent}%`);
  }
  if (progress.speed) parts.push(`Speed: ${progress.speed}`);
  if (progress.eta) parts.push(`ETA: ${progress.eta}`);
  if (progress.filesDone != null && progress.filesTotal != null) {
    parts.push(`Files: ${progress.filesDone}/${progress.filesTotal}`);
  }
  return parts.join(" · ");
}
