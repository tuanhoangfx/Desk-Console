/** SSOT emoji map for HubDirectoryBulkActionBar labels (P0005/P0020 parity). */
export function deskBulkActionIcon(label: string): string {
  if (label === "Delete") return "🗑️";
  if (label === "Stop" || label === "Disable") return "⏹️";
  if (label === "Detail") return "👁️";
  if (label === "Start" || label === "Run") return "▶️";
  if (label === "Restart" || label === "Recover") return "🔄";
  return "🔄";
}
