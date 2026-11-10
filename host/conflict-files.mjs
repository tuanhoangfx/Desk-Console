import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function resolveTrashRoot(customTrashRoot) {
  if (customTrashRoot) return path.resolve(customTrashRoot);
  const dataRoot =
    process.env.FOLDER_SYNC_DATA_ROOT ||
    path.join(process.env.APPDATA || path.join(os.homedir(), ".config"), "folder-sync");
  return path.join(dataRoot, "trash");
}

function moveFileToLocalTrash(absPath, relPath, trashRoot) {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  const stampId = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  const cleanRel = String(relPath || path.basename(absPath))
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");
  const destAbs = path.join(resolveTrashRoot(trashRoot), "conflicts", stampId, ...cleanRel.split("/"));
  fs.mkdirSync(path.dirname(destAbs), { recursive: true });
  try {
    fs.renameSync(absPath, destAbs);
  } catch {
    fs.copyFileSync(absPath, destAbs);
    fs.unlinkSync(absPath);
  }
  return destAbs;
}

/**
 * Matches rclone bisync conflict filenames:
 * - `report.conflict-20261022-013000.txt` or `report.txt.conflict-20261022-013000`
 * - `report.conflict1.txt` / `report.conflict2.txt` / `report.txt.conflict1`
 */
const CONFLICT_MARKER_RE = /(\.conflict(?:-[0-9]{8}-[0-9]{6}|\d+))(?=\.|$)/i;

/**
 * Given a file name or relative path, returns `{ isConflict, originalRelPath, suffix }` if it is a conflict copy.
 */
export function parseConflictRelPath(relPath) {
  const norm = String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  const match = CONFLICT_MARKER_RE.exec(norm);
  if (!match) {
    return { isConflict: false, originalRelPath: norm, suffix: "" };
  }
  const suffix = match[1];
  const idx = match.index;
  const originalRelPath = `${norm.slice(0, idx)}${norm.slice(idx + suffix.length)}`;
  return {
    isConflict: true,
    originalRelPath,
    suffix,
  };
}

/**
 * Recursively scan `localRoot` for rclone conflict files.
 */
export function listConflictFiles(localRoot, { limit = 100 } = {}) {
  const root = String(localRoot || "").trim();
  if (!root || !fs.existsSync(root)) return [];
  const results = [];

  function walk(absDir, relDir) {
    if (results.length >= limit) return;
    let entries = [];
    try {
      entries = fs.readdirSync(absDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      if (results.length >= limit) break;
      if (ent.name === ".git" || ent.name === "node_modules" || ent.name.startsWith(".folder-sync")) {
        continue;
      }
      const absPath = path.join(absDir, ent.name);
      const relPath = relDir ? `${relDir}/${ent.name}` : ent.name;
      if (ent.isDirectory()) {
        walk(absPath, relPath);
        continue;
      }
      const parsed = parseConflictRelPath(relPath);
      if (!parsed.isConflict) continue;
      let stat = null;
      try {
        stat = fs.statSync(absPath);
      } catch {
        continue;
      }
      const originalAbs = path.join(root, ...parsed.originalRelPath.split("/"));
      let originalStat = null;
      try {
        if (fs.existsSync(originalAbs)) originalStat = fs.statSync(originalAbs);
      } catch {
        originalStat = null;
      }
      results.push({
        conflictRelPath: relPath,
        originalRelPath: parsed.originalRelPath,
        suffix: parsed.suffix,
        conflictBytes: stat.size,
        conflictMtime: stat.mtime.toISOString(),
        originalExists: Boolean(originalStat),
        originalBytes: originalStat ? originalStat.size : null,
        originalMtime: originalStat ? originalStat.mtime.toISOString() : null,
      });
    }
  }

  walk(root, "");
  return results.sort((a, b) => Date.parse(b.conflictMtime) - Date.parse(a.conflictMtime));
}

/**
 * Resolve one conflict file inside `localRoot` by moving discarded files into Trash (`trashRoot`):
 * - `keep-local`: keep the primary file (`originalRelPath`) and move `conflictRelPath` to local Trash
 * - `keep-conflict`: move existing `originalRelPath` to local Trash, then promote `conflictRelPath` to `originalRelPath`
 */
export function resolveConflictFile(localRoot, conflictRelPath, resolution = "keep-local", opts = {}) {
  const root = path.resolve(String(localRoot || "").trim());
  if (!root || !fs.existsSync(root)) {
    return { ok: false, error: "local_root_missing" };
  }
  const cleanConflictRel = String(conflictRelPath || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");
  const parsed = parseConflictRelPath(cleanConflictRel);
  if (!parsed.isConflict) {
    return { ok: false, error: "not_a_conflict_file" };
  }

  const conflictAbs = path.resolve(root, ...cleanConflictRel.split("/"));
  const originalAbs = path.resolve(root, ...parsed.originalRelPath.split("/"));
  if (!conflictAbs.startsWith(root + path.sep) || !originalAbs.startsWith(root + path.sep)) {
    return { ok: false, error: "path_outside_root" };
  }
  if (!fs.existsSync(conflictAbs)) {
    return { ok: false, error: "conflict_file_missing" };
  }

  const trashedPaths = [];
  if (resolution === "keep-conflict") {
    fs.mkdirSync(path.dirname(originalAbs), { recursive: true });
    if (fs.existsSync(originalAbs)) {
      trashedPaths.push(moveFileToLocalTrash(originalAbs, parsed.originalRelPath, opts.trashRoot));
    }
    try {
      fs.renameSync(conflictAbs, originalAbs);
    } catch {
      fs.copyFileSync(conflictAbs, originalAbs);
      trashedPaths.push(moveFileToLocalTrash(conflictAbs, cleanConflictRel, opts.trashRoot));
    }
  } else if (resolution === "keep-local" || resolution === "delete-conflict") {
    trashedPaths.push(moveFileToLocalTrash(conflictAbs, cleanConflictRel, opts.trashRoot));
  } else {
    return { ok: false, error: "invalid_resolution" };
  }

  const remaining = listConflictFiles(root);
  return {
    ok: true,
    resolvedRelPath: cleanConflictRel,
    originalRelPath: parsed.originalRelPath,
    resolution,
    trashedPaths,
    remainingCount: remaining.length,
    conflicts: remaining,
  };
}
