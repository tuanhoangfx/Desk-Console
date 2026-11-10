import type { HubUsersStatusTone } from "@tool-workspace/hub-ui";

/**
 * P0001 Desk directory sticker SSOT — emoji headers, filters, KPI (not Lucide).
 * Runners + Tasks + Sync Jobs/Drives share desk directory stickers.
 */
export const DESK_DIRECTORY_FILTER_EMOJI = {
  group: "🗂️",
  status: "🚦",
  project: "📁",
  task: "📅",
  runner: "▶️",
  up: "🟢",
  running: "▶️",
  down: "⛔",
} as const;

/** Runner KPI + Status cell + Status filter options — single SSOT. */
export const DESK_STATUS_KPI_EMOJI = {
  up: DESK_DIRECTORY_FILTER_EMOJI.up,
  running: DESK_DIRECTORY_FILTER_EMOJI.running,
  down: DESK_DIRECTORY_FILTER_EMOJI.down,
} as const;

/** Map a Status column / filter value → HubUsersStatusTone dot color (Campaign P0002 / Jobs P0001 SSOT). */
export function deskStatusDotTone(status: string): HubUsersStatusTone {
  const key = status.trim().toLowerCase();
  if (key === "up" || key === "active" || key === "ready" || key === "synced" || key === "signed in" || key === "history") {
    return "online";
  }
  if (key === "starting" || key === "running" || key === "syncing" || key === "analyzing" || key === "waiting" || key === "sample") {
    return "active";
  }
  if (key === "down" || key === "failed" || key === "error") {
    return "offline";
  }
  return "idle";
}

/** Whether the status dot pulses with the live glow effect (Campaign P0002 / Jobs P0001 SSOT). */
export function deskStatusLive(status: string): boolean {
  const key = status.trim().toLowerCase();
  return (
    key === "active" ||
    key === "ready" ||
    key === "up" ||
    key === "running" ||
    key === "starting" ||
    key === "syncing" ||
    key === "analyzing"
  );
}

/** Map a Status column / filter value → KPI glyph. */
export function deskStatusKpiEmoji(status: string): string {
  const key = status.trim().toLowerCase();
  if (key === "up" || key === "active" || key === "ready") return "🟢";
  if (key === "starting" || key === "running" || key === "stopping") {
    return DESK_STATUS_KPI_EMOJI.running;
  }
  if (key === "down" || key === "failed" || key === "error") return DESK_STATUS_KPI_EMOJI.down;
  if (key === "disabled" || key === "stopped") return "⏸️";
  if (key === "history") return "📋";
  if (key === "sample") return "📌";
  return DESK_DIRECTORY_FILTER_EMOJI.status;
}

/** Explain a Status column / filter value in tooltips so cell & header hints stay 100% unified. */
export function deskStatusKpiDetail(status: string): string {
  const key = status.trim().toLowerCase();
  if (key === "active" || key === "ready") return "Task or daemon is enabled and scheduled to run.";
  if (key === "up") return "Local service or worker is listening and healthy.";
  if (key === "running") return "Process or scheduled task is currently executing.";
  if (key === "starting") return "Service spawn initiated; awaiting health probe.";
  if (key === "stopping") return "Graceful stop requested for the target process.";
  if (key === "disabled" || key === "stopped") return "Paused / disabled — will not auto-trigger until enabled.";
  if (key === "failed" || key === "error") return "Last execution exited with a non-zero error code.";
  if (key === "down") return "Target port is not listening (stopped or offline).";
  if (key === "history") return "Captured automatically from Windows clipboard watch.";
  if (key === "sample") return "Reusable snippet saved in the Samples collection.";
  return "Current operational state for this row.";
}

/** Tab header emoji — HubTabTitleIcon SSOT (not Lucide). */
export const DESK_SCREEN_TITLE_EMOJI = {
  dashboard: "📈",
  clips: "📋",
  jobs: "📁",
  drives: "☁️",
  runners: "▶️",
  cron: "🕒",
} as const;
