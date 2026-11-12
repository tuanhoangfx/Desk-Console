/**
 * Per-drive file inventory.
 * Counts folders, files, and bytes by extension. The directory Update time and Log
 * follow each file's own modification, not the Google account event (Gmail / Signed in).
 * The first completed listing is a baseline: the log shows the newest files, and later
 * listings append one row per added, changed, or removed file.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { spawn } from "node:child_process";
import { DATA_ROOT, readDriveAccountLedger, whichRclone } from "./rclone-ops.mjs";
import { buildRcloneProxyEnv, readNetworkSettings } from "./network-qos.mjs";

const LOG_LIMIT = 40;
const FORMAT_LIMIT = 48;
const MAX_INDEX_FILES = 200_000;
const MAX_FOLDER_KEYS = 20_000;
const FRESH_MS = 10 * 60 * 1000;
const ERROR_RETRY_MS = 2 * 60 * 1000;
const FILE_SCAN_TIMEOUT_MS = 15 * 60 * 1000;
const DIR_SCAN_TIMEOUT_MS = 5 * 60 * 1000;

/** @type {Map<string, Promise<void>>} */
const running = new Map();
/** Sync finished while a listing was already running. One follow-up scan. */
const rerun = new Set();

/**
 * Concurrency limiter for background recursive `rclone` inventory scans.
 * Prevents bursting 4+ parallel `rclone lsf --recursive` processes when `/api/remotes/drive/accounts`
 * kicks inventory across all signed-in Drive remotes at once.
 */
export function createInventoryScanQueue(maxConcurrent = 1) {
  const limit = Math.max(1, Number(maxConcurrent) || 1);
  let active = 0;
  /** @type {Array<() => void>} */
  const waiters = [];
  return async function runInInventoryQueue(taskFn) {
    if (active >= limit) {
      await new Promise((resolve) => waiters.push(resolve));
    }
    active += 1;
    try {
      return await taskFn();
    } finally {
      active = Math.max(0, active - 1);
      const next = waiters.shift();
      if (next) next();
    }
  };
}

const runInGlobalInventoryQueue = createInventoryScanQueue(1);

export function fileExtension(filePath) {
  const base = String(filePath || "").replace(/\\/g, "/").split("/").pop() || "";
  const dot = base.lastIndexOf(".");
  if (dot <= 0 || dot === base.length - 1) return "(none)";
  return base.slice(dot + 1).toLowerCase();
}

/** rclone `lsf --format pst` directory line (`path/;-1;time` or `path/`) → normalized folder key. */
export function parseLsfDirLine(line) {
  const text = String(line || "").trim();
  if (!text) return null;
  const parts = text.split(";");
  const rawPath = (parts.length >= 3 ? parts.slice(0, -2).join(";") : text).replace(/\\/g, "/").replace(/^\/+/, "");
  if (!rawPath.endsWith("/")) return null;
  return folderByteKey(rawPath);
}

/** rclone `lsf --format pst` line → `{ path, size, modTime }`. */
export function parseLsfFileLine(line) {
  const text = String(line || "").trim();
  if (!text) return null;
  const parts = text.split(";");
  if (parts.length < 3) return null;
  const modRaw = parts.pop();
  const sizeRaw = parts.pop();
  const filePath = parts.join(";").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!filePath || filePath.endsWith("/")) return null;
  const size = Number(sizeRaw);
  return {
    path: filePath,
    size: Number.isFinite(size) && size >= 0 ? size : 0,
    modTime: normalizeModTime(modRaw),
  };
}

export function normalizeModTime(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const parsed = Date.parse(text);
  if (!Number.isFinite(parsed)) return "";
  return new Date(parsed).toISOString();
}

export function createFolderByteState(maxKeys = MAX_FOLDER_KEYS) {
  return { bytes: { "": 0 }, keys: 1, maxKeys };
}

/** One folder path, matching rclone `lsf` and `lsjson` names (slashes + NFC). */
export function folderByteKey(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .normalize("NFC");
}

function rememberFolderKey(state, key) {
  if (!key || state.bytes[key] != null) return true;
  if (state.keys >= state.maxKeys) return false;
  state.bytes[key] = 0;
  state.keys += 1;
  return true;
}

/** Record a directory even when it contains no files, so the tree can show 0 B. */
export function ensureFolderByteKey(state, dirPath) {
  const parts = folderByteKey(dirPath).split("/").filter(Boolean);
  let acc = "";
  for (const part of parts) {
    acc = acc ? `${acc}/${part}` : part;
    if (!rememberFolderKey(state, acc)) break;
  }
  return state;
}

/** Add one file's bytes onto the root and each parent folder. */
export function addFileToFolderBytes(state, filePath, size) {
  const bytes = Number(size) || 0;
  state.bytes[""] += bytes;
  const parts = folderByteKey(filePath).split("/").filter(Boolean);
  parts.pop();
  let acc = "";
  for (const part of parts) {
    acc = acc ? `${acc}/${part}` : part;
    if (!rememberFolderKey(state, acc)) continue;
    state.bytes[acc] += bytes;
  }
  return state;
}

/** Backup copies count on their own folder, not on the Drive total or parent folders. */
export function addBackupFolderBytes(state, filePath, size) {
  const bytes = Number(size) || 0;
  const parts = folderByteKey(filePath).split("/").filter(Boolean);
  parts.pop();
  let acc = "";
  let inside = false;
  for (const part of parts) {
    acc = acc ? `${acc}/${part}` : part;
    if (part === "_FolderSyncBackups" || part === ".folder-sync-backup") inside = true;
    if (!inside) continue;
    if (!rememberFolderKey(state, acc)) continue;
    state.bytes[acc] += bytes;
  }
  return state;
}

export function buildInventorySummary(files, folderCount) {
  /** @type {Map<string, { ext: string, files: number, bytes: number }>} */
  const formats = new Map();
  let listedBytes = 0;
  let latest = null;
  for (const file of files || []) {
    const size = Number(file?.size) || 0;
    listedBytes += size;
    const ext = fileExtension(file?.path);
    const row = formats.get(ext) || { ext, files: 0, bytes: 0 };
    row.files += 1;
    row.bytes += size;
    formats.set(ext, row);
    if (file?.modTime && (!latest || String(file.modTime) > String(latest.modTime))) latest = file;
  }
  const sorted = [...formats.values()].sort(
    (a, b) => b.bytes - a.bytes || b.files - a.files || a.ext.localeCompare(b.ext),
  );
  return {
    folderCount: Number(folderCount) || 0,
    fileCount: (files || []).length,
    listedBytes,
    formats: sorted.slice(0, FORMAT_LIMIT),
    latestModTime: latest?.modTime || null,
    latestPath: latest?.path || null,
  };
}

/** One change per path. `added` / `changed` / `removed`. */
export function diffFileIndex(previous, next) {
  const before = previous && typeof previous === "object" ? previous : {};
  const after = next && typeof next === "object" ? next : {};
  const changes = [];
  for (const [filePath, row] of Object.entries(after)) {
    const prior = before[filePath];
    if (!prior) {
      changes.push({ action: "added", path: filePath, at: row?.modTime || "", size: Number(row?.size) || 0 });
      continue;
    }
    if (Number(prior.size) !== Number(row?.size) || String(prior.modTime || "") !== String(row?.modTime || "")) {
      changes.push({
        action: "changed",
        path: filePath,
        at: row?.modTime || "",
        size: Number(row?.size) || 0,
        beforeSize: Number(prior.size) || 0,
      });
    }
  }
  for (const filePath of Object.keys(before)) {
    if (!Object.prototype.hasOwnProperty.call(after, filePath)) {
      changes.push({ action: "removed", path: filePath, at: "", size: Number(before[filePath]?.size) || 0 });
    }
  }
  return changes;
}

function fileBaseName(filePath) {
  const parts = String(filePath || "").split("/");
  return parts[parts.length - 1] || filePath;
}

/** rclone bisync backup dirs. They are not the files the user is syncing. */
export function isSyncBackupPath(filePath) {
  return String(filePath || "")
    .replace(/\\/g, "/")
    .split("/")
    .some((part) => part === "_FolderSyncBackups" || part === ".folder-sync-backup");
}

/** Path stored on a file log row. Size text such as `12 B` is not a path. */
export function fileLogPath(entry) {
  const change = (entry?.changes || []).find((row) => row?.field === "file");
  const after = String(change?.after || "").trim();
  const before = String(change?.before || "").trim();
  if (after && after !== "previous" && !/^\d+ B$/.test(after)) return after;
  return before || after;
}

/** True when every stored row is inside a backup dir, so the chip has no work file. */
export function fileLogIsBackupOnly(summary) {
  const log = Array.isArray(summary?.fileLog) ? summary.fileLog : [];
  if (!log.length) return false;
  return log.every((entry) => isSyncBackupPath(fileLogPath(entry)));
}

/** Activity rows, newest file time first. One row per file. Work files stay even when backup removals are newer. */
export function fileLogEntries(changes, detectedAt, limit = LOG_LIMIT) {
  const stamp = detectedAt || new Date().toISOString();
  const rows = (changes || []).map((change) => {
    const name = fileBaseName(change.path);
    const verb = change.action === "added" ? "added" : change.action === "removed" ? "removed" : "updated";
    const before =
      change.action === "added"
        ? ""
        : change.action === "removed"
          ? change.path
          : change.beforeSize != null
            ? `${change.beforeSize} B`
            : "previous";
    const after = change.action === "removed" ? "" : change.path;
    return {
      at: change.at || stamp,
      message: `${name} ${verb}`,
      changes: [{ field: "file", before, after }],
      actor: { label: "Folder Sync", source: "system" },
    };
  });
  const byTime = (a, b) => String(b.at).localeCompare(String(a.at)) || String(a.message).localeCompare(String(b.message));
  rows.sort(byTime);
  const work = [];
  const backup = [];
  for (const row of rows) (isSyncBackupPath(fileLogPath(row)) ? backup : work).push(row);
  return [...work, ...backup].slice(0, limit).sort(byTime);
}

/** Newest files already on the drive. Shown before a later listing can see a diff. */
export function fileLogFromRecent(files, limit = LOG_LIMIT) {
  const ranked = (files || [])
    .filter((file) => file?.path && file?.modTime)
    .sort((a, b) => String(b.modTime).localeCompare(String(a.modTime)) || String(a.path).localeCompare(String(b.path)));
  return fileLogEntries(
    ranked.slice(0, limit).map((file) => ({
      action: "changed",
      path: file.path,
      at: file.modTime,
      beforeSize: file.size,
    })),
    ranked[0]?.modTime || new Date().toISOString(),
    limit,
  );
}

export function inventoryNeedsScan(summary, now = Date.now()) {
  if (!summary?.scannedAt) return true;
  const at = Date.parse(summary.scannedAt);
  if (!Number.isFinite(at)) return true;
  const age = now - at;
  if (summary.error) return age > ERROR_RETRY_MS;
  return age > FRESH_MS;
}

function cleanName(name) {
  return String(name || "gdrive").replace(/[^A-Za-z0-9_-]/g, "") || "gdrive";
}

function inventoryRoot() {
  return path.join(DATA_ROOT, "drive-inventory");
}

function summaryFile(name) {
  return path.join(inventoryRoot(), `${cleanName(name)}.summary.json`);
}

function indexFile(name) {
  return path.join(inventoryRoot(), `${cleanName(name)}.index.json`);
}

function folderFile(name) {
  return path.join(inventoryRoot(), `${cleanName(name)}.folders.json`);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(value), "utf8");
    fs.renameSync(tmp, filePath);
  } catch (err) {
    try {
      fs.rmSync(tmp, { force: true });
    } catch {
      /* ignore cleanup */
    }
    throw err;
  }
}

export function readDriveSummary(name) {
  const parsed = readJson(summaryFile(name));
  return parsed && typeof parsed === "object" ? parsed : null;
}

function readIndex(name) {
  const parsed = readJson(indexFile(name));
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
}

export function readFolderBytes(name) {
  const parsed = readJson(folderFile(name));
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
}

export function lookupFolderBytes(bytes, parentPath, name) {
  const parent = folderByteKey(parentPath);
  const folder = folderByteKey(name);
  const full = parent ? `${parent}/${folder}` : folder;
  if (Object.prototype.hasOwnProperty.call(bytes, full)) return bytes[full];
  const rawParent = String(parentPath || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  const rawName = String(name || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  const raw = rawParent ? `${rawParent}/${rawName}` : rawName;
  if (raw !== full && Object.prototype.hasOwnProperty.call(bytes, raw)) return bytes[raw];
  const nfd = full.normalize("NFD");
  if (nfd !== full && Object.prototype.hasOwnProperty.call(bytes, nfd)) return bytes[nfd];
  return undefined;
}

/** Folder rows pick up the cached byte total for that path. Files keep their own size. */
export function applyFolderSizes(name, parentPath, entries) {
  const bytes = readFolderBytes(name);
  return (entries || []).map((entry) => {
    if (!bytes || entry?.kind !== "folder") return entry;
    const size = lookupFolderBytes(bytes, parentPath, entry.name);
    if (size == null) return entry;
    return { ...entry, size };
  });
}

export function inventoryScanning(name) {
  return running.has(cleanName(name));
}

/** Fields merged onto a Drive account. `contentUpdatedAt` is the newest file time. */
export function readDriveInventoryPublic(name) {
  const summary = readDriveSummary(name);
  const fileLog = Array.isArray(summary?.fileLog) ? summary.fileLog : [];
  const scanning = inventoryScanning(name);
  return {
    inventory: {
      folderCount: summary?.folderCount ?? null,
      fileCount: summary?.fileCount ?? null,
      listedBytes: summary?.listedBytes ?? null,
      formats: Array.isArray(summary?.formats) ? summary.formats : [],
      scannedAt: summary?.scannedAt || null,
      latestModTime: summary?.latestModTime || null,
      latestPath: summary?.latestPath || null,
      scanning,
      error: summary?.error || null,
    },
    fileLog,
    contentUpdatedAt: summary?.latestModTime || fileLog[0]?.at || null,
  };
}

export function kickDriveInventory(name, opts = {}) {
  const clean = cleanName(name);
  if (!clean) return;
  const summary = readDriveSummary(clean);
  const missingCounts = Boolean(summary && summary.folderCount == null && summary.fileCount == null);
  const force = Boolean(opts.force) || missingCounts || (summary?.logBalanced !== true && fileLogIsBackupOnly(summary));
  if (running.has(clean)) {
    if (opts.force) rerun.add(clean);
    return;
  }
  if (!force && !inventoryNeedsScan(summary)) return;
  // Reserve the slot before the scan reads the previous index. Two account polls
  // otherwise start two listings and the second one records false removals.
  running.set(clean, Promise.resolve());
  const task = runInGlobalInventoryQueue(async () => {
    const upSec = typeof os.uptime === "function" ? os.uptime() : 999;
    if (upSec < 180 && process.env.DESK_SKIP_BOOT_COOLDOWN !== "1") {
      const waitMs = Math.max(5_000, Math.round((180 - upSec) * 1000));
      await new Promise((r) => setTimeout(r, waitMs));
    }
    return scanDriveInventory(clean);
  }).finally(() => {
    if (running.get(clean) === task) running.delete(clean);
    if (rerun.has(clean)) {
      rerun.delete(clean);
      kickDriveInventory(clean, { force: true });
    }
  });
  running.set(clean, task);
}

function streamLines(args, onLine, timeoutMs, remoteName = "") {
  return new Promise((resolve) => {
    const bin = whichRclone();
    if (!bin) {
      resolve({ ok: false, error: "rclone_missing" });
      return;
    }
    const ledgerRow = remoteName ? readDriveAccountLedger()[cleanName(remoteName)] : undefined;
    const proxyEnv = buildRcloneProxyEnv(readNetworkSettings(), ledgerRow);
    const child = spawn(bin, args, {
      detached: process.platform === "win32",
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, ...proxyEnv },
    });
    const rl = readline.createInterface({ input: child.stdout });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
      if (stderr.length > 4000) stderr = stderr.slice(-4000);
    });
    rl.on("line", (line) => onLine(line));
    const timer = setTimeout(() => {
      try {
        child.kill();
      } catch {
        /* already closed */
      }
    }, timeoutMs);
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ ok: false, error: String(err?.message || err) });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      rl.close();
      const errMsg = stderr.trim();
      resolve({
        ok: code === 0,
        error: code === 0 ? null : errMsg ? errMsg.slice(0, 300) : null,
      });
    });
  });
}

async function runDriveFileScan(name, onProgress) {
  const folderState = createFolderByteState();
  /** @type {Record<string, { size: number, modTime: string }>} */
  const index = {};
  /** @type {{ path: string, size: number, modTime: string }[]} */
  const recent = [];
  let fileCount = 0;
  let folderCount = 0;
  let overflow = false;
  /** @type {Map<string, { ext: string, files: number, bytes: number }>} */
  const formats = new Map();
  let listedBytes = 0;
  let latest = null;
  let lastProgressWriteMs = 0;

  const maybeFlushProgress = () => {
    if (typeof onProgress !== "function") return;
    const now = Date.now();
    const totalSeen = fileCount + folderCount;
    if (totalSeen === 0) return;
    if (lastProgressWriteMs > 0 && now - lastProgressWriteMs < 1500) return;
    lastProgressWriteMs = now;
    const sorted = [...formats.values()].sort(
      (a, b) => b.bytes - a.bytes || b.files - a.files || a.ext.localeCompare(b.ext),
    );
    onProgress({
      fileCount,
      folderCount,
      listedBytes,
      formats: sorted.slice(0, FORMAT_LIMIT),
      latestModTime: latest?.modTime || null,
      latestPath: latest?.path || null,
      recent: [...recent],
      folderBytes: folderState.bytes,
    });
  };

  const listed = await streamLines(
    [
      "lsf",
      `${name}:`,
      "--recursive",
      "--format",
      "pst",
      "--exclude",
      "**/node_modules/**",
      "--exclude",
      "**/.git/**",
      "--exclude",
      "**/_gsdata_/**",
      "--exclude",
      "**/GPM Profile/**",
      "--exclude",
      "**/Cache/**",
      "--exclude",
      "**/Code Cache/**",
      "--exclude",
      "**/GPUCache/**",
      "--exclude",
      "**/Service Worker/**",
      "--exclude",
      "**/_FolderSyncBackups/**",
      "--exclude",
      "**/.folder-sync-backup/**",
    ],
    (line) => {
      const dirKey = parseLsfDirLine(line);
      if (dirKey) {
        ensureFolderByteKey(folderState, dirKey);
        if (!isSyncBackupPath(dirKey)) folderCount += 1;
        maybeFlushProgress();
        return;
      }
      const file = parseLsfFileLine(line);
      if (!file) return;
      const backup = isSyncBackupPath(file.path);
      if (!backup) {
        fileCount += 1;
        listedBytes += file.size;
        addFileToFolderBytes(folderState, file.path, file.size);
        const ext = fileExtension(file.path);
        const row = formats.get(ext) || { ext, files: 0, bytes: 0 };
        row.files += 1;
        row.bytes += file.size;
        formats.set(ext, row);
        if (file.modTime && (!latest || file.modTime > latest.modTime)) latest = file;
      } else {
        addBackupFolderBytes(folderState, file.path, file.size);
      }
      if (!overflow) {
        if (fileCount > MAX_INDEX_FILES) {
          overflow = true;
        } else {
          index[file.path] = { size: file.size, modTime: file.modTime };
        }
      }
      if (file.modTime) {
        if (recent.length < LOG_LIMIT || file.modTime > recent[recent.length - 1].modTime) {
          recent.push(file);
          recent.sort((a, b) => (a.modTime < b.modTime ? 1 : a.modTime > b.modTime ? -1 : 0));
          if (recent.length > LOG_LIMIT) recent.length = LOG_LIMIT;
        }
      }
      maybeFlushProgress();
    },
    FILE_SCAN_TIMEOUT_MS,
    name,
  );
  const hasCollectedItems = fileCount > 0 || folderCount > 0;
  if (!listed.ok && !hasCollectedItems) return { ok: false, error: listed.error || null };

  const sortedFormats = [...formats.values()].sort(
    (a, b) => b.bytes - a.bytes || b.files - a.files || a.ext.localeCompare(b.ext),
  );
  return {
    ok: true,
    error: null,
    fileCount,
    folderCount,
    listedBytes,
    formats: sortedFormats.slice(0, FORMAT_LIMIT),
    latestModTime: latest?.modTime || null,
    latestPath: latest?.path || null,
    recent,
    index: overflow ? null : index,
    overflow,
    folderBytes: folderState.bytes,
  };
}

async function scanDriveInventory(name) {
  const previous = readDriveSummary(name);
  const previousIndex = readIndex(name);
  const scannedAt = new Date().toISOString();
  const scanned = await runDriveFileScan(name, (partial) => {
    const existingLog = Array.isArray(previous?.fileLog) && previous.fileLog.length
      ? previous.fileLog
      : fileLogFromRecent(partial.recent);
    writeJson(summaryFile(name), {
      ...(previous || {}),
      scannedAt,
      error: null,
      folderCount: partial.folderCount,
      fileCount: partial.fileCount,
      listedBytes: partial.listedBytes,
      formats: partial.formats,
      latestModTime: partial.latestModTime || previous?.latestModTime || null,
      latestPath: partial.latestPath || previous?.latestPath || null,
      fileLog: existingLog,
      logBalanced: true,
    });
    writeJson(folderFile(name), partial.folderBytes);
  });
  if (!scanned.ok) {
    writeJson(summaryFile(name), {
      ...(previous || {}),
      scannedAt,
      error: scanned.error || null,
    });
    return;
  }

  let fileLog = Array.isArray(previous?.fileLog) ? previous.fileLog : [];
  const hadIndex = previousIndex && !previous?.indexOverflow;
  if (!hadIndex || scanned.overflow) {
    const seeded = fileLogFromRecent(scanned.recent);
    if (seeded.length) fileLog = seeded;
  } else if (scanned.index) {
    const changes = diffFileIndex(previousIndex, scanned.index);
    if (changes.length) fileLog = fileLogEntries(changes, scannedAt);
  }

  writeJson(summaryFile(name), {
    scannedAt,
    error: scanned.error,
    folderCount: scanned.folderCount,
    fileCount: scanned.fileCount,
    listedBytes: scanned.listedBytes,
    formats: scanned.formats,
    latestModTime: scanned.latestModTime,
    latestPath: scanned.latestPath,
    fileLog,
    indexOverflow: scanned.overflow,
    logBalanced: true,
  });
  writeJson(folderFile(name), scanned.folderBytes);
  if (scanned.index) writeJson(indexFile(name), scanned.index);
  else {
    try {
      fs.rmSync(indexFile(name), { force: true });
    } catch {
      /* no previous index */
    }
  }
}
