import { Eye, Play, RotateCcw, Square, Trash2, type LucideIcon } from "lucide-react";

/** SSOT icon map for HubDirectoryBulkActionBar labels (P0005/P0020 parity). */
export function deskBulkActionIcon(label: string): LucideIcon {
  if (label === "Delete") return Trash2;
  if (label === "Stop" || label === "Disable") return Square;
  if (label === "Detail") return Eye;
  if (label === "Start" || label === "Run") return Play;
  if (label === "Restart" || label === "Recover") return RotateCcw;
  return RotateCcw;
}
