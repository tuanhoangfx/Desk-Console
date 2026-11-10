import { createElement } from "react";
import type { FilterDef, FilterValues } from "@tool-workspace/hub-ui";
import type { DeskRow } from "./DeskDirectoryTable";
import {
  DESK_DIRECTORY_FILTER_EMOJI,
  deskStatusDotTone,
  deskStatusKpiDetail,
} from "./desk-directory-stickers";

export const DESK_STATUS_FILTER_KEY = "status";
export const DESK_KIND_FILTER_KEY = "kind";
export const DESK_PROJECT_FILTER_KEY = "project";
export const DESK_FORMAT_FILTER_KEY = "format";

const FORMAT_EMOJI: Record<string, string> = {
  Text: "📝",
  Link: "🌐",
  Image: "🖼️",
  JSON: "🧩",
  Color: "🎨",
  Path: "📁",
};

const FORMAT_DETAIL: Record<string, string> = {
  Text: "Plain text or multi-line snippet.",
  Link: "HTTP / HTTPS URL captured from clipboard.",
  Image: "Screenshot or bitmap image stored in Clips.",
  JSON: "Structured JSON payload.",
  Color: "HEX / RGB / HSL color token.",
  Path: "Local file or directory path.",
};

export function deskFormatFilterDef(rows: readonly DeskRow[]): FilterDef {
  const counts: Record<string, number> = {};
  let hasAny = false;
  for (const row of rows) {
    if (!row.clipFormat) continue;
    hasAny = true;
    counts[row.clipFormat] = (counts[row.clipFormat] || 0) + 1;
  }
  const order = ["Text", "Link", "Image", "JSON", "Color", "Path"];
  const options = hasAny
    ? order.map((value) => ({
        value,
        label: value,
        emoji: FORMAT_EMOJI[value] || "📄",
        tip: FORMAT_DETAIL[value] || `${value} format`,
        count: counts[value] || 0,
      }))
    : [];
  return {
    key: DESK_FORMAT_FILTER_KEY,
    label: "Format",
    triggerEmoji: "🗂️",
    suppressDefaultTriggerIcon: true,
    labelHint: {
      title: "Format",
      lines: order.map((value) => ({
        emoji: FORMAT_EMOJI[value] || "📄",
        label: value,
        detail: FORMAT_DETAIL[value] || `${value} format`,
      })),
    },
    options,
  };
}

export function matchesDeskFormatFilter(row: DeskRow, values: FilterValues): boolean {
  const selected = values[DESK_FORMAT_FILTER_KEY];
  if (!selected?.length || selected.includes("all")) return true;
  if (!row.clipFormat) return true;
  return selected.includes(row.clipFormat);
}

export function deskProjectFilterDef(rows: readonly DeskRow[], screen?: string): FilterDef {
  const seen = new Set<string>();
  const options: FilterDef["options"] = [];
  for (const row of rows) {
    const value = String(row.project || "").trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    const emoji =
      value === "Host Daemon" || value === "Daemon"
        ? "⚡"
        : value === "Task Scheduler" || value === "Schtask"
          ? "📅"
          : DESK_DIRECTORY_FILTER_EMOJI.project;
    const tip =
      value === "Host Daemon" || value === "Daemon"
        ? "In-process Desk Console background daemon."
        : value === "Task Scheduler" || value === "Schtask"
          ? "Windows Task Scheduler (Dev-*) job."
          : `Filter rows tagged with ${value}.`;
    options.push({ value, label: value, emoji, tip });
  }
  options.sort((a, b) => a.label.localeCompare(b.label));
  const isCron = screen === "cron";
  const filterLabel = isCron ? "Engine" : "Project";
  const filterEmoji = isCron ? "⚡" : DESK_DIRECTORY_FILTER_EMOJI.project;
  return {
    key: DESK_PROJECT_FILTER_KEY,
    label: filterLabel,
    triggerEmoji: filterEmoji,
    suppressDefaultTriggerIcon: true,
    labelHint: options.length
      ? {
          title: filterLabel,
          lines: options.map((opt) => ({
            emoji: opt.emoji,
            label: opt.label,
            detail: opt.tip || `Filter by ${opt.label}.`,
          })),
        }
      : undefined,
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
    const tone = deskStatusDotTone(value);
    const tip = deskStatusKpiDetail(value);
    options.push({
      value,
      label: value,
      tip,
      glyph: createElement("span", {
        className: `hub-users-status-dot hub-users-status-dot--${tone}`,
        "aria-hidden": true,
      }),
    });
  }
  return {
    key: DESK_STATUS_FILTER_KEY,
    label: "Status",
    triggerEmoji: DESK_DIRECTORY_FILTER_EMOJI.status,
    suppressDefaultTriggerIcon: true,
    labelHint: options.length
      ? {
          title: "Status",
          lines: options.map((opt) => ({
            statusDot: deskStatusDotTone(opt.value),
            label: opt.label,
            detail: opt.tip || deskStatusKpiDetail(opt.value),
          })),
        }
      : undefined,
    options,
  };
}

export function matchesDeskStatusFilter(row: DeskRow, values: FilterValues): boolean {
  const selected = values[DESK_STATUS_FILTER_KEY];
  if (!selected?.length) return true;
  if (selected.includes("all")) return true;
  return selected.includes(row.status);
}
