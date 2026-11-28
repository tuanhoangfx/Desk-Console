import { buildStickerPrefItems, type PrefItem } from "@tool-workspace/hub-ui";
import type { AppScreen } from "./app-screen";

function deskChartDefs(
  items: readonly { key: string; label: string }[],
  stickers: Record<string, string>,
): PrefItem[] {
  return buildStickerPrefItems(items, stickers);
}

export const SCREEN_DISPLAY_PREFS: Partial<
  Record<
    AppScreen,
    {
      kpis: PrefItem[];
      charts: PrefItem[];
      filters?: { key: string; label: string; emoji?: string }[];
      headerStats?: { key: string; label: string }[];
      defaultKpiKeys: string[];
      defaultChartKeys: string[];
      defaultFilterKeys?: string[];
      defaultHeaderStatKeys?: string[];
    }
  >
> = {
  dashboard: {
    kpis: [
      { key: "sync-jobs", label: "Sync Jobs" },
      { key: "drive-accounts", label: "Drives" },
      { key: "clips-vault", label: "Clips" },
      { key: "runners-up", label: "Runners Up" },
      { key: "cron-healthy", label: "Active Crons" },
      { key: "disk-free", label: "Disk D: Free" },
      { key: "pc-ram", label: "RAM Headroom" },
      { key: "pc-handles", label: "OS Handles" },
    ],
    charts: [],
    filters: [{ key: "data", label: "Data", emoji: "📊" }],
    defaultKpiKeys: [
      "sync-jobs",
      "drive-accounts",
      "clips-vault",
      "runners-up",
      "cron-healthy",
      "disk-free",
      "pc-ram",
      "pc-handles",
    ],
    defaultChartKeys: [],
    defaultFilterKeys: ["data"],
  },
  clips: {
    kpis: [
      { key: "total", label: "Total" },
      { key: "createdToday", label: "Created today" },
      { key: "createdThisWeek", label: "Created this week" },
      { key: "history", label: "History" },
      { key: "sample", label: "Samples" },
      { key: "pinned", label: "Pinned" },
      { key: "links", label: "Links" },
      { key: "images", label: "Images" },
    ],
    charts: deskChartDefs(
      [
        { key: "format_bar", label: "Format (bar)" },
        { key: "status_bar", label: "Clip Type (bar)" },
        { key: "source_bar", label: "Source (bar)" },
        { key: "pin_bar", label: "Pin State (bar)" },
      ],
      { format_bar: "🗂️", status_bar: "📋", source_bar: "📡", pin_bar: "📌" },
    ),
    filters: [
      { key: "status", label: "Status", emoji: "🚦" },
      { key: "format", label: "Format", emoji: "🗂️" },
      { key: "project", label: "Project", emoji: "📁" },
    ],
    defaultKpiKeys: [
      "total",
      "createdToday",
      "createdThisWeek",
      "history",
      "sample",
      "pinned",
      "links",
      "images",
    ],
    defaultChartKeys: ["format_bar", "status_bar", "source_bar", "pin_bar"],
    defaultFilterKeys: ["status", "format", "project"],
  },
  jobs: {
    kpis: [
      { key: "job", label: "Total" },
      { key: "created_today", label: "Created today" },
      { key: "created_this_week", label: "Created this week" },
      { key: "updated_today", label: "Updated today" },
      { key: "synced", label: "Synced" },
      { key: "syncing", label: "Syncing" },
      { key: "failed", label: "Failed" },
      { key: "stopped", label: "Stopped" },
    ],
    charts: deskChartDefs(
      [
        { key: "status_bar", label: "Status (bar)" },
        { key: "drive_bar", label: "Drive (bar)" },
        { key: "mode_bar", label: "Mode (bar)" },
        { key: "result_bar", label: "Last Result (bar)" },
      ],
      { status_bar: "🚦", drive_bar: "☁️", mode_bar: "🔄", result_bar: "☑️" },
    ),
    filters: [
      { key: "drive", label: "Drive", emoji: "☁️" },
      { key: "mode", label: "Mode", emoji: "🔄" },
      { key: "status", label: "Status", emoji: "🚦" },
      { key: "created", label: "Created", emoji: "📅" },
      { key: "updated", label: "Updated", emoji: "🕒" },
    ],
    defaultKpiKeys: ["job", "created_today", "created_this_week", "updated_today", "synced", "syncing", "failed", "stopped"],
    defaultChartKeys: ["status_bar", "drive_bar", "mode_bar", "result_bar"],
    defaultFilterKeys: ["drive", "mode", "status", "created", "updated"],
  },
  drives: {
    kpis: [
      { key: "drive", label: "Total" },
      { key: "created_today", label: "Created today" },
      { key: "created_this_week", label: "Created this week" },
      { key: "updated_today", label: "Updated today" },
      { key: "signed", label: "Signed in" },
      { key: "pending", label: "Sign in" },
      { key: "with_jobs", label: "With jobs" },
      { key: "no_jobs", label: "No jobs" },
    ],
    charts: deskChartDefs(
      [
        { key: "status_bar", label: "Status (bar)" },
        { key: "jobs_bar", label: "Jobs Linked (bar)" },
        { key: "storage_bar", label: "Storage Tier (bar)" },
        { key: "activity_bar", label: "Activity State (bar)" },
      ],
      { status_bar: "🚦", jobs_bar: "📁", storage_bar: "💾", activity_bar: "⚡" },
    ),
    filters: [
      { key: "status", label: "Status", emoji: "🚦" },
      { key: "jobs", label: "Jobs", emoji: "📁" },
      { key: "created", label: "Created", emoji: "📅" },
      { key: "updated", label: "Updated", emoji: "🕒" },
    ],
    defaultKpiKeys: ["drive", "created_today", "created_this_week", "updated_today", "signed", "pending", "with_jobs", "no_jobs"],
    defaultChartKeys: ["status_bar", "jobs_bar", "storage_bar", "activity_bar"],
    defaultFilterKeys: ["status", "jobs", "created", "updated"],
  },
  runners: {
    kpis: [
      { key: "total", label: "Total" },
      { key: "up", label: "Up" },
      { key: "running", label: "Starting" },
      { key: "down", label: "Down" },
      { key: "ui", label: "UI Apps" },
      { key: "worker", label: "Workers" },
      { key: "pinned", label: "Pinned" },
      { key: "healthy", label: "Healthy" },
    ],
    charts: deskChartDefs(
      [
        { key: "status_bar", label: "Status (bar)" },
        { key: "kind_bar", label: "Runner Kind (bar)" },
        { key: "stack_bar", label: "Runtime Stack (bar)" },
        { key: "project_bar", label: "Product Scope (bar)" },
      ],
      { status_bar: "🚦", kind_bar: "🧩", stack_bar: "🗂️", project_bar: "📦" },
    ),
    filters: [
      { key: "status", label: "Status", emoji: "🚦" },
      { key: "project", label: "Product", emoji: "📦" },
    ],
    defaultKpiKeys: ["total", "up", "running", "down", "ui", "worker", "pinned", "healthy"],
    defaultChartKeys: ["status_bar", "kind_bar", "stack_bar", "project_bar"],
    defaultFilterKeys: ["status", "project"],
  },
  cron: {
    kpis: [
      { key: "total", label: "Total" },
      { key: "ready", label: "Active" },
      { key: "running", label: "Running" },
      { key: "disabled", label: "Disabled" },
      { key: "daemon", label: "Daemons" },
      { key: "schtask", label: "Scheduled" },
      { key: "healthy", label: "Exit 0" },
      { key: "ranToday", label: "Ran today" },
    ],
    charts: deskChartDefs(
      [
        { key: "project_bar", label: "Engine (bar)" },
        { key: "status_bar", label: "Status (bar)" },
        { key: "schedule_bar", label: "Schedule (bar)" },
        { key: "result_bar", label: "Last Result (bar)" },
      ],
      { project_bar: "⚡", status_bar: "🚦", schedule_bar: "🕒", result_bar: "☑️" },
    ),
    filters: [
      { key: "status", label: "Status", emoji: "🚦" },
      { key: "project", label: "Engine", emoji: "⚡" },
    ],
    defaultKpiKeys: [
      "total",
      "ready",
      "running",
      "disabled",
      "daemon",
      "schtask",
      "healthy",
      "ranToday",
    ],
    defaultChartKeys: ["project_bar", "status_bar", "schedule_bar", "result_bar"],
    defaultFilterKeys: ["status", "project"],
  },
  apps: {
    kpis: [
      { key: "total", label: "Total" },
      { key: "up", label: "Active" },
      { key: "running", label: "Running" },
      { key: "pinned", label: "Pinned" },
      { key: "outdated", label: "Outdated" },
      { key: "sxs", label: "SxS Builds" },
      { key: "zalo", label: "Zalo Fleet" },
      { key: "down", label: "Offline" },
    ],
    charts: deskChartDefs(
      [
        { key: "project_bar", label: "Product (bar)" },
        { key: "status_bar", label: "Status (bar)" },
        { key: "guard_bar", label: "Update Guard (bar)" },
        { key: "kind_bar", label: "Install Kind (bar)" },
      ],
      { project_bar: "📦", status_bar: "🚦", guard_bar: "🔒", kind_bar: "🧩" },
    ),
    filters: [
      { key: "status", label: "Status", emoji: "🚦" },
      { key: "project", label: "Product", emoji: "📁" },
    ],
    defaultKpiKeys: ["total", "up", "running", "pinned", "outdated", "sxs", "zalo", "down"],
    defaultChartKeys: ["project_bar", "status_bar", "guard_bar", "kind_bar"],
    defaultFilterKeys: ["status", "project"],
  },
};
