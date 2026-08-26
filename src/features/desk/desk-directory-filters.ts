import type { FilterDef, FilterValues } from "@tool-workspace/hub-ui";
import type { DeskRow } from "./DeskDirectoryTable";

export const DESK_STATUS_FILTER_KEY = "status";

export function deskStatusFilterDef(rows: readonly DeskRow[]): FilterDef {
  const seen = new Set<string>();
  const options: FilterDef["options"] = [];
  for (const row of rows) {
    const value = row.status.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    options.push({ value, label: value, emoji: row.statusTone === "online" ? "✅" : "🚦" });
  }
  return {
    key: DESK_STATUS_FILTER_KEY,
    label: "Status",
    triggerEmoji: "🚦",
    options,
  };
}

export function matchesDeskStatusFilter(row: DeskRow, values: FilterValues): boolean {
  const selected = values[DESK_STATUS_FILTER_KEY];
  if (!selected?.length) return true;
  if (selected.includes("all")) return true;
  return selected.includes(row.status);
}
