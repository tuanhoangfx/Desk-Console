import type { FilterDef, FilterValues } from "@tool-workspace/hub-ui";
import type { ClipRow } from "../../lib/api";
import { DESK_DIRECTORY_FILTER_EMOJI } from "../desk/desk-directory-stickers";

export const CLIP_PICKER_STATUS_KEY = "status";

export function clipPickerStatusFilterDef(): FilterDef {
  return {
    key: CLIP_PICKER_STATUS_KEY,
    label: "Status",
    triggerEmoji: DESK_DIRECTORY_FILTER_EMOJI.status,
    suppressDefaultTriggerIcon: true,
    options: [
      { value: "History", label: "History", emoji: DESK_DIRECTORY_FILTER_EMOJI.status },
      { value: "Sample", label: "Sample", emoji: "📌" },
    ],
  };
}

export function clipPickerStatus(row: ClipRow): string {
  return row.kind === "sample" ? "Sample" : "History";
}

export function matchesClipPickerStatus(row: ClipRow, values: FilterValues): boolean {
  const selected = values[CLIP_PICKER_STATUS_KEY];
  if (!selected?.length || selected.includes("all")) return true;
  return selected.includes(clipPickerStatus(row));
}
