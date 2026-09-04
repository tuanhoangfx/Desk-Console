import type { FilterDef, FilterValues } from "@tool-workspace/hub-ui";
import type { DeskRow } from "./DeskDirectoryTable";
import { DESK_DIRECTORY_FILTER_EMOJI } from "./desk-directory-stickers";

export const DESK_STATUS_FILTER_KEY = "status";
export const DESK_KIND_FILTER_KEY = "kind";
export const DESK_PROJECT_FILTER_KEY = "project";

export function deskProjectFilterDef(rows: readonly DeskRow[]): FilterDef {
  const seen = new Set<string>();
  const options: FilterDef["options"] = [];
  for (const row of rows) {
    const value = String(row.project || "").trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    options.push({ value, label: value, emoji: DESK_DIRECTORY_FILTER_EMOJI.project });
  }
  options.sort((a, b) => a.label.localeCompare(b.label));
  return {
    key: DESK_PROJECT_FILTER_KEY,
    label: "Project",
    triggerEmoji: DESK_DIRECTORY_FILTER_EMOJI.project,
    suppressDefaultTriggerIcon: true,
    options,
  };
}

export function matchesDeskProjectFilter(row: DeskRow, values: FilterValues): boolean {
  const selected = values[DESK_PROJECT_FILTER_KEY];
  if (!selected?.length) return true;
  if (selected.includes("all")) return true;
  const project = String(row.project || "").trim();
  if (!project) return false;
  return selected.includes(project);
}

export function deskKindFilterDef(): FilterDef {
  return {
    key: DESK_KIND_FILTER_KEY,
    label: "Group",
    triggerEmoji: DESK_DIRECTORY_FILTER_EMOJI.group,
    suppressDefaultTriggerIcon: true,
    options: [
      { value: "task", label: "Task", emoji: DESK_DIRECTORY_FILTER_EMOJI.task },
      { value: "runner", label: "Runner", emoji: DESK_DIRECTORY_FILTER_EMOJI.runner },
    ],
  };
}

export function matchesDeskKindFilter(row: DeskRow, values: FilterValues): boolean {
  const selected = values[DESK_KIND_FILTER_KEY];
  if (!selected?.length || selected.includes("all")) return true;
  if (!row.opsKind) return true;
  return selected.includes(row.opsKind);
}

export function deskStatusFilterDef(rows: readonly DeskRow[]): FilterDef {
  const seen = new Set<string>();
  const options: FilterDef["options"] = [];
  for (const row of rows) {
    const value = row.status.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    const emoji =
      value === "Up" || row.statusTone === "online"
        ? DESK_DIRECTORY_FILTER_EMOJI.up
        : DESK_DIRECTORY_FILTER_EMOJI.status;
    options.push({ value, label: value, emoji });
  }
  return {
    key: DESK_STATUS_FILTER_KEY,
    label: "Status",
    triggerEmoji: DESK_DIRECTORY_FILTER_EMOJI.status,
    suppressDefaultTriggerIcon: true,
    options,
  };
}

export function matchesDeskStatusFilter(row: DeskRow, values: FilterValues): boolean {
  const selected = values[DESK_STATUS_FILTER_KEY];
  if (!selected?.length) return true;
  if (selected.includes("all")) return true;
  return selected.includes(row.status);
}
