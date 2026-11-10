import type { DriveStorage } from "./sync-api";

const UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

export function formatDriveBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return "—";
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = value >= 100 || unit === 0 ? 0 : 1;
  return `${value.toFixed(digits)} ${UNITS[unit]}`;
}

export function driveUsagePercent(storage: DriveStorage | null | undefined): number | null {
  if (!storage || storage.usedBytes == null || storage.limitBytes == null || storage.limitBytes <= 0) return null;
  return Math.min(100, Math.round((storage.usedBytes / storage.limitBytes) * 100));
}

export function formatExtensionLabel(ext: string): string {
  if (!ext || ext === "(none)") return "No extension";
  return ext.toUpperCase();
}

/** `12 folders · 48 files`, or a scanning hint before the first listing finishes. */
export function formatInventoryCounts(
  inventory: { folderCount: number | null; fileCount: number | null; scanning?: boolean } | null | undefined,
): string {
  if (!inventory) return "";
  if (inventory.fileCount == null && inventory.folderCount == null) return inventory.scanning ? "Scanning…" : "";
  const folders = inventory.folderCount == null ? "—" : String(inventory.folderCount);
  const files = inventory.fileCount == null ? "—" : String(inventory.fileCount);
  return `${folders} folders · ${files} files`;
}

/** Used / total, plus percent when the Drive has a limit. */
export function formatDriveUsage(storage: DriveStorage | null | undefined): string {
  if (!storage || storage.usedBytes == null) return "";
  const total = storage.limitBytes == null ? "Unlimited" : formatDriveBytes(storage.limitBytes);
  const pct = driveUsagePercent(storage);
  const base = `${formatDriveBytes(storage.usedBytes)} / ${total}`;
  return pct == null ? base : `${base} · ${pct}%`;
}
