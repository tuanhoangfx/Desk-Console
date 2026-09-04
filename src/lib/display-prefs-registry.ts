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
  clips: {
    kpis: [
      { key: "total", label: "Total" },
      { key: "createdToday", label: "Created today" },
      { key: "createdThisWeek", label: "Created this week" },
    ],
    charts: [],
    filters: [
      { key: "status", label: "Status", emoji: "📋" },
      { key: "project", label: "Project", emoji: "📁" },
    ],
    defaultKpiKeys: ["total", "createdToday", "createdThisWeek"],
    defaultChartKeys: [],
    defaultFilterKeys: ["status"],
  },
  runners: {
    kpis: [
      { key: "total", label: "Total" },
      { key: "up", label: "Up" },
      { key: "down", label: "Down" },
    ],
    charts: [],
    filters: [{ key: "status", label: "Status", emoji: "🚦" }],
    defaultKpiKeys: ["total", "up", "down"],
    defaultChartKeys: [],
    defaultFilterKeys: ["status"],
  },
  tasks: {
    kpis: [
      { key: "total", label: "Total" },
      { key: "ready", label: "Ready" },
      { key: "disabled", label: "Disabled" },
    ],
    charts: [],
    filters: [{ key: "status", label: "Status", emoji: "🚦" }],
    defaultKpiKeys: ["total", "ready", "disabled"],
    defaultChartKeys: [],
    defaultFilterKeys: ["status"],
  },
};
