import type { FilterDef, FilterValues } from "@tool-workspace/hub-ui";
import type { ClipRow } from "../../lib/api";
import { DESK_DIRECTORY_FILTER_EMOJI } from "../desk/desk-directory-stickers";
import { detectClipSmartTag } from "./clip-smart-tag";

export const CLIP_PICKER_STATUS_KEY = "status";
export const CLIP_PICKER_FORMAT_KEY = "format";

export type ClipFormatLabel = "Text" | "Link" | "Image" | "JSON" | "Color" | "Path";

export const CLIP_FORMAT_EMOJI: Record<ClipFormatLabel, string> = {
  Text: "📝",
  Link: "🌐",
  Image: "🖼️",
  JSON: "🧩",
  Color: "🎨",
  Path: "📁",
};

export function clipFormatEmoji(format?: string): string {
  if (!format) return CLIP_FORMAT_EMOJI.Text;
  return CLIP_FORMAT_EMOJI[format as ClipFormatLabel] || CLIP_FORMAT_EMOJI.Text;
}

export function clipPickerStatus(row: ClipRow): string {
  return row.kind === "sample" ? "Sample" : "History";
}

export function clipPickerFormat(row: ClipRow): ClipFormatLabel {
  if (row.imageDataUrl || row.hasImage || row.contentType === "image") return "Image";
  const tag = detectClipSmartTag(row);
  if (tag?.kind === "url") return "Link";
  if (tag?.kind === "json") return "JSON";
  if (tag?.kind === "color") return "Color";
  if (tag?.kind === "path") return "Path";
  return "Text";
}

export function clipPickerStatusFilterDef(rows?: readonly ClipRow[]): FilterDef {
  const counts: Record<string, number> = { History: 0, Sample: 0 };
  if (rows) {
    for (const r of rows) {
      const s = clipPickerStatus(r);
      counts[s] = (counts[s] || 0) + 1;
    }
  }
  return {
    key: CLIP_PICKER_STATUS_KEY,
    label: "Status",
    triggerEmoji: DESK_DIRECTORY_FILTER_EMOJI.status,
    suppressDefaultTriggerIcon: true,
    options: [
      { value: "History", label: "History", emoji: DESK_DIRECTORY_FILTER_EMOJI.status, ...(rows ? { count: counts.History } : {}) },
      { value: "Sample", label: "Sample", emoji: "📌", ...(rows ? { count: counts.Sample } : {}) },
    ],
  };
}

export function clipPickerFormatFilterDef(rows?: readonly ClipRow[]): FilterDef {
  const counts: Record<ClipFormatLabel, number> = {
    Text: 0,
    Link: 0,
    Image: 0,
    JSON: 0,
    Color: 0,
    Path: 0,
  };
  if (rows) {
    for (const r of rows) {
      const f = clipPickerFormat(r);
      counts[f] = (counts[f] || 0) + 1;
    }
  }
  const catalog: { value: ClipFormatLabel; label: ClipFormatLabel; emoji: string }[] = [
    { value: "Text", label: "Text", emoji: "📝" },
    { value: "Link", label: "Link", emoji: "🌐" },
    { value: "Image", label: "Image", emoji: "🖼️" },
    { value: "JSON", label: "JSON", emoji: "🧩" },
    { value: "Color", label: "Color", emoji: "🎨" },
    { value: "Path", label: "Path", emoji: "📁" },
  ];
  return {
    key: CLIP_PICKER_FORMAT_KEY,
    label: "Format",
    triggerEmoji: "🗂️",
    suppressDefaultTriggerIcon: true,
    options: catalog.map((item) => ({
      ...item,
      ...(rows ? { count: counts[item.value] } : {}),
    })),
  };
}

export function matchesClipPickerStatus(row: ClipRow, values: FilterValues): boolean {
  const selected = values[CLIP_PICKER_STATUS_KEY];
  if (!selected?.length || selected.includes("all")) return true;
  return selected.includes(clipPickerStatus(row));
}

export function matchesClipPickerFormat(row: ClipRow, values: FilterValues): boolean {
  const selected = values[CLIP_PICKER_FORMAT_KEY];
  if (!selected?.length || selected.includes("all")) return true;
  return selected.includes(clipPickerFormat(row));
}
