import fs from "node:fs";
import path from "node:path";

/** Relative folder under a job root. Rejects `.` and `..`. */
export function safeRel(input) {
  const rel = String(input || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
  if (!rel) return "";
  const parts = rel.split("/").filter(Boolean);
  if (parts.some((part) => part === "." || part === "..")) return null;
  return parts.join("/");
}

/**
 * One directory level on disk.
 * @returns {{ ok: boolean, entries: BrowseEntry[], missing?: boolean, error?: string }}
 */
export function listLocalEntries(root, rel = "") {
  const safe = safeRel(rel);
  if (safe === null) return { ok: false, entries: [], error: "invalid_path" };
  const rootText = String(root || "").trim();
  if (!rootText || !fs.existsSync(rootText)) return { ok: true, entries: [], missing: true };
  const rootAbs = path.resolve(rootText);
  const abs = path.resolve(rootAbs, safe);
  const relCheck = path.relative(rootAbs, abs);
  if (relCheck.startsWith("..") || path.isAbsolute(relCheck)) {
    return { ok: false, entries: [], error: "invalid_path" };
  }
  let dirents;
  try {
    dirents = fs.readdirSync(abs, { withFileTypes: true });
  } catch {
    return { ok: false, entries: [], error: "list_failed" };
  }
  const entries = [];
  for (const dirent of dirents) {
    if (dirent.name === "." || dirent.name === "..") continue;
    const isDir = dirent.isDirectory();
    let size = null;
    let modTime = null;
    try {
      const st = fs.statSync(path.join(abs, dirent.name));
      modTime = st.mtime.toISOString();
      if (!isDir && dirent.isFile()) size = st.size;
    } catch {
      size = null;
    }
    entries.push({
      name: dirent.name,
      kind: isDir ? "folder" : "file",
      size,
      modTime,
    });
  }
  return { ok: true, entries };
}

/** @typedef {{ name: string, kind: "folder" | "file", size: number | null, modTime?: string | null }} BrowseEntry */

/**
 * Align local and cloud names. Status is the sync mark for this level only.
 * @param {BrowseEntry[]} localRows
 * @param {BrowseEntry[]} remoteRows
 */
export function mergeBrowseSides(localRows, remoteRows) {
  /** @type {Map<string, { name: string, kind: string, local: BrowseEntry | null, remote: BrowseEntry | null }>} */
  const map = new Map();
  for (const row of localRows || []) {
    const name = String(row?.name || "");
    if (!name) continue;
    map.set(name.toLowerCase(), { name, kind: row.kind === "folder" ? "folder" : "file", local: row, remote: null });
  }
  for (const row of remoteRows || []) {
    const name = String(row?.name || "");
    if (!name) continue;
    const key = name.toLowerCase();
    const kind = row.kind === "folder" ? "folder" : "file";
    const current = map.get(key);
    if (!current) {
      map.set(key, { name, kind, local: null, remote: row });
      continue;
    }
    current.remote = row;
    if (current.kind !== kind) current.kind = "mixed";
  }
  const rows = [...map.values()].map((row) => ({
    name: row.name,
    kind: row.kind,
    local: row.local ? { kind: row.local.kind, size: row.local.size ?? null, modTime: row.local.modTime || null } : null,
    remote: row.remote ? { kind: row.remote.kind, size: row.remote.size ?? null, modTime: row.remote.modTime || null } : null,
    status: browseStatus(row),
  }));
  rows.sort((a, b) => {
    const af = a.kind === "file" ? 1 : 0;
    const bf = b.kind === "file" ? 1 : 0;
    if (af !== bf) return af - bf;
    return a.name.localeCompare(b.name);
  });
  return rows;
}

/** Parse `rclone check --combined` lines. `=` match, `*` size drift, `-` local only, `+` cloud only. */
export function summarizeCheckCombined(text, limit = 80) {
  const counts = { match: 0, different: 0, local: 0, cloud: 0, error: 0 };
  const diffs = [];
  for (const line of String(text || "").split(/\r?\n/)) {
    const match = line.match(/^([=*+\-!])\s+(.+)$/);
    if (!match) continue;
    const flag = match[1];
    const filePath = match[2].trim();
    if (!filePath) continue;
    if (flag === "=") counts.match += 1;
    else if (flag === "*") {
      counts.different += 1;
      if (diffs.length < limit) diffs.push({ status: "different", path: filePath });
    } else if (flag === "-") {
      counts.local += 1;
      if (diffs.length < limit) diffs.push({ status: "local", path: filePath });
    } else if (flag === "+") {
      counts.cloud += 1;
      if (diffs.length < limit) diffs.push({ status: "cloud", path: filePath });
    } else {
      counts.error += 1;
      if (diffs.length < limit) diffs.push({ status: "error", path: filePath });
    }
  }
  return { counts, diffs };
}

function browseStatus(row) {
  if (!row.local) return "cloud";
  if (!row.remote) return "local";
  const localKind = row.local.kind === "folder" ? "folder" : "file";
  const remoteKind = row.remote.kind === "folder" ? "folder" : "file";
  if (localKind !== remoteKind) return "different";
  if (localKind === "folder") return "both";
  const localSize = Number(row.local.size);
  const remoteSize = Number(row.remote.size);
  if (Number.isFinite(localSize) && Number.isFinite(remoteSize) && localSize !== remoteSize) return "different";
  return "in-sync";
}
