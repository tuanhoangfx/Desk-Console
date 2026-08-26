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
      { key: "history", label: "History" },
      { key: "sample", label: "Samples" },
    ],
    charts: [],
    filters: [{ key: "status", label: "Store", emoji: "📋" }],
    defaultKpiKeys: ["total", "history", "sample"],
    defaultChartKeys: [],
    defaultFilterKeys: ["status"],
  },
  captures: {
    kpis: [{ key: "total", label: "Total" }],
    charts: [],
    filters: [{ key: "status", label: "Status", emoji: "🚦" }],
    defaultKpiKeys: ["total"],
    defaultChartKeys: [],
    defaultFilterKeys: ["status"],
  },
  runners: {
    kpis: [
      { key: "total", label: "Total" },
      { key: "up", label: "Up" },
    ],
    charts: [],
    filters: [{ key: "status", label: "Status", emoji: "🚦" }],
    defaultKpiKeys: ["total", "up"],
    defaultChartKeys: [],
    defaultFilterKeys: ["status"],
  },
  tasks: {
    kpis: [{ key: "total", label: "Total" }],
    charts: [],
    filters: [{ key: "status", label: "Status", emoji: "🚦" }],
    defaultKpiKeys: ["total"],
    defaultChartKeys: [],
    defaultFilterKeys: ["status"],
  },
};
