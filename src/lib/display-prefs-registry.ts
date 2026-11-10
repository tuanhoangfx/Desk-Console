import type { AppScreen } from "./app-screen";

export const SCREEN_DISPLAY_PREFS: Partial<
  Record<
    AppScreen,
    {
      kpis: { key: string; label: string }[];
      charts: { key: string; label: string }[];
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
    ],
    charts: [],
    filters: [
      { key: "status", label: "Status", emoji: "📋" },
      { key: "format", label: "Format", emoji: "🗂️" },
      { key: "project", label: "Project", emoji: "📁" },
    ],
    defaultKpiKeys: ["total", "createdToday", "createdThisWeek"],
    defaultChartKeys: [],
    defaultFilterKeys: ["status", "format"],
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
    charts: [],
    filters: [
      { key: "mode", label: "Mode", emoji: "🔄" },
      { key: "status", label: "Status", emoji: "🚦" },
      { key: "created", label: "Created", emoji: "📅" },
      { key: "updated", label: "Updated", emoji: "🕒" },
    ],
    defaultKpiKeys: ["job", "created_today", "created_this_week", "updated_today", "synced", "syncing", "failed", "stopped"],
    defaultChartKeys: [],
    defaultFilterKeys: ["mode", "status", "created", "updated"],
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
    charts: [],
    filters: [
      { key: "status", label: "Status", emoji: "🚦" },
      { key: "jobs", label: "Jobs", emoji: "📁" },
      { key: "created", label: "Created", emoji: "📅" },
      { key: "updated", label: "Updated", emoji: "🕒" },
    ],
    defaultKpiKeys: ["drive", "created_today", "created_this_week", "updated_today", "signed", "pending", "with_jobs", "no_jobs"],
    defaultChartKeys: [],
    defaultFilterKeys: ["status", "jobs", "created", "updated"],
  },
  runners: {
    kpis: [
      { key: "total", label: "Total" },
      { key: "up", label: "Up" },
      { key: "running", label: "Running" },
      { key: "down", label: "Down" },
      { key: "ui", label: "UI Apps" },
      { key: "worker", label: "Workers" },
      { key: "pinned", label: "Pinned" },
      { key: "healthy", label: "Healthy" },
    ],
    charts: [],
    filters: [{ key: "status", label: "Status", emoji: "🚦" }],
    defaultKpiKeys: ["total", "up", "running", "down", "ui", "worker", "pinned", "healthy"],
    defaultChartKeys: [],
    defaultFilterKeys: ["status"],
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
    charts: [],
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
    defaultChartKeys: [],
    defaultFilterKeys: ["status", "project"],
  },
};
