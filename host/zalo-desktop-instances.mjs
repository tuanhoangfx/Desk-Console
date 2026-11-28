/**
 * P0001 Desk Console — Multi-Instance Zalo Desktop Inspector, Sync & Launcher.
 * Scans Primary (%LOCALAPPDATA%\Programs\Zalo) and Portable Multi-Instance folders (D:\Apps Data\Zalo\*),
 * detects outdated/broken builds (e.g. 26.8.10 blocked by "Yeu cau cap nhat ung dung"),
 * verifies app.asar SHA1 against update_meta.json, and repairs/syncs from the newest verified build.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { promisify } from "node:util";
import { DEV_ROOT } from "./windows.mjs";

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);

export const DEFAULT_ZALO_PORTABLE_ROOT = "D:\\Apps Data\\Zalo";
export const ZALO_EXCLUDED_FALLBACK_VERSIONS = new Set(["27.12.31"]);
export const ZALO_AUTO_CACHE_CLEAN_THRESHOLD_BYTES = 300 * 1024 * 1024;
export const ZALO_ON_LAUNCH_CACHE_CLEAN_THRESHOLD_BYTES = 500 * 1024 * 1024;
export const ZALO_AUTO_OFFLOAD_THRESHOLD_BYTES = Math.round(1.5 * 1024 * 1024 * 1024);
export const ZALO_SAFE_CACHE_SUBDIRS = [
  "Cache",
  "GPUCache",
  "Code Cache",
  "DawnCache",
  "DawnGraphiteCache",
  "DawnWebGPUCache",
  "Partitions/zalo/Cache",
  "Partitions/zalo/GPUCache",
  "Partitions/zalo/Code Cache",
  "Partitions/zalo/DawnCache",
  "Partitions/zalo/DawnGraphiteCache",
  "Partitions/zalo/DawnWebGPUCache",
  "media/temp",
  "media/update",
];

const ZALO_ACCOUNT_DISPLAY_MAP = {
  czp: "Hoàng Anh Tuấn",
  pc02: "Infi Open",
  pc03: "Tuấn Hoàng",
  pc04: "Thái Nguyễn Infi",
  pc05: "Hoàng Anh",
  pc06: "UID 612908225723997231",
};

function readCustomZaloAccountMap() {
  try {
    const candidates = [
      process.env.P0001_ZALO_ACCOUNT_LABELS_PATH,
      path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "desk-console", "zalo-account-labels.json"),
    ].filter(Boolean);
    for (const p of candidates) {
      if (!fs.existsSync(p)) continue;
      const raw = JSON.parse(fs.readFileSync(p, "utf8"));
      if (raw && typeof raw === "object") return raw;
    }
  } catch {
    /* ignore */
  }
  return null;
}

let cachedZaloProcList = { ts: 0, rows: [] };
let cachedDesktopProcStats = { ts: 0, rows: [] };
let koffiProcApi = null;
let koffiProcInitTried = false;
const dirSizeCache = new Map();
const zaloDataStatsCache = new Map();
let savedCredCache = { ts: 0, users: new Set() };
let lastZaloFleetAutoSyncAt = 0;

export function formatZaloAccountLabel(winUser) {
  const user = String(winUser || "").trim();
  if (!user) return "";
  const custom = readCustomZaloAccountMap();
  const customVal = custom && (custom[user] || custom[user.toLowerCase()]);
  const mapped = (typeof customVal === "string" && customVal.trim()) || ZALO_ACCOUNT_DISPLAY_MAP[user.toLowerCase()];
  return mapped ? `${mapped} (${user})` : user;
}

export function formatBytes(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n >= 1024 * 1024 * 1024) return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (n >= 1024 * 1024) return `${Math.round(n / (1024 * 1024))} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}

function sumDirectoryBytesSync(dirPath, maxDepth = 8) {
  let total = 0;
  const stack = [{ dir: dirPath, depth: 0 }];
  while (stack.length > 0) {
    const { dir, depth } = stack.pop();
    if (depth > maxDepth) continue;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      try {
        if (ent.isSymbolicLink()) continue;
        if (ent.isDirectory()) {
          stack.push({ dir: full, depth: depth + 1 });
        } else if (ent.isFile()) {
          total += fs.statSync(full).size;
        }
      } catch {
        /* ignore */
      }
    }
  }
  return total;
}

export function measureDirectorySizeCached(dirPath, { ttlMs = 120_000, force = false, syncCompute = true } = {}) {
  if (!dirPath || !fs.existsSync(dirPath)) return 0;
  const key = path.resolve(dirPath).toLowerCase();
  const now = Date.now();
  const hit = dirSizeCache.get(key);
  if (!force && hit && now - hit.ts < ttlMs) return hit.bytes;
  if (!syncCompute) return hit?.bytes ?? 0;
  const bytes = sumDirectoryBytesSync(dirPath);
  dirSizeCache.set(key, { ts: now, bytes });
  return bytes;
}

function withNoAsarSync(fn) {
  const prev = process.noAsar;
  process.noAsar = true;
  try {
    return fn();
  } finally {
    process.noAsar = prev;
  }
}

async function withNoAsarAsync(fn) {
  const prev = process.noAsar;
  process.noAsar = true;
  try {
    return await fn();
  } finally {
    process.noAsar = prev;
  }
}

async function sumDirectoryBytesAsync(dirPath, maxDepth = 8) {
  return withNoAsarAsync(async () => {
    let total = 0;
    const stack = [{ dir: dirPath, depth: 0 }];
    while (stack.length > 0) {
      const { dir, depth } = stack.pop();
      if (depth > maxDepth) continue;
      let entries;
      try {
        entries = await fs.promises.readdir(dir, { withFileTypes: true });
      } catch {
        continue;
      }
      const fileStats = [];
      for (const ent of entries) {
        const full = path.join(dir, ent.name);
        try {
          if (ent.isSymbolicLink()) continue;
          if (ent.isDirectory()) {
            stack.push({ dir: full, depth: depth + 1 });
          } else if (ent.isFile()) {
            fileStats.push(fs.promises.stat(full).then((st) => st.size).catch(() => 0));
          }
        } catch {
          /* ignore */
        }
      }
      if (fileStats.length > 0) {
        const sizes = await Promise.all(fileStats);
        for (const s of sizes) total += s;
      }
    }
    return total;
  });
}

let activeSizeWarm = null;
const pendingSizeDirs = new Set();
const queuedWarmCallbacks = new Set();

export function scheduleDirectorySizeWarm(dirPaths = [], { ttlMs = 120_000, concurrency = 4, onComplete = null } = {}) {
  const now = Date.now();
  for (const raw of dirPaths) {
    if (!raw) continue;
    const resolved = path.resolve(raw);
    const hit = dirSizeCache.get(resolved.toLowerCase());
    if (!hit || now - hit.ts >= ttlMs) {
      pendingSizeDirs.add(resolved);
    }
  }
  if (typeof onComplete === "function") queuedWarmCallbacks.add(onComplete);
  if (activeSizeWarm) return activeSizeWarm;
  if (pendingSizeDirs.size === 0) return Promise.resolve(false);

  activeSizeWarm = (async () => {
    let updatedAny = false;
    try {
      const nextDir = () => {
        const first = pendingSizeDirs.values().next();
        if (first.done) return null;
        pendingSizeDirs.delete(first.value);
        return first.value;
      };
      const worker = async () => {
        while (true) {
          const d = nextDir();
          if (!d) break;
          if (!fs.existsSync(d)) continue;
          const bytes = await sumDirectoryBytesAsync(d);
          dirSizeCache.set(d.toLowerCase(), { ts: Date.now(), bytes });
          updatedAny = true;
        }
      };
      const count = Math.min(Math.max(1, concurrency), Math.max(1, pendingSizeDirs.size));
      await Promise.all(Array.from({ length: count }, () => worker()));
      if (updatedAny) {
        for (const cb of queuedWarmCallbacks) {
          try {
            cb(updatedAny);
          } catch {
            /* ignore */
          }
        }
      }
    } finally {
      queuedWarmCallbacks.clear();
      activeSizeWarm = null;
      if (pendingSizeDirs.size > 0) {
        void scheduleDirectorySizeWarm([], { ttlMs, concurrency });
      }
    }
    return updatedAny;
  })();
  return activeSizeWarm;
}

function resolveZaloDataDirForUser(winUser, currentWinUser) {
  const user = String(winUser || currentWinUser || "").trim();
  if (!user) return null;
  if (user.toLowerCase() === String(currentWinUser || "").toLowerCase()) {
    const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
    return path.join(appData, "ZaloData");
  }
  const sysDrive = process.env.SystemDrive || "C:";
  return path.join(sysDrive, "Users", user, "AppData", "Roaming", "ZaloData");
}

async function countDirectoryFilesAndBytesAsync(rootDir, maxDepth = 10) {
  if (!rootDir || !fs.existsSync(rootDir)) return { files: 0, bytes: 0 };
  let files = 0;
  let bytes = 0;
  const stack = [{ dir: rootDir, depth: 0 }];
  while (stack.length > 0) {
    const { dir, depth } = stack.pop();
    if (depth > maxDepth) continue;
    let entries;
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    const fileStats = [];
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      try {
        if (ent.isSymbolicLink()) continue;
        if (ent.isDirectory()) {
          stack.push({ dir: full, depth: depth + 1 });
        } else if (ent.isFile()) {
          files += 1;
          fileStats.push(fs.promises.stat(full).then((st) => st.size).catch(() => 0));
        }
      } catch {
        /* ignore */
      }
    }
    if (fileStats.length > 0) {
      const sizes = await Promise.all(fileStats);
      for (const s of sizes) bytes += s;
    }
  }
  return { files, bytes };
}

function detectZaloDataJunctionsSync(dataDir) {
  const empty = {
    media: { linked: false, target: null, bytes: 0, label: "" },
    database: { linked: false, target: null, bytes: 0, label: "" },
  };
  if (!dataDir || !fs.existsSync(dataDir)) return empty;
  const inspectOne = (folderName) => {
    const subPath = path.join(dataDir, folderName);
    try {
      const lst = fs.lstatSync(subPath);
      if (lst.isSymbolicLink()) {
        const rawTarget = fs.readlinkSync(subPath);
        const resolved = path.resolve(dataDir, rawTarget);
        return { linked: true, target: resolved, bytes: 0, label: "" };
      }
    } catch {
      /* ignore missing */
    }
    return { linked: false, target: null, bytes: 0, label: "" };
  };
  return {
    media: inspectOne("media"),
    database: inspectOne("Database"),
  };
}

function scheduleZaloDataStatsWarm(dataDirs = [], { ttlMs = 180_000 } = {}) {
  const now = Date.now();
  const stale = [...new Set(dataDirs.filter(Boolean))].filter((d) => {
    const hit = zaloDataStatsCache.get(path.resolve(d).toLowerCase());
    return !hit || now - hit.ts >= ttlMs;
  });
  if (stale.length === 0) return;
  void (async () => {
    for (const d of stale) {
      const key = path.resolve(d).toLowerCase();
      try {
        if (!fs.existsSync(d)) {
          zaloDataStatsCache.set(key, {
            ts: Date.now(),
            accessible: false,
            totalBytes: 0,
            onCBytes: 0,
            onDBytes: 0,
            cacheBytes: 0,
            junctions: detectZaloDataJunctionsSync(d),
          });
          continue;
        }
        // sumDirectoryBytesAsync skips symlinks/junctions, so onCBytes measures only physical C: files
        const onCBytes = await sumDirectoryBytesAsync(d, 6);
        const junctions = detectZaloDataJunctionsSync(d);
        let onDBytes = 0;
        for (const [metaKey, folderName] of [
          ["media", "media"],
          ["database", "Database"],
        ]) {
          const info = junctions[metaKey];
          const measureDir = info.linked ? info.target : path.join(d, folderName);
          if (measureDir && fs.existsSync(measureDir)) {
            const subBytes = await sumDirectoryBytesAsync(measureDir, 6);
            info.bytes = subBytes;
            info.label = formatBytes(subBytes);
            if (info.linked) {
              onDBytes += subBytes;
            }
          }
        }
        const totalBytes = onCBytes + onDBytes;
        let cacheBytes = 0;
        for (const rel of ZALO_SAFE_CACHE_SUBDIRS) {
          const subPath = path.join(d, ...rel.split("/"));
          if (fs.existsSync(subPath)) {
            cacheBytes += await sumDirectoryBytesAsync(subPath, 6);
          }
        }
        zaloDataStatsCache.set(key, {
          ts: Date.now(),
          accessible: true,
          totalBytes,
          onCBytes,
          onDBytes,
          cacheBytes,
          junctions,
        });
      } catch {
        zaloDataStatsCache.set(key, {
          ts: Date.now(),
          accessible: false,
          totalBytes: 0,
          onCBytes: 0,
          onDBytes: 0,
          cacheBytes: 0,
          junctions: detectZaloDataJunctionsSync(d),
        });
      }
    }
  })();
}

function zaloRemoteStatsFilePath() {
  const override = process.env.P0001_ZALO_REMOTE_STATS_PATH;
  if (override) return override;
  const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
  return path.join(appData, "desk-console", "zalo-remote-stats.json");
}

function writeJsonDurableSync(filePath, data) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const payload = JSON.stringify(data, null, 2);
  const fd = fs.openSync(tmpPath, "w");
  try {
    fs.writeSync(fd, payload, 0, "utf8");
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmpPath, filePath);
}

function loadPersistedRemoteStatsMap() {
  try {
    const p = zaloRemoteStatsFilePath();
    if (!fs.existsSync(p)) return {};
    const parsed = JSON.parse(fs.readFileSync(p, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function readPersistedZaloDaemonMeta() {
  const map = loadPersistedRemoteStatsMap();
  const meta = map?._meta;
  return meta && typeof meta === "object" ? meta : {};
}

function savePersistedZaloDaemonMeta(patch) {
  if (!patch || typeof patch !== "object") return;
  try {
    const p = zaloRemoteStatsFilePath();
    const cur = loadPersistedRemoteStatsMap();
    const prevMeta = cur._meta && typeof cur._meta === "object" ? cur._meta : {};
    cur._meta = { ...prevMeta, ...patch, updatedAt: new Date().toISOString() };
    writeJsonDurableSync(p, cur);
  } catch {
    /* non-fatal daemon meta persistence */
  }
}

function savePersistedRemoteStatsEntry(winUser, statsEntry) {
  if (!winUser || !statsEntry || String(winUser) === "_meta") return;
  try {
    const p = zaloRemoteStatsFilePath();
    const cur = loadPersistedRemoteStatsMap();
    cur[String(winUser).toLowerCase()] = { ...statsEntry, updatedAt: new Date().toISOString() };
    writeJsonDurableSync(p, cur);
  } catch {
    /* non-fatal stats persistence */
  }
}

export function buildHeadlessPowerShellCommandForRunas(psArgsSuffix, { conhostPath = null } = {}) {
  const sysRoot = process.env.SystemRoot || "C:\\Windows";
  const resolvedConhost = conhostPath || path.win32.join(sysRoot, "System32", "conhost.exe");
  const basePs = `powershell.exe -NoProfile -NonInteractive -WindowStyle Hidden ${String(psArgsSuffix || "").trim()}`;
  if (process.platform === "win32" && fs.existsSync(resolvedConhost)) {
    return `"${resolvedConhost}" --headless ${basePs}`;
  }
  return basePs;
}

function readZaloDataStatsCached(dataPath, allowSchedule = true, winUser = null) {
  if (!dataPath) {
    return {
      accessible: false,
      totalBytes: 0,
      onCBytes: 0,
      onDBytes: 0,
      cacheBytes: 0,
      junctions: detectZaloDataJunctionsSync(null),
    };
  }
  const key = path.resolve(dataPath).toLowerCase();
  const hit = zaloDataStatsCache.get(key);
  if (allowSchedule && (!hit || Date.now() - hit.ts >= 180_000)) {
    scheduleZaloDataStatsWarm([dataPath]);
  }
  if (hit) return hit;
  if (!allowSchedule && winUser) {
    const remoteAll = loadPersistedRemoteStatsMap();
    const remoteHit = remoteAll[String(winUser).toLowerCase()];
    if (remoteHit && typeof remoteHit === "object") {
      return {
        accessible: true,
        remoteProbed: true,
        totalBytes: Number(remoteHit.totalBytes) || 0,
        onCBytes: Number(remoteHit.onCBytes) || 0,
        onDBytes: Number(remoteHit.onDBytes) || 0,
        cacheBytes: Number(remoteHit.cacheBytes) || 0,
        junctions: remoteHit.junctions || detectZaloDataJunctionsSync(null),
      };
    }
  }
  return {
    accessible: allowSchedule && fs.existsSync(dataPath),
    totalBytes: 0,
    onCBytes: 0,
    onDBytes: 0,
    cacheBytes: 0,
    junctions: allowSchedule ? detectZaloDataJunctionsSync(dataPath) : detectZaloDataJunctionsSync(null),
  };
}

export async function refreshSavedCredCacheAsync({ ttlMs = 60_000, force = false } = {}) {
  if (process.platform !== "win32") return savedCredCache.users;
  const now = Date.now();
  if (!force && now - savedCredCache.ts < ttlMs) return savedCredCache.users;
  try {
    const { stdout } = await execFileAsync("cmdkey.exe", ["/list"], { windowsHide: true, timeout: 5000 });
    const users = new Set();
    for (const line of String(stdout || "").split(/\r?\n/)) {
      const m = line.match(/User:\s*(?:[^\\]+\\)?([^\s\\]+)\s*$/i) || line.match(/interactive=[^\\]+\\([^\s]+)/i);
      if (m?.[1]) users.add(m[1].trim().toLowerCase());
    }
    savedCredCache = { ts: now, users };
  } catch {
    /* keep previous cache */
  }
  return savedCredCache.users;
}

function getKoffiProcessApi() {
  if (koffiProcInitTried) return koffiProcApi;
  koffiProcInitTried = true;
  if (process.platform !== "win32") return null;
  try {
    const koffi = require("koffi");
    const kernel32 = koffi.load("kernel32.dll");
    const PROCESSENTRY32W = koffi.struct("ZALO_DESK_PROCESSENTRY32W", {
      dwSize: "uint32_t",
      cntUsage: "uint32_t",
      th32ProcessID: "uint32_t",
      th32DefaultHeapID: "uintptr_t",
      th32ModuleID: "uint32_t",
      cntThreads: "uint32_t",
      th32ParentProcessID: "uint32_t",
      pcPriClassBase: "int32_t",
      dwFlags: "uint32_t",
      szExeFile: koffi.array("uint16_t", 260, "Array"),
    });
    const PROCESS_MEMORY_COUNTERS = koffi.struct("ZALO_DESK_PROCESS_MEMORY_COUNTERS", {
      cb: "uint32_t",
      PageFaultCount: "uint32_t",
      PeakWorkingSetSize: "size_t",
      WorkingSetSize: "size_t",
      QuotaPeakPagedPoolUsage: "size_t",
      QuotaPagedPoolUsage: "size_t",
      QuotaPeakNonPagedPoolUsage: "size_t",
      QuotaNonPagedPoolUsage: "size_t",
      PagefileUsage: "size_t",
      PeakPagefileUsage: "size_t",
    });
    const pmcSize = koffi.sizeof(PROCESS_MEMORY_COUNTERS);
    koffiProcApi = {
      _lib: kernel32,
      koffi,
      PROCESSENTRY32W,
      PROCESS_MEMORY_COUNTERS,
      pmcSize,
      CreateToolhelp32Snapshot: kernel32.func(
        "void* __stdcall CreateToolhelp32Snapshot(uint32_t dwFlags, uint32_t th32ProcessID)",
      ),
      Process32FirstW: kernel32.func(
        "bool __stdcall Process32FirstW(void* hSnapshot, _Inout_ ZALO_DESK_PROCESSENTRY32W* lppe)",
      ),
      Process32NextW: kernel32.func(
        "bool __stdcall Process32NextW(void* hSnapshot, _Inout_ ZALO_DESK_PROCESSENTRY32W* lppe)",
      ),
      OpenProcess: kernel32.func(
        "void* __stdcall OpenProcess(uint32_t dwDesiredAccess, bool bInheritHandle, uint32_t dwProcessId)",
      ),
      QueryFullProcessImageNameW: kernel32.func(
        "bool __stdcall QueryFullProcessImageNameW(void* hProcess, uint32_t dwFlags, _Out_ uint16_t* lpExeName, _Inout_ uint32_t* lpdwSize)",
      ),
      K32GetProcessMemoryInfo: kernel32.func(
        "bool __stdcall K32GetProcessMemoryInfo(void* hProcess, _Out_ ZALO_DESK_PROCESS_MEMORY_COUNTERS* ppsmemCounters, uint32_t cb)",
      ),
      CloseHandle: kernel32.func("bool __stdcall CloseHandle(void* hObject)"),
    };
  } catch {
    koffiProcApi = null;
  }
  return koffiProcApi;
}

function decodeUtf16ZeroTerminated(arr) {
  let out = "";
  for (let i = 0; i < arr.length; i += 1) {
    const code = arr[i];
    if (!code) break;
    out += String.fromCharCode(code);
  }
  return out;
}

function probeProcessImageAndMemory(api, pid) {
  let exePath = "";
  let workingSetBytes = 0;
  const h = api.OpenProcess(0x1000 | 0x0400, false, pid);
  if (!h) return { exePath, workingSetBytes };
  try {
    const buf = new Uint16Array(520);
    const sizePtr = [buf.length];
    if (api.QueryFullProcessImageNameW(h, 0, buf, sizePtr)) {
      exePath = decodeUtf16ZeroTerminated(buf.subarray(0, sizePtr[0]));
    }
    if (api.K32GetProcessMemoryInfo && api.pmcSize) {
      const mem = {
        cb: api.pmcSize,
        PageFaultCount: 0,
        PeakWorkingSetSize: 0,
        WorkingSetSize: 0,
        QuotaPeakPagedPoolUsage: 0,
        QuotaPagedPoolUsage: 0,
        QuotaPeakNonPagedPoolUsage: 0,
        QuotaNonPagedPoolUsage: 0,
        PagefileUsage: 0,
        PeakPagefileUsage: 0,
      };
      if (api.K32GetProcessMemoryInfo(h, mem, api.pmcSize)) {
        const ws = Number(mem.WorkingSetSize);
        if (Number.isFinite(ws) && ws > 0) workingSetBytes = ws;
      }
    }
  } catch {
    /* ignore */
  } finally {
    api.CloseHandle(h);
  }
  return { exePath, workingSetBytes };
}

/**
 * Single Win32 Toolhelp32 scan (~12ms) for Zalo, Antigravity, Cursor & Claude Code processes
 * including full exePath and native WorkingSet RAM bytes (zero shell spawns).
 */
export function listDesktopProcessStatsFast({ force = false } = {}) {
  if (process.platform !== "win32") return [];
  const now = Date.now();
  if (!force && now - cachedDesktopProcStats.ts < 8000) {
    return cachedDesktopProcStats.rows;
  }
  const api = getKoffiProcessApi();
  if (!api) return cachedDesktopProcStats.rows;

  const snap = api.CreateToolhelp32Snapshot(0x00000002, 0);
  if (!snap) return cachedDesktopProcStats.rows;

  const rows = [];
  const entry = {
    dwSize: api.koffi.sizeof(api.PROCESSENTRY32W),
    cntUsage: 0,
    th32ProcessID: 0,
    th32DefaultHeapID: 0,
    th32ModuleID: 0,
    cntThreads: 0,
    th32ParentProcessID: 0,
    pcPriClassBase: 0,
    dwFlags: 0,
    szExeFile: new Array(260).fill(0),
  };

  try {
    if (api.Process32FirstW(snap, entry)) {
      do {
        const exeName = decodeUtf16ZeroTerminated(entry.szExeFile);
        if (/^(zalo(cap|call|attest)?|antigravity|cursor|claude)\.exe$/i.test(exeName)) {
          const { exePath, workingSetBytes } = probeProcessImageAndMemory(api, entry.th32ProcessID);
          rows.push({
            pid: entry.th32ProcessID,
            name: exeName,
            exePath,
            workingSetBytes,
          });
        }
      } while (api.Process32NextW(snap, entry));
    }
  } catch {
    /* ignore */
  } finally {
    api.CloseHandle(snap);
  }

  cachedDesktopProcStats = { ts: now, rows };
  cachedZaloProcList = {
    ts: now,
    rows: rows.filter((r) => /^zalo(cap|call|attest)?\.exe$/i.test(r.name)),
  };
  return rows;
}

/**
 * Lists running Zalo processes (`Zalo.exe`, `ZaloCap.exe`, `ZaloCall.exe`, `ZaloAttest.exe`)
 * natively via Win32 Toolhelp32 + QueryFullProcessImageNameW with an 8s cache (zero shell spawns).
 */
export function listRunningZaloProcessesFast({ force = false } = {}) {
  if (process.platform !== "win32") return [];
  const now = Date.now();
  if (!force && now - cachedZaloProcList.ts < 8000) {
    return cachedZaloProcList.rows;
  }
  listDesktopProcessStatsFast({ force });
  return cachedZaloProcList.rows;
}

export function compareZaloVersions(a, b) {
  const pa = String(a || "").split(".").map((n) => Number.parseInt(n, 10) || 0);
  const pb = String(b || "").split(".").map((n) => Number.parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length, 3);
  for (let i = 0; i < len; i += 1) {
    const va = pa[i] || 0;
    const vb = pb[i] || 0;
    if (va !== vb) return va - vb;
  }
  return 0;
}

function sha1File(filePath) {
  return withNoAsarSync(() => {
    const h = crypto.createHash("sha1");
    h.update(fs.readFileSync(filePath));
    return h.digest("hex").toLowerCase();
  });
}

function statIso(targetPath, fallbackIso) {
  try {
    if (targetPath && fs.existsSync(targetPath)) {
      const st = fs.statSync(targetPath);
      const ts = st.mtimeMs > 0 ? st.mtimeMs : st.birthtimeMs;
      if (Number.isFinite(ts) && ts > 0) return new Date(ts).toISOString();
    }
  } catch {
    /* ignore */
  }
  return fallbackIso;
}

function statCreatedIso(targetPath, fallbackIso) {
  try {
    if (targetPath && fs.existsSync(targetPath)) {
      const st = fs.statSync(targetPath);
      const ts = st.birthtimeMs > 0 ? st.birthtimeMs : st.mtimeMs;
      if (Number.isFinite(ts) && ts > 0) return new Date(ts).toISOString();
    }
  } catch {
    /* ignore */
  }
  return fallbackIso;
}

function readUpdateMetaExpectedSha1(verDir) {
  try {
    const metaPath = path.join(verDir, "update_meta.json");
    if (!fs.existsSync(metaPath)) return null;
    const parsed = JSON.parse(fs.readFileSync(metaPath, "utf8"));
    const verify = Array.isArray(parsed?.verify) ? parsed.verify : [];
    const asarEntry = verify.find((v) => /app\.asar$/i.test(String(v?.file || "")));
    return asarEntry?.sha1 ? String(asarEntry.sha1).trim().toLowerCase() : null;
  } catch {
    return null;
  }
}

function inferWinUserFromFolder(folderName, currentWinUser) {
  const m = String(folderName || "").match(/^zalo\s+(\d{2,})$/i);
  if (m) return `PC${m[1]}`;
  return currentWinUser;
}

function buildInstanceSlug(folderName) {
  return String(folderName || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function resolveShortcutPaths(shortcutName, currentWinUser) {
  const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
  const userProfile = process.env.USERPROFILE || os.homedir();
  const startMenuPath = path.join(appData, "Microsoft", "Windows", "Start Menu", "Programs", `${shortcutName}.lnk`);
  const desktopPath = path.join(userProfile, "Desktop", `${shortcutName}.lnk`);
  return { startMenuPath, desktopPath, currentWinUser };
}

function inspectSingleZaloDirectory({
  id,
  name,
  folderName,
  shortcutName,
  dirPath,
  winUser,
  currentWinUser,
  kind,
  runningProcesses,
  checkedAt,
  verifyChecksum = false,
  measureSize = true,
}) {
  const installed = fs.existsSync(dirPath) && fs.existsSync(path.join(dirPath, "Zalo.exe"));
  let versionDirs = [];
  try {
    if (fs.existsSync(dirPath)) {
      versionDirs = fs
        .readdirSync(dirPath, { withFileTypes: true })
        .filter((d) => d.isDirectory() && /^zalo-(\d+\.\d+\.\d+)$/i.test(d.name))
        .map((d) => ({
          dirName: d.name,
          version: d.name.replace(/^zalo-/i, ""),
        }))
        .sort((a, b) => compareZaloVersions(b.version, a.version));
    }
  } catch {
    versionDirs = [];
  }

  const nonFallback = versionDirs.filter((v) => !ZALO_EXCLUDED_FALLBACK_VERSIONS.has(v.version));
  const activeEntry = nonFallback[0] || versionDirs[0] || null;
  const activeVersion = activeEntry ? activeEntry.version : null;
  const activeVerDir = activeEntry ? path.join(dirPath, activeEntry.dirName) : null;

  const rootExePath = path.join(dirPath, "Zalo.exe");
  const verExePath = activeVerDir ? path.join(activeVerDir, "Zalo.exe") : null;
  const verLauncherPath = activeVerDir ? path.join(activeVerDir, "ZaloExecutable.exe") : null;
  const appAsarPath = activeVerDir ? path.join(activeVerDir, "resources", "app.asar") : null;

  const exeExists = Boolean(installed && verExePath && fs.existsSync(verExePath));
  const appAsarExists = withNoAsarSync(() => Boolean(appAsarPath && fs.existsSync(appAsarPath)));
  const expectedSha1 = activeVerDir ? readUpdateMetaExpectedSha1(activeVerDir) : null;
  let checksumVerified = null;
  if (verifyChecksum && appAsarExists && expectedSha1) {
    try {
      checksumVerified = sha1File(appAsarPath) === expectedSha1;
    } catch {
      checksumVerified = false;
    }
  }

  let launcherSynced = false;
  try {
    if (fs.existsSync(rootExePath) && verLauncherPath && fs.existsSync(verLauncherPath)) {
      launcherSynced = fs.statSync(rootExePath).size === fs.statSync(verLauncherPath).size;
    } else if (exeExists) {
      launcherSynced = true;
    }
  } catch {
    launcherSynced = false;
  }

  const normalizedRoot = path.resolve(dirPath).toLowerCase();
  const matchingProcs = (runningProcesses || []).filter((p) => {
    const exe = String(p?.exePath || "").toLowerCase();
    return exe && exe.startsWith(normalizedRoot + path.sep);
  });
  const runningPids = matchingProcs.map((p) => Number(p.pid)).filter((n) => Number.isFinite(n) && n > 0);
  const memoryBytes = matchingProcs.reduce((acc, p) => acc + (Number(p?.workingSetBytes) || 0), 0);
  const memoryMb = memoryBytes > 0 ? Math.round(memoryBytes / (1024 * 1024)) : 0;
  const isRunning = runningPids.length > 0;
  const sizeBytes = installed && measureSize ? measureDirectorySizeCached(dirPath, { syncCompute: false }) : 0;
  if (installed && measureSize && sizeBytes === 0) {
    void scheduleDirectorySizeWarm([dirPath]);
  }
  const sizeLabel = formatBytes(sizeBytes);
  const { startMenuPath, desktopPath } = resolveShortcutPaths(shortcutName || folderName, currentWinUser);
  const startMenuShortcutExists = fs.existsSync(startMenuPath);
  const desktopShortcutExists = fs.existsSync(desktopPath);
  const isCurrentUser = !winUser || winUser.toLowerCase() === String(currentWinUser || "").toLowerCase();
  const savedCredReady = isCurrentUser || savedCredCache.users.has(winUser.toLowerCase());
  const zaloDataPath = resolveZaloDataDirForUser(winUser, currentWinUser);
  const zaloDataStats = readZaloDataStatsCached(zaloDataPath, isCurrentUser, winUser);
  const savecredCommand = !isCurrentUser
    ? `runas /savecred /user:Admin\\${winUser} "${fs.existsSync(rootExePath) ? rootExePath : path.join(dirPath, "Zalo.exe")}"`
    : null;

  return {
    id,
    name,
    folderName,
    shortcutName: shortcutName || folderName,
    dirPath,
    exePath: fs.existsSync(rootExePath) ? rootExePath : null,
    activeVerDir,
    winUser,
    accountLabel: formatZaloAccountLabel(winUser),
    kind,
    installed,
    activeVersion,
    installedVersions: versionDirs.map((v) => v.version),
    exeExists,
    appAsarExists,
    expectedSha1,
    checksumVerified,
    launcherSynced,
    isRunning,
    runningPids,
    memoryBytes,
    memoryMb,
    sizeBytes,
    sizeLabel,
    zaloDataPath,
    zaloDataAccessible: zaloDataStats.accessible,
    zaloDataBytes: zaloDataStats.totalBytes,
    zaloDataLabel: formatBytes(zaloDataStats.totalBytes),
    zaloDataOnCBytes: zaloDataStats.onCBytes || 0,
    zaloDataOnCLabel: formatBytes(zaloDataStats.onCBytes || 0),
    zaloDataOnDBytes: zaloDataStats.onDBytes || 0,
    zaloDataOnDLabel: formatBytes(zaloDataStats.onDBytes || 0),
    zaloDataJunctions: zaloDataStats.junctions || null,
    zaloDataCacheBytes: zaloDataStats.cacheBytes,
    zaloDataCacheLabel: formatBytes(zaloDataStats.cacheBytes),
    startMenuShortcutExists,
    desktopShortcutExists,
    startMenuShortcutPath: startMenuPath,
    desktopShortcutPath: desktopPath,
    savedCredReady,
    savecredCommand,
    createdAt: statCreatedIso(activeVerDir || dirPath, checkedAt),
    updated: statIso(activeVerDir || rootExePath || dirPath, checkedAt),
  };
}

/**
 * Discovers all local Zalo Desktop installations (Primary + D:\Apps Data\Zalo\* multi-instance),
 * identifies the newest verified golden version, and flags outdated or broken instances.
 */
export function inspectZaloDesktopInstances({
  localProgramsDir = null,
  portableRootDir = DEFAULT_ZALO_PORTABLE_ROOT,
  runningProcesses = null,
  verifyChecksum = false,
  forceProcessRefresh = false,
} = {}) {
  const checkedAt = new Date().toISOString();
  const currentWinUser = os.userInfo().username || process.env.USERNAME || "CzP";
  const resolvedLocalDir =
    localProgramsDir ||
    path.join(
      process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"),
      "Programs",
      "Zalo",
    );

  const procs = Array.isArray(runningProcesses)
    ? runningProcesses
    : listRunningZaloProcessesFast({ force: forceProcessRefresh });

  const discovered = [];
  if (fs.existsSync(resolvedLocalDir)) {
    discovered.push(
      inspectSingleZaloDirectory({
        id: "zalo:primary",
        name: "Zalo Desktop 01 (Primary)",
        folderName: "Zalo (Primary)",
        shortcutName: "Zalo",
        dirPath: resolvedLocalDir,
        winUser: currentWinUser,
        currentWinUser,
        kind: "primary",
        runningProcesses: procs,
        checkedAt,
        verifyChecksum,
      }),
    );
  }

  if (portableRootDir && fs.existsSync(portableRootDir)) {
    const subdirs = fs
      .readdirSync(portableRootDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && /^zalo(?:\s+\d+)?$/i.test(d.name))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    for (const d of subdirs) {
      const slug = buildInstanceSlug(d.name);
      const winUser = inferWinUserFromFolder(d.name, currentWinUser);
      const numMatch = d.name.match(/\d+/);
      const displayName = numMatch ? `Zalo Desktop ${numMatch[0]} (${winUser})` : `Zalo Portable (${d.name})`;
      const shortcutName = numMatch ? d.name : "Zalo Portable";
      discovered.push(
        inspectSingleZaloDirectory({
          id: `zalo:${slug}`,
          name: displayName,
          folderName: d.name,
          shortcutName,
          dirPath: path.join(portableRootDir, d.name),
          winUser,
          currentWinUser,
          kind: "instance",
          runningProcesses: procs,
          checkedAt,
          verifyChecksum,
        }),
      );
    }
  }

  let latestVersion = null;
  let goldenSource = null;
  for (const inst of discovered) {
    if (!inst.installed || !inst.activeVersion || !inst.appAsarExists || !inst.exeExists) continue;
    if (!latestVersion || compareZaloVersions(inst.activeVersion, latestVersion) > 0) {
      latestVersion = inst.activeVersion;
      goldenSource = inst;
    } else if (inst.activeVersion === latestVersion && goldenSource && inst.launcherSynced && !goldenSource.launcherSynced) {
      goldenSource = inst;
    }
  }

  const instances = discovered.map((inst) => {
    const outdated = Boolean(
      latestVersion &&
        inst.activeVersion &&
        compareZaloVersions(inst.activeVersion, latestVersion) < 0,
    );
    const broken = !inst.installed || !inst.exeExists || !inst.appAsarExists || inst.checksumVerified === false;
    const status = !inst.installed
      ? "Down"
      : broken
        ? "Conflict"
        : outdated || !inst.launcherSynced
          ? "Update"
          : inst.isRunning
            ? "Running"
            : "Ready";

    const shortcutText = inst.startMenuShortcutExists && inst.desktopShortcutExists
      ? "Start + Desktop .lnk"
      : inst.startMenuShortcutExists
        ? "Start .lnk"
        : inst.desktopShortcutExists
          ? "Desktop .lnk"
          : "No .lnk";

    const junctionTags = [];
    if (inst.zaloDataJunctions?.media?.linked) junctionTags.push("media");
    if (inst.zaloDataJunctions?.database?.linked) junctionTags.push("DB");
    const zaloSummary = inst.zaloDataAccessible
      ? inst.zaloDataOnDBytes > 0 || junctionTags.length > 0
        ? `On C: ${inst.zaloDataOnCLabel || "0 B"} · Junction D: ${junctionTags.join("+") || "linked"}${inst.zaloDataOnDLabel ? ` (${inst.zaloDataOnDLabel})` : ""}`
        : inst.zaloDataLabel
          ? `Data ${inst.zaloDataLabel}${inst.zaloDataCacheLabel ? ` (Cache ${inst.zaloDataCacheLabel})` : ""}`
          : ""
      : "";

    const detailParts = [
      outdated && latestVersion ? `Behind v${latestVersion}` : !inst.launcherSynced ? "Launcher mismatch" : shortcutText,
      !inst.savedCredReady ? "Needs /savecred" : "",
      zaloSummary,
    ].filter(Boolean);

    const logMsg = broken
      ? `Broken installation in ${inst.dirPath} (missing app.asar or Zalo.exe)`
      : outdated && latestVersion
        ? `Outdated v${inst.activeVersion} (< v${latestVersion}) — click Sync Zalo to upgrade from ${goldenSource?.folderName || "latest"}`
        : !inst.launcherSynced
          ? `Root Zalo.exe out of sync with v${inst.activeVersion} — click Sync Zalo to repair`
          : `${inst.isRunning ? `Running (${inst.runningPids.length} procs, PID ${inst.runningPids[0]})` : "Ready"} · v${inst.activeVersion} verified · ${inst.dirPath}`;

    return {
      ...inst,
      latestVersion,
      outdated,
      broken,
      status,
      detail: detailParts.join(" · "),
      log: logMsg,
    };
  });

  const outdatedCount = instances.filter((i) => i.outdated || i.broken || !i.launcherSynced).length;

  return {
    ok: true,
    checkedAt,
    latestVersion,
    goldenSourceId: goldenSource?.id || null,
    goldenSourceDir: goldenSource?.dirPath || null,
    outdatedCount,
    instances,
  };
}

async function stopProcessesForInstance(inst, currentWinUser) {
  if (!inst?.dirPath || !inst?.isRunning) return;
  const escapedDir = inst.dirPath.replace(/'/g, "''");
  const psScript = `Get-CimInstance Win32_Process -Filter "Name='Zalo.exe' OR Name='ZaloCap.exe' OR Name='ZaloCall.exe' OR Name='ZaloAttest.exe'" | Where-Object { $_.ExecutablePath -like '${escapedDir}\\*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`;

  if (!inst.winUser || inst.winUser.toLowerCase() === currentWinUser.toLowerCase()) {
    await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-WindowStyle", "Hidden", "-Command", psScript],
      { windowsHide: true, timeout: 15_000 },
    ).catch(() => null);
  } else {
    await execFileAsync(
      "runas.exe",
      ["/savecred", `/user:Admin\\${inst.winUser}`, buildHeadlessPowerShellCommandForRunas(`-Command "${psScript.replace(/"/g, '\\"')}"`)],
      { windowsHide: true, timeout: 15_000 },
    ).catch(() => null);
  }
  await new Promise((r) => setTimeout(r, 1200));
}

async function copyDirectoryWithRobocopyFallback(srcDir, destDir) {
  if (process.platform === "win32") {
    try {
      await execFileAsync(
        "robocopy.exe",
        [srcDir, destDir, "/MIR", "/MT:8", "/R:2", "/W:1", "/NFL", "/NDL", "/NJH", "/NJS", "/NP"],
        { windowsHide: true, timeout: 120_000 },
      );
      return;
    } catch (err) {
      if (typeof err?.code === "number" && err.code < 8) return;
      if (typeof err?.status === "number" && err.status < 8) return;
    }
  }
  fs.rmSync(destDir, { recursive: true, force: true });
  fs.cpSync(srcDir, destDir, { recursive: true, force: true });
}

/**
 * Syncs the newest verified Zalo Desktop build onto outdated/broken instances,
 * updates root launcher binaries (`Zalo.exe`, `Uninstall Zalo.exe`, `resources/elevate.exe`),
 * verifies `app.asar` SHA1, and prunes dead old version directories.
 */
export async function syncZaloDesktopInstances({
  instanceIds = null,
  localProgramsDir = null,
  portableRootDir = DEFAULT_ZALO_PORTABLE_ROOT,
  includePrimary = false,
  stopRunning = true,
  pruneOld = true,
  verifySha1 = true,
  runningProcesses = null,
} = {}) {
  const snap = inspectZaloDesktopInstances({
    localProgramsDir,
    portableRootDir,
    runningProcesses,
    verifyChecksum: true,
    forceProcessRefresh: runningProcesses == null,
  });

  if (!snap.latestVersion || !snap.goldenSourceDir) {
    return {
      ok: false,
      error: "No verified Zalo Desktop golden build found to sync from.",
      synced: [],
      skipped: [],
      errors: [],
    };
  }

  const sourceInst = snap.instances.find((i) => i.id === snap.goldenSourceId);
  if (!sourceInst || sourceInst.checksumVerified === false) {
    return {
      ok: false,
      error: `Golden source ${snap.goldenSourceDir} failed SHA1 verification.`,
      synced: [],
      skipped: [],
      errors: [],
    };
  }

  const targetVersion = snap.latestVersion;
  const sourceVerDir = sourceInst.activeVerDir;
  const expectedSha1 = sourceInst.expectedSha1;
  const currentWinUser = os.userInfo().username || process.env.USERNAME || "CzP";

  const requestedSet = Array.isArray(instanceIds) && instanceIds.length > 0 ? new Set(instanceIds) : null;
  const candidates = snap.instances.filter((inst) => {
    if (inst.id === sourceInst.id) return false;
    if (requestedSet) return requestedSet.has(inst.id);
    if (inst.kind === "primary" && !includePrimary) return false;
    return inst.outdated || inst.broken || !inst.launcherSynced;
  });

  const synced = [];
  const skipped = [];
  const errors = [];

  for (const inst of candidates) {
    try {
      if (inst.isRunning) {
        if (!stopRunning) {
          skipped.push({ id: inst.id, reason: "running" });
          continue;
        }
        await stopProcessesForInstance(inst, currentWinUser);
      }

      const destVerDir = path.join(inst.dirPath, `Zalo-${targetVersion}`);
      await copyDirectoryWithRobocopyFallback(sourceVerDir, destVerDir);

      const copyPair = (srcRel, destRel) => {
        const src = path.join(sourceInst.dirPath, srcRel);
        const dest = path.join(inst.dirPath, destRel);
        if (fs.existsSync(src)) {
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.copyFileSync(src, dest);
        }
      };

      const launcherSrc = fs.existsSync(path.join(sourceVerDir, "ZaloExecutable.exe"))
        ? path.join(sourceVerDir, "ZaloExecutable.exe")
        : path.join(sourceInst.dirPath, "Zalo.exe");
      if (fs.existsSync(launcherSrc)) {
        fs.copyFileSync(launcherSrc, path.join(inst.dirPath, "Zalo.exe"));
      }
      copyPair("Uninstall Zalo.exe", "Uninstall Zalo.exe");
      copyPair(path.join("resources", "elevate.exe"), path.join("resources", "elevate.exe"));

      if (verifySha1 && expectedSha1) {
        const destAsar = path.join(destVerDir, "resources", "app.asar");
        if (!withNoAsarSync(() => fs.existsSync(destAsar))) {
          throw new Error(`Missing app.asar after copy in ${inst.dirPath}`);
        }
        const actualSha1 = sha1File(destAsar);
        if (actualSha1 !== expectedSha1) {
          throw new Error(`SHA1 mismatch in ${inst.dirPath}: got ${actualSha1}, expected ${expectedSha1}`);
        }
      }

      const removedOld = [];
      if (pruneOld) {
        withNoAsarSync(() => {
          for (const entry of fs.readdirSync(inst.dirPath, { withFileTypes: true })) {
            if (
              entry.isDirectory() &&
              /^zalo-(\d+\.\d+\.\d+)$/i.test(entry.name) &&
              entry.name.toLowerCase() !== `zalo-${targetVersion}`.toLowerCase() &&
              !ZALO_EXCLUDED_FALLBACK_VERSIONS.has(entry.name.replace(/^zalo-/i, ""))
            ) {
              fs.rmSync(path.join(inst.dirPath, entry.name), { recursive: true, force: true });
              removedOld.push(entry.name);
            }
          }
        });
      }

      synced.push({
        id: inst.id,
        name: inst.name,
        fromVersion: inst.activeVersion,
        toVersion: targetVersion,
        removedOld,
      });
    } catch (err) {
      errors.push({
        id: inst.id,
        name: inst.name,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Also prune stale (< targetVersion) version folders on already-current instances (including stopped Primary)
  if (pruneOld) {
    for (const inst of snap.instances || []) {
      if (!inst.installed || !inst.dirPath || inst.isRunning) continue;
      if (requestedSet && !requestedSet.has(inst.id)) continue;
      if (inst.activeVersion !== targetVersion) continue;
      try {
        withNoAsarSync(() => {
          for (const entry of fs.readdirSync(inst.dirPath, { withFileTypes: true })) {
            if (!entry.isDirectory()) continue;
            const m = entry.name.match(/^zalo-(\d+\.\d+\.\d+)$/i);
            if (!m) continue;
            const ver = m[1];
            if (ZALO_EXCLUDED_FALLBACK_VERSIONS.has(ver)) continue;
            if (compareZaloVersions(ver, targetVersion) < 0) {
              try {
                fs.rmSync(path.join(inst.dirPath, entry.name), { recursive: true, force: true });
              } catch {
                /* skip EBUSY file handle gracefully until process restart */
              }
            }
          }
        });
      } catch {
        /* ignore directory read error */
      }
    }
  }

  cachedZaloProcList = { ts: 0, rows: [] };
  dirSizeCache.clear();

  const message =
    errors.length > 0
      ? `Zalo sync v${targetVersion}: ${synced.length} synced, ${errors.length} failed (${errors[0].error})`
      : synced.length > 0
        ? `Synced ${synced.length} Zalo instance(s) to v${targetVersion} (${synced.map((s) => s.name).join(", ")})`
        : `All targeted Zalo instances already on verified v${targetVersion}`;

  return {
    ok: errors.length === 0,
    targetVersion,
    sourceDir: sourceInst.dirPath,
    synced,
    skipped,
    errors,
    message,
  };
}

export async function launchZaloDesktopInstance({
  id,
  relaunch = false,
  localProgramsDir = null,
  portableRootDir = DEFAULT_ZALO_PORTABLE_ROOT,
} = {}) {
  const snap = inspectZaloDesktopInstances({
    localProgramsDir,
    portableRootDir,
    forceProcessRefresh: true,
  });
  const inst = snap.instances.find((i) => i.id === id);
  if (!inst || !inst.installed || !inst.exePath) {
    return { ok: false, error: `Zalo instance ${id} not found or not installed` };
  }
  const currentWinUser = os.userInfo().username || process.env.USERNAME || "CzP";
  if (inst.isRunning && relaunch) {
    await stopProcessesForInstance(inst, currentWinUser);
  } else if (inst.isRunning) {
    return { ok: true, alreadyRunning: true, message: `${inst.name} is already running (PID ${inst.runningPids[0]})` };
  }

  if (!inst.winUser || inst.winUser.toLowerCase() === currentWinUser.toLowerCase()) {
    let preLaunchFreed = "";
    if (inst.zaloDataPath && fs.existsSync(inst.zaloDataPath)) {
      try {
        const preCacheBytes = await measureZaloSafeCacheBytesAsync(inst.zaloDataPath);
        if (preCacheBytes >= ZALO_ON_LAUNCH_CACHE_CLEAN_THRESHOLD_BYTES) {
          const cleanRes = await cleanZaloDataCache({ instanceIds: [inst.id], localProgramsDir, portableRootDir });
          if (cleanRes?.freedBytes > 0) {
            preLaunchFreed = cleanRes.freedLabel || formatBytes(cleanRes.freedBytes);
          }
        }
      } catch {
        /* non-fatal pre-launch cache cleanup */
      }
    }
    const winShellPath = path.join(DEV_ROOT || path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../.."), "Tool", "scripts", "lib", "win-shell-env.cjs");
    let launched = false;
    if (process.platform === "win32" && fs.existsSync(winShellPath)) {
      try {
        const { startHiddenDetachedProcessAsync } = require(winShellPath);
        if (typeof startHiddenDetachedProcessAsync === "function") {
          await startHiddenDetachedProcessAsync({
            command: inst.exePath,
            args: [],
            cwd: inst.dirPath,
          });
          launched = true;
        }
      } catch {
        launched = false;
      }
    }
    if (!launched) {
      const { spawn } = await import("node:child_process");
      const child = spawn(inst.exePath, [], { cwd: inst.dirPath, detached: true, stdio: "ignore", windowsHide: true });
      child.unref();
    }
    cachedZaloProcList = { ts: 0, rows: [] };
    dirSizeCache.clear();
    return {
      ok: true,
      id: inst.id,
      version: inst.activeVersion,
      preLaunchFreed,
      message: preLaunchFreed
        ? `Cleaned ${preLaunchFreed} cache & launched ${inst.name} (v${inst.activeVersion})`
        : `Launched ${inst.name} (v${inst.activeVersion})`,
    };
  } else {
    await execFileAsync(
      "runas.exe",
      ["/savecred", `/user:${inst.winUser}`, inst.exePath],
      { cwd: inst.dirPath, windowsHide: true, timeout: 10_000 },
    );
  }

  cachedZaloProcList = { ts: 0, rows: [] };
  dirSizeCache.clear();
  return {
    ok: true,
    id: inst.id,
    version: inst.activeVersion,
    message: `Launched ${inst.name} (v${inst.activeVersion})`,
  };
}

export async function stopZaloDesktopInstance({
  id,
  localProgramsDir = null,
  portableRootDir = DEFAULT_ZALO_PORTABLE_ROOT,
} = {}) {
  const snap = inspectZaloDesktopInstances({
    localProgramsDir,
    portableRootDir,
    forceProcessRefresh: true,
  });
  const inst = snap.instances.find((i) => i.id === id);
  if (!inst) {
    return { ok: false, error: `Zalo instance ${id} not found` };
  }
  const currentWinUser = os.userInfo().username || process.env.USERNAME || "CzP";
  await stopProcessesForInstance(inst, currentWinUser);
  cachedZaloProcList = { ts: 0, rows: [] };
  dirSizeCache.clear();
  return {
    ok: true,
    id: inst.id,
    message: `Stopped ${inst.name}`,
  };
}

/**
 * Creates or repairs Windows Start Menu (and optional Desktop) `.lnk` shortcuts for Zalo Desktop instances.
 */
export async function repairZaloShortcuts({
  instanceIds = null,
  createStartMenu = true,
  createDesktop = false,
  localProgramsDir = null,
  portableRootDir = DEFAULT_ZALO_PORTABLE_ROOT,
} = {}) {
  await refreshSavedCredCacheAsync();
  const snap = inspectZaloDesktopInstances({
    localProgramsDir,
    portableRootDir,
    forceProcessRefresh: false,
  });
  const currentWinUser = os.userInfo().username || process.env.USERNAME || "CzP";
  const reqIds = Array.isArray(instanceIds) && instanceIds.length > 0 ? new Set(instanceIds) : null;
  const targets = snap.instances.filter((i) => i.installed && i.exePath && (!reqIds || reqIds.has(i.id)));
  const updated = [];
  const errors = [];

  if (process.platform !== "win32") {
    return { ok: true, updated: [], errors: [], message: "Shortcuts skipped on non-Windows host" };
  }

  const psLines = ["$sh = New-Object -ComObject WScript.Shell;"];
  const pending = [];

  for (const inst of targets) {
    const destPaths = [];
    if (createStartMenu) destPaths.push(inst.startMenuShortcutPath);
    if (createDesktop) destPaths.push(inst.desktopShortcutPath);
    const useRunas = Boolean(inst.winUser && inst.winUser.toLowerCase() !== currentWinUser.toLowerCase());
    const targetPath = useRunas ? "C:\\Windows\\System32\\runas.exe" : inst.exePath;
    const argsStr = useRunas ? `/savecred /user:${inst.winUser} "${inst.exePath}"` : "";

    for (const lnkPath of destPaths) {
      try {
        fs.mkdirSync(path.dirname(lnkPath), { recursive: true });
        const esc = (s) => String(s || "").replace(/'/g, "''");
        psLines.push(
          `$s = $sh.CreateShortcut('${esc(lnkPath)}'); $s.TargetPath = '${esc(targetPath)}'; $s.Arguments = '${esc(argsStr)}'; $s.WorkingDirectory = '${esc(inst.dirPath)}'; $s.IconLocation = '${esc(inst.exePath)},0'; $s.Save();`,
        );
        pending.push({ id: inst.id, shortcut: lnkPath, runasUser: useRunas ? inst.winUser : currentWinUser });
      } catch (err) {
        errors.push({ id: inst.id, shortcut: lnkPath, error: err instanceof Error ? err.message : String(err) });
      }
    }
  }

  if (pending.length > 0) {
    try {
      await execFileAsync(
        "powershell.exe",
        ["-NoProfile", "-WindowStyle", "Hidden", "-Command", psLines.join(" ")],
        { windowsHide: true, timeout: 15_000 },
      );
      updated.push(...pending);
    } catch (err) {
      errors.push({ id: "zalo:shortcuts", shortcut: "batch", error: err instanceof Error ? err.message : String(err) });
    }
  }

  return {
    ok: errors.length === 0,
    updated,
    errors,
    message:
      errors.length > 0
        ? `Repaired ${updated.length} Zalo shortcut(s), ${errors.length} failed`
        : `Verified/repaired ${updated.length} Zalo shortcut(s)`,
  };
}

let lastZaloCacheAutoCleanAt = 0;

/**
 * Computes total bytes across ZALO_SAFE_CACHE_SUBDIRS without traversing into
 * non-cache directories (`Database`, `media` user attachments, cookies).
 */
export async function measureZaloSafeCacheBytesAsync(dataDir) {
  if (!dataDir || !fs.existsSync(dataDir)) return 0;
  let total = 0;
  for (const rel of ZALO_SAFE_CACHE_SUBDIRS) {
    const subPath = path.join(dataDir, ...rel.split("/"));
    if (fs.existsSync(subPath)) {
      total += await sumDirectoryBytesAsync(subPath, 6);
    }
  }
  return total;
}

/**
 * Periodic non-disruptive Zalo cache cleanup: skips running profiles and, on directly
 * accessible profiles (`CzP` / test overrides), only deletes safe Chromium caches once
 * they reach `thresholdBytes` (default 300 MB).
 */
export async function cleanZaloCacheIfDue({
  force = false,
  thresholdBytes = ZALO_AUTO_CACHE_CLEAN_THRESHOLD_BYTES,
  intervalMs = 7 * 24 * 3600_000,
  localProgramsDir = null,
  portableRootDir = DEFAULT_ZALO_PORTABLE_ROOT,
  zaloDataDirOverride = null,
  runningProcesses = null,
} = {}) {
  const now = Date.now();
  const hasStatsOverride = Boolean(process.env.P0001_ZALO_REMOTE_STATS_PATH);
  const persistedMeta = zaloDataDirOverride ? {} : readPersistedZaloDaemonMeta();
  const persistedLastCleanAt = Number(persistedMeta.lastCacheCleanAt) || 0;
  const effectiveLastCleanAt =
    zaloDataDirOverride || hasStatsOverride
      ? persistedLastCleanAt
      : Math.max(lastZaloCacheAutoCleanAt, persistedLastCleanAt);
  const weeklyDue = force || effectiveLastCleanAt === 0 || now - effectiveLastCleanAt >= intervalMs;
  const persistedStats = zaloDataDirOverride ? {} : loadPersistedRemoteStatsMap();
  const snap = inspectZaloDesktopInstances({
    localProgramsDir,
    portableRootDir,
    runningProcesses,
    forceProcessRefresh: runningProcesses == null,
  });
  const currentWinUser = os.userInfo().username || process.env.USERNAME || "CzP";
  const candidateIds = [];
  const skipped = [];

  for (const inst of snap.instances || []) {
    if (!inst.installed) continue;
    if (inst.isRunning) {
      skipped.push({ id: inst.id, reason: "running" });
      continue;
    }
    const isCurrentUser = !inst.winUser || inst.winUser.toLowerCase() === currentWinUser.toLowerCase();
    const targetDataDir = zaloDataDirOverride || inst.zaloDataPath;
    if (isCurrentUser || zaloDataDirOverride) {
      if (!targetDataDir || !fs.existsSync(targetDataDir)) continue;
      const cacheBytes = await measureZaloSafeCacheBytesAsync(targetDataDir);
      if (cacheBytes <= 0) continue;
      if (!force && cacheBytes < thresholdBytes) {
        skipped.push({ id: inst.id, reason: `below_threshold (${formatBytes(cacheBytes)})` });
        continue;
      }
      candidateIds.push(inst.id);
    } else if (inst.savedCredReady && weeklyDue) {
      const uLow = String(inst.winUser || "").toLowerCase();
      const remoteEntry = persistedStats[uLow];
      const remoteUpdatedMs = remoteEntry?.updatedAt ? Date.parse(remoteEntry.updatedAt) : 0;
      const remoteCacheBytes = Number(remoteEntry?.cacheBytes);
      if (
        !force &&
        remoteEntry &&
        Number.isFinite(remoteUpdatedMs) &&
        now - remoteUpdatedMs < intervalMs &&
        Number.isFinite(remoteCacheBytes) &&
        remoteCacheBytes < thresholdBytes
      ) {
        skipped.push({
          id: inst.id,
          reason: `below_threshold_cached (${formatBytes(remoteCacheBytes) || "0 B"})`,
        });
        continue;
      }
      candidateIds.push(inst.id);
    }
  }

  if (weeklyDue && !zaloDataDirOverride) {
    if (!hasStatsOverride) lastZaloCacheAutoCleanAt = now;
    savePersistedZaloDaemonMeta({ lastCacheCleanAt: now });
  }

  if (candidateIds.length === 0) {
    return {
      ok: true,
      cleaned: [],
      freedBytes: 0,
      freedLabel: "0 B",
      skipped,
      errors: [],
      message: "Zalo Chromium cache below auto-clean threshold",
    };
  }

  if (weeklyDue && !zaloDataDirOverride && !hasStatsOverride) lastZaloCacheAutoCleanAt = now;
  const res = await cleanZaloDataCache({
    instanceIds: candidateIds,
    localProgramsDir,
    portableRootDir,
    zaloDataDirOverride,
    runningProcesses: runningProcesses ?? [],
  });
  return {
    ...res,
    skipped: [...(res.skipped || []), ...skipped],
  };
}

/**
 * Periodic non-disruptive Zalo Fleet sync for `Daemon-Zalo-Fleet-Sync`:
 * automatically upgrades stopped portable instances (`stopRunning: false`) when a newer verified build exists
 * and sweeps oversized Chromium caches (>300 MB) on stopped profiles.
 */
export async function syncZaloFleetIfDue({
  force = false,
  intervalMs = 6 * 3600_000,
  cleanCacheThresholdBytes = ZALO_AUTO_CACHE_CLEAN_THRESHOLD_BYTES,
} = {}) {
  const now = Date.now();
  const persistedMeta = readPersistedZaloDaemonMeta();
  const persistedLastSyncAt = Number(persistedMeta.lastFleetSyncAt) || 0;
  const effectiveLastSyncAt = Math.max(lastZaloFleetAutoSyncAt, persistedLastSyncAt);
  if (!force && effectiveLastSyncAt > 0 && now - effectiveLastSyncAt < intervalMs) {
    return { ok: true, skipped: true, reason: "interval_not_due" };
  }
  lastZaloFleetAutoSyncAt = now;
  savePersistedZaloDaemonMeta({ lastFleetSyncAt: now });
  const syncRes = await syncZaloDesktopInstances({
    includePrimary: false,
    stopRunning: false,
    pruneOld: true,
    verifySha1: true,
  });
  const cacheCleanup = await cleanZaloCacheIfDue({
    force: false,
    thresholdBytes: cleanCacheThresholdBytes,
    intervalMs: 7 * 24 * 3600_000,
  }).catch((err) => ({
    ok: false,
    freedBytes: 0,
    freedLabel: "0 B",
    cleaned: [],
    errors: [{ error: err instanceof Error ? err.message : String(err) }],
  }));
  const freedBytes = Number(cacheCleanup?.freedBytes) || 0;
  const remoteProbe = await probeRemoteZaloDataStatsIfDue({
    intervalMs: 24 * 3600_000,
    excludeUsers: ["pc07"],
  }).catch(() => null);
  const autoOffload = await offloadZaloDataIfDue({
    thresholdBytes: ZALO_AUTO_OFFLOAD_THRESHOLD_BYTES,
    excludeUsers: ["pc07"],
  }).catch((err) => ({
    ok: false,
    offloaded: [],
    freedBytes: 0,
    freedLabel: "0 B",
    errors: [{ error: err instanceof Error ? err.message : String(err) }],
  }));
  const offloadFreed = Number(autoOffload?.freedBytes) || 0;
  const msgParts = [syncRes.message];
  if (freedBytes > 0) msgParts.push(`Cache cleaned (${cacheCleanup.freedLabel})`);
  if (offloadFreed > 0) msgParts.push(`Offloaded ${autoOffload.offloaded.length} folder(s) to D: (${autoOffload.freedLabel})`);
  return {
    ...syncRes,
    cacheCleanup,
    remoteProbe,
    autoOffload,
    message: msgParts.join(" · "),
  };
}

/**
 * Automatically offloads allowlisted heavy ZaloData folders (`media` or `Database`)
 * exceeding `thresholdBytes` (default 1.5 GB) onto Drive D: via NTFS Junction whenever the
 * target Zalo instance is stopped (never disturbs running chats).
 */
export async function offloadZaloDataIfDue({
  thresholdBytes = ZALO_AUTO_OFFLOAD_THRESHOLD_BYTES,
  excludeUsers = ["pc07"],
  localProgramsDir = null,
  portableRootDir = DEFAULT_ZALO_PORTABLE_ROOT,
  zaloDataDirOverride = null,
  targetBaseDir = null,
  runningProcesses = null,
  remoteExecutor = null,
} = {}) {
  await refreshSavedCredCacheAsync();
  const excluded = new Set((excludeUsers || []).map((u) => String(u).toLowerCase()));
  const snap = inspectZaloDesktopInstances({
    localProgramsDir,
    portableRootDir,
    runningProcesses,
    forceProcessRefresh: runningProcesses == null,
  });
  const currentWinUser = os.userInfo().username || process.env.USERNAME || "CzP";
  const persisted = loadPersistedRemoteStatsMap();
  const offloaded = [];
  const skipped = [];
  const errors = [];
  let freedBytes = 0;

  for (const inst of snap.instances || []) {
    if (!inst.installed) continue;
    const uLow = String(inst.winUser || currentWinUser).toLowerCase();
    if (excluded.has(uLow)) continue;
    if (inst.isRunning) {
      skipped.push({ id: inst.id, reason: "running" });
      continue;
    }

    const isCurrent = Boolean(zaloDataDirOverride) || !inst.winUser || uLow === currentWinUser.toLowerCase();
    const candidates = [];

    if (isCurrent) {
      const dataDir = zaloDataDirOverride || inst.zaloDataPath;
      if (!dataDir || !fs.existsSync(dataDir)) continue;
      const junctions = detectZaloDataJunctionsSync(dataDir);
      for (const [metaKey, folderName] of [
        ["media", "media"],
        ["database", "Database"],
      ]) {
        if (junctions[metaKey]?.linked) continue;
        const subDir = path.join(dataDir, folderName);
        if (!fs.existsSync(subDir)) continue;
        const bytes = await sumDirectoryBytesAsync(subDir, 10);
        if (bytes >= thresholdBytes) {
          candidates.push(folderName);
        }
      }
    } else if (inst.savedCredReady) {
      const remoteEntry = persisted[uLow];
      const junctions = remoteEntry?.junctions;
      if (junctions) {
        for (const [metaKey, folderName] of [
          ["media", "media"],
          ["database", "Database"],
        ]) {
          const info = junctions[metaKey];
          if (info && !info.linked && (Number(info.bytes) || 0) >= thresholdBytes) {
            candidates.push(folderName);
          }
        }
      }
    }

    for (const folder of candidates) {
      const res = await offloadZaloDataToDriveD({
        instanceId: inst.id,
        folder,
        localProgramsDir,
        portableRootDir,
        targetBaseDir,
        zaloDataDirOverride,
        runningProcesses: runningProcesses ?? [],
        remoteExecutor,
      });
      if (res?.ok && !res.alreadyLinked) {
        const movedBytes = Number(res.bytes) || 0;
        freedBytes += movedBytes;
        offloaded.push({ id: inst.id, name: inst.name, folder, bytes: movedBytes, bytesLabel: formatBytes(movedBytes) });
      } else if (!res?.ok) {
        errors.push({ id: inst.id, folder, error: res?.error || "auto-offload failed" });
      }
    }
  }

  return {
    ok: errors.length === 0,
    offloaded,
    skipped,
    errors,
    freedBytes,
    freedLabel: formatBytes(freedBytes),
    message:
      offloaded.length > 0
        ? `Auto-offloaded ${offloaded.length} Zalo folder(s) (${formatBytes(freedBytes)}) to D:`
        : "No stopped Zalo folders exceed auto-offload threshold",
  };
}

/**
 * Safely deletes ONLY Chromium browser cache directories inside ZaloData (never ftsm_*.db,
 * Preferences, Network cookies, or user media). Works directly on current user and via hidden
 * runas /savecred on PC02..PC06 when credential is cached.
 */
export async function cleanZaloDataCache({
  instanceIds = null,
  localProgramsDir = null,
  portableRootDir = DEFAULT_ZALO_PORTABLE_ROOT,
  zaloDataDirOverride = null,
  runningProcesses = null,
} = {}) {
  await refreshSavedCredCacheAsync();
  const snap = inspectZaloDesktopInstances({
    localProgramsDir,
    portableRootDir,
    runningProcesses,
    forceProcessRefresh: false,
  });
  const currentWinUser = os.userInfo().username || process.env.USERNAME || "CzP";
  const reqIds = Array.isArray(instanceIds) && instanceIds.length > 0 ? new Set(instanceIds) : null;
  const targets = snap.instances.filter((i) => i.installed && (!reqIds || reqIds.has(i.id)));

  let freedBytes = 0;
  const cleaned = [];
  const skipped = [];
  const errors = [];

  for (const inst of targets) {
    const targetDataPath = zaloDataDirOverride || inst.zaloDataPath;
    if (!targetDataPath) continue;
    const isCurrentUser =
      Boolean(zaloDataDirOverride) || !inst.winUser || inst.winUser.toLowerCase() === currentWinUser.toLowerCase();
    if (!isCurrentUser && !inst.savedCredReady) {
      skipped.push({ id: inst.id, reason: `Needs /savecred (${inst.winUser})` });
      continue;
    }

    try {
      if (isCurrentUser) {
        let instFreed = 0;
        const removedDirs = [];
        for (const sub of ZALO_SAFE_CACHE_SUBDIRS) {
          const targetDir = path.join(targetDataPath, ...sub.split("/"));
          if (!fs.existsSync(targetDir)) continue;
          const bytes = sumDirectoryBytesSync(targetDir);
          fs.rmSync(targetDir, { recursive: true, force: true });
          instFreed += bytes;
          removedDirs.push(sub);
        }
        freedBytes += instFreed;
        zaloDataStatsCache.delete(path.resolve(targetDataPath).toLowerCase());
        cleaned.push({ id: inst.id, name: inst.name, freedBytes: instFreed, removedDirs });
      } else {
        const cleanDirsPs = ZALO_SAFE_CACHE_SUBDIRS.map((s) => `'${escapePsSingle(s.replace(/\//g, "\\"))}'`).join(",");
        const psCleanBody = `
$zd = Join-Path $env:APPDATA 'ZaloData'
[long]$freed = 0
$removed = [System.Collections.Generic.List[string]]::new()
foreach ($rel in @(${cleanDirsPs})) {
  $cp = Join-Path $zd $rel
  if (Test-Path -LiteralPath $cp) {
    $bytes = [long](Get-NoJunctionStats $cp).bytes
    Remove-Item -LiteralPath $cp -Recurse -Force -ErrorAction SilentlyContinue
    if (!(Test-Path -LiteralPath $cp)) {
      $freed += $bytes
      [void]$removed.Add($rel)
    } else {
      $left = [long](Get-NoJunctionStats $cp).bytes
      if ($bytes -gt $left) { $freed += ($bytes - $left) }
    }
  }
}
$st = Collect-ZaloDataStats
Write-OpResult @{ ok = $true; freedBytes = $freed; removedDirs = @($removed); stats = $st }
`;
        const remoteRes = await runZaloRemotePsScriptAsync({
          winUser: inst.winUser,
          opsBaseDir: portableRootDir || DEFAULT_ZALO_PORTABLE_ROOT,
          psBody: psCleanBody,
          timeoutMs: 45_000,
        });
        if (!remoteRes?.ok) {
          throw new Error(remoteRes?.error || `Failed cleaning cache for ${inst.winUser}`);
        }
        const instFreed = Number(remoteRes.freedBytes) || 0;
        freedBytes += instFreed;
        if (remoteRes.stats) {
          savePersistedRemoteStatsEntry(inst.winUser, hydrateStatsLabels(remoteRes.stats));
        }
        cleaned.push({
          id: inst.id,
          name: inst.name,
          freedBytes: instFreed,
          removedDirs: Array.isArray(remoteRes.removedDirs) ? remoteRes.removedDirs : [],
        });
      }
    } catch (err) {
      errors.push({ id: inst.id, name: inst.name, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return {
    ok: errors.length === 0,
    freedBytes,
    freedLabel: formatBytes(freedBytes),
    cleaned,
    skipped,
    errors,
    message:
      cleaned.length > 0
        ? `Cleaned Chromium cache for ${cleaned.length} Zalo profile(s)${freedBytes > 0 ? ` (${formatBytes(freedBytes)} freed)` : ""}`
        : skipped.length > 0
          ? `Skipped ${skipped.length} profile(s): ${skipped[0].reason}`
          : "No cache directories needed cleanup",
  };
}

const ZALO_SAFE_OFFLOAD_FOLDERS = new Set(["media", "Database"]);

function escapePsSingle(val) {
  return String(val || "").replace(/'/g, "''");
}

function buildRemoteZaloStatsPsSnippet() {
  const cacheSubdirsPs = ZALO_SAFE_CACHE_SUBDIRS.map((s) => `'${escapePsSingle(s.replace(/\//g, "\\"))}'`).join(",");
  return `
function Get-NoJunctionStats([string]$dir) {
  if (!(Test-Path -LiteralPath $dir)) { return @{ files = 0L; bytes = 0L } }
  try {
    if (([IO.File]::GetAttributes($dir) -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
      return @{ files = 0L; bytes = 0L }
    }
  } catch { return @{ files = 0L; bytes = 0L } }
  [long]$files = 0
  [long]$bytes = 0
  $stack = [System.Collections.Generic.Stack[string]]::new()
  $stack.Push($dir)
  while ($stack.Count -gt 0) {
    $cur = $stack.Pop()
    try {
      foreach ($f in [IO.Directory]::GetFiles($cur)) {
        try {
          $fi = [IO.FileInfo]::new($f)
          $files += 1
          $bytes += $fi.Length
        } catch {}
      }
      foreach ($d in [IO.Directory]::GetDirectories($cur)) {
        try {
          if (([IO.File]::GetAttributes($d) -band [IO.FileAttributes]::ReparsePoint) -eq 0) {
            $stack.Push($d)
          }
        } catch {}
      }
    } catch {}
  }
  return @{ files = $files; bytes = $bytes }
}
function Inspect-ZaloFolder([string]$zd, [string]$folderName) {
  $p = Join-Path $zd $folderName
  if (!(Test-Path -LiteralPath $p)) { return @{ linked = $false; target = $null; bytes = 0L } }
  $it = Get-Item -LiteralPath $p -Force -ErrorAction SilentlyContinue
  $linked = $false
  $target = $null
  if ($null -ne $it -and (($it.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0)) {
    $linked = $true
    if ($it.Target) {
      $target = if ($it.Target -is [array]) { [string]$it.Target[0] } else { [string]$it.Target }
    }
  }
  $measureDir = if ($linked -and $target -and (Test-Path -LiteralPath $target)) { $target } else { $p }
  $st = if ($linked) {
    # Measure target directly without outermost reparse check when resolved
    $raw = @{ files = 0L; bytes = 0L }
    $stk = [System.Collections.Generic.Stack[string]]::new()
    if (Test-Path -LiteralPath $measureDir) { $stk.Push($measureDir) }
    while ($stk.Count -gt 0) {
      $c = $stk.Pop()
      try {
        foreach ($f in [IO.Directory]::GetFiles($c)) { try { $raw.bytes += ([IO.FileInfo]::new($f)).Length } catch {} }
        foreach ($d in [IO.Directory]::GetDirectories($c)) { try { if (([IO.File]::GetAttributes($d) -band [IO.FileAttributes]::ReparsePoint) -eq 0) { $stk.Push($d) } } catch {} }
      } catch {}
    }
    $raw
  } else {
    Get-NoJunctionStats $measureDir
  }
  return @{ linked = $linked; target = $target; bytes = [long]$st.bytes }
}
function Collect-ZaloDataStats {
  $zd = Join-Path $env:APPDATA 'ZaloData'
  if (!(Test-Path -LiteralPath $zd)) {
    return @{ accessible = $false; onCBytes = 0L; onDBytes = 0L; totalBytes = 0L; cacheBytes = 0L; junctions = @{ media = @{ linked = $false; target = $null; bytes = 0L }; database = @{ linked = $false; target = $null; bytes = 0L } } }
  }
  $onC = [long](Get-NoJunctionStats $zd).bytes
  $media = Inspect-ZaloFolder $zd 'media'
  $db = Inspect-ZaloFolder $zd 'Database'
  [long]$onD = 0
  if ($media.linked) { $onD += [long]$media.bytes }
  if ($db.linked) { $onD += [long]$db.bytes }
  [long]$cache = 0
  foreach ($rel in @(${cacheSubdirsPs})) {
    $cp = Join-Path $zd $rel
    if (Test-Path -LiteralPath $cp) { $cache += [long](Get-NoJunctionStats $cp).bytes }
  }
  return @{
    accessible = $true
    onCBytes = $onC
    onDBytes = $onD
    totalBytes = ($onC + $onD)
    cacheBytes = $cache
    junctions = @{ media = $media; database = $db }
  }
}
`;
}

async function runZaloRemotePsScriptAsync({
  winUser,
  opsBaseDir,
  psBody,
  timeoutMs = 240_000,
  remoteExecutor = null,
}) {
  const opsDir = path.join(opsBaseDir || DEFAULT_ZALO_PORTABLE_ROOT, ".p0001-remote-ops");
  fs.mkdirSync(opsDir, { recursive: true });
  const runId = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const scriptPath = path.join(opsDir, `zalo-op-${runId}.ps1`);
  const resultPath = path.join(opsDir, `zalo-res-${runId}.json`);
  const resTmpPath = `${resultPath}.tmp`;

  const fullPs = `${buildRemoteZaloStatsPsSnippet()}
$ErrorActionPreference = 'Stop'
$resPath = '${escapePsSingle(resultPath)}'
$resTmp = '${escapePsSingle(resTmpPath)}'
function Write-OpResult($obj) {
  $json = $obj | ConvertTo-Json -Depth 6 -Compress
  [IO.File]::WriteAllText($resTmp, $json, [Text.UTF8Encoding]::new($false))
  Move-Item -LiteralPath $resTmp -Destination $resPath -Force
}
try {
${psBody}
} catch {
  Write-OpResult @{ ok = $false; error = $_.Exception.Message }
}
`;
  fs.writeFileSync(scriptPath, fullPs, "utf8");

  try {
    if (typeof remoteExecutor === "function") {
      await remoteExecutor({ winUser, scriptPath, resultPath, opsDir });
    } else {
      await execFileAsync(
        "runas.exe",
        [
          "/savecred",
          `/user:Admin\\${winUser}`,
          buildHeadlessPowerShellCommandForRunas(`-ExecutionPolicy Bypass -File "${scriptPath}"`),
        ],
        { windowsHide: true, timeout: 20_000 },
      );
    }
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (fs.existsSync(resultPath)) {
        const raw = fs.readFileSync(resultPath, "utf8");
        return JSON.parse(raw);
      }
      await new Promise((r) => setTimeout(r, 300));
    }
    return { ok: false, error: `Timed out waiting for ${winUser} remote operation (${Math.round(timeoutMs / 1000)}s)` };
  } finally {
    try {
      fs.rmSync(scriptPath, { force: true });
    } catch {
      /* ignore */
    }
    try {
      fs.rmSync(resultPath, { force: true });
      fs.rmSync(resTmpPath, { force: true });
    } catch {
      /* ignore */
    }
  }
}

function hydrateStatsLabels(stats) {
  const media = stats?.junctions?.media || { linked: false, target: null, bytes: 0 };
  const database = stats?.junctions?.database || { linked: false, target: null, bytes: 0 };
  return {
    accessible: Boolean(stats?.accessible),
    totalBytes: Number(stats?.totalBytes) || 0,
    onCBytes: Number(stats?.onCBytes) || 0,
    onDBytes: Number(stats?.onDBytes) || 0,
    cacheBytes: Number(stats?.cacheBytes) || 0,
    junctions: {
      media: {
        linked: Boolean(media.linked),
        target: media.target || null,
        bytes: Number(media.bytes) || 0,
        label: formatBytes(Number(media.bytes) || 0),
      },
      database: {
        linked: Boolean(database.linked),
        target: database.target || null,
        bytes: Number(database.bytes) || 0,
        label: formatBytes(Number(database.bytes) || 0),
      },
    },
  };
}

/**
 * Probes exact ZaloData disk/junction/cache stats for cross-user Windows profiles (`PC02..PC06`)
 * via saved `runas /savecred` credentials and persists them for instant P0001 display.
 */
export async function probeRemoteZaloDataStats({
  instanceIds = null,
  localProgramsDir = null,
  portableRootDir = DEFAULT_ZALO_PORTABLE_ROOT,
  remoteExecutor = null,
} = {}) {
  await refreshSavedCredCacheAsync();
  const snap = inspectZaloDesktopInstances({
    localProgramsDir,
    portableRootDir,
    forceProcessRefresh: false,
  });
  const currentWinUser = os.userInfo().username || process.env.USERNAME || "CzP";
  const reqSet = Array.isArray(instanceIds) && instanceIds.length > 0 ? new Set(instanceIds) : null;
  const targets = (snap.instances || []).filter((inst) => {
    if (!inst.installed) return false;
    if (reqSet && !reqSet.has(inst.id)) return false;
    const isCurrent = !inst.winUser || inst.winUser.toLowerCase() === currentWinUser.toLowerCase();
    return !isCurrent;
  });

  const probed = [];
  const skipped = [];
  const errors = [];

  await Promise.all(
    targets.map(async (inst) => {
      if (!inst.savedCredReady) {
        skipped.push({ id: inst.id, reason: `Needs /savecred (${inst.winUser})` });
        return;
      }
      const res = await runZaloRemotePsScriptAsync({
        winUser: inst.winUser,
        opsBaseDir: portableRootDir || DEFAULT_ZALO_PORTABLE_ROOT,
        psBody: `$s = Collect-ZaloDataStats\nWrite-OpResult @{ ok = $true; stats = $s }`,
        timeoutMs: 45_000,
        remoteExecutor,
      });
      if (res?.ok && res?.stats) {
        const hydrated = hydrateStatsLabels(res.stats);
        savePersistedRemoteStatsEntry(inst.winUser, hydrated);
        probed.push({
          id: inst.id,
          name: inst.name,
          winUser: inst.winUser,
          onCLabel: formatBytes(hydrated.onCBytes),
          onDLabel: formatBytes(hydrated.onDBytes),
          cacheLabel: formatBytes(hydrated.cacheBytes),
        });
      } else {
        errors.push({ id: inst.id, name: inst.name, error: res?.error || "Probe failed" });
      }
    }),
  );

  return {
    ok: errors.length === 0,
    probed,
    skipped,
    errors,
    message:
      probed.length > 0
        ? `Probed ZaloData for ${probed.length} profile(s): ${probed.map((p) => `${p.winUser} (C: ${p.onCLabel || "0 B"}, D: ${p.onDLabel || "0 B"})`).join(", ")}`
        : skipped.length > 0
          ? `Skipped ${skipped.length} profile(s): ${skipped[0].reason}`
          : errors[0]?.error || "No remote Zalo profiles targeted",
  };
}

/**
 * Automatically updates `zalo-remote-stats.json` for secondary profiles whose stats are missing
 * or older than `intervalMs` (default 24h) — runs silently in `Daemon-Zalo-Fleet-Sync`.
 */
export async function probeRemoteZaloDataStatsIfDue({
  intervalMs = 24 * 3600_000,
  excludeUsers = ["pc07"],
  localProgramsDir = null,
  portableRootDir = DEFAULT_ZALO_PORTABLE_ROOT,
} = {}) {
  await refreshSavedCredCacheAsync();
  const excluded = new Set((excludeUsers || []).map((u) => String(u).toLowerCase()));
  const persisted = loadPersistedRemoteStatsMap();
  const snap = inspectZaloDesktopInstances({ localProgramsDir, portableRootDir, forceProcessRefresh: false });
  const currentWinUser = os.userInfo().username || process.env.USERNAME || "CzP";
  const now = Date.now();
  const dueIds = [];
  for (const inst of snap.instances || []) {
    if (!inst.installed || !inst.winUser) continue;
    const uLow = inst.winUser.toLowerCase();
    if (uLow === currentWinUser.toLowerCase() || excluded.has(uLow) || !inst.savedCredReady) continue;
    const hit = persisted[uLow];
    const updatedMs = hit?.updatedAt ? Date.parse(hit.updatedAt) : 0;
    if (!hit || !Number.isFinite(updatedMs) || now - updatedMs >= intervalMs) {
      dueIds.push(inst.id);
    }
  }
  if (dueIds.length === 0) return { ok: true, skipped: true, reason: "fresh" };
  return probeRemoteZaloDataStats({ instanceIds: dueIds, localProgramsDir, portableRootDir });
}

/**
 * Safely offloads an allowlisted heavy ZaloData folder (`media` or `Database`)
 * to Drive D: (`D:\Apps Data\Zalo\ZaloData-Primary\<folder>` or `ZaloData-<Instance>\<folder>`)
 * and replaces the C: folder with an NTFS Directory Junction (`mklink /J`).
 * Supports both active user and `/savecred` secondary users (`PC02..PC06`).
 * Refuses if Zalo is currently running or if source vs copied file/byte counts do not match.
 */
export async function offloadZaloDataToDriveD({
  instanceId = "zalo:primary",
  folder,
  localProgramsDir = null,
  portableRootDir = DEFAULT_ZALO_PORTABLE_ROOT,
  targetBaseDir = null,
  zaloDataDirOverride = null,
  runningProcesses = null,
  remoteExecutor = null,
  force = false,
} = {}) {
  const safeFolder = String(folder || "").trim();
  if (!ZALO_SAFE_OFFLOAD_FOLDERS.has(safeFolder)) {
    return {
      ok: false,
      error: `Folder '${safeFolder}' is not allowlisted for Drive D: offload (only 'media' or 'Database' allowed).`,
    };
  }

  await refreshSavedCredCacheAsync();
  const snap = inspectZaloDesktopInstances({
    localProgramsDir,
    portableRootDir,
    runningProcesses,
    forceProcessRefresh: runningProcesses == null,
  });
  const inst = snap.instances.find((i) => i.id === instanceId);
  if (!inst || !inst.installed) {
    return { ok: false, error: `Zalo instance ${instanceId} not found or not installed.` };
  }
  if (inst.isRunning) {
    return {
      ok: false,
      error: `${inst.name} is currently running (PID ${inst.runningPids[0]}). Stop Zalo before offloading ${safeFolder}.`,
    };
  }

  const currentWinUser = os.userInfo().username || process.env.USERNAME || "CzP";
  const isCurrentUser =
    Boolean(zaloDataDirOverride) || !inst.winUser || inst.winUser.toLowerCase() === currentWinUser.toLowerCase();

  const sanitizedInstance = inst.folderName.replace(/[^a-zA-Z0-9_-]/g, "") || "Primary";
  const resolvedBase =
    targetBaseDir ||
    path.join(
      portableRootDir || DEFAULT_ZALO_PORTABLE_ROOT,
      inst.kind === "primary" ? "ZaloData-Primary" : `ZaloData-${sanitizedInstance}`,
    );
  const destDir = path.join(resolvedBase, safeFolder);

  if (!isCurrentUser) {
    if (!inst.savedCredReady) {
      return {
        ok: false,
        error: `${inst.name} (${inst.winUser}) needs one-time /savecred before remote offload.`,
      };
    }
    fs.mkdirSync(destDir, { recursive: true });
    const forceFlag = force ? "$true" : "$false";
    const remotePs = `
$zd = Join-Path $env:APPDATA 'ZaloData'
$srcDir = Join-Path $zd '${escapePsSingle(safeFolder)}'
$destDir = '${escapePsSingle(destDir)}'
if (!(Test-Path -LiteralPath $srcDir)) {
  Write-OpResult @{ ok = $false; error = "Source folder does not exist: $srcDir" }; return
}
$it = Get-Item -LiteralPath $srcDir -Force
if (($it.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
  $tgt = if ($it.Target -is [array]) { [string]$it.Target[0] } else { [string]$it.Target }
  $st = Collect-ZaloDataStats
  Write-OpResult @{ ok = $true; alreadyLinked = $true; srcDir = $srcDir; destDir = $tgt; stats = $st }; return
}
$srcSt = Get-NoJunctionStats $srcDir
if (!(Test-Path -LiteralPath $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
& robocopy.exe $srcDir $destDir /MIR /MT:8 /R:2 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Null
$rc = $LASTEXITCODE
if ($rc -ge 8) {
  Write-OpResult @{ ok = $false; error = "robocopy failed with exit code $rc" }; return
}
$dstSt = Get-NoJunctionStats $destDir
if (-not ${forceFlag} -and ($dstSt.files -ne $srcSt.files -or $dstSt.bytes -ne $srcSt.bytes)) {
  Write-OpResult @{ ok = $false; error = "Copy verification mismatch for ${escapePsSingle(safeFolder)}: src=$($srcSt.files) files ($($srcSt.bytes) B) vs dst=$($dstSt.files) files ($($dstSt.bytes) B). Original untouched." }; return
}
$bakDir = Join-Path $zd ("${escapePsSingle(safeFolder)}.offload-bak-" + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())
Rename-Item -LiteralPath $srcDir -NewName ([IO.Path]::GetFileName($bakDir)) -Force
try {
  & cmd.exe /c mklink /J "$srcDir" "$destDir" | Out-Null
  $chk = Get-Item -LiteralPath $srcDir -Force
  if (($chk.Attributes -band [IO.FileAttributes]::ReparsePoint) -eq 0) {
    throw "Junction verification failed at $srcDir"
  }
} catch {
  if (Test-Path -LiteralPath $srcDir) { Remove-Item -LiteralPath $srcDir -Recurse -Force -ErrorAction SilentlyContinue }
  if (Test-Path -LiteralPath $bakDir) { Rename-Item -LiteralPath $bakDir -NewName '${escapePsSingle(safeFolder)}' -Force -ErrorAction SilentlyContinue }
  Write-OpResult @{ ok = $false; error = "Failed creating NTFS junction: $($_.Exception.Message)" }; return
}
Remove-Item -LiteralPath $bakDir -Recurse -Force -ErrorAction SilentlyContinue
$st = Collect-ZaloDataStats
Write-OpResult @{ ok = $true; srcDir = $srcDir; destDir = $destDir; files = [long]$dstSt.files; bytes = [long]$dstSt.bytes; stats = $st }
`;
    const remoteRes = await runZaloRemotePsScriptAsync({
      winUser: inst.winUser,
      opsBaseDir: portableRootDir || DEFAULT_ZALO_PORTABLE_ROOT,
      psBody: remotePs,
      timeoutMs: 240_000,
      remoteExecutor,
    });
    if (!remoteRes?.ok) {
      return { ok: false, error: remoteRes?.error || `Remote offload failed for ${inst.name}` };
    }
    if (remoteRes.stats) {
      savePersistedRemoteStatsEntry(inst.winUser, hydrateStatsLabels(remoteRes.stats));
    }
    dirSizeCache.clear();
    if (remoteRes.alreadyLinked) {
      return {
        ok: true,
        alreadyLinked: true,
        instanceId: inst.id,
        folder: safeFolder,
        srcDir: remoteRes.srcDir,
        destDir: remoteRes.destDir || destDir,
        message: `${safeFolder} (${inst.winUser}) is already an NTFS junction -> ${remoteRes.destDir || destDir}`,
      };
    }
    const bytes = Number(remoteRes.bytes) || 0;
    const files = Number(remoteRes.files) || 0;
    return {
      ok: true,
      remote: true,
      instanceId: inst.id,
      folder: safeFolder,
      srcDir: remoteRes.srcDir,
      destDir: remoteRes.destDir || destDir,
      files,
      bytes,
      bytesLabel: formatBytes(bytes),
      message: `Offloaded ${inst.winUser} ${safeFolder} (${formatBytes(bytes)}, ${files} files) -> ${remoteRes.destDir || destDir}`,
    };
  }

  const dataRootDir = zaloDataDirOverride || inst.zaloDataPath;
  if (!dataRootDir) {
    return { ok: false, error: `Cannot resolve ZaloData path for ${inst.name}.` };
  }

  const srcDir = path.join(dataRootDir, safeFolder);
  if (!fs.existsSync(srcDir)) {
    return { ok: false, error: `Source folder does not exist: ${srcDir}` };
  }
  try {
    const lst = fs.lstatSync(srcDir);
    if (lst.isSymbolicLink()) {
      const target = path.resolve(dataRootDir, fs.readlinkSync(srcDir));
      return {
        ok: true,
        alreadyLinked: true,
        instanceId: inst.id,
        folder: safeFolder,
        srcDir,
        destDir: target,
        message: `${safeFolder} is already an NTFS junction -> ${target}`,
      };
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  if (path.resolve(srcDir).toLowerCase() === path.resolve(destDir).toLowerCase()) {
    return { ok: false, error: `Source and destination are identical (${srcDir}).` };
  }

  const srcStats = await countDirectoryFilesAndBytesAsync(srcDir, 12);
  fs.mkdirSync(destDir, { recursive: true });
  await copyDirectoryWithRobocopyFallback(srcDir, destDir);
  const dstStats = await countDirectoryFilesAndBytesAsync(destDir, 12);
  if (!force && (dstStats.files !== srcStats.files || dstStats.bytes !== srcStats.bytes)) {
    return {
      ok: false,
      error: `Copy verification mismatch for ${safeFolder}: src=${srcStats.files} files (${srcStats.bytes} B) vs dst=${dstStats.files} files (${dstStats.bytes} B). Original folder untouched.`,
    };
  }

  const bakDir = path.join(dataRootDir, `${safeFolder}.offload-bak-${Date.now()}`);
  try {
    fs.renameSync(srcDir, bakDir);
  } catch (err) {
    return {
      ok: false,
      error: `Unable to lock/rename ${srcDir} (close any lingering Zalo helper processes): ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  try {
    if (process.platform === "win32") {
      await execFileAsync("cmd.exe", ["/c", "mklink", "/J", srcDir, destDir], {
        windowsHide: true,
        timeout: 15_000,
      });
    } else {
      fs.symlinkSync(destDir, srcDir, "dir");
    }
    const createdLstat = fs.lstatSync(srcDir);
    if (!createdLstat.isSymbolicLink()) {
      throw new Error(`Junction verification failed at ${srcDir}`);
    }
  } catch (err) {
    try {
      if (fs.existsSync(srcDir)) fs.rmSync(srcDir, { recursive: true, force: true });
      fs.renameSync(bakDir, srcDir);
    } catch {
      /* keep backup intact for manual recovery */
    }
    return {
      ok: false,
      error: `Failed creating NTFS junction for ${safeFolder}: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  try {
    fs.rmSync(bakDir, { recursive: true, force: true });
  } catch {
    /* non-fatal cleanup error; junction is already live */
  }

  zaloDataStatsCache.delete(path.resolve(dataRootDir).toLowerCase());
  dirSizeCache.clear();

  return {
    ok: true,
    instanceId: inst.id,
    folder: safeFolder,
    srcDir,
    destDir,
    files: dstStats.files,
    bytes: dstStats.bytes,
    bytesLabel: formatBytes(dstStats.bytes),
    message: `Offloaded ${safeFolder} (${formatBytes(dstStats.bytes)}, ${dstStats.files} files) -> ${destDir}`,
  };
}
