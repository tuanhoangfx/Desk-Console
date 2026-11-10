import fs from "node:fs";
import path from "node:path";
import { safeRel } from "./browse-status.mjs";

const DRIVE_LETTERS = "CDEFGHIJKLMNOPQRSTUVWXYZAB".split("");

/**
 * Format bytes into a concise human label (e.g. `124 GB`).
 * @param {number | null | undefined} bytes
 */
export function formatDriveFreeLabel(bytes) {
  if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes < 0) return "";
  const gib = bytes / 1024 ** 3;
  if (gib >= 1000) return `${(gib / 1024).toFixed(1)} TB free`;
  if (gib >= 10) return `${Math.round(gib)} GB free`;
  if (gib >= 1) return `${gib.toFixed(1)} GB free`;
  const mib = bytes / 1024 ** 2;
  return `${Math.max(1, Math.round(mib))} MB free`;
}

/**
 * Detect mounted local roots (`C:\`, `D:\`, `E:\` on Windows, or `/` on POSIX)
 * along with free and total bytes via `fs.statfsSync`.
 * @param {{ platform?: string, existsSync?: typeof fs.existsSync, statSync?: typeof fs.statSync, statfsSync?: typeof fs.statfsSync }} [deps]
 */
export function listLocalDrives(deps = {}) {
  const platform = deps.platform || process.platform;
  const existsSync = deps.existsSync || fs.existsSync;
  const statSync = deps.statSync || fs.statSync;
  const statfsSync = deps.statfsSync || fs.statfsSync;

  if (platform !== "win32") {
    let freeBytes = null;
    let totalBytes = null;
    try {
      if (typeof statfsSync === "function") {
        const s = statfsSync("/");
        freeBytes = Number(s.bavail) * Number(s.bsize);
        totalBytes = Number(s.blocks) * Number(s.bsize);
      }
    } catch {
      /* ignore */
    }
    const freeText = formatDriveFreeLabel(freeBytes);
    return [
      {
        root: "/",
        label: freeText ? `/ · ${freeText}` : "/",
        freeBytes,
        totalBytes,
      },
    ];
  }

  const drives = [];
  for (const letter of DRIVE_LETTERS) {
    const root = `${letter}:\\`;
    try {
      if (!existsSync(root)) continue;
      const st = statSync(root);
      if (!st.isDirectory()) continue;
    } catch {
      continue;
    }
    let freeBytes = null;
    let totalBytes = null;
    try {
      if (typeof statfsSync === "function") {
        const s = statfsSync(root);
        const free = Number(s.bavail) * Number(s.bsize);
        const total = Number(s.blocks) * Number(s.bsize);
        if (Number.isFinite(free) && free >= 0) freeBytes = free;
        if (Number.isFinite(total) && total > 0) totalBytes = total;
      }
    } catch {
      /* statfsSync optional on some network mounts */
    }
    const freeText = formatDriveFreeLabel(freeBytes);
    drives.push({
      root,
      label: freeText ? `${root} · ${freeText}` : root,
      freeBytes,
      totalBytes,
    });
  }

  if (drives.length === 0) {
    drives.push({ root: "C:\\", label: "C:\\", freeBytes: null, totalBytes: null });
  }
  return drives;
}

const INVALID_FOLDER_CHARS_RE = /[<>:"/\\|?*\x00-\x1F]/;
const WINDOWS_RESERVED_NAMES = new Set([
  "CON",
  "PRN",
  "AUX",
  "NUL",
  "COM1",
  "COM2",
  "COM3",
  "COM4",
  "COM5",
  "COM6",
  "COM7",
  "COM8",
  "COM9",
  "LPT1",
  "LPT2",
  "LPT3",
  "LPT4",
  "LPT5",
  "LPT6",
  "LPT7",
  "LPT8",
  "LPT9",
]);

/**
 * Validate a single new subfolder name for Local or Google Drive creation.
 * @param {string} rawName
 * @returns {{ ok: true, name: string } | { ok: false, error: string }}
 */
export function validateNewFolderName(rawName) {
  const trimmed = String(rawName || "")
    .trim()
    .replace(/\.+$/, "")
    .trim();
  if (!trimmed) {
    return { ok: false, error: "Folder name is required." };
  }
  if (trimmed === "." || trimmed === "..") {
    return { ok: false, error: "Invalid folder name." };
  }
  if (INVALID_FOLDER_CHARS_RE.test(trimmed)) {
    return { ok: false, error: 'Folder name cannot contain < > : " / \\ | ? *' };
  }
  if (WINDOWS_RESERVED_NAMES.has(trimmed.toUpperCase())) {
    return { ok: false, error: `"${trimmed}" is a reserved Windows folder name.` };
  }
  return { ok: true, name: trimmed };
}

/**
 * Create a new local directory inside `root` + `parentPath` + `folderName`.
 * @param {string} root
 * @param {string} parentPath
 * @param {string} folderName
 */
export function createLocalSubfolder(root, parentPath, folderName) {
  const cleanRoot = String(root || "").trim();
  if (!cleanRoot || !fs.existsSync(cleanRoot) || !fs.statSync(cleanRoot).isDirectory()) {
    return { ok: false, error: "root_required" };
  }
  const parentRel = safeRel(parentPath || "");
  if (parentRel === null) {
    return { ok: false, error: "invalid_parent_path" };
  }
  const checked = validateNewFolderName(folderName);
  if (!checked.ok) {
    return { ok: false, error: checked.error };
  }
  const relPath = parentRel ? `${parentRel}/${checked.name}` : checked.name;
  const fullPath = path.join(cleanRoot, ...relPath.split("/"));
  try {
    fs.mkdirSync(fullPath, { recursive: true });
    return { ok: true, path: relPath, fullPath, name: checked.name };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}
