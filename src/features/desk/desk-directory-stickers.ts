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
export function deskStatusDotTone(status: string, screen?: string): HubUsersStatusTone {
  const key = status.trim().toLowerCase();
  if (screen === "apps") {
    if (key === "running" || key === "up") return "online";
    if (key === "ready") return "active";
    if (key === "update" || key === "pending") return "idle";
    if (key === "conflict" || key === "failed" || key === "error") return "off";
    if (key === "down" || key === "disabled" || key === "stopped") return "offline";
  }
  if (key === "up" || key === "active" || key === "synced" || key === "signed in" || key === "history") {
    return "online";
  }
  if (key === "ready") {
    return "active";
  }
  if (key === "starting" || key === "running" || key === "syncing" || key === "analyzing" || key === "waiting" || key === "sample") {
    return "active";
  }
  if (key === "conflict" || key === "failed" || key === "error") {
    return "off";
  }
  if (key === "down") {
    return "offline";
  }
  return "idle";
}

/** Whether the status dot pulses with the live glow effect (Campaign P0002 / Jobs P0001 SSOT). */
export function deskStatusLive(status: string): boolean {
  const key = status.trim().toLowerCase();
  return (
    key === "active" ||
    key === "up" ||
    key === "running" ||
    key === "starting" ||
    key === "syncing" ||
    key === "analyzing" ||
    key === "update" ||
    key === "conflict"
  );
}

/** Map a Status column / filter value → KPI glyph. */
export function deskStatusKpiEmoji(status: string): string {
  const key = status.trim().toLowerCase();
  if (key === "up" || key === "active") return "🟢";
  if (key === "ready") return "💠";
  if (key === "starting" || key === "running" || key === "stopping") {
    return DESK_STATUS_KPI_EMOJI.running;
  }
  if (key === "update" || key === "pending") return "⚠️";
  if (key === "conflict") return "🚨";
  if (key === "down" || key === "failed" || key === "error") return DESK_STATUS_KPI_EMOJI.down;
  if (key === "disabled" || key === "stopped") return "⏸️";
  if (key === "history") return "📋";
  if (key === "sample") return "📌";
  return DESK_DIRECTORY_FILTER_EMOJI.status;
}

/** Explain a Status column / filter value in tooltips so cell & header hints stay 100% unified. */
export function deskStatusKpiDetail(status: string, screen?: string): string {
  const key = status.trim().toLowerCase();
  if (screen === "apps") {
    if (key === "running" || key === "up") return "App or instance is running in memory with live PID & RAM.";
    if (key === "ready") return "Installed and verified locally — stopped and ready to launch.";
    if (key === "update" || key === "pending") return "Outdated version, launcher mismatch, or staged updater detected.";
    if (key === "conflict") return "Shared lockfile conflict or missing app binary / app.asar.";
    if (key === "down") return "Not installed on this workstation.";
  }
  if (key === "active") return "Task or daemon is enabled and scheduled to run.";
  if (key === "ready") return "Installed and verified locally — ready to launch.";
  if (key === "up") return "Local service or worker is listening and healthy.";
  if (key === "running") return "Process or scheduled task is currently executing.";
  if (key === "starting") return "Service spawn initiated; awaiting health probe.";
  if (key === "stopping") return "Graceful stop requested for the target process.";
  if (key === "disabled" || key === "stopped") return "Paused / disabled — will not auto-trigger until enabled.";
  if (key === "update" || key === "pending") return "Pending update or outdated runtime — sync / lock recommended.";
  if (key === "conflict") return "Lock conflict or broken package detected — inspect Detail.";
  if (key === "failed" || key === "error") return "Last execution exited with a non-zero error code.";
  if (key === "down") return "Target port or app is not running / not installed.";
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
  apps: "📦",
  system: "🛠️",
} as const;
