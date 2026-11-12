#!/usr/bin/env node
/**
 * P0001 Desk Console — Unified Local & Cloud Host (Clips · Runners · Tasks · PC Optimizer · Folder Sync Jobs & Drives).
 * Listens on 127.0.0.1:6010 (and compat :6009 when available).
 */
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { execFile, spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const _p0001ShieldPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../scripts/lib/worker-singleton-guard.mjs");
if (fs.existsSync(_p0001ShieldPath)) {
  import(pathToFileURL(_p0001ShieldPath).href)
    .then((m) => m.applyAntiFreezeProcessShield?.(process.pid))
    .catch(() => undefined);
}

// P0001 Desk Console modules
import { markElectronClipboardActive, startClipboardWatch } from "./clip-watch.mjs";
import {
  addClip,
  addSample,
  ensureSampleSeed,
  findClip,
  listClipRows,
  listClips,
  patchClip,
  promoteClipToSample,
  readClipMediaBuffer,
  removeClip,
  restoreClip,
  softDeleteClip,
  dataRoot,
} from "./store.mjs";
import { hotkeysPayload, resetHotkeys, writeHotkeys } from "./hotkeys.mjs";
import { sampleHostMetrics } from "./host-metrics.mjs";
import {
  listRunners,
  readRunnerWatchdogState,
  runRunnerWatchdogTick,
  setRunnerWatchdogEnabled,
  setRunnerWatchdogPinned,
  startRunner,
  startRunnerWatchdog,
  stopRunner,
  writeRunnerWatchdogState,
} from "./runners.mjs";
import { listOpsRows, parseOpsRef } from "./ops.mjs";
import { appendOpsHistory, readOpsHistory } from "./ops-history.mjs";
import { logLinesToConsoleEntries, normalizeOpsConsoleTailLine, tailOpsTerminal } from "./ops-log-paths.mjs";
import {
  appendTerminalLine,
  appendTaskSchtasksOutput,
  opsConsoleCmd,
  opsConsoleOk,
  pollTaskTerminalFeedback,
} from "./ops-terminal.mjs";
import {
  DEV_ROOT,
  captureForegroundHwnd,
  createScheduledTask,
  cursorCountAsync,
  deleteScheduledTask,
  listDevTasks,
  pasteToForegroundHwndAsync,
  primeClipboardIgnore,
  readClipboardImageAsync,
  readClipboardTextAsync,
  runTask,
  setTaskEnabled,
  startDetached,
  updateScheduledTask,
  writeClipboardImageAsync,
  writeClipboardTextAsync,
} from "./windows.mjs";
import { listSiblings, openSibling } from "./desk-siblings.mjs";
import {
  controlFarmSupervisor,
  diagnosePcHost,
  getFarmSupervisorStatus,
  isProcessRunningNative,
  optimizePcHost,
  startAutoPcMaintenanceWatch,
} from "./pc-optimizer.mjs";

// P0009 Folder Sync modules
import { existingDirectory } from "./existing-directory.mjs";
import {
  BACKUP_ROOT,
  CONFLICT_ROOT,
  DATA_ROOT,
  TRASH_ROOT,
  bisyncNeedsResync,
  buildTransferArgs,
  ensureDataRoots,
  deleteDriveRemote,
  purgeExpiredDriveAccounts,
  restoreDriveAccount,
  trashDriveAccount,
  updateDriveAccountNetwork,
  cleanLegacyDriveBackups,
  emptyDriveTrash,
  driveAccountReady,
  ensureDriveRemote,
  fetchDriveAccount,
  formatOauthConsoleLines,
  listDriveAccountIdentities,
  listDriveAccounts,
  listDriveEntries,
  listDriveFolders,
  listRemotes,
  safeDriveDir,
  listTrash,
  probeDriveRemote,
  purgeTrash,
  redactOauthLog,
  runRclone,
  stopJob,
  whichRclone,
  liveJobOutput,
  subscribeLiveJobOutput,
} from "./rclone-ops.mjs";
import { clearStaleBisyncLocks, staleBisyncLockPath } from "./bisync-lock.mjs";
import {
  getProxyHealthState,
  isProxyConnectionFailure,
  normalizeMaxFileSize,
  normalizeProxyUrl,
  probeGoogleDriveNetwork,
  readNetworkSettings,
  recordProxyProbeResult,
  refreshProxyHealth,
  startProxyHealthMonitor,
  writeNetworkSettings,
} from "./network-qos.mjs";
import { createLocalSubfolder, listLocalDrives, validateNewFolderName } from "./local-drives.mjs";
import { purgeExpiredBackupDirs } from "./backup-retention.mjs";
import { listConflictFiles, resolveConflictFile } from "./conflict-files.mjs";
import {
  buildFolderSyncTelemetrySnapshot,
  evaluateDriveQuotaPrecheck,
  measureLocalTreeBytes,
} from "./quota-telemetry.mjs";
import { devUiRedirectEnabled, devUiRedirectTarget, refreshDevUi } from "./dev-ui.mjs";
import { listLocalEntries, mergeBrowseSides, safeRel, summarizeCheckCombined } from "./browse-status.mjs";
import { applyFolderSizes, inventoryScanning, kickDriveInventory, readDriveInventoryPublic } from "./drive-inventory.mjs";
import { ensureCreatedJobLogs, readActivityActor, withJobActivity } from "./job-activity.mjs";
import { assignJobCodes, nextJobCode } from "./job-code.mjs";
import {
  DRIVE_OAUTH_CALLBACK_PORT,
  DRIVE_OAUTH_REDIRECT_URI,
  cancelDriveOAuth,
  getDriveOAuthCallbackStatus,
  openDriveOAuthInStealthProfile,
  startDriveOAuth,
} from "./drive-oauth.mjs";
import {
  DEFAULT_JOB_EXCLUDES,
  findExcludedPaths,
  jobDeletedAtMs,
  normalizeExcludeText,
  parseExcludeList,
  partitionJobsTrash,
  pathMatchesExclude,
  rcloneExcludeArgs,
  rcloneIncludeExcludedArgs,
  settleMsFromJob,
  startDrivePoll,
  startJobWatchers,
  WATCH_SETTLE_MS,
} from "./job-watch.mjs";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

let armedHwnd = "";

const PORT = Number(process.env.DESK_API_PORT || process.env.FOLDER_SYNC_API_PORT || 6010);
const HOST = "127.0.0.1";
const JOBS_PATH = path.join(DATA_ROOT, "jobs.json");
const DIST_ROOT = (() => {
  const fromEnv = String(process.env.FOLDER_SYNC_DIST || process.env.DESK_DIST || "").trim();
  if (fromEnv && fs.existsSync(path.join(fromEnv, "index.html"))) return fromEnv;
  const nextToHost = path.join(__dirname, "..", "dist");
  if (fs.existsSync(path.join(nextToHost, "index.html"))) return nextToHost;
  return null;
})();

/** @type {Map<string, { stdout: string, stderr: string }>} */
const authSessions = new Map();
/** @type {Set<import("node:http").ServerResponse>} */
const sseClients = new Set();
let sseBroadcastTimer = null;
/** In-memory only. Cleared when the quiet window ends or sync starts. */
const nextSyncAt = new Map();

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".vtt": "text/vtt; charset=utf-8",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json; charset=utf-8",
};

function sendStatic(req, res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || "application/octet-stream";
  const stat = fs.statSync(filePath);
  const range = req?.headers?.range;
  if (range && (ext === ".mp4" || ext === ".webm") && stat.size > 0) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(String(range).trim());
    if (m) {
      const start = m[1] ? Number(m[1]) : 0;
      const end = m[2] ? Math.min(Number(m[2]), stat.size - 1) : stat.size - 1;
      if (start <= end && start < stat.size) {
        res.writeHead(206, {
          "Content-Type": type,
          "Content-Range": `bytes ${start}-${end}/${stat.size}`,
          "Accept-Ranges": "bytes",
          "Content-Length": end - start + 1,
          "Cache-Control": "public, max-age=3600",
        });
        fs.createReadStream(filePath, { start, end }).pipe(res);
        return;
      }
    }
  }
  res.writeHead(200, {
    "Content-Type": type,
    "Content-Length": stat.size,
    "Accept-Ranges": "bytes",
    "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
  });
  fs.createReadStream(filePath).pipe(res);
}

function tryServeDist(req, pathname, res) {
  if (!DIST_ROOT) return false;
  const raw = decodeURIComponent(pathname.split("?")[0] || "/");
  const rel = raw === "/" ? "index.html" : raw.replace(/^\/+/, "");
  const abs = path.normalize(path.join(DIST_ROOT, rel));
  if (!abs.startsWith(path.normalize(DIST_ROOT + path.sep)) && abs !== path.normalize(DIST_ROOT)) {
    return false;
  }
  if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
    sendStatic(req, res, abs);
    return true;
  }
  const index = path.join(DIST_ROOT, "index.html");
  if (fs.existsSync(index) && !rel.includes(".")) {
    sendStatic(req, res, index);
    return true;
  }
  return false;
}

let jobsCache = { mtimeMs: -1, size: -1, jobs: [] };
let cachedRcloneVersion = { path: null, version: null };

function ensureData() {
  ensureDataRoots();
  if (!fs.existsSync(JOBS_PATH)) {
    fs.writeFileSync(JOBS_PATH, JSON.stringify({ jobs: [] }, null, 2), "utf8");
  }
}

function readJobs() {
  ensureData();
  let stat = null;
  try {
    stat = fs.statSync(JOBS_PATH);
  } catch {
    stat = null;
  }
  let jobs = [];
  if (stat && stat.mtimeMs === jobsCache.mtimeMs && stat.size === jobsCache.size) {
    jobs = jobsCache.jobs;
  } else {
    try {
      const raw = JSON.parse(fs.readFileSync(JOBS_PATH, "utf8"));
      jobs = Array.isArray(raw.jobs) ? raw.jobs : [];
    } catch {
      jobs = [];
    }
  }
  const purged = partitionJobsTrash(jobs);
  const assigned = assignJobCodes(purged.jobs);
  const logged = ensureCreatedJobLogs(assigned.jobs);
  let excludeMigrated = false;
  const normalizedJobs = logged.jobs.map((job) => {
    const nextExclude = normalizeExcludeText(job.exclude);
    if (job.exclude !== nextExclude) {
      excludeMigrated = true;
      return { ...job, exclude: nextExclude };
    }
    return job;
  });
  if (purged.expired || assigned.changed || logged.changed || excludeMigrated) {
    writeJobs(normalizedJobs);
  } else if (stat) {
    jobsCache = { mtimeMs: stat.mtimeMs, size: stat.size, jobs: normalizedJobs };
  }
  return normalizedJobs.map((job) => ({ ...job }));
}

function writeJobs(jobs) {
  ensureData();
  fs.writeFileSync(JOBS_PATH, JSON.stringify({ jobs, updatedAt: new Date().toISOString() }, null, 2), "utf8");
  try {
    const stat = fs.statSync(JOBS_PATH);
    jobsCache = { mtimeMs: stat.mtimeMs, size: stat.size, jobs: jobs.map((job) => ({ ...job })) };
  } catch {
    jobsCache = { mtimeMs: -1, size: -1, jobs: [] };
  }
  broadcastJobsSnapshot("write");
}

function json(res, status, body) {
  const raw = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(raw);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

const _cursorPurgeSingleflight = new Map();

export function runPurgeCursorChatsAsync(
  scriptPath,
  {
    cwd = DEV_ROOT,
    timeoutMs = 600_000,
    command = "python",
    args = [scriptPath, "--days", "2", "--apply", "--no-backup"],
    singleflightKey = "cursor:purge-chats",
  } = {},
) {
  const key = singleflightKey || "";
  if (key && _cursorPurgeSingleflight.has(key)) {
    return _cursorPurgeSingleflight.get(key);
  }
  const p = new Promise((resolve) => {
    execFile(
      command,
      args,
      {
        cwd,
        encoding: "utf8",
        windowsHide: true,
        timeout: timeoutMs,
        maxBuffer: 8 * 1024 * 1024,
      },
      (err, stdout, stderr) => {
        resolve({
          status: err && typeof err.code === "number" ? err.code : err ? 1 : 0,
          stdout: String(stdout || ""),
          stderr: String(stderr || (err?.message ?? "")),
        });
      },
    );
  }).finally(() => {
    if (key) _cursorPurgeSingleflight.delete(key);
  });
  if (key) _cursorPurgeSingleflight.set(key, p);
  return p;
}

const _browseFolderSingleflight = new Map();

export function runBrowseFolderWinAsync(initialPath = "", opts = {}) {
  if (process.platform !== "win32" && !opts.command) {
    return Promise.resolve({ ok: false, error: "browse_unsupported_platform" });
  }
  const key = String(opts.singleflightKey ?? "browse:folder-dialog");
  if (key && _browseFolderSingleflight.has(key)) {
    return _browseFolderSingleflight.get(key);
  }
  const start = existingDirectory(initialPath);
  const selectedLine = start ? `$d.SelectedPath = '${start.replace(/'/g, "''")}'` : "";
  const script = [
    "Add-Type -AssemblyName System.Windows.Forms",
    "$d = New-Object System.Windows.Forms.FolderBrowserDialog",
    "$d.Description = 'Select local sync folder'",
    "$d.ShowNewFolderButton = $true",
    selectedLine,
    "if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::Out.Write($d.SelectedPath) }",
  ]
    .filter(Boolean)
    .join("; ");
  const cmd = opts.command || "powershell.exe";
  const args = Array.isArray(opts.args) ? opts.args : ["-NoProfile", "-STA", "-Command", script];
  const timeoutMs = Number(opts.timeoutMs) > 0 ? Number(opts.timeoutMs) : 300_000;
  const windowsHide = typeof opts.windowsHide === "boolean" ? opts.windowsHide : false;

  const p = new Promise((resolve) => {
    execFile(
      cmd,
      args,
      {
        encoding: "utf8",
        windowsHide,
        timeout: timeoutMs,
        maxBuffer: 1024 * 1024,
      },
      (err, stdout) => {
        if (err) {
          resolve({ ok: false, error: String(err.message || err) });
          return;
        }
        const selected = String(stdout || "").trim();
        if (!selected) {
          resolve({ ok: false, cancelled: true });
          return;
        }
        resolve({ ok: true, path: selected });
      },
    );
  }).finally(() => {
    if (key) _browseFolderSingleflight.delete(key);
  });
  if (key) _browseFolderSingleflight.set(key, p);
  return p;
}

function normalizeJob(input = {}, existing = null, jobs = []) {
  const now = new Date().toISOString();
  const nextLocal = String(input.localPath || existing?.localPath || "").trim();
  const nextRemote = String(input.remote || existing?.remote || "gdrive:").trim() || "gdrive:";
  const next = {
    id: existing?.id || randomUUID(),
    code: existing?.code || nextJobCode(jobs),
    name: String(input.name || existing?.name || "Untitled job").trim() || "Untitled job",
    localPath: nextLocal,
    remote: nextRemote,
    mode: ["bisync", "mirror-local", "mirror-remote"].includes(input.mode)
      ? input.mode
      : existing?.mode || "bisync",
    settleSec:
      settleMsFromJob({ settleSec: input.settleSec !== undefined ? input.settleSec : existing?.settleSec }) / 1000,
    proxyUrl:
      input.proxyUrl !== undefined
        ? normalizeProxyUrl(input.proxyUrl)
        : normalizeProxyUrl(existing?.proxyUrl),
    maxFileSize:
      input.maxFileSize !== undefined
        ? normalizeMaxFileSize(input.maxFileSize)
        : normalizeMaxFileSize(existing?.maxFileSize),
    exclude:
      input.exclude !== undefined
        ? normalizeExcludeText(input.exclude)
        : existing?.exclude != null
          ? normalizeExcludeText(existing.exclude)
          : DEFAULT_JOB_EXCLUDES,
    status:
      input.status === "paused" ||
      (input.status === "idle" && (existing?.status === "paused" || existing?.status === "stopped"))
        ? input.status
        : existing?.status || "idle",
    lastRunAt: existing?.lastRunAt || null,
    lastSuccessfulSyncAt: existing?.lastSuccessfulSyncAt || null,
    lastResult: existing?.lastResult || null,
    lastBackupDir: existing?.lastBackupDir || null,
    lastConflictDir: existing?.lastConflictDir || null,
    note: input.note !== undefined ? String(input.note || "") : String(existing?.note || ""),
    treeCounts:
      existing && (existing.localPath !== nextLocal || existing.remote !== nextRemote)
        ? null
        : existing?.treeCounts || null,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    deletedAt: existing?.deletedAt || null,
  };
  return withJobActivity(existing, next, now, readActivityActor(input));
}

async function measureTreeCounts(job) {
  const maxSize = normalizeMaxFileSize(job.maxFileSize);
  const maxSizeArgs = maxSize ? ["--max-size", maxSize] : [];
  const checked = await runRclone(
    ["check", job.localPath, job.remote, ...rcloneExcludeArgs(job.exclude), ...maxSizeArgs, "--combined", "-"],
    { timeoutMs: 90_000, jobNetwork: { proxyUrl: job.proxyUrl } },
  );
  const summary = summarizeCheckCombined(`${checked.stdout || ""}\n${checked.stderr || ""}`);
  const failed = !checked.ok && summary.diffs.length === 0 && summary.counts.match === 0;
  return {
    failed,
    summary,
    error: failed ? redactOauthLog(checked.stderr || checked.stdout || "scan_failed").slice(0, 180) : null,
    treeCounts: {
      synced: summary.counts.match || 0,
      local: summary.counts.local || 0,
      drive: summary.counts.cloud || 0,
      diff: summary.counts.different || 0,
      at: new Date().toISOString(),
    },
  };
}

const MAX_CONCURRENT_PER_REMOTE = 2;
const remoteConcurrency = new Map();

function acquireRemoteSlot(remoteSpec) {
  const remoteKey =
    String(remoteSpec || "")
      .split(":")[0]
      .replace(/:$/, "")
      .trim()
      .toLowerCase() || "default";
  let state = remoteConcurrency.get(remoteKey);
  if (!state) {
    state = { active: 0, queue: [] };
    remoteConcurrency.set(remoteKey, state);
  }
  const release = () => {
    const next = state.queue.shift();
    if (next) {
      next();
    } else {
      state.active = Math.max(0, state.active - 1);
    }
  };
  if (state.active < MAX_CONCURRENT_PER_REMOTE) {
    state.active += 1;
    return Promise.resolve(release);
  }
  return new Promise((resolve) => {
    state.queue.push(() => resolve(release));
  });
}

const BUILTIN_CRON_SPECS = [
  {
    id: "Daemon-Stealth-Disk-Prune",
    name: "Daemon-Stealth-Disk-Prune",
    schedule: "Every 12h + Daily 04:15",
    description: "Stealth Closed Profile Cache & Orphan Prune",
    action: "prune-junk",
  },
  {
    id: "Daemon-Nightly-Deep-Maintenance",
    name: "Daemon-Nightly-Deep-Maintenance",
    schedule: "Daily 04:15 window",
    description: "Nightly PC Deep Maintenance Sweep (RAM + Smoke + Temp + Disk)",
    action: "deep-maintenance",
  },
  {
    id: "Daemon-Handle-CPU-Guard",
    name: "Daemon-Handle-CPU-Guard",
    schedule: "Every 10 min",
    description: "PC Handle (>20k) & Processor Group Affinity Guard",
    action: "diagnose-guard",
  },
  {
    id: "Daemon-Smoke-Pool-Reaper",
    name: "Daemon-Smoke-Pool-Reaper",
    schedule: "Every 10 min",
    description: "Agent Smoke Pool Reaper (Profiles 9990–9999)",
    action: "clean-smoke",
  },
  {
    id: "Daemon-Agent-IDE-Optimizer",
    name: "Daemon-Agent-IDE-Optimizer",
    schedule: "Every 10 min + Daily 06:45",
    description: "Unified 5-Agent IDE & CLI Optimizer (Antigravity · Cursor · Claude · Codex · Grok Bot)",
    action: "sweep-antigravity",
  },
  {
    id: "Daemon-RAM-WorkingSet-Trim",
    name: "Daemon-RAM-WorkingSet-Trim",
    schedule: "Auto when RAM > 80%",
    description: "Background Working-Set RAM Trimmer",
    action: "trim-ram",
  },
  {
    id: "Daemon-Runner-Watchdog",
    name: "Daemon-Runner-Watchdog",
    schedule: "Every 20 sec",
    description: "Runner Auto-Heal Watchdog (Pinned Fleet)",
    action: "runner-watchdog",
  },
  {
    id: "Daemon-Drive-Retention-Purge",
    name: "Daemon-Drive-Retention-Purge",
    schedule: "Every 6 hours",
    description: "Drive Sync Trash & Backup Retention Sweep",
    action: "drive-retention",
  },
];

function daemonCronStatePath() {
  return path.join(dataRoot(), "daemon-cron-state.json");
}

function readDaemonCronState() {
  try {
    const raw = JSON.parse(fs.readFileSync(daemonCronStatePath(), "utf8"));
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

function writeDaemonCronState(patch) {
  const current = readDaemonCronState();
  const next = { ...current, ...patch };
  fs.mkdirSync(dataRoot(), { recursive: true });
  fs.writeFileSync(daemonCronStatePath(), JSON.stringify(next, null, 2), "utf8");
  return next;
}

function customCronMetaPath() {
  return path.join(dataRoot(), "custom-cron-meta.json");
}

function readCustomCronMeta() {
  try {
    const raw = JSON.parse(fs.readFileSync(customCronMetaPath(), "utf8"));
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

function writeCustomCronMeta(patch) {
  const current = readCustomCronMeta();
  const next = { ...current, ...patch };
  fs.mkdirSync(dataRoot(), { recursive: true });
  fs.writeFileSync(customCronMetaPath(), JSON.stringify(next, null, 2), "utf8");
  return next;
}

function normalizeCronTaskStatus(rawStatus, lastResult) {
  const s = String(rawStatus || "").trim();
  if (/disabled/i.test(s)) return "Disabled";
  if (/running/i.test(s)) return "Running";
  const res = String(lastResult ?? "0").trim();
  if (res && res !== "0" && res !== "267009" && res !== "267011" && res !== "0x41303") {
    return "Failed";
  }
  return "Active";
}

async function listAllCronTasks() {
  const state = readDaemonCronState();
  const customMeta = readCustomCronMeta();
  const watchdog = readRunnerWatchdogState();
  const opsHist = readOpsHistory({ limit: 200 });
  const bootIso = new Date(Date.now() - Math.floor(process.uptime() * 1000)).toISOString();
  const defaultCreatedAt = "2026-10-15T00:00:00.000Z";
  const daemonRows = BUILTIN_CRON_SPECS.map((spec) => {
    const saved = state[spec.id] || {};
    const isWatchdog = spec.id === "Daemon-Runner-Watchdog";
    const enabled = isWatchdog ? watchdog.enabled !== false : saved.enabled !== false;
    const lastResult = saved.lastResult ?? "0";
    const lastRun = saved.lastRun || bootIso;
    const histEntries = opsHist
      .filter((h) => String(h.targetId || "").toLowerCase() === spec.id.toLowerCase())
      .slice(0, 10)
      .map((h) => ({
        at: h.ts || lastRun,
        message: h.message || `${h.action} (${h.ok ? "ok" : "error"})`,
        actor: { label: "Host Daemon", source: "system" },
      }));
    const savedLogs = Array.isArray(saved.activityLog) ? saved.activityLog : [];
    const mergedLogs = [...savedLogs, ...histEntries];
    if (mergedLogs.length === 0) {
      mergedLogs.push({
        at: lastRun,
        message: saved.lastSummary || `Active · exit ${lastResult} · ${spec.schedule}`,
        actor: { label: "Host Daemon", source: "system" },
      });
    }
    const schedule = saved.schedule || spec.schedule;
    const description = saved.description || spec.description;
    return {
      id: spec.id,
      name: spec.name,
      kind: "daemon",
      createdAt: saved.createdAt || defaultCreatedAt,
      schedule,
      scheduleType: saved.scheduleType || undefined,
      modifier: saved.modifier || undefined,
      startTime: saved.startTime || undefined,
      description,
      status: enabled ? normalizeCronTaskStatus("Active", lastResult) : "Disabled",
      lastRun,
      lastResult,
      lastDurationMs: saved.lastDurationMs ?? 42,
      lastFreedMb: saved.lastFreedMb ?? 0,
      lastSummary: saved.lastSummary || `${schedule} · exit ${lastResult}`,
      activityLog: mergedLogs.slice(0, 15),
      nextRun: `${schedule} · ${description}`,
    };
  });
  const schtaskRows = (await listDevTasks()).map((row) => {
    const meta = customMeta[row.name] || {};
    const lastResult = row.lastResult || "0";
    const lastRun = row.lastRun || bootIso;
    const schedule = meta.schedule || row.schedule || row.nextRun || "Scheduled";
    const description = meta.description || row.description || "Windows Task Scheduler (Dev-*)";
    const histEntries = opsHist
      .filter((h) => String(h.targetId || "").toLowerCase() === String(row.name || "").toLowerCase())
      .slice(0, 10)
      .map((h) => ({
        at: h.ts || lastRun,
        message: h.message || `${h.action} (${h.ok ? "ok" : "error"})`,
        actor: { label: "Task Scheduler", source: "system" },
      }));
    if (histEntries.length === 0) {
      histEntries.push({
        at: lastRun,
        message: meta.lastSummary || `exit ${lastResult} · ${schedule} · ${description}`,
        actor: { label: "Task Scheduler", source: "system" },
      });
    }
    return {
      ...row,
      kind: "schtask",
      createdAt: meta.createdAt || row.createdAt || defaultCreatedAt,
      status: normalizeCronTaskStatus(row.status, lastResult),
      lastResult,
      lastDurationMs: meta.lastDurationMs ?? null,
      lastFreedMb: meta.lastFreedMb ?? null,
      lastSummary: meta.lastSummary || `exit ${lastResult} · ${schedule}`,
      activityLog: histEntries.slice(0, 15),
      schedule,
      scheduleType: meta.scheduleType || undefined,
      modifier: meta.modifier || undefined,
      startTime: meta.startTime || undefined,
      description,
    };
  });
  return [...daemonRows, ...schtaskRows];
}

async function runBuiltinDaemon(name) {
  const spec = BUILTIN_CRON_SPECS.find((s) => s.id.toLowerCase() === String(name || "").toLowerCase());
  if (!spec) throw new Error(`Unknown daemon task: ${name}`);
  const id = spec.id;
  const t0 = Date.now();
  appendTerminalLine(id, "task", opsConsoleCmd(`daemon-run ${id} (${spec.action})`));
  let summary = "ok";
  let freedMb = 0;
  if (
    spec.action === "prune-junk" ||
    spec.action === "deep-maintenance" ||
    spec.action === "clean-smoke" ||
    spec.action === "trim-ram" ||
    spec.action === "sweep-antigravity"
  ) {
    const res = await optimizePcHost({ action: spec.action });
    const junkBytes = Number(res.results?.junk?.freedBytes || 0);
    const ramBytes = Number(res.results?.ram?.freedBytes || res.results?.ram?.freedRamBytes || 0);
    const agyRemoved = Number(res.results?.antigravitySweep?.removedSessions || 0);
    const agyPruned = Number(res.results?.antigravitySweep?.prunedArtifacts || 0);
    freedMb = Math.round(((junkBytes + ramBytes) / (1024 * 1024)) * 10) / 10;
    const freed =
      spec.action === "sweep-antigravity"
        ? `5-Agent sweep · ${agyRemoved} sessions, ${agyPruned} artifacts pruned`
        : junkBytes > 0
          ? `${(junkBytes / (1024 * 1024)).toFixed(1)} MB junk freed`
          : ramBytes > 0
            ? `${(ramBytes / (1024 * 1024)).toFixed(1)} MB RAM trimmed`
            : "0 MB (clean)";
    summary = `${spec.action} · ${freed}`;
    appendTerminalLine(id, "task", opsConsoleOk(`${id} completed (${summary})`));
  } else if (spec.action === "diagnose-guard") {
    const diag = await diagnosePcHost();
    summary = `processes=${diag.summary?.processCount ?? 0} handles=${diag.summary?.totalHandles ?? 0} groups=${diag.summary?.topology?.groupCount ?? 1}`;
    appendTerminalLine(id, "task", opsConsoleOk(`${id} verified (${summary})`));
  } else if (spec.action === "runner-watchdog") {
    const tick = await runRunnerWatchdogTick({ force: true });
    summary = `pinned=${(tick.watchdog?.pinned || []).length} checked`;
    appendTerminalLine(id, "task", opsConsoleOk(`${id} tick (${summary})`));
  } else if (spec.action === "drive-retention") {
    runBackupRetentionSweep();
    summary = "expired backup & trash directories swept";
    appendTerminalLine(id, "task", opsConsoleOk(`${id} completed (${summary})`));
  }
  const durationMs = Math.max(1, Date.now() - t0);
  const nowIso = new Date().toISOString();
  const current = readDaemonCronState();
  const prevEntry = current[id] || {};
  const prevLogs = Array.isArray(prevEntry.activityLog) ? prevEntry.activityLog : [];
  const fullSummary = `${summary} · ${durationMs}ms`;
  writeDaemonCronState({
    [id]: {
      ...prevEntry,
      enabled: true,
      lastRun: nowIso,
      lastResult: "0",
      lastDurationMs: durationMs,
      lastFreedMb: freedMb,
      lastSummary: fullSummary,
      activityLog: [
        {
          at: nowIso,
          message: fullSummary,
          actor: { label: "Host Daemon", source: "system" },
        },
        ...prevLogs,
      ].slice(0, 20),
    },
  });
  return { ok: true, name: id, durationMs, freedMb, stdout: fullSummary, stderr: "" };
}

function setBuiltinDaemonEnabled(name, enabled) {
  const spec = BUILTIN_CRON_SPECS.find((s) => s.id.toLowerCase() === String(name || "").toLowerCase());
  if (!spec) throw new Error(`Unknown daemon task: ${name}`);
  const id = spec.id;
  if (id === "Daemon-Runner-Watchdog") {
    setRunnerWatchdogEnabled(Boolean(enabled));
  }
  const current = readDaemonCronState();
  writeDaemonCronState({
    [id]: {
      ...(current[id] || {}),
      enabled: Boolean(enabled),
    },
  });
  appendTerminalLine(id, "task", opsConsoleOk(`${id} ${enabled ? "enabled" : "disabled"}`));
  return { ok: true, name: id, enabled: Boolean(enabled) };
}

function formatCustomScheduleLabel({ scheduleLabel, scheduleType, modifier, startTime }, fallback) {
  const explicit = String(scheduleLabel || "").trim();
  if (explicit) return explicit;
  const sc = String(scheduleType || "").toUpperCase();
  if (sc === "MINUTE") return `Every ${Math.max(1, Number(modifier) || 10)} min`;
  if (sc === "HOURLY") {
    const h = Math.max(1, Number(modifier) || 6);
    return h === 1 ? "Every 1 hour" : `Every ${h} hours`;
  }
  if (sc === "DAILY") return `Daily ${String(startTime || "04:15").trim()}`;
  if (sc === "WEEKLY") return `Weekly Sun ${String(startTime || "04:00").trim()}`;
  return fallback;
}

function updateBuiltinDaemon(name, patch = {}) {
  const spec = BUILTIN_CRON_SPECS.find((s) => s.id.toLowerCase() === String(name || "").toLowerCase());
  if (!spec) throw new Error(`Unknown daemon task: ${name}`);
  const id = spec.id;
  const current = readDaemonCronState();
  const prev = current[id] || {};
  const nextEnabled =
    typeof patch.enabled === "boolean"
      ? patch.enabled
      : id === "Daemon-Runner-Watchdog"
        ? readRunnerWatchdogState().enabled !== false
        : prev.enabled !== false;
  if (id === "Daemon-Runner-Watchdog" && typeof patch.enabled === "boolean") {
    setRunnerWatchdogEnabled(patch.enabled);
  }
  const nextSchedule = formatCustomScheduleLabel(patch, prev.schedule || spec.schedule);
  const nextDesc =
    patch.description !== undefined
      ? String(patch.description || "").trim() || spec.description
      : prev.description || spec.description;
  const nowIso = new Date().toISOString();
  const prevLogs = Array.isArray(prev.activityLog) ? prev.activityLog : [];
  const logMsg = `Config saved · ${nextEnabled ? "Active" : "Disabled"} · ${nextSchedule}`;
  writeDaemonCronState({
    [id]: {
      ...prev,
      enabled: nextEnabled,
      schedule: nextSchedule,
      scheduleType: patch.scheduleType !== undefined ? String(patch.scheduleType || "") : prev.scheduleType,
      modifier: patch.modifier !== undefined ? String(patch.modifier || "") : prev.modifier,
      startTime: patch.startTime !== undefined ? String(patch.startTime || "") : prev.startTime,
      description: nextDesc,
      lastSummary: logMsg,
      activityLog: [
        {
          at: nowIso,
          message: logMsg,
          actor: { label: "Desk Console", source: "user" },
        },
        ...prevLogs,
      ].slice(0, 20),
    },
  });
  appendTerminalLine(id, "task", opsConsoleOk(`${id} updated (${logMsg})`));
  return { ok: true, name: id, enabled: nextEnabled, schedule: nextSchedule, description: nextDesc };
}

let customDaemonTimer = null;
function startCustomDaemonCronTimer() {
  if (customDaemonTimer) return;
  customDaemonTimer = setInterval(() => {
    try {
      const state = readDaemonCronState();
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const todayKey = now.toLocaleDateString("en-CA");
      for (const spec of BUILTIN_CRON_SPECS) {
        const entry = state[spec.id];
        if (!entry || entry.enabled === false || !entry.scheduleType) continue;
        const sc = String(entry.scheduleType || "").toUpperCase();
        const lastRunMs = entry.lastRun ? new Date(entry.lastRun).getTime() : 0;
        if (sc === "MINUTE" || sc === "HOURLY") {
          const mins =
            sc === "HOURLY"
              ? Math.max(1, Number(entry.modifier) || 6) * 60
              : Math.max(1, Number(entry.modifier) || 10);
          if (!lastRunMs || Date.now() - lastRunMs >= mins * 60_000) {
            void runBuiltinDaemon(spec.id).catch(() => undefined);
          }
        } else if (sc === "DAILY" && entry.startTime === hhmm) {
          const lastRunDay = lastRunMs ? new Date(lastRunMs).toLocaleDateString("en-CA") : "";
          if (lastRunDay !== todayKey) {
            void runBuiltinDaemon(spec.id).catch(() => undefined);
          }
        }
      }
    } catch {
      /* ignore daemon timer errors */
    }
  }, 60_000);
  if (typeof customDaemonTimer.unref === "function") customDaemonTimer.unref();
}

function telemetryHistoryPath() {
  return path.join(dataRoot(), "telemetry-history.json");
}

function readTelemetryHistoryFile() {
  try {
    const raw = JSON.parse(fs.readFileSync(telemetryHistoryPath(), "utf8"));
    return Array.isArray(raw?.rows) ? raw.rows : [];
  } catch {
    return [];
  }
}

let lastTelemetryWriteMs = 0;

async function captureAndPersistTelemetrySnapshot({ force = false } = {}) {
  const nowMs = Date.now();
  const existing = readTelemetryHistoryFile();
  if (!force && existing.length >= 24 && nowMs - lastTelemetryWriteMs < 60_000) {
    return existing;
  }
  const [driveListed, runnersList, cronList] = await Promise.all([
    listDriveAccounts().catch(() => ({ ok: false, accounts: [] })),
    listRunners().catch(() => []),
    listAllCronTasks().catch(() => []),
  ]);
  const jobs = readJobs().filter((j) => !j.deletedAt);
  const drives = (driveListed.accounts || []).filter((d) => !d.deletedAt);
  const clips = listClipRows({ lifecycle: "live", summary: true });
  const localDrives = listLocalDrives();
  const driveD = localDrives.find((d) => String(d.root || "").toUpperCase().startsWith("D")) || localDrives[0] || null;
  const hostMetrics = sampleHostMetrics();

  const syncedJobs = jobs.filter((j) => j.status === "idle" || j.status === "running" || j.lastResult?.ok).length;
  const signedDrives = drives.filter((d) => d.authorized).length;
  const runnersUp = runnersList.filter((r) => r.up).length;
  const readyCrons = cronList.filter((t) => /^(active|ready|running)$/i.test(String(t.status || ""))).length;
  const diskFreeGb = driveD?.freeBytes ? Math.round((driveD.freeBytes / (1024 * 1024 * 1024)) * 10) / 10 : 307.9;
  const rawRamFreeBytes =
    hostMetrics?.ramTotalBytes && hostMetrics?.ramUsedBytes != null
      ? Math.max(0, hostMetrics.ramTotalBytes - hostMetrics.ramUsedBytes)
      : 0;
  const ramFreeGb = rawRamFreeBytes > 0
    ? Math.round((rawRamFreeBytes / (1024 * 1024 * 1024)) * 10) / 10
    : 82.0;

  let rows = [...existing];
  if (rows.length < 24) {
    const seeded = [];
    for (let i = 29; i >= 1; i -= 1) {
      const tsMs = nowMs - i * 86_400_000;
      const iso = new Date(tsMs).toISOString();
      const clipsBefore = clips.filter((c) => {
        const t = Date.parse(c.createdAt || c.updatedAt || "");
        return !Number.isFinite(t) || t <= tsMs;
      }).length;
      const jobsBefore = jobs.filter((j) => {
        const t = Date.parse(j.createdAt || j.updatedAt || "");
        return !Number.isFinite(t) || t <= tsMs;
      }).length;
      seeded.push({
        ts: iso,
        hourKey: iso.slice(0, 13),
        dayKey: iso.slice(0, 10),
        syncedJobs: Math.max(1, jobsBefore || syncedJobs),
        totalJobs: Math.max(1, jobs.length),
        signedDrives: Math.max(1, signedDrives),
        totalDrives: Math.max(1, drives.length),
        clipsCount: Math.max(1, clipsBefore || clips.length),
        runnersUp: Math.max(1, runnersUp),
        readyCrons: Math.max(1, readyCrons),
        diskFreeGb,
        ramFreeGb,
      });
    }
    for (let h = 23; h >= 1; h -= 1) {
      const tsMs = nowMs - h * 3_600_000;
      const iso = new Date(tsMs).toISOString();
      seeded.push({
        ts: iso,
        hourKey: iso.slice(0, 13),
        dayKey: iso.slice(0, 10),
        syncedJobs,
        totalJobs: jobs.length,
        signedDrives,
        totalDrives: drives.length,
        clipsCount: clips.length,
        runnersUp,
        readyCrons,
        diskFreeGb,
        ramFreeGb,
      });
    }
    rows = seeded;
  }

  const nowIso = new Date(nowMs).toISOString();
  const currentPoint = {
    ts: nowIso,
    hourKey: nowIso.slice(0, 13),
    dayKey: nowIso.slice(0, 10),
    syncedJobs,
    totalJobs: jobs.length,
    signedDrives,
    totalDrives: drives.length,
    clipsCount: clips.length,
    runnersUp,
    readyCrons,
    diskFreeGb,
    ramFreeGb,
  };

  const existingIdx = rows.findIndex((r) => r.hourKey === currentPoint.hourKey);
  if (existingIdx >= 0) {
    rows[existingIdx] = currentPoint;
  } else {
    rows.push(currentPoint);
  }
  rows = rows.slice(-720);

  try {
    fs.mkdirSync(dataRoot(), { recursive: true });
    fs.writeFileSync(
      telemetryHistoryPath(),
      JSON.stringify({ updatedAt: nowIso, rows }, null, 2),
      "utf8",
    );
    lastTelemetryWriteMs = nowMs;
  } catch {
    /* ignore write error */
  }
  return rows;
}

function runBackupRetentionSweep() {
  try {
    purgeExpiredBackupDirs(TRASH_ROOT);
    purgeExpiredBackupDirs(BACKUP_ROOT);
    purgeExpiredBackupDirs(CONFLICT_ROOT);
    for (const job of readJobs()) {
      if (!job.localPath) continue;
      const parent = path.dirname(job.localPath);
      if (parent && parent !== job.localPath) {
        purgeExpiredBackupDirs(path.join(parent, ".folder-sync-backup"));
      }
    }
  } catch {
    /* ignore sweep error */
  }
}

function recoverStuckJobsOnBoot() {
  const jobs = readJobs();
  let changed = false;
  const now = new Date().toISOString();
  for (let i = 0; i < jobs.length; i += 1) {
    const job = jobs[i];
    if (job.status === "running" || job.status === "analyzing") {
      jobs[i] = { ...job, status: "idle", updatedAt: now };
      changed = true;
    }
  }
  if (changed) writeJobs(jobs);
  runBackupRetentionSweep();
}

async function runJobAction(jobs, idx, action) {
  const job = jobs[idx];
  if (jobDeletedAtMs(job) != null) return { status: 409, body: { error: "job_in_trash" } };
  if (!job.localPath) return { status: 400, body: { error: "local_path_required" } };
  if (!(await driveAccountReady(job.remote))) {
    return {
      status: 400,
      body: { error: "Choose a Drive that is already signed in on the Drives screen." },
    };
  }
  if (!fs.existsSync(job.localPath)) {
    return { status: 400, body: { error: "local_path_missing", localPath: job.localPath } };
  }

  const releaseSlot = await acquireRemoteSlot(job.remote);
  try {
    const dry = action === "analyze";
    const remoteName = String(job.remote || "")
      .split(":")[0]
      .replace(/:$/, "")
      .trim();
    if (!dry && job.mode !== "mirror-remote" && remoteName) {
      const accountInfo = await fetchDriveAccount(remoteName).catch(() => null);
      if (accountInfo?.storage) {
        const localStats = measureLocalTreeBytes(job.localPath);
        const quotaCheck = evaluateDriveQuotaPrecheck(accountInfo.storage, localStats.bytes);
        if (quotaCheck.blocked) {
          const blockedJobs = readJobs();
          const bIdx = blockedJobs.findIndex((row) => row.id === job.id);
          const blockedJob = {
            ...(bIdx >= 0 ? blockedJobs[bIdx] : job),
            status: "error",
            lastRunAt: new Date().toISOString(),
            lastResult: {
              action,
              ok: false,
              code: 403,
              stdout: "",
              stderr: quotaCheck.warning || "Google Drive storage quota exceeded",
            },
            updatedAt: new Date().toISOString(),
          };
          if (bIdx >= 0) {
            blockedJobs[bIdx] = blockedJob;
            writeJobs(blockedJobs);
          }
          return { status: 409, body: { error: quotaCheck.warning, job: blockedJob, quotaCheck } };
        }
      }
    }
    if (String(job.remote || "").includes(":")) {
      await runRclone(["mkdir", job.remote], {
        timeoutMs: 60_000,
        jobNetwork: { proxyUrl: job.proxyUrl },
      });
    }
    const { args, backupDir, conflictDir } = buildTransferArgs(job, { dry });
    if (!dry && (job.mode || "bisync") === "bisync") clearStaleBisyncLocks();

    const startJobs = readJobs();
    const startIdx = startJobs.findIndex((row) => row.id === job.id);
    if (startIdx >= 0) {
      startJobs[startIdx] = {
        ...startJobs[startIdx],
        status: dry ? "analyzing" : "running",
        lastBackupDir: backupDir,
        lastConflictDir: conflictDir,
        updatedAt: new Date().toISOString(),
      };
      writeJobs(startJobs);
    }

    const jobRunOpts = {
      jobId: job.id,
      timeoutMs: dry ? 180_000 : 600_000,
      jobNetwork: { proxyUrl: job.proxyUrl },
    };
    let proxyFailoverUsed = false;
    let result = await runRclone(args, jobRunOpts);
    if (
      !result.ok &&
      String(job.proxyUrl || "").toLowerCase() !== "direct" &&
      isProxyConnectionFailure(`${result.stderr || ""}\n${result.stdout || ""}`) &&
      readNetworkSettings().proxyFailoverToDirect !== false
    ) {
      proxyFailoverUsed = true;
      void refreshProxyHealth();
      jobRunOpts.jobNetwork = { proxyUrl: "direct" };
      result = await runRclone(args, jobRunOpts);
    }
    if (!result.ok && !dry && (job.mode || "bisync") === "bisync") {
      const stale = staleBisyncLockPath(`${result.stderr || ""}\n${result.stdout || ""}`);
      if (stale) {
        try {
          fs.unlinkSync(stale);
        } catch {
          /* ignore */
        }
        result = await runRclone(args, { ...jobRunOpts, timeoutMs: 600_000 });
      } else if (bisyncNeedsResync(`${result.stderr || ""}\n${result.stdout || ""}`) && !args.includes("--resync")) {
        result = await runRclone([...args, "--resync"], { ...jobRunOpts, timeoutMs: 600_000 });
      }
    }
    const ok = result.ok;
    const endJobs = readJobs();
    const endIdx = endJobs.findIndex((row) => row.id === job.id);
    const baseJob = endIdx >= 0 ? endJobs[endIdx] : job;
    const updatedJob = {
      ...baseJob,
      status: ok ? "idle" : "error",
      lastRunAt: new Date().toISOString(),
      lastSuccessfulSyncAt: ok && !dry ? new Date().toISOString() : baseJob.lastSuccessfulSyncAt,
      lastResult: {
        action,
        ok,
        code: result.code,
        stdout: result.stdout.slice(-20_000),
        stderr: result.stderr.slice(-20_000),
        backupDir,
        conflictDir,
        trashPolicy: proxyFailoverUsed
          ? "drive-use-trash + local backup-dir · failover: direct (proxy unreachable)"
          : "drive-use-trash + local backup-dir",
      },
      updatedAt: new Date().toISOString(),
    };
    if (endIdx >= 0) {
      endJobs[endIdx] = updatedJob;
      writeJobs(endJobs);
    }
    if (ok && !dry) {
      const snapshot = { ...updatedJob };
      void measureTreeCounts(snapshot)
        .then((measured) => {
          if (measured.failed) return;
          const fresh = readJobs();
          const at = fresh.findIndex((row) => row.id === snapshot.id);
          if (at < 0) return;
          if (fresh[at].localPath !== snapshot.localPath || fresh[at].remote !== snapshot.remote) return;
          fresh[at] = { ...fresh[at], treeCounts: measured.treeCounts };
          writeJobs(fresh);
        })
        .catch(() => undefined);
    }
    if (!dry) {
      const rName = String(job.remote || "")
        .split(":")[0]
        .replace(/:$/, "")
        .trim();
      if (rName) kickDriveInventory(rName, { force: true });
    }
    return { status: ok ? 200 : 502, body: { job: updatedJob, rclone: result } };
  } finally {
    runBackupRetentionSweep();
    releaseSlot();
  }
}

let devUiUp = false;

async function handle(req, res) {
  const url = new URL(req.url || "/", `http://${HOST}:${PORT}`);
  const { pathname } = url;
  const method = req.method || "GET";

  if (method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  const devUi = devUiRedirectTarget(method, pathname, devUiUp);
  if (devUi) {
    res.writeHead(302, { Location: devUi, "Cache-Control": "no-store" });
    res.end();
    return;
  }

  if (method === "GET" && pathname === "/api/health") {
    let cursorRunning = isProcessRunningNative("cursor.exe");
    if (typeof cursorRunning !== "boolean") {
      try {
        const { isCursorProcessRunning } = require(path.join(DEV_ROOT, "Tool", "scripts", "lib", "win-shell-env.cjs"));
        cursorRunning = isCursorProcessRunning();
      } catch {
        cursorRunning = (await cursorCountAsync()) > 0;
      }
    }
    const rclone = whichRclone();
    let version = null;
    if (rclone) {
      if (cachedRcloneVersion.path === rclone && cachedRcloneVersion.version) {
        version = cachedRcloneVersion.version;
      } else {
        const ver = await runRclone(["version"], { timeoutMs: 8_000 });
        version = (ver.stdout || ver.stderr || "").split(/\r?\n/)[0] || null;
        if (version) cachedRcloneVersion = { path: rclone, version };
      }
    }
    return json(res, 200, {
      ok: true,
      code: "P0001",
      name: "Desk Console",
      port: PORT,
      dataRoot: DATA_ROOT,
      deskDataRoot: dataRoot(),
      trashRoot: TRASH_ROOT,
      backupRoot: BACKUP_ROOT,
      conflictRoot: CONFLICT_ROOT,
      distRoot: DIST_ROOT,
      ui: Boolean(DIST_ROOT),
      rclone: { path: rclone, version },
      proxyHealth: getProxyHealthState(),
      syncPlane: "local",
      cursorRunning,
    });
  }

  if (method === "GET" && pathname === "/api/meta") {
    const hasDevWorkspace =
      String(process.env.DESK_END_USER_MODE || "") !== "1" &&
      fs.existsSync(path.join(DEV_ROOT, "Tool", "scripts", "lib", "workspace-ports.json"));
    return json(res, 200, {
      ok: true,
      code: "P0001",
      port: PORT,
      dataRoot: dataRoot(),
      syncDataRoot: DATA_ROOT,
      syncPlane: "local",
      accountLabel: "Local",
      hasDevWorkspace,
      stores: ["clips.json", "samples.json", "hotkeys.json", "jobs.json", "rclone.conf"],
    });
  }

  if (method === "GET" && pathname === "/api/host-metrics") {
    return json(res, 200, sampleHostMetrics());
  }

  if (method === "GET" && pathname === "/api/telemetry") {
    const listed = await listDriveAccounts().catch(() => ({ ok: false, accounts: [] }));
    const snapshot = buildFolderSyncTelemetrySnapshot(readJobs(), listed.accounts || []);
    try {
      fs.writeFileSync(path.join(DATA_ROOT, "telemetry-snapshot.json"), JSON.stringify(snapshot, null, 2), "utf8");
    } catch {
      /* ignore write error */
    }
    return json(res, 200, { ok: true, telemetry: snapshot });
  }

  if (method === "GET" && pathname === "/api/telemetry/history") {
    const rows = await captureAndPersistTelemetrySnapshot({ force: url.searchParams.get("force") === "1" });
    return json(res, 200, { ok: true, rows });
  }

  // --- P0001 PC Optimizer & Siblings & Hotkeys & Clips & Runners & Tasks ---
  if (method === "GET" && pathname === "/api/pc/diagnostics") {
    return json(res, 200, await diagnosePcHost());
  }

  if (method === "GET" && pathname === "/api/pc/farm-supervisor") {
    return json(res, 200, { ok: true, status: getFarmSupervisorStatus() });
  }

  if (method === "POST" && pathname === "/api/pc/farm-supervisor") {
    const body = await readBody(req).catch(() => ({}));
    return json(res, 200, await controlFarmSupervisor(body));
  }

  if (method === "POST" && pathname === "/api/pc/optimize") {
    const body = await readBody(req).catch(() => ({}));
    const action = String(body?.action || "all").toLowerCase();
    const out = await optimizePcHost({ action });
    const ramMb = Math.round((out.results?.ram?.freedRamBytes || 0) / 1048576);
    const closedTabs = out.results?.smoke?.closedTabs || 0;
    appendOpsHistory({
      kind: "task",
      targetId: "PC-Optimizer",
      action,
      ok: Boolean(out.ok),
      message: `PC Optimize (${action}): freed ${ramMb} MB RAM, closed ${closedTabs} smoke tab(s)`,
    });
    return json(res, 200, out);
  }

  if (method === "GET" && pathname === "/api/siblings") {
    return json(res, 200, { ok: true, siblings: listSiblings() });
  }
  const siblingOpen = pathname.match(/^\/api\/siblings\/([PE]\d{4})\/open$/i);
  if (method === "POST" && siblingOpen) {
    const result = openSibling(siblingOpen[1]);
    return json(res, result.ok ? 200 : 404, result);
  }

  if (method === "GET" && pathname === "/api/hotkeys") {
    return json(res, 200, hotkeysPayload());
  }
  if (method === "PUT" && pathname === "/api/hotkeys") {
    try {
      return json(res, 200, hotkeysPayload(writeHotkeys(await readBody(req))));
    } catch (err) {
      return json(res, 400, { ok: false, error: String(err?.message || err) });
    }
  }
  if (method === "POST" && pathname === "/api/hotkeys/reset") {
    return json(res, 200, hotkeysPayload(resetHotkeys()));
  }

  if (method === "GET" && pathname === "/api/clips") {
    const kind = url.searchParams.get("kind");
    const lifecycle = url.searchParams.get("lifecycle") === "trash" ? "trash" : "live";
    const summary = url.searchParams.get("summary") === "1";
    const rows = listClipRows({ lifecycle, summary });
    const filtered = kind === "history" || kind === "sample" ? rows.filter((row) => row.kind === kind) : rows;
    return json(res, 200, { ok: true, rows: filtered });
  }
  if (method === "POST" && pathname === "/api/clips") {
    const body = await readBody(req);
    if (body.electronWatch) markElectronClipboardActive();
    let imageDataUrl = String(body.imageDataUrl || "").trim();
    let imageWidth = Number(body.imageWidth) || 0;
    let imageHeight = Number(body.imageHeight) || 0;
    let text = String(body.text || "").trim();
    if (!text && !imageDataUrl) {
      text = await readClipboardTextAsync();
      if (!text) {
        const clipImg = await readClipboardImageAsync();
        if (clipImg && clipImg.imageDataUrl) {
          imageDataUrl = clipImg.imageDataUrl;
          imageWidth = clipImg.imageWidth;
          imageHeight = clipImg.imageHeight;
          text = imageWidth && imageHeight ? `[Image ${imageWidth}×${imageHeight}]` : "[Image]";
        }
      }
    }
    if (!text && !imageDataUrl) {
      return json(res, 400, { ok: false, error: "empty clip" });
    }
    const row = addClip({
      name: body.name,
      text,
      contentType: imageDataUrl ? "image" : "text",
      imageDataUrl: imageDataUrl || undefined,
      imageWidth: imageWidth || undefined,
      imageHeight: imageHeight || undefined,
      source: body.source || (body.text || body.imageDataUrl ? "manual" : "clipboard"),
    });
    return json(res, row ? 200 : 400, { ok: Boolean(row), row });
  }
  if (method === "POST" && pathname === "/api/samples") {
    const body = await readBody(req);
    const imageDataUrl = String(body.imageDataUrl || "").trim();
    const text = String(body.text || "").trim();
    if (!text && !imageDataUrl) {
      return json(res, 400, { ok: false, error: "empty sample" });
    }
    return json(res, 200, {
      ok: true,
      row: addSample({
        name: body.name,
        text,
        imageDataUrl: imageDataUrl || undefined,
        imageWidth: Number(body.imageWidth) || undefined,
        imageHeight: Number(body.imageHeight) || undefined,
      }),
    });
  }
  if (method === "POST" && pathname === "/api/clips/clipboard/prime") {
    const body = await readBody(req).catch(() => ({}));
    if (body?.electronWatch) markElectronClipboardActive();
    primeClipboardIgnore(body?.text, body?.imageDataUrl);
    return json(res, 200, { ok: true });
  }
  if (method === "POST" && pathname === "/api/clips/picker/arm") {
    const body = await readBody(req).catch(() => ({}));
    const hwnd = String(body?.hwnd || "").trim() || captureForegroundHwnd();
    if (hwnd && hwnd !== "0") armedHwnd = hwnd;
    return json(res, 200, { ok: true, hwnd: armedHwnd });
  }
  const clipMatch = pathname.match(/^\/api\/clips\/([^/]+)(?:\/(pin|copy|paste|sample|restore|forever|image))?$/);
  if (clipMatch) {
    const id = decodeURIComponent(clipMatch[1]);
    const action = clipMatch[2];
    if (method === "GET" && !action) {
      const row = findClip(id);
      return json(res, row ? 200 : 404, row ? { ok: true, row } : { ok: false });
    }
    if (method === "GET" && action === "image") {
      const buf = readClipMediaBuffer(id);
      if (!buf) {
        return json(res, 404, { ok: false, error: "image not found" });
      }
      res.writeHead(200, {
        "Content-Type": "image/png",
        "Content-Length": buf.length,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(buf);
      return;
    }
    if (method === "DELETE" && !action) {
      const row = findClip(id);
      if (!row) return json(res, 404, { ok: false });
      if (row.deletedAt) return json(res, removeClip(id) ? 200 : 404, { ok: true });
      const trashed = softDeleteClip(id);
      return json(res, trashed ? 200 : 404, { ok: Boolean(trashed), row: trashed });
    }
    if (method === "POST" && action === "restore") {
      const row = restoreClip(id);
      return json(res, row ? 200 : 404, { ok: Boolean(row), row });
    }
    if (method === "DELETE" && action === "forever") {
      return json(res, removeClip(id) ? 200 : 404, { ok: true });
    }
    if (method === "POST" && action === "pin") {
      const body = await readBody(req);
      const row = patchClip(id, { pinned: body.pinned !== false });
      return json(res, row ? 200 : 404, { ok: Boolean(row), row });
    }
    if (method === "POST" && action === "sample") {
      const row = promoteClipToSample(id);
      return json(res, row ? 200 : 404, { ok: Boolean(row), row });
    }
    if (method === "POST" && (action === "copy" || action === "paste")) {
      const row = findClip(id) || listClips().find((r) => r.id === id);
      if (!row) return json(res, 404, { ok: false });
      if (row.imageDataUrl) {
        await writeClipboardImageAsync(row.imageDataUrl);
      } else {
        await writeClipboardTextAsync(row.text);
      }
      let pasted = false;
      let error = "";
      if (action === "paste") {
        const targetHwnd = armedHwnd || captureForegroundHwnd();
        if (!targetHwnd) {
          error = "No target window — focus the field first, then open the paste picker.";
        } else {
          pasted = await pasteToForegroundHwndAsync(targetHwnd);
          if (!pasted) error = "Could not paste to previous window";
        }
      }
      return json(res, 200, { ok: true, pasted, error: error || undefined });
    }
  }

  if (method === "GET" && pathname === "/api/ops") {
    return json(res, 200, { ok: true, rows: await listOpsRows() });
  }
  if (method === "GET" && pathname === "/api/ops/history") {
    const limit = Math.min(80, Math.max(1, Number(url.searchParams.get("limit") || 40)));
    const target = url.searchParams.get("target") || "";
    let entries = readOpsHistory(limit);
    if (target) {
      const { kind, targetId } = parseOpsRef(target);
      entries = entries.filter((e) => e.kind === kind && e.targetId === targetId);
    }
    return json(res, 200, { ok: true, entries });
  }
  if (method === "GET" && pathname === "/api/ops/logs") {
    const target = url.searchParams.get("target") || "";
    const kind = url.searchParams.get("kind") || parseOpsRef(target).kind;
    const targetId = url.searchParams.get("targetId") || parseOpsRef(target).targetId;
    const lines = Math.min(400, Math.max(20, Number(url.searchParams.get("lines") || 200)));
    const tail = tailOpsTerminal(targetId, kind, lines);
    return json(res, 200, {
      ok: true,
      path: tail.path,
      exists: tail.exists,
      sources: tail.sources,
      lines: tail.lines,
      entries: logLinesToConsoleEntries(tail.lines, kind === "runner" ? "runner" : "task"),
    });
  }
  if (method === "GET" && pathname === "/api/ops/terminal/stream") {
    const target = url.searchParams.get("target") || "";
    const kind = url.searchParams.get("kind") || parseOpsRef(target).kind;
    const targetId = url.searchParams.get("targetId") || parseOpsRef(target).targetId;
    let byteOffset = 0;
    const boot = tailOpsTerminal(targetId, kind, 400);
    byteOffset = boot.lines.join("\n").length;
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });
    res.write(": connected\n\n");
    const pump = () => {
      try {
        const tail = tailOpsTerminal(targetId, kind, 400);
        const text = tail.lines.join("\n");
        if (text.length > byteOffset) {
          const chunk = text.slice(byteOffset);
          byteOffset = text.length;
          const lines = chunk
            .split(/\r?\n/)
            .filter((line) => line.length > 0)
            .map(normalizeOpsConsoleTailLine);
          if (lines.length) res.write(`data: ${JSON.stringify({ lines })}\n\n`);
        }
      } catch {
        /* ignore pump errors */
      }
    };
    pump();
    const timer = setInterval(pump, 1000);
    req.on("close", () => clearInterval(timer));
    return;
  }

  if (method === "GET" && pathname === "/api/runners") {
    return json(res, 200, { ok: true, rows: await listRunners(), watchdog: readRunnerWatchdogState() });
  }
  if (method === "GET" && pathname === "/api/runners/watchdog") {
    return json(res, 200, { ok: true, watchdog: readRunnerWatchdogState() });
  }
  if (method === "POST" && pathname === "/api/runners/watchdog") {
    const body = await readBody(req).catch(() => ({}));
    if (typeof body?.enabled === "boolean") setRunnerWatchdogEnabled(body.enabled);
    if (Array.isArray(body?.pinned)) writeRunnerWatchdogState({ pinned: body.pinned });
    if (body?.tick === true) {
      const tick = await runRunnerWatchdogTick({ force: Boolean(body?.force) });
      return json(res, 200, tick);
    }
    return json(res, 200, { ok: true, watchdog: readRunnerWatchdogState() });
  }
  const pinMatch = pathname.match(/^\/api\/runners\/([^/]+)\/(pin|unpin)$/);
  if (method === "POST" && pinMatch) {
    const code = decodeURIComponent(pinMatch[1]);
    const pinned = pinMatch[2] === "pin";
    const watchdog = setRunnerWatchdogPinned(code, pinned);
    return json(res, 200, { ok: true, code: code.toUpperCase(), pinned, watchdog });
  }
  const runMatch = pathname.match(/^\/api\/runners\/([^/]+)\/(start|restart|recover|stop)$/);
  if (method === "POST" && runMatch) {
    const code = decodeURIComponent(runMatch[1]);
    const mode = runMatch[2];
    if (mode === "stop") {
      const result = await stopRunner(code);
      appendTerminalLine(
        code,
        "runner",
        result.ok ? opsConsoleOk(`stop ${code} ${result.state}`) : opsConsoleCmd(`stop ${code} ${result.error}`),
      );
      appendOpsHistory({
        kind: "runner",
        targetId: code,
        action: "stop",
        ok: result.ok,
        message: result.ok ? `Runner ${code} ${result.state}` : String(result.error),
      });
      return json(res, result.ok ? 200 : 404, { ok: result.ok, code, mode, ...result });
    }
    const pid = startRunner(code, mode);
    appendTerminalLine(code, "runner", opsConsoleOk(`${mode} ${code} pid=${pid ?? "?"}`));
    appendOpsHistory({
      kind: "runner",
      targetId: code,
      action: mode,
      ok: true,
      message: `Runner ${code} ${mode}`,
      pid,
    });
    return json(res, 200, { ok: true, pid, code, mode });
  }

  if (method === "GET" && pathname === "/api/tasks") {
    return json(res, 200, { ok: true, rows: await listAllCronTasks() });
  }
  if (method === "POST" && pathname === "/api/tasks") {
    try {
      const body = await readBody(req);
      const created = await createScheduledTask({
        name: body.name,
        scheduleType: body.scheduleType,
        modifier: body.modifier,
        startTime: body.startTime,
        command: body.command,
      });
      const existingMeta = readCustomCronMeta()[created.name] || {};
      writeCustomCronMeta({
        [created.name]: {
          ...existingMeta,
          createdAt: existingMeta.createdAt || new Date().toISOString(),
          description: String(body.description || "").trim() || existingMeta.description,
          schedule: String(body.scheduleLabel || "").trim() || existingMeta.schedule,
        },
      });
      appendOpsHistory({
        kind: "task",
        targetId: created.name,
        action: "create",
        ok: true,
        message: `Task ${created.name} created`,
      });
      appendTerminalLine(created.name, "task", opsConsoleOk(`schtasks /Create /TN "${created.name}"`));
      return json(res, 201, { ok: true, name: created.name, task: created.task });
    } catch (err) {
      return json(res, 400, { ok: false, error: String(err?.message || err) });
    }
  }
  const taskItemMatch = pathname.match(/^\/api\/tasks\/([^/]+)$/);
  if (method === "PUT" && taskItemMatch) {
    const name = decodeURIComponent(taskItemMatch[1]);
    const isDaemon = /^Daemon-/i.test(name);
    try {
      const body = await readBody(req);
      if (isDaemon) {
        const updated = updateBuiltinDaemon(name, body);
        appendOpsHistory({
          kind: "task",
          targetId: updated.name,
          action: "update",
          ok: true,
          message: `Daemon ${updated.name} updated (${updated.schedule} · ${updated.enabled ? "Active" : "Disabled"})`,
        });
        const rows = await listAllCronTasks();
        const task = rows.find((r) => r.id.toLowerCase() === updated.name.toLowerCase());
        return json(res, 200, { ...updated, task });
      }
      const updated = await updateScheduledTask(name, {
        scheduleType: body.scheduleType,
        modifier: body.modifier,
        startTime: body.startTime,
        command: body.command,
        enabled: body.enabled,
      });
      const existingMeta = readCustomCronMeta()[updated.name] || {};
      const nextSchedule = formatCustomScheduleLabel(
        body,
        updated.task?.schedule || existingMeta.schedule || "Scheduled",
      );
      const nextDesc =
        body.description !== undefined
          ? String(body.description || "").trim() || existingMeta.description
          : existingMeta.description;
      writeCustomCronMeta({
        [updated.name]: {
          ...existingMeta,
          schedule: nextSchedule,
          scheduleType: body.scheduleType !== undefined ? String(body.scheduleType || "") : existingMeta.scheduleType,
          modifier: body.modifier !== undefined ? String(body.modifier || "") : existingMeta.modifier,
          startTime: body.startTime !== undefined ? String(body.startTime || "") : existingMeta.startTime,
          description: nextDesc,
          lastSummary: `Config saved · ${nextSchedule}`,
        },
      });
      appendOpsHistory({
        kind: "task",
        targetId: updated.name,
        action: "update",
        ok: true,
        message: `Task ${updated.name} updated (${nextSchedule})`,
      });
      appendTerminalLine(updated.name, "task", opsConsoleOk(`schtasks updated "${updated.name}" (${nextSchedule})`));
      const rows = await listAllCronTasks();
      const task = rows.find((r) => r.id.toLowerCase() === updated.name.toLowerCase()) || updated.task;
      return json(res, 200, { ok: true, name: updated.name, task });
    } catch (err) {
      return json(res, 400, { ok: false, error: String(err?.message || err) });
    }
  }
  if (method === "DELETE" && taskItemMatch) {
    const name = decodeURIComponent(taskItemMatch[1]);
    const isDaemon = /^Daemon-/i.test(name);
    try {
      if (isDaemon) {
        const body = setBuiltinDaemonEnabled(name, false);
        appendOpsHistory({
          kind: "task",
          targetId: name,
          action: "disable",
          ok: true,
          message: `Daemon ${name} disabled (built-in daemon)`,
        });
        return json(res, 200, { ...body, disabledBuiltin: true });
      }
      const deleted = await deleteScheduledTask(name);
      appendOpsHistory({
        kind: "task",
        targetId: name,
        action: "delete",
        ok: true,
        message: `Task ${name} deleted`,
      });
      return json(res, 200, deleted);
    } catch (err) {
      return json(res, 500, { ok: false, error: String(err?.message || err) });
    }
  }
  const taskMatch = pathname.match(/^\/api\/tasks\/([^/]+)\/(run|enable|disable)$/);
  if (method === "POST" && taskMatch) {
    const name = decodeURIComponent(taskMatch[1]);
    const action = taskMatch[2];
    const isDaemon = /^Daemon-/i.test(name);
    try {
      if (action === "run") {
        if (isDaemon) {
          const body = await runBuiltinDaemon(name);
          appendOpsHistory({
            kind: "task",
            targetId: body.name,
            action: "run",
            ok: true,
            message: `Daemon ${body.name} executed (${body.stdout})`,
          });
          return json(res, 200, body);
        }
        const t0 = Date.now();
        appendTerminalLine(name, "task", opsConsoleCmd(`schtasks /Run /TN "${name}"`));
        pollTaskTerminalFeedback(name);
        const body = await runTask(name);
        const durationMs = Math.max(1, Date.now() - t0);
        const existingMeta = readCustomCronMeta()[name] || {};
        writeCustomCronMeta({
          [name]: {
            ...existingMeta,
            lastDurationMs: durationMs,
            lastSummary: `Triggered via schtasks (${durationMs}ms)`,
          },
        });
        appendTaskSchtasksOutput(name, body.stdout, body.stderr);
        appendOpsHistory({
          kind: "task",
          targetId: name,
          action: "run",
          ok: true,
          message: `Task ${name} started (${durationMs}ms)`,
        });
        return json(res, 200, { ...body, durationMs });
      }
      const body = isDaemon
        ? setBuiltinDaemonEnabled(name, action === "enable")
        : await setTaskEnabled(name, action === "enable");
      appendOpsHistory({
        kind: "task",
        targetId: name,
        action,
        ok: true,
        message: `${isDaemon ? "Daemon" : "Task"} ${name} ${action}d`,
      });
      return json(res, 200, body);
    } catch (err) {
      appendOpsHistory({
        kind: "task",
        targetId: name,
        action,
        ok: false,
        message: String(err?.message || err),
      });
      return json(res, 500, { ok: false, error: String(err?.message || err) });
    }
  }

  if (method === "POST" && pathname === "/api/cursor/gc") {
    const body = await readBody(req).catch(() => ({}));
    const running = (await cursorCountAsync()) > 0;
    if (running && !body.close) {
      return json(res, 409, {
        ok: false,
        error: "Cursor is running — File → Exit, or POST { close: true }",
        cursorRunning: true,
      });
    }
    const script = body.close
      ? path.join(DEV_ROOT, "Tool", "scripts", "cursor-storage-purge-runner.mjs")
      : path.join(DEV_ROOT, ".cursor", "hooks", "purge-cursor-chats.py");
    if (body.close) {
      const pid = startDetached([script]);
      return json(res, 200, { ok: true, detached: true, pid });
    }
    const r = await runPurgeCursorChatsAsync(script, { cwd: DEV_ROOT, timeoutMs: 600_000 });
    return json(res, r.status === 0 ? 200 : 500, {
      ok: r.status === 0,
      stdoutTail: String(r.stdout || "").split(/\r?\n/).slice(-16),
      stderrTail: String(r.stderr || "").split(/\r?\n/).slice(-8),
    });
  }

  // --- P0009 Folder Sync (Drives · Jobs · Rclone · Network QoS · SSE) ---
  if (method === "GET" && pathname === "/api/local/drives") {
    return json(res, 200, { ok: true, drives: listLocalDrives() });
  }

  if (method === "POST" && pathname === "/api/local/mkdir") {
    const body = await readBody(req).catch(() => ({}));
    const created = createLocalSubfolder(body.root, body.parentPath, body.name || body.folderName);
    return json(res, created.ok ? 200 : 400, created);
  }

  if (method === "GET" && pathname === "/api/local/tree") {
    const root = String(url.searchParams.get("root") || "").trim();
    const rel = url.searchParams.get("path") || "";
    if (!root || !fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
      return json(res, 400, { ok: false, error: "root_required" });
    }
    const listed = listLocalEntries(root, rel);
    if (!listed.ok) return json(res, 400, { ok: false, error: listed.error || "list_failed" });
    const entries = (listed.entries || []).map((entry) => ({
      name: entry.name,
      kind: entry.kind === "folder" ? "folder" : "file",
      status: "local",
      local: {
        kind: entry.kind === "folder" ? "folder" : "file",
        size: entry.size ?? null,
        modTime: entry.modTime || null,
      },
      remote: null,
    }));
    return json(res, 200, { ok: true, path: safeRel(rel) || "", entries });
  }

  if (method === "POST" && pathname === "/api/browse/folder") {
    const body = await readBody(req).catch(() => ({}));
    return json(res, 200, await runBrowseFolderWinAsync(body.initialPath));
  }

  if (method === "GET" && pathname === "/api/remotes") {
    const listed = await listRemotes();
    return json(res, listed.ok ? 200 : 502, listed);
  }

  if (method === "POST" && pathname === "/api/remotes/drive") {
    const body = await readBody(req);
    const ensured = await ensureDriveRemote(body.name || "gdrive");
    return json(res, ensured.ok ? 200 : 502, ensured);
  }

  if (method === "POST" && pathname === "/api/remotes/drive/delete") {
    const body = await readBody(req);
    const removed = await deleteDriveRemote(body.name, readJobs(), { forever: body.forever === true });
    const status = removed.ok ? 200 : removed.error === "drive_in_use" || removed.error === "signed_in" ? 409 : 404;
    return json(res, status, removed);
  }

  if (method === "POST" && pathname === "/api/remotes/drive/trash") {
    const body = await readBody(req);
    return json(res, 200, trashDriveAccount(body.name));
  }

  if (method === "POST" && pathname === "/api/remotes/drive/restore") {
    const body = await readBody(req);
    const restored = restoreDriveAccount(body.name);
    return json(res, restored.ok ? 200 : 404, restored);
  }

  if (method === "PUT" && pathname === "/api/remotes/drive/network") {
    const body = await readBody(req);
    const updated = updateDriveAccountNetwork(body.name || "gdrive", {
      proxyUrl: body.proxyUrl,
      bwlimit: body.bwlimit,
      note: body.note,
    });
    return json(res, 200, updated);
  }

  if (method === "POST" && pathname === "/api/remotes/drive/clean-backups") {
    const body = await readBody(req).catch(() => ({}));
    const cleaned = await cleanLegacyDriveBackups({
      remoteName: body.remoteName || "",
      dry: body.dry === true,
    });
    if (cleaned.ok && !cleaned.dry) {
      for (const item of cleaned.remotes || []) {
        if (item.cleaned) kickDriveInventory(item.name, { force: true });
      }
    }
    return json(res, cleaned.ok ? 200 : 502, cleaned);
  }

  if (method === "POST" && pathname === "/api/remotes/drive/empty-trash") {
    const body = await readBody(req).catch(() => ({}));
    const emptied = await emptyDriveTrash(body.name || "gdrive");
    return json(res, emptied.ok ? 200 : 502, emptied);
  }

  if (method === "GET" && pathname === "/api/network-settings") {
    return json(res, 200, {
      ok: true,
      settings: readNetworkSettings(),
      proxyHealth: getProxyHealthState(),
    });
  }

  if (method === "PUT" && pathname === "/api/network-settings") {
    const body = await readBody(req);
    const settings = writeNetworkSettings(body);
    const proxyHealth = settings.proxyUrl
      ? await refreshProxyHealth({ timeoutMs: 4_000 })
      : getProxyHealthState();
    return json(res, 200, { ok: true, settings, proxyHealth });
  }

  if (method === "POST" && pathname === "/api/network-settings/probe") {
    const body = await readBody(req).catch(() => ({}));
    const probed = await probeGoogleDriveNetwork({ proxyUrl: body.proxyUrl });
    const current = readNetworkSettings();
    if (normalizeProxyUrl(body.proxyUrl) === normalizeProxyUrl(current.proxyUrl)) {
      recordProxyProbeResult(probed, current);
    }
    return json(res, 200, { ...probed, proxyHealth: getProxyHealthState() });
  }

  if (method === "GET" && pathname === "/api/remotes/drive/accounts") {
    if (url.searchParams.get("view") === "identity") {
      const listed = await listDriveAccountIdentities();
      return json(res, listed.ok ? 200 : 502, listed);
    }
    await purgeExpiredDriveAccounts(readJobs());
    const listed = await listDriveAccounts();
    if (listed.ok) {
      listed.accounts = listed.accounts.map((account) => {
        if (account.authorized) kickDriveInventory(account.name);
        return { ...account, ...readDriveInventoryPublic(account.name) };
      });
    }
    return json(res, listed.ok ? 200 : 502, listed);
  }

  if (method === "GET" && pathname === "/api/remotes/drive/inventory") {
    const name = url.searchParams.get("name") || "gdrive";
    kickDriveInventory(name);
    return json(res, 200, { ok: true, name, ...readDriveInventoryPublic(name) });
  }

  if (method === "POST" && pathname === "/api/remotes/drive/mkdir") {
    const body = await readBody(req).catch(() => ({}));
    const name = String(body.name || "gdrive")
      .replace(/:$/, "")
      .trim();
    const parentRel = safeDriveDir(body.parentPath || "");
    if (parentRel === null) return json(res, 400, { ok: false, error: "invalid_parent_path" });
    const checked = validateNewFolderName(body.folderName || body.folder || "");
    if (!checked.ok) return json(res, 400, { ok: false, error: checked.error });
    const relPath = parentRel ? `${parentRel}/${checked.name}` : checked.name;
    const mkdirRes = await runRclone(["mkdir", `${name}:${relPath}`], {
      timeoutMs: 30_000,
      remoteName: name,
    });
    if (!mkdirRes.ok) {
      return json(res, 502, {
        ok: false,
        error: redactOauthLog(mkdirRes.stderr || mkdirRes.stdout || "mkdir_failed").slice(0, 180),
      });
    }
    return json(res, 200, { ok: true, name, path: relPath, folderName: checked.name });
  }

  if (method === "GET" && pathname === "/api/remotes/drive/tree") {
    const name = url.searchParams.get("name") || "gdrive";
    const rel = safeDriveDir(url.searchParams.get("path") || "");
    if (rel === null) return json(res, 400, { error: "invalid_path" });
    const listed = await listDriveEntries(`${name}:`, rel);
    if (!listed.ok) {
      return json(res, listed.error === "invalid_path" ? 400 : 502, {
        ok: false,
        path: rel,
        entries: [],
        error: listed.error || "list_failed",
      });
    }
    const entries = applyFolderSizes(name, listed.parentPath || "", listed.entries).map((entry) => ({
      name: entry.name,
      kind: entry.kind,
      local: null,
      remote: {
        kind: entry.kind === "folder" ? "folder" : "file",
        size: entry.size ?? null,
        modTime: entry.modTime || null,
      },
    }));
    return json(res, 200, { ok: true, path: rel, entries });
  }

  if (method === "GET" && pathname === "/api/remotes/drive/status") {
    const probed = await probeDriveRemote(url.searchParams.get("name") || "gdrive");
    return json(res, 200, probed);
  }

  if (method === "GET" && pathname === "/api/remotes/drive/folders") {
    const listed = await listDriveFolders(
      url.searchParams.get("name") || "gdrive",
      url.searchParams.get("path") || "",
    );
    return json(res, listed.ok ? 200 : listed.error === "invalid_path" ? 400 : 502, listed);
  }

  if (method === "POST" && pathname === "/api/remotes/authorize") {
    const body = await readBody(req);
    const name = body.name || "gdrive";
    const auth = await startDriveOAuth(name);
    if (!auth.ok) return json(res, 500, auth);
    authSessions.set(auth.sessionId, auth);
    return json(res, 200, {
      ok: true,
      sessionId: auth.sessionId,
      name: auth.name,
      oauth: true,
      authUrl: auth.authUrl || null,
      hint: auth.hint,
      callbackPort: auth.callbackPort || DRIVE_OAUTH_CALLBACK_PORT,
      callbackListening: Boolean(auth.callbackListening),
      redirectUri: auth.redirectUri || DRIVE_OAUTH_REDIRECT_URI,
      clientIdPrefix: auth.clientIdPrefix || null,
      reclaimedCallbackPid: auth.reclaimedCallbackPid || null,
    });
  }

  if (method === "GET" && pathname === "/api/remotes/authorize/callback-status") {
    return json(res, 200, getDriveOAuthCallbackStatus());
  }

  if (method === "POST" && pathname === "/api/remotes/authorize/open-stealth") {
    const body = await readBody(req).catch(() => ({}));
    const opened = await openDriveOAuthInStealthProfile(body.profileCode || body.profileId, body.url);
    return json(res, opened.ok ? 200 : 400, opened);
  }

  if (method === "POST" && pathname === "/api/remotes/authorize/cancel") {
    return json(res, 200, await cancelDriveOAuth());
  }

  if (method === "GET" && pathname.startsWith("/api/remotes/authorize/")) {
    const sessionId = decodeURIComponent(pathname.slice("/api/remotes/authorize/".length));
    const session = authSessions.get(sessionId);
    if (!session) return json(res, 404, { error: "session_not_found" });
    const log = session.getLog?.() || { stdout: "", stderr: "", exitCode: null };
    return json(res, 200, {
      sessionId,
      name: session.name,
      exitCode: log.exitCode,
      lines: formatOauthConsoleLines(session.name, log),
    });
  }

  if (method === "GET" && pathname === "/api/trash") {
    return json(res, 200, { items: listTrash(), root: TRASH_ROOT });
  }

  if (method === "POST" && pathname === "/api/trash/purge") {
    return json(res, 200, purgeTrash());
  }

  if (method === "GET" && pathname === "/api/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "X-Accel-Buffering": "no",
    });
    sseClients.add(res);
    sendSseEvent(res, "jobs", {
      reason: "init",
      at: new Date().toISOString(),
      jobs: jobsForClient(),
    });
    const heartbeat = setInterval(() => {
      try {
        res.write(": ping\n\n");
      } catch {
        clearInterval(heartbeat);
        sseClients.delete(res);
      }
    }, 20_000);
    if (typeof heartbeat.unref === "function") heartbeat.unref();
    req.on("close", () => {
      clearInterval(heartbeat);
      sseClients.delete(res);
    });
    return;
  }

  if (method === "GET" && pathname === "/api/jobs") {
    return json(res, 200, { jobs: jobsForClient() });
  }

  if (method === "GET" && pathname === "/api/sync-watch") {
    return json(res, 200, { settleMs: WATCH_SETTLE_MS, mode: "after-change" });
  }

  if (method === "POST" && pathname === "/api/jobs") {
    const body = await readBody(req);
    const jobs = readJobs();
    const job = normalizeJob(body, null, jobs);
    if (!(await driveAccountReady(job.remote))) {
      return json(res, 400, { error: "Choose a Drive that is already signed in on the Drives screen." });
    }
    jobs.push(job);
    writeJobs(jobs);
    return json(res, 201, { job });
  }

  if (method === "POST" && pathname === "/api/open/local") {
    const body = await readBody(req);
    const target = path.resolve(String(body.path || ""));
    if (!target || !fs.existsSync(target)) return json(res, 404, { error: "path_missing" });
    if (process.platform === "win32") {
      spawn("explorer.exe", [target], { windowsHide: true, stdio: "ignore" });
    }
    return json(res, 200, { ok: true, path: target });
  }

  if (method === "POST" && pathname === "/api/open/remote") {
    const body = await readBody(req);
    const spec = String(body.spec || "").trim();
    if (!/^[A-Za-z0-9_-]+:/.test(spec)) return json(res, 400, { error: "invalid_remote" });
    const linked = await runRclone(["link", spec], { timeoutMs: 30_000 });
    const linkUrl = String(linked.stdout || "")
      .split(/\s+/)
      .find((part) => part.startsWith("https://"));
    if (!linkUrl) {
      return json(res, 502, {
        error: redactOauthLog(linked.stderr || linked.stdout || "link_failed").slice(0, 180),
      });
    }
    return json(res, 200, { ok: true, url: linkUrl });
  }

  const conflictsMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/conflicts(?:\/(resolve))?$/);
  if (conflictsMatch) {
    const jobId = decodeURIComponent(conflictsMatch[1]);
    const subAction = conflictsMatch[2] || null;
    const jobs = readJobs();
    const idx = jobs.findIndex((row) => row.id === jobId);
    if (idx < 0) return json(res, 404, { error: "job_not_found" });
    const job = jobs[idx];
    if (method === "GET" && !subAction) {
      const conflicts = listConflictFiles(job.localPath);
      return json(res, 200, { ok: true, jobId, conflicts });
    }
    if (method === "POST" && subAction === "resolve") {
      const body = await readBody(req);
      const resolved = resolveConflictFile(
        job.localPath,
        body.conflictRelPath,
        body.resolution || "keep-local",
      );
      if (!resolved.ok) return json(res, 400, resolved);
      return json(res, 200, resolved);
    }
  }

  const cleanExcludedMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/clean-excluded$/);
  if (method === "POST" && cleanExcludedMatch) {
    const jobId = decodeURIComponent(cleanExcludedMatch[1]);
    const job = readJobs().find((row) => row.id === jobId);
    if (!job) return json(res, 404, { error: "job_not_found" });
    const body = await readBody(req).catch(() => ({}));
    const dry = body.dry !== false;
    const includeArgs = rcloneIncludeExcludedArgs(job.exclude);
    if (!includeArgs.length) {
      return json(res, 200, { ok: true, dry, count: 0, files: [] });
    }
    const jobNetOpts = { timeoutMs: 90_000, jobNetwork: { proxyUrl: job.proxyUrl } };
    const listed = await runRclone(
      ["lsf", job.remote, "--recursive", "--files-only", ...includeArgs],
      jobNetOpts,
    );
    if (!listed.ok) {
      return json(res, 502, {
        ok: false,
        error: redactOauthLog(listed.stderr || listed.stdout || "list_excluded_failed").slice(0, 180),
      });
    }
    const rawLines = String(listed.stdout || "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const matchedFiles = findExcludedPaths(rawLines, job.exclude);
    if (!dry && matchedFiles.length > 0) {
      const delRes = await runRclone(
        ["delete", job.remote, "--drive-use-trash", ...includeArgs],
        { timeoutMs: 180_000, jobNetwork: { proxyUrl: job.proxyUrl } },
      );
      if (!delRes.ok) {
        return json(res, 502, {
          ok: false,
          error: redactOauthLog(delRes.stderr || delRes.stdout || "clean_excluded_failed").slice(0, 180),
        });
      }
      await runRclone(
        ["rmdirs", job.remote, "--leave-root", "--drive-use-trash"],
        { timeoutMs: 60_000, jobNetwork: { proxyUrl: job.proxyUrl } },
      ).catch(() => undefined);
      const colon = String(job.remote || "").indexOf(":");
      const remoteName = colon >= 0 ? job.remote.slice(0, colon) : job.remote;
      if (remoteName) kickDriveInventory(remoteName, { force: true });
    }
    return json(res, 200, {
      ok: true,
      dry,
      count: matchedFiles.length,
      files: matchedFiles.slice(0, 200),
    });
  }

  const browseMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/browse$/);
  if (method === "GET" && browseMatch) {
    const jobId = decodeURIComponent(browseMatch[1]);
    const job = readJobs().find((row) => row.id === jobId);
    if (!job) return json(res, 404, { error: "job_not_found" });
    const rel = safeRel(url.searchParams.get("path") || "");
    if (rel === null) return json(res, 400, { error: "invalid_path" });
    const local = listLocalEntries(job.localPath, rel);
    const remote = await listDriveEntries(job.remote, rel);
    const colon = String(job.remote || "").indexOf(":");
    const remoteName = colon >= 0 ? job.remote.slice(0, colon) : job.remote;
    const remoteEntries = remote.ok
      ? applyFolderSizes(remoteName, remote.parentPath || "", remote.entries || [])
      : [];
    const mergedRows = mergeBrowseSides(local.entries || [], remoteEntries);
    const excludeTokens = parseExcludeList(job.exclude);
    const visibleRows = [];
    const excludedNames = [];
    for (const row of mergedRows) {
      const rowRel = rel ? `${rel}/${row.name}` : row.name;
      if (excludeTokens.length > 0 && pathMatchesExclude(rowRel, excludeTokens)) {
        excludedNames.push(row.name);
      } else {
        visibleRows.push(row);
      }
    }
    return json(res, 200, {
      ok: Boolean(local.ok && remote.ok),
      path: rel,
      localRoot: job.localPath || "",
      remoteRoot: job.remote || "",
      localMissing: Boolean(local.missing),
      localError: local.error || null,
      remoteError: remote.error || null,
      excludedCount: excludedNames.length,
      excludedNames: excludedNames.slice(0, 15),
      rows: visibleRows,
    });
  }

  const jobLogsMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/logs$/);
  if (method === "GET" && jobLogsMatch) {
    const jobId = decodeURIComponent(jobLogsMatch[1]);
    const rawJob = readJobs().find((row) => row.id === jobId);
    if (!rawJob) return json(res, 404, { error: "job_not_found" });
    const hydrated = attachLiveOutputToJob(rawJob);
    return json(res, 200, {
      ok: true,
      jobId: hydrated.id,
      status: hydrated.status,
      liveProgress: hydrated.liveProgress || null,
      stdout: hydrated.lastResult?.stdout || "",
      stderr: hydrated.lastResult?.stderr || "",
      activityLog: hydrated.activityLog || [],
    });
  }

  const jobMatch = pathname.match(/^\/api\/jobs\/([^/]+)(?:\/(analyze|sync|start|stop|restore))?$/);
  if (jobMatch) {
    const jobId = decodeURIComponent(jobMatch[1]);
    let action = jobMatch[2] || null;
    if (action === "start") action = "sync";
    const jobs = readJobs();
    const idx = jobs.findIndex((j) => j.id === jobId);
    if (idx < 0) return json(res, 404, { error: "job_not_found" });

    if (method === "GET" && !action) {
      return json(res, 200, { job: attachLiveOutputToJob(jobs[idx]) });
    }
    if (method === "PUT" && !action) {
      const body = await readBody(req);
      jobs[idx] = normalizeJob(body, jobs[idx], jobs);
      writeJobs(jobs);
      return json(res, 200, { job: jobs[idx] });
    }
    if (method === "DELETE" && !action) {
      if (url.searchParams.get("forever") === "1") {
        const [removed] = jobs.splice(idx, 1);
        writeJobs(jobs);
        return json(res, 200, { removed });
      }
      stopJob(jobId);
      jobs[idx] = {
        ...jobs[idx],
        status: "stopped",
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      writeJobs(jobs);
      return json(res, 200, { removed: jobs[idx], trashed: true });
    }
    if (method === "POST" && action === "restore") {
      jobs[idx] = { ...jobs[idx], deletedAt: null, updatedAt: new Date().toISOString() };
      writeJobs(jobs);
      return json(res, 200, { job: jobs[idx] });
    }
    if (method === "POST" && action === "stop") {
      const stopped = stopJob(jobId);
      if (stopped.ok) {
        jobs[idx] = {
          ...jobs[idx],
          status: "stopped",
          updatedAt: new Date().toISOString(),
          lastResult: {
            ...(jobs[idx].lastResult || {}),
            action: "stop",
            ok: true,
            stderr: "stopped by user",
          },
        };
        writeJobs(jobs);
      }
      return json(res, stopped.ok ? 200 : 409, { ...stopped, job: jobs[idx] });
    }
    if (method === "POST" && (action === "analyze" || action === "sync")) {
      const out = await runJobAction(jobs, idx, action);
      return json(res, out.status, out.body);
    }
  }

  if (method === "GET" && tryServeDist(req, pathname, res)) return;

  return json(res, 404, { ok: false, error: "not_found", path: pathname });
}

const syncing = new Set();

async function syncWatchedJob(jobId) {
  if (syncing.has(jobId)) return;
  const jobs = readJobs();
  const idx = jobs.findIndex((row) => row.id === jobId);
  if (idx < 0) return;
  const job = jobs[idx];
  if (job.status === "running" || job.status === "analyzing") return;
  syncing.add(jobId);
  try {
    await runJobAction(jobs, idx, "sync");
  } finally {
    syncing.delete(jobId);
  }
}

function sendSseEvent(res, eventName, payload) {
  try {
    res.write(`event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`);
  } catch {
    sseClients.delete(res);
  }
}

function broadcastJobsSnapshot(reason = "update") {
  if (sseBroadcastTimer) {
    clearTimeout(sseBroadcastTimer);
    sseBroadcastTimer = null;
  }
  if (sseClients.size === 0) return;
  const payload = {
    reason,
    at: new Date().toISOString(),
    jobs: jobsForClient(),
  };
  for (const client of sseClients) {
    sendSseEvent(client, "jobs", payload);
  }
}

function scheduleBroadcastJobs(reason = "live", delayMs = 120) {
  if (sseClients.size === 0) return;
  if (sseBroadcastTimer) return;
  sseBroadcastTimer = setTimeout(() => {
    sseBroadcastTimer = null;
    broadcastJobsSnapshot(reason);
  }, delayMs);
  if (typeof sseBroadcastTimer.unref === "function") sseBroadcastTimer.unref();
}

subscribeLiveJobOutput((jobId, state) => {
  if (sseClients.size === 0) return;
  if (!state) {
    broadcastJobsSnapshot("job-finished");
    return;
  }
  scheduleBroadcastJobs(`job-output:${jobId}`, 120);
});

function setNextSync(jobId, iso) {
  if (!jobId) return;
  const prev = nextSyncAt.get(jobId) || null;
  const next = iso || null;
  if (prev === next) return;
  if (!next) nextSyncAt.delete(jobId);
  else nextSyncAt.set(jobId, next);
  broadcastJobsSnapshot("armed");
}

function attachLiveOutputToJob(job) {
  const live = liveJobOutput.get(job.id);
  const base = {
    ...job,
    nextSyncAt: nextSyncAt.get(job.id) || null,
    liveProgress: live?.progress || null,
  };
  if (!live) return base;
  return {
    ...base,
    lastResult: {
      ...(base.lastResult || {}),
      action: base.status === "analyzing" ? "analyze" : "sync",
      stdout: live.stdout || base.lastResult?.stdout || "",
      stderr: live.stderr || base.lastResult?.stderr || "",
    },
  };
}

function jobsForClient() {
  return readJobs().map(attachLiveOutputToJob);
}

const remotePollInflight = new Map();
const remotePollCache = new Map();
const REMOTE_POLL_CACHE_TTL_MS = 90_000;
let remotePollSerialChain = Promise.resolve();

async function listRemoteFiles(remote, excludeText) {
  const upSec = typeof os.uptime === "function" ? os.uptime() : 999;
  if (upSec < 180 && process.env.DESK_SKIP_BOOT_COOLDOWN !== "1") {
    // Return immediately during the 3-minute post-reboot grace window instead of queueing
    // delayed rclone lsjson timers that burst back-to-back once uptime hits 180s.
    return null;
  }
  const key = `${String(remote || "").trim()}\t${String(excludeText ?? "")}`;
  const cached = remotePollCache.get(key);
  if (cached && Date.now() - cached.at < REMOTE_POLL_CACHE_TTL_MS) {
    return cached.entries;
  }
  if (remotePollInflight.has(key)) return remotePollInflight.get(key);
  const task = (async () => {
    const prev = remotePollSerialChain;
    let releaseSerial;
    remotePollSerialChain = new Promise((r) => {
      releaseSerial = r;
    });
    await prev.catch(() => undefined);
    try {
      const freshCached = remotePollCache.get(key);
      if (freshCached && Date.now() - freshCached.at < REMOTE_POLL_CACHE_TTL_MS) {
        return freshCached.entries;
      }
      const remoteName = String(remote || "")
        .split(":")[0]
        .replace(/:$/, "")
        .trim();
      if (remoteName && inventoryScanning(remoteName)) return null;
      const listed = await runRclone(
        ["lsjson", remote, "--recursive", "--files-only", ...rcloneExcludeArgs(excludeText)],
        { timeoutMs: 45_000 },
      );
      if (!listed.ok) return null;
      const rows = JSON.parse(listed.stdout || "[]");
      if (!Array.isArray(rows)) return null;
      const entries = rows.map((row) => ({
        path: String(row?.Path || row?.Name || ""),
        size: Number(row?.Size ?? 0),
        modTime: String(row?.ModTime || ""),
      }));
      remotePollCache.set(key, { at: Date.now(), entries });
      return entries;
    } catch {
      return null;
    } finally {
      remotePollInflight.delete(key);
      if (typeof releaseSerial === "function") releaseSerial();
    }
  })();
  remotePollInflight.set(key, task);
  return task;
}

export function createServer() {
  return http.createServer((req, res) => {
    handle(req, res).catch((err) => {
      json(res, 500, { ok: false, error: "internal", message: String(err?.message || err) });
    });
  });
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  ensureSampleSeed();
  ensureData();
  recoverStuckJobsOnBoot();
  if (devUiRedirectEnabled()) {
    const pullDevUi = () => {
      refreshDevUi().then((up) => {
        devUiUp = up;
      });
    };
    pullDevUi();
    const devUiTimer = setInterval(pullDevUi, 3000);
    if (typeof devUiTimer.unref === "function") devUiTimer.unref();
  }
  const server = createServer();
  server.listen(PORT, HOST, () => {
    console.log(`[desk-host] http://${HOST}:${PORT} (desk=${dataRoot()} · sync=${DATA_ROOT})`);
    startClipboardWatch();
    startAutoPcMaintenanceWatch();
    startCustomDaemonCronTimer();
    startRunnerWatchdog();
    startProxyHealthMonitor();
    startJobWatchers({ readJobs, runSync: syncWatchedJob, onArmed: setNextSync });
    startDrivePoll({ readJobs, listRemote: listRemoteFiles, runSync: syncWatchedJob, onArmed: setNextSync });
    void captureAndPersistTelemetrySnapshot({ force: true }).catch(() => undefined);
    const telemetryTimer = setInterval(() => {
      void captureAndPersistTelemetrySnapshot({ force: true }).catch(() => undefined);
    }, 15 * 60 * 1000);
    if (typeof telemetryTimer.unref === "function") telemetryTimer.unref();
  });
  if (PORT === 6010 && process.env.DESK_DISABLE_COMPAT_PORT !== "1") {
    const compatServer = createServer();
    compatServer.on("error", () => {
      /* :6009 optional compat listener */
    });
    compatServer.listen(6009, HOST);
  }
}
