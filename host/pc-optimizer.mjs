/**
 * P0001 Desk Console — Native Win32 PC Diagnostics & Safe Optimizer (`koffi`).
 *
 * Scans all Windows processes in ~150ms via Toolhelp32 + OpenProcess + GetGuiResources
 * + K32GetProcessMemoryInfo + GetProcessHandleCount + GetProcessGroupAffinity (zero WMI).
 *
 * Safe optimization actions:
 * - `trim-ram`: K32EmptyWorkingSet on background process families (reclaims unused working set without closing apps)
 * - `clean-smoke`: Closes leaked tabs in headless Agent Smoke Pool profiles (`9990–9999` only; never touches user profiles)
 * - `prune-junk`: Runs `Tool/scripts/prune-workspace-junk.mjs --apply --root-only`
 */
import { execFile, execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { promisify } from "node:util";
import { DEV_ROOT, listDevTasks, runTask } from "./windows.mjs";

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);
let cachedLocalSqliteOpen = null;

function openLocalSqlite(filePath, { readOnly = false } = {}) {
  if (!cachedLocalSqliteOpen) {
    let BetterSqlite = null;
    if (DEV_ROOT) {
      try {
        const p0003Pkg = path.join(DEV_ROOT, "Tool", "P0003-Stealth-Browser-Console", "package.json");
        if (fs.existsSync(p0003Pkg)) {
          BetterSqlite = createRequire(p0003Pkg)("better-sqlite3");
        }
      } catch {
        /* fall back to node:sqlite */
      }
    }
    if (BetterSqlite) {
      cachedLocalSqliteOpen = (fp, ro) => new BetterSqlite(fp, ro ? { readonly: true } : {});
    } else {
      const { DatabaseSync } = require("node:sqlite");
      cachedLocalSqliteOpen = (fp, ro) =>
        new DatabaseSync(fp, ro ? { open: true, readOnly: true } : { open: true });
    }
  }
  return cachedLocalSqliteOpen(filePath, readOnly);
}

const TRIM_TARGET_PROCESSES = new Set([
  "chrome.exe",
  "chrome-headless.exe",
  "zalo.exe",
  "zalocall.exe",
  "msedgewebview2.exe",
  "telegram.exe",
  "node.exe",
]);

const FAMILY_LABELS = [
  { match: /^chrome(-headless)?\.exe$/i, label: "Chrome / Stealth" },
  { match: /^zalo(call|cap)?\.exe$/i, label: "Zalo" },
  { match: /^cursor\.exe$/i, label: "Cursor" },
  { match: /^antigravity\.exe$|^language_server/i, label: "Antigravity" },
  { match: /^telegram\.exe$/i, label: "Telegram" },
  { match: /^node\.exe$/i, label: "Node.js" },
  { match: /^powershell\.exe$/i, label: "PowerShell" },
];

let win32Api = null;
let win32InitTried = false;

function getWin32Api() {
  if (win32InitTried) return win32Api;
  win32InitTried = true;
  if (process.platform !== "win32") return null;
  try {
    const koffi = require("koffi");
    const kernel32 = koffi.load("kernel32.dll");
    const user32 = koffi.load("user32.dll");
    const ntdll = koffi.load("ntdll.dll");

    const PROCESSENTRY32W = koffi.struct("DESK_PROCESSENTRY32W", {
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

    const PROCESS_MEMORY_COUNTERS = koffi.struct("DESK_PROCESS_MEMORY_COUNTERS", {
      cb: "uint32_t",
      PageFaultCount: "uint32_t",
      PeakWorkingSetSize: "uintptr_t",
      WorkingSetSize: "uintptr_t",
      QuotaPeakPagedPoolUsage: "uintptr_t",
      QuotaPagedPoolUsage: "uintptr_t",
      QuotaPeakNonPagedPoolUsage: "uintptr_t",
      QuotaNonPagedPoolUsage: "uintptr_t",
      PagefileUsage: "uintptr_t",
      PeakPagefileUsage: "uintptr_t",
    });

    const THREADENTRY32 = koffi.struct("DESK_THREADENTRY32", {
      dwSize: "uint32_t",
      cntUsage: "uint32_t",
      th32ThreadID: "uint32_t",
      th32OwnerProcessID: "uint32_t",
      tpBasePri: "int32_t",
      tpDeltaPri: "int32_t",
      dwFlags: "uint32_t",
    });

    const GROUP_AFFINITY = koffi.struct("DESK_GROUP_AFFINITY", {
      Mask: "uintptr_t",
      Group: "uint16_t",
      Reserved: koffi.array("uint16_t", 3, "Array"),
    });

    win32Api = {
      koffi,
      PROCESSENTRY32W,
      PROCESS_MEMORY_COUNTERS,
      THREADENTRY32,
      GROUP_AFFINITY,
      CreateToolhelp32Snapshot: kernel32.func(
        "void* __stdcall CreateToolhelp32Snapshot(uint32_t dwFlags, uint32_t th32ProcessID)",
      ),
      Process32FirstW: kernel32.func(
        "bool __stdcall Process32FirstW(void* hSnapshot, _Inout_ DESK_PROCESSENTRY32W* lppe)",
      ),
      Process32NextW: kernel32.func(
        "bool __stdcall Process32NextW(void* hSnapshot, _Inout_ DESK_PROCESSENTRY32W* lppe)",
      ),
      Thread32First: kernel32.func(
        "bool __stdcall Thread32First(void* hSnapshot, _Inout_ DESK_THREADENTRY32* lpte)",
      ),
      Thread32Next: kernel32.func(
        "bool __stdcall Thread32Next(void* hSnapshot, _Inout_ DESK_THREADENTRY32* lpte)",
      ),
      OpenProcess: kernel32.func(
        "void* __stdcall OpenProcess(uint32_t dwDesiredAccess, bool bInheritHandle, uint32_t dwProcessId)",
      ),
      OpenThread: kernel32.func(
        "void* __stdcall OpenThread(uint32_t dwDesiredAccess, bool bInheritHandle, uint32_t dwThreadId)",
      ),
      SetThreadGroupAffinity: kernel32.func(
        "bool __stdcall SetThreadGroupAffinity(void* hThread, const DESK_GROUP_AFFINITY* GroupAffinity, _Out_ DESK_GROUP_AFFINITY* PreviousGroupAffinity)",
      ),
      CloseHandle: kernel32.func("bool __stdcall CloseHandle(void* hObject)"),
      TerminateProcess: kernel32.func("bool __stdcall TerminateProcess(void* hProcess, uint32_t uExitCode)"),
      NtQueryInformationProcess: ntdll.func(
        "int __stdcall NtQueryInformationProcess(void* ProcessHandle, int ProcessInformationClass, void* ProcessInformation, uint32_t ProcessInformationLength, uint32_t* ReturnLength)",
      ),
      GetProcessHandleCount: kernel32.func(
        "bool __stdcall GetProcessHandleCount(void* hProcess, _Out_ uint32_t* pdwHandleCount)",
      ),
      K32GetProcessMemoryInfo: kernel32.func(
        "bool __stdcall K32GetProcessMemoryInfo(void* hProcess, _Out_ DESK_PROCESS_MEMORY_COUNTERS* ppsmemCounters, uint32_t cb)",
      ),
      K32EmptyWorkingSet: kernel32.func("bool __stdcall K32EmptyWorkingSet(void* hProcess)"),
      GetProcessGroupAffinity: kernel32.func(
        "bool __stdcall GetProcessGroupAffinity(void* hProcess, _Inout_ uint16_t* GroupCount, _Out_ uint16_t* GroupArray)",
      ),
      GetActiveProcessorGroupCount: kernel32.func("uint16_t __stdcall GetActiveProcessorGroupCount()"),
      GetActiveProcessorCount: kernel32.func(
        "uint32_t __stdcall GetActiveProcessorCount(uint16_t GroupNumber)",
      ),
      GetProcessTimes: kernel32.func(
        "bool __stdcall GetProcessTimes(void* hProcess, _Out_ uint64_t* lpCreationTime, _Out_ uint64_t* lpExitTime, _Out_ uint64_t* lpKernelTime, _Out_ uint64_t* lpUserTime)",
      ),
      SetPriorityClass: kernel32.func(
        "bool __stdcall SetPriorityClass(void* hProcess, uint32_t dwPriorityClass)",
      ),
      SetProcessAffinityMask: kernel32.func(
        "bool __stdcall SetProcessAffinityMask(void* hProcess, uintptr_t dwProcessAffinityMask)",
      ),
      CreateJobObjectW: kernel32.func("void* __stdcall CreateJobObjectW(void* lpJobAttributes, const char16_t* lpName)"),
      SetInformationJobObject: kernel32.func(
        "bool __stdcall SetInformationJobObject(void* hJob, int JobObjectInfoClass, const DESK_GROUP_AFFINITY* lpJobObjectInfo, uint32_t cbJobObjectInfoLength)",
      ),
      AssignProcessToJobObject: kernel32.func(
        "bool __stdcall AssignProcessToJobObject(void* hJob, void* hProcess)",
      ),
      GetGuiResources: user32.func("uint32_t __stdcall GetGuiResources(void* hProcess, uint32_t uiFlags)"),
      FindWindowExW: user32.func(
        "void* __stdcall FindWindowExW(void* hWndParent, void* hWndChildAfter, str16 lpszClass, str16 lpszWindow)",
      ),
      IsWindowVisible: user32.func("bool __stdcall IsWindowVisible(void* hWnd)"),
      ShowWindow: user32.func("bool __stdcall ShowWindow(void* hWnd, int nCmdShow)"),
      GetWindowTextW: user32.func(
        "int __stdcall GetWindowTextW(void* hWnd, _Out_ uint16_t* lpString, int nMaxCount)",
      ),
    };
  } catch {
    win32Api = null;
  }
  return win32Api;
}

export function readProcessorGroupTopology() {
  const api = getWin32Api();
  if (!api) {
    const count = os.cpus().length;
    return { groupCount: 1, logicalCpuCount: count, groupThreads: [count] };
  }
  try {
    const groupCount = Math.max(1, Number(api.GetActiveProcessorGroupCount()) || 1);
    const groupThreads = [];
    for (let g = 0; g < groupCount; g++) {
      groupThreads.push(Number(api.GetActiveProcessorCount(g)) || 0);
    }
    const logicalCpuCount = groupThreads.reduce((a, b) => a + b, 0) || os.cpus().length;
    return { groupCount, logicalCpuCount, groupThreads };
  } catch {
    const count = os.cpus().length;
    return { groupCount: 1, logicalCpuCount: count, groupThreads: [count] };
  }
}

export function isProcessRunningNative(targetExeName = "cursor.exe") {
  const api = getWin32Api();
  if (!api) return null;
  const snap = api.CreateToolhelp32Snapshot(0x00000002, 0);
  if (!snap) return null;
  const pe = { dwSize: api.koffi.sizeof(api.PROCESSENTRY32W) };
  const needle = String(targetExeName || "").toLowerCase();
  try {
    if (api.Process32FirstW(snap, pe)) {
      do {
        const chars = [];
        for (let i = 0; i < 260; i++) {
          if (!pe.szExeFile[i]) break;
          chars.push(pe.szExeFile[i]);
        }
        if (String.fromCharCode(...chars).toLowerCase() === needle) {
          return true;
        }
      } while (api.Process32NextW(snap, pe));
    }
    return false;
  } finally {
    api.CloseHandle(snap);
  }
}

export function scanNativeProcesses() {
  const t0 = Date.now();
  const api = getWin32Api();
  const topology = readProcessorGroupTopology();
  if (!api) {
    return {
      ok: true,
      scanMs: 0,
      topology,
      processCount: 0,
      totalHandles: 0,
      totalGdi: 0,
      totalUser: 0,
      affinityCounts: {},
      processes: [],
    };
  }

  const snap = api.CreateToolhelp32Snapshot(0x00000002, 0);
  if (!snap) {
    return {
      ok: false,
      scanMs: Date.now() - t0,
      topology,
      processCount: 0,
      totalHandles: 0,
      totalGdi: 0,
      totalUser: 0,
      affinityCounts: {},
      processes: [],
    };
  }

  const pe = { dwSize: api.koffi.sizeof(api.PROCESSENTRY32W) };
  const processes = [];
  let totalHandles = 0;
  let totalGdi = 0;
  let totalUser = 0;
  const affinityCounts = {};

  try {
    if (api.Process32FirstW(snap, pe)) {
      do {
        const chars = [];
        for (let i = 0; i < 260; i++) {
          if (!pe.szExeFile[i]) break;
          chars.push(pe.szExeFile[i]);
        }
        const name = String.fromCharCode(...chars);
        const pid = Number(pe.th32ProcessID);
        const ppid = Number(pe.th32ParentProcessID);
        const threads = Number(pe.cntThreads);
        let handles = 0;
        let gdi = 0;
        let user = 0;
        let workingSetBytes = 0;
        let group = "0";

        if (pid > 4) {
          const h = api.OpenProcess(0x1000, false, pid);
          if (h) {
            try {
              const hc = [0];
              if (api.GetProcessHandleCount(h, hc)) handles = Number(hc[0]) || 0;
              const mc = { cb: api.koffi.sizeof(api.PROCESS_MEMORY_COUNTERS) };
              if (api.K32GetProcessMemoryInfo(h, mc, mc.cb)) {
                workingSetBytes = Number(mc.WorkingSetSize) || 0;
              }
              gdi = Number(api.GetGuiResources(h, 0)) || 0;
              user = Number(api.GetGuiResources(h, 1)) || 0;
              const gc = [4];
              const ga = [0, 0, 0, 0];
              if (api.GetProcessGroupAffinity(h, gc, ga) && gc[0] > 0) {
                group = ga.slice(0, gc[0]).join(",");
                affinityCounts[group] = (affinityCounts[group] || 0) + 1;
              }
            } finally {
              api.CloseHandle(h);
            }
          }
        }

        totalHandles += handles;
        totalGdi += gdi;
        totalUser += user;
        processes.push({
          pid,
          ppid,
          name,
          threads,
          ramMB: Math.round((workingSetBytes / 1048576) * 10) / 10,
          workingSetBytes,
          handles,
          gdi,
          user,
          group,
        });
      } while (api.Process32NextW(snap, pe));
    }
  } finally {
    api.CloseHandle(snap);
  }

  return {
    ok: true,
    scanMs: Date.now() - t0,
    topology,
    processCount: processes.length,
    totalHandles,
    totalGdi,
    totalUser,
    affinityCounts,
    processes,
  };
}

/** Track when a headless Stealth browser (`r.headless === true`) was first observed running. */
const headlessFarmSeenAt = new Map();

function extractFourDigitProfileNum(code) {
  const m = String(code || "").trim().match(/^(\d{4})\b/);
  return m ? Number(m[1]) : NaN;
}

function isUserProtectedHeadedProfileCode(code) {
  const num = extractFourDigitProfileNum(code);
  if (!Number.isFinite(num)) return false;
  if (num >= 1 && num <= 21) return true;
  if (num === 59 || num === 69 || num === 70 || num === 93) return true;
  if (num >= 8000 && num <= 8999) return true;
  if (num >= 9990 && num <= 9999) return true;
  return false;
}

function isProtectedOrSmokeProfileCode(code) {
  const num = extractFourDigitProfileNum(code);
  if (!Number.isFinite(num)) return false;
  // Customer profiles (8000-8999) and user profiles (0001-0021, 0059, 0069) are strictly protected.
  // Dedicated Agent Smoke Pool (9990-9999) is handled by the smoke tab cleaner.
  if (num >= 1 && num <= 21) return true;
  if (num === 59 || num === 69) return true;
  if (num >= 8000 && num <= 8999) return true;
  if (num >= 9990 && num <= 9999) return true;
  return false;
}

/**
 * Inspect Stealth Browser Agent Smoke Pool (`9990–9999`) for leaked background tabs
 * AND non-protected headless farm profiles (`0022–5999`, excluding `0059`, `0069`) left open in headless mode.
 * Never touches headed profiles (`headless: false`) or user Stealth profiles (`0001–0021`, `0059`, `0069`).
 */
export async function inspectSmokePoolBrowsers() {
  const runningSmoke = [];
  const leakedHeadlessFarm = [];
  let totalSmokeTabs = 0;
  try {
    const runRes = await fetch("http://127.0.0.1:6003/api/sessions/running", {
      signal: AbortSignal.timeout(4000),
    });
    if (!runRes.ok) {
      return {
        reachable: false,
        runningCount: 0,
        totalSmokeTabs: 0,
        leakedHeadlessFarmCount: 0,
        leakedHeadlessFarm: [],
        profiles: [],
      };
    }
    const runData = await runRes.json().catch(() => ({}));
    const runRows = runData?.sessions || runData?.running || runData?.profiles || [];
    const now = Date.now();
    const activeHeadlessIds = new Set();
    const trackedDirs = [];
    const trackedIds = [];
    const trackedPorts = [];
    const candidates = [];
    for (const r of Array.isArray(runRows) ? runRows : []) {
      const id = String(r.id || r.profileId || "").trim();
      const code = String(r.name || r.code || "").trim();
      if (r.userDataDir) trackedDirs.push(String(r.userDataDir).toLowerCase());
      if (id) trackedIds.push(id.toLowerCase());
      if (Number(r.debugPort || 0) > 0) trackedPorts.push(Number(r.debugPort));
      if (!id) continue;
      const num = extractFourDigitProfileNum(code);
      if (Number.isFinite(num) && num >= 9990 && num <= 9999) {
        candidates.push({
          id,
          code,
          debugPort: Number(r.debugPort || 0),
        });
        continue;
      }
      const serverAnchorMs = Number(r.lastActivityAt || r.launchedAt || 0);
      const serverIdleMs = serverAnchorMs > 0 ? Math.max(0, now - serverAnchorMs) : 0;
      // Standing Order: NEVER auto-close any User Headed session (`headless !== true`).
      if (r.headless !== true) continue;
      if (isProtectedOrSmokeProfileCode(code)) continue;
      activeHeadlessIds.add(id);
      if (!headlessFarmSeenAt.has(id)) {
        headlessFarmSeenAt.set(id, serverAnchorMs > 0 ? serverAnchorMs : now);
      }
      leakedHeadlessFarm.push({
        id,
        code,
        debugPort: Number(r.debugPort || 0),
        ageMs: Math.max(serverIdleMs, now - (headlessFarmSeenAt.get(id) || now)),
      });
    }
    for (const key of headlessFarmSeenAt.keys()) {
      if (!activeHeadlessIds.has(key)) headlessFarmSeenAt.delete(key);
    }
    const probed = await Promise.all(
      candidates.map(async (c) => {
        let pageTabs = 0;
        if (c.debugPort > 0) {
          try {
            const tRes = await fetch(`http://127.0.0.1:${c.debugPort}/json/list`, {
              signal: AbortSignal.timeout(700),
            });
            if (tRes.ok) {
              const targets = await tRes.json();
              pageTabs = (Array.isArray(targets) ? targets : []).filter(
                (t) => t.type === "page" && t.url && t.url !== "about:blank",
              ).length;
            }
          } catch {
            /* ignore unreachable debug port */
          }
        }
        return { ...c, pageTabs };
      }),
    );
    for (const item of probed) {
      totalSmokeTabs += item.pageTabs;
      runningSmoke.push(item);
    }
    return {
      reachable: true,
      runningCount: runningSmoke.length,
      totalSmokeTabs,
      leakedHeadlessFarmCount: leakedHeadlessFarm.length,
      leakedHeadlessFarm,
      trackedDirs,
      trackedIds,
      trackedPorts,
      profiles: runningSmoke,
    };
  } catch {
    return {
      reachable: false,
      runningCount: 0,
      totalSmokeTabs: 0,
      leakedHeadlessFarmCount: 0,
      leakedHeadlessFarm: [],
      profiles: [],
    };
  }
}

export async function diagnosePcHost() {
  const scan = scanNativeProcesses();
  const smoke = await inspectSmokePoolBrowsers();
  const adaptiveThrottle = computeAdaptiveHeadlessCap(scan);
  const farmSupervisor = getFarmSupervisorStatus(scan, adaptiveThrottle);

  const familyMap = new Map();
  for (const def of FAMILY_LABELS) {
    familyMap.set(def.label, { label: def.label, count: 0, ramMB: 0, handles: 0, gdi: 0, user: 0 });
  }
  for (const p of scan.processes) {
    const matched = FAMILY_LABELS.find((f) => f.match.test(p.name));
    if (!matched) continue;
    const item = familyMap.get(matched.label);
    item.count += 1;
    item.ramMB = Math.round((item.ramMB + p.ramMB) * 10) / 10;
    item.handles += p.handles;
    item.gdi += p.gdi;
    item.user += p.user;
  }

  const alerts = [];

  for (const p of scan.processes) {
    if (p.handles >= 10000 && !/^evkey/i.test(p.name)) {
      alerts.push({
        id: `handle-leak-${p.pid}`,
        severity: p.handles >= 25000 ? "critical" : "warn",
        title: `${p.name} (PID ${p.pid}) holds ${p.handles.toLocaleString()} OS handles`,
        detail: `RAM ${p.ramMB} MB · Group ${p.group}. High per-process handle count increases NT kernel handle-table contention.`,
        action: "trim-ram",
      });
    } else if (p.gdi >= 3500 || p.user >= 3500) {
      alerts.push({
        id: `gui-leak-${p.pid}`,
        severity: "warn",
        title: `${p.name} (PID ${p.pid}) GUI objects high (GDI ${p.gdi} / USER ${p.user})`,
        detail: "Windows enforces a 10,000 GDI/USER object ceiling per process.",
        action: "trim-ram",
      });
    }
  }

  if (smoke.totalSmokeTabs > 0 || smoke.leakedHeadlessFarmCount > 0) {
    const parts = [];
    if (smoke.totalSmokeTabs > 0) {
      parts.push(`Smoke Pool: ${smoke.profiles.map((p) => `${p.code} (${p.pageTabs} tabs)`).join(", ")}`);
    }
    if (smoke.leakedHeadlessFarmCount > 0) {
      parts.push(`Headless Farm: ${smoke.leakedHeadlessFarm.map((p) => p.code).join(", ")}`);
    }
    alerts.push({
      id: "smoke-pool-tabs",
      severity: "warn",
      title: `Background Stealth leak: ${smoke.totalSmokeTabs} smoke tab(s) · ${smoke.leakedHeadlessFarmCount} headless farm profile(s)`,
      detail: `${parts.join(" · ")}. Auto-sweeper closes idle headless farm profiles (cap=${adaptiveThrottle.maxHeadlessConcurrent}, dwm=${adaptiveThrottle.dwmCpuSecPerSec}s/s) and leaked smoke tabs.`,
      action: "clean-smoke",
    });
  }

  if (scan.topology.groupCount > 1) {
    const g0 = scan.affinityCounts["0"] || 0;
    const g1 = scan.affinityCounts["1"] || 0;
    const gSplit = scan.affinityCounts["0,1"] || 0;
    alerts.push({
      id: "numa-processor-groups",
      severity: gSplit > 12 ? "warn" : "info",
      title: `Dual-Xeon 50/50 Core Shield (${scan.topology.groupCount} Processor Groups · ${scan.topology.logicalCpuCount} logical CPUs · Cores 0–3 Reserved)`,
      detail: `Group 0 (Cores 4–35): ${g0} procs · Group 1 (Cores 0–35): ${g1} procs · Split-group ("0,1"): ${gSplit}. Logical Cores 0–3 on Group 0 are reserved 100% for Mouse/Keyboard HID, csrss, dwm & EVKey64.`,
      action: "clean-smoke",
    });
  }

  const topProcesses = [...scan.processes]
    .filter((p) => p.pid > 4)
    .sort((a, b) => {
      const scoreA = a.handles * 0.4 + a.ramMB * 4 + (a.gdi + a.user) * 3;
      const scoreB = b.handles * 0.4 + b.ramMB * 4 + (b.gdi + b.user) * 3;
      return scoreB - scoreA;
    })
    .slice(0, 12);

  const ramTotalBytes = os.totalmem();
  const ramFreeBytes = os.freemem();
  const ramUsedBytes = Math.max(0, ramTotalBytes - ramFreeBytes);
  const antigravityBrain = readAntigravityBrainStats(false, scan);
  const storageIo = readStorageAndIoTelemetry();

  if (storageIo.volumes.length > 0) {
    const volText = storageIo.volumes
      .map((v) => `${v.drive} ${v.usedGB}/${v.totalGB} GB (${v.freeGB} GB free · ${v.probeLatencyMs}ms)`)
      .join(" · ");
    alerts.push({
      id: "storage-io-telemetry",
      severity: storageIo.ioStalled || storageIo.underPressure ? "warn" : "info",
      title: `NVMe Storage & I/O Telemetry: ${storageIo.totalUsedGB} / ${storageIo.totalCapacityGB} GB used · Max I/O Latency ${storageIo.maxLatencyMs} ms`,
      detail: `${volText}. Status: ${storageIo.ioStalled ? "SLC Cache / I/O Contention Detected" : "Healthy (<15ms latency)"}.`,
      action: "prune-junk",
    });
  }

  if (antigravityBrain.bloatedCount > 0 || antigravityBrain.lsRamMB >= 1800) {
    alerts.push({
      id: "antigravity-brain-bloat",
      severity: antigravityBrain.lsRamMB >= 2200 || antigravityBrain.totalMB >= 2500 ? "warn" : "info",
      title: `Antigravity Brain: ${antigravityBrain.sessionCount} active sessions · ${antigravityBrain.totalMB} MB (LS RAM ${antigravityBrain.lsRamMB} MB)`,
      detail: `${antigravityBrain.bloatedCount} session(s) exceed 2,500 steps (${antigravityBrain.bloatedIds.join(", ") || "none"}). Run /compact or Purge AGY Logs to free single-thread Renderer DOM load.`,
      action: "sweep-antigravity",
    });
  }

  return {
    ok: true,
    sampledAt: new Date().toISOString(),
    scanMs: scan.scanMs,
    summary: {
      processCount: scan.processCount,
      totalHandles: scan.totalHandles,
      totalGdi: scan.totalGdi,
      totalUser: scan.totalUser,
      ramUsedBytes,
      ramFreeBytes,
      ramTotalBytes,
      ramPercent: ramTotalBytes > 0 ? Math.round((ramUsedBytes / ramTotalBytes) * 1000) / 10 : 0,
      topology: {
        ...scan.topology,
        affinityCounts: scan.affinityCounts,
      },
      smokePool: smoke,
      adaptiveThrottle,
      antigravityBrain,
      storageIo,
      suppressedConsolePopups: totalSuppressedConsolePopups,
    },
    farmSupervisor,
    alerts,
    families: [...familyMap.values()].filter((f) => f.count > 0).sort((a, b) => b.ramMB - a.ramMB),
    topProcesses,
  };
}

export function trimBackgroundWorkingSet(options = {}) {
  const api = getWin32Api();
  const beforeFreeBytes = os.freemem();
  const totalBytes = os.totalmem();
  const usedRatio = totalBytes > 0 ? (totalBytes - beforeFreeBytes) / totalBytes : 0;
  // Never call K32EmptyWorkingSet when system RAM usage is < 80% unless explicitly forced,
  // because stripping active working sets when 80+ GB of RAM is free causes 15,000+ Page Faults/sec UI stalls.
  if (!api || (!options?.force && usedRatio < 0.8)) {
    return { ok: true, skipped: usedRatio < 0.8, trimmedProcesses: 0, beforeFreeBytes, afterFreeBytes: beforeFreeBytes, freedRamBytes: 0 };
  }

  const snap = api.CreateToolhelp32Snapshot(0x00000002, 0);
  if (!snap) {
    return { ok: false, trimmedProcesses: 0, beforeFreeBytes, afterFreeBytes: beforeFreeBytes, freedRamBytes: 0 };
  }

  const pe = { dwSize: api.koffi.sizeof(api.PROCESSENTRY32W) };
  const bloatedCandidates = [];
  const MIN_BLOATED_BYTES = 200 * 1048576; // 200 MB threshold avoids page-fault storms across hundreds of small helpers
  const MAX_TRIM_COUNT = 16;
  try {
    if (api.Process32FirstW(snap, pe)) {
      do {
        const chars = [];
        for (let i = 0; i < 260; i++) {
          if (!pe.szExeFile[i]) break;
          chars.push(pe.szExeFile[i]);
        }
        const name = String.fromCharCode(...chars).toLowerCase();
        const pid = Number(pe.th32ProcessID);
        if (pid !== process.pid && TRIM_TARGET_PROCESSES.has(name)) {
          const h = api.OpenProcess(0x1000, false, pid);
          if (h) {
            try {
              const mc = { cb: api.koffi.sizeof(api.PROCESS_MEMORY_COUNTERS) };
              if (api.K32GetProcessMemoryInfo(h, mc, mc.cb)) {
                const ws = Number(mc.WorkingSetSize) || 0;
                if (ws >= MIN_BLOATED_BYTES) {
                  bloatedCandidates.push({ pid, ws });
                }
              }
            } finally {
              api.CloseHandle(h);
            }
          }
        }
      } while (api.Process32NextW(snap, pe));
    }
  } finally {
    api.CloseHandle(snap);
  }

  bloatedCandidates.sort((a, b) => b.ws - a.ws);
  let trimmedProcesses = 0;
  for (const item of bloatedCandidates.slice(0, MAX_TRIM_COUNT)) {
    const h = api.OpenProcess(0x1100, false, item.pid);
    if (h) {
      try {
        if (api.K32EmptyWorkingSet(h)) trimmedProcesses += 1;
      } finally {
        api.CloseHandle(h);
      }
    }
  }

  const afterFreeBytes = os.freemem();
  const freedRamBytes = Math.max(0, afterFreeBytes - beforeFreeBytes);
  return {
    ok: true,
    trimmedProcesses,
    beforeFreeBytes,
    afterFreeBytes,
    freedRamBytes,
  };
}

async function closeHeadlessFarmViaCdp(debugPort) {
  if (!debugPort || debugPort <= 0 || typeof WebSocket === "undefined") return false;
  try {
    const vRes = await fetch(`http://127.0.0.1:${debugPort}/json/version`, {
      signal: AbortSignal.timeout(500),
    });
    if (!vRes.ok) return false;
    const v = await vRes.json();
    if (!v?.webSocketDebuggerUrl) return false;
    await new Promise((resolve) => {
      const ws = new WebSocket(v.webSocketDebuggerUrl);
      const timer = setTimeout(() => {
        try {
          ws.close();
        } catch {
          /* ignore */
        }
        resolve();
      }, 450);
      ws.onopen = () => {
        try {
          ws.send(JSON.stringify({ id: 1, method: "Browser.close" }));
        } catch {
          /* ignore */
        }
        setTimeout(() => {
          clearTimeout(timer);
          try {
            ws.close();
          } catch {
            /* ignore */
          }
          resolve();
        }, 90);
      };
      ws.onerror = () => {
        clearTimeout(timer);
        resolve();
      };
    });
    return true;
  } catch {
    return false;
  }
}

export async function cleanSmokePoolBrowsers({ maxHeadlessIdleMs = 0, maxHeadlessConcurrent = 0 } = {}) {
  const smoke = await inspectSmokePoolBrowsers();
  let closedTabs = 0;
  let closedHeadlessProfiles = 0;
  for (const prof of smoke.profiles) {
    if (!prof.debugPort) continue;
    try {
      const res = await fetch(`http://127.0.0.1:${prof.debugPort}/json/list`, {
        signal: AbortSignal.timeout(1200),
      });
      if (!res.ok) continue;
      const targets = await res.json();
      const pages = (Array.isArray(targets) ? targets : []).filter(
        (t) => t.type === "page" && t.url && t.url !== "about:blank",
      );
      if (pages.length === 0) continue;
      await fetch(`http://127.0.0.1:${prof.debugPort}/json/new?about:blank`, {
        method: "PUT",
        signal: AbortSignal.timeout(1200),
      }).catch(() => {});
      for (const page of pages) {
        const c = await fetch(`http://127.0.0.1:${prof.debugPort}/json/close/${page.id}`, {
          signal: AbortSignal.timeout(1200),
        });
        if (c.ok) closedTabs += 1;
      }
    } catch {
      /* ignore */
    }
  }
  const allLocks = readActiveAgentLocks();
  const activeLockCodes = new Set(allLocks.map((l) => String(l.code || "").trim().padStart(4, "0")));
  const priorityLockCodes = new Set(
    allLocks.filter((l) => l.priority).map((l) => String(l.code || "").trim().padStart(4, "0")),
  );
  const farmList = [...(smoke.leakedHeadlessFarm || [])].sort((a, b) => b.ageMs - a.ageMs);
  for (let i = 0; i < farmList.length; i++) {
    const farm = farmList[i];
    const normCode = String(farm.code || "").trim().padStart(4, "0");
    if (isProtectedOrSmokeProfileCode(farm.code)) continue;
    if (priorityLockCodes.has(normCode) && farm.ageMs < 10 * 60_000) continue;
    const overCap = maxHeadlessConcurrent > 0 && farmList.length - closedHeadlessProfiles > maxHeadlessConcurrent;
    const isStaleLocked = activeLockCodes.has(normCode) && farm.ageMs < Math.max(maxHeadlessIdleMs, 3 * 60_000);
    if (isStaleLocked) continue;
    if (farm.ageMs < maxHeadlessIdleMs && !overCap) continue;
    const cdpClosed = await closeHeadlessFarmViaCdp(farm.debugPort);
    let apiClosed = false;
    try {
      const c = await fetch(`http://127.0.0.1:6003/api/profiles/${encodeURIComponent(farm.id)}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true, forcePriority: true, agentOnly: true }),
        signal: AbortSignal.timeout(2500),
      });
      apiClosed = Boolean(c.ok);
    } catch {
      /* ignore */
    }
    if (cdpClosed || apiClosed) {
      closedHeadlessProfiles += 1;
      headlessFarmSeenAt.delete(farm.id);
    }
  }

  // Reap untracked OS-level `--headless` Chrome trees left behind after P0003 restarts or script crashes (> 3 minutes old)
  if (smoke.reachable) {
    const api = getWin32Api();
    if (api) {
      const scan = scanNativeProcesses();
      const allPids = new Set(scan.processes.map((p) => p.pid));
      const chromeProcs = scan.processes.filter((p) => {
        const nm = String(p.name || "").toLowerCase();
        return nm === "chrome-headless.exe" || nm === "chrome-headless-shell.exe";
      });
      const conhostProcs = scan.processes.filter((p) => String(p.name || "").toLowerCase() === "conhost.exe");
      const chromePids = new Set(chromeProcs.map((p) => p.pid));
      const trackedSet = new Set(Array.isArray(smoke.trackedDirs) ? smoke.trackedDirs : []);
      const trackedIdList = Array.isArray(smoke.trackedIds) ? smoke.trackedIds : [];
      const trackedPortSet = new Set(Array.isArray(smoke.trackedPorts) ? smoke.trackedPorts : []);
      const untrackedHeadlessRoots = [];
      for (const p of chromeProcs) {
        if (chromePids.has(p.ppid)) continue; // only root headless browser processes
        const cmd = readNativeProcessCmd(api, p.pid);
        if (!allPids.has(p.ppid) && /--type=/i.test(cmd || "")) {
          terminatePidNative(api, p.pid);
          continue;
        }
        if (!cmd || /--type=/i.test(cmd) || !/--headless\b/i.test(cmd)) continue;
        if (/--stealth-profile-code=(?:8\d{3}|00(?:0[1-9]|1\d|2[01]|59|69))\b/i.test(cmd)) continue;
        const mDir = cmd.match(/--user-data-dir=(?:"([^"]+)"|([^\s]+))/i);
        const dirLower = String(mDir?.[1] || mDir?.[2] || "").trim().toLowerCase();
        const mPort = cmd.match(/--remote-debugging-port=(\d+)/i);
        const portNum = Number(mPort?.[1] || 0);
        const isTrackedByP0003 =
          (dirLower && trackedSet.has(dirLower)) ||
          (portNum > 0 && trackedPortSet.has(portNum)) ||
          (dirLower && trackedIdList.some((tid) => tid && dirLower.includes(tid)));
        if (!isTrackedByP0003) {
          const procAgeMs = getProcessAgeMsNative(api, p.pid);
          if (procAgeMs > 3 * 60_000) {
            untrackedHeadlessRoots.push(p.pid);
          }
        }
      }
      if (untrackedHeadlessRoots.length > 0) {
        const rootSet = new Set(untrackedHeadlessRoots);
        for (const ch of conhostProcs) {
          if (rootSet.has(ch.ppid)) terminatePidNative(api, ch.pid);
        }
        for (const p of chromeProcs) {
          if (rootSet.has(p.ppid)) terminatePidNative(api, p.pid);
        }
        for (const rootPid of untrackedHeadlessRoots) {
          if (terminatePidNative(api, rootPid)) {
            closedHeadlessProfiles += 1;
          }
        }
      }
    }
  }

  return {
    ok: true,
    closedTabs,
    closedHeadlessProfiles,
    checkedProfiles: smoke.runningCount,
  };
}

let autoMaintenanceTimer = null;
let consolePopupGuardTimer = null;
let totalSuppressedConsolePopups = 0;

export function ensurePlaywrightHeadlessShellsGuiSubsystem() {
  const patched = [];
  try {
    const msPw = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"), "ms-playwright");
    if (!fs.existsSync(msPw)) return patched;
    for (const dir of fs.readdirSync(msPw)) {
      if (!/headless_shell/i.test(dir)) continue;
      const candidates = [
        path.join(msPw, dir, "chrome-headless-shell-win64", "chrome-headless-shell.exe"),
        path.join(msPw, dir, "chrome-win", "headless_shell.exe"),
      ];
      for (const exePath of candidates) {
        if (!fs.existsSync(exePath)) continue;
        try {
          const fd = fs.openSync(exePath, "r+");
          try {
            const hdr = Buffer.alloc(1024);
            const bytesRead = fs.readSync(fd, hdr, 0, 1024, 0);
            if (bytesRead >= 256 && hdr.readUInt16LE(0) === 0x5a4d) {
              const peOffset = hdr.readUInt32LE(0x3c);
              if (peOffset + 96 <= bytesRead && hdr.readUInt32LE(peOffset) === 0x00004550) {
                const subOffset = peOffset + 4 + 20 + 68;
                const curSub = hdr.readUInt16LE(subOffset);
                if (curSub === 3) {
                  const b = Buffer.alloc(2);
                  b.writeUInt16LE(2, 0); // 2 = IMAGE_SUBSYSTEM_WINDOWS_GUI
                  fs.writeSync(fd, b, 0, 2, subOffset);
                  patched.push(exePath);
                }
              }
            }
          } finally {
            fs.closeSync(fd);
          }
        } catch {
          /* ignore if binary is currently locked */
        }
      }
    }
  } catch {
    /* ignore */
  }
  return patched;
}

export function suppressTransientConsolePopupsNative() {
  // Console hiding is handled at process creation via nodew.exe (IMAGE_SUBSYSTEM_WINDOWS_GUI),
  // CREATE_NO_WINDOW, and preload-windows-hide.cjs FreeConsole(). Never poll FindWindowExW /
  // GetWindowTextW (cross-process WM_GETTEXT) / ShowWindow on WinSta0\Default in a timer.
  return { ok: true, hiddenCount: 0, totalSuppressedConsolePopups };
}

function readNativeProcessCmd(api, pid) {
  if (!api || !pid) return "";
  const h = api.OpenProcess(0x1000, false, pid);
  if (!h) return "";
  try {
    const buf = Buffer.alloc(16384);
    const retLen = [0];
    if (api.NtQueryInformationProcess(h, 60, buf, buf.length, retLen) !== 0) return "";
    const len = buf.readUInt16LE(0);
    const ptrVal = Number(buf.readBigUInt64LE(8));
    if (!len || !ptrVal) return "";
    const strBuf = api.koffi.decode(ptrVal, "uint8_t", len);
    return Buffer.from(strBuf).toString("utf16le");
  } catch {
    return "";
  } finally {
    api.CloseHandle(h);
  }
}

const NEVER_TERMINATE_EXE_NAMES = new Set([
  "antigravity.exe",
  "antigravity ide.exe",
  "language_server_windows_x64.exe",
  "language_server.exe",
  "cursor.exe",
  "code.exe",
  "explorer.exe",
  "wmiprvse.exe",
  "stealth browser console.exe",
  "desk console.exe",
  "zalo.exe",
  "svchost.exe",
  "csrss.exe",
  "wininit.exe",
  "winlogon.exe",
  "services.exe",
  "lsass.exe",
]);

function terminatePidNative(api, pid, protectedPids = null) {
  if (!api || !pid || pid === process.pid || pid === process.ppid) return false;
  if (protectedPids && protectedPids.has(Number(pid))) return false;
  const h = api.OpenProcess(0x0001, false, pid);
  if (!h) return false;
  try {
    return Boolean(api.TerminateProcess(h, 1));
  } catch {
    return false;
  } finally {
    api.CloseHandle(h);
  }
}

function getProcessAgeMsNative(api, pid) {
  if (!api || !pid || !api.GetProcessTimes) return 0;
  const h = api.OpenProcess(0x1000, false, pid); // PROCESS_QUERY_LIMITED_INFORMATION
  if (!h) return 0;
  try {
    const cTime = [0n];
    const eTime = [0n];
    const kTime = [0n];
    const uTime = [0n];
    if (!api.GetProcessTimes(h, cTime, eTime, kTime, uTime) || !cTime[0]) return 0;
    const createdEpochMs = Number(BigInt(cTime[0]) / 10000n - 11644473600000n);
    return createdEpochMs > 0 ? Math.max(0, Date.now() - createdEpochMs) : 0;
  } catch {
    return 0;
  } finally {
    api.CloseHandle(h);
  }
}

/**
 * Zero-WMI native handle-leak self-healer (<3ms via Toolhelp32 + NtQueryInformationProcess):
 * - Restarts `EVKey64.exe` cleanly if it leaks >4,000 handles (normal ~180; bloated WH_KEYBOARD_LL lags all typing/clicks).
 * - Terminates windowless `olk.exe` if it leaks >15,000 handles in the background.
 * - Terminates runaway Chrome `--type=renderer` child processes leaking >35,000 handles (never touches root browser windows).
 */
export function autoHealSystemHandleLeaks(existingScan = null) {
  const api = getWin32Api();
  if (!api) return { ok: true, healed: [] };
  const scan = existingScan || scanNativeProcesses();
  const allPids = new Set(scan.processes.map((p) => p.pid));
  const protectedPids = new Set([process.pid, process.ppid]);
  const psTaskbarWorkers = [];
  const wireproxyByCountry = new Map();
  const conhostChildrenByParent = new Map();
  const lsPids = new Set();
  for (const p of scan.processes) {
    const pLower = String(p.name || "").toLowerCase();
    if (NEVER_TERMINATE_EXE_NAMES.has(pLower)) {
      protectedPids.add(p.pid);
    }
    if (pLower === "language_server_windows_x64.exe" || pLower === "language_server.exe") {
      lsPids.add(p.pid);
    }
    if (pLower === "conhost.exe" && p.ppid) {
      const list = conhostChildrenByParent.get(p.ppid) || [];
      list.push(p.pid);
      conhostChildrenByParent.set(p.ppid, list);
    }
  }
  let hasActiveG1UnlockSession = false;
  try {
    const g1SessionPath = path.join(DEV_ROOT, ".cache", "g1-family-unlock-sessions.json");
    if (fs.existsSync(g1SessionPath)) {
      const doc = JSON.parse(fs.readFileSync(g1SessionPath, "utf8") || "{}");
      const nowMs = Date.now();
      for (const s of Array.isArray(doc.sessions) ? doc.sessions : []) {
        const upMs = Date.parse(s.updatedAt || doc.updatedAt || "");
        if (s.status === "running" && s.stage !== "completed" && Number.isFinite(upMs) && nowMs - upMs < 12 * 3600_000) {
          hasActiveG1UnlockSession = true;
          break;
        }
      }
    }
  } catch {
    /* ignore */
  }
  const healed = [];
  for (const p of scan.processes) {
    const lower = p.name.toLowerCase();
    if (lower === "evkey64.exe") {
      if (p.handles > 4000) {
        const rawCmd = readNativeProcessCmd(api, p.pid);
        const cmdExeMatch = rawCmd.match(/^"([^"]+)"|^(\S+)/);
        const detectedEvkPath = cmdExeMatch ? (cmdExeMatch[1] || cmdExeMatch[2] || "").trim() : "";
        let evkStopped = terminatePidNative(api, p.pid);
        if (!evkStopped) {
          try {
            const endChild = spawn("schtasks.exe", ["/End", "/TN", "\\EVKey - Vietnamese Keyboard"], {
              detached: true,
              stdio: "ignore",
              windowsHide: true,
            });
            endChild.unref();
            evkStopped = true;
          } catch {
            /* ignore */
          }
        }
        if (evkStopped) {
          try {
            setTimeout(() => {
              try {
                const schChild = spawn("schtasks.exe", ["/Run", "/TN", "\\EVKey - Vietnamese Keyboard"], {
                  detached: true,
                  stdio: "ignore",
                  windowsHide: true,
                });
                schChild.unref();
              } catch {
                /* ignore */
              }
            }, 350);
            const evkCandidates = [
              detectedEvkPath,
              "D:\\Tool\\System\\EVKey\\EVKey 5.0.1\\EVKey64.exe",
              "C:\\Program Files\\EVKey\\EVKey64.exe",
              path.join(os.homedir(), "Desktop", "EVKey", "EVKey64.exe"),
              path.join(os.homedir(), "Downloads", "EVKey", "EVKey64.exe"),
              "D:\\Tools\\EVKey\\EVKey64.exe",
              "C:\\EVKey\\EVKey64.exe",
            ].filter(Boolean);
            const evkPath = evkCandidates.find((c) => fs.existsSync(c));
            if (evkPath) {
              setTimeout(() => {
                try {
                  if (!isProcessRunningNative("evkey64.exe")) {
                    const child = spawn(evkPath, [], {
                      cwd: path.dirname(evkPath),
                      env: { ...process.env, __COMPAT_LAYER: "RunAsInvoker" },
                      detached: true,
                      stdio: "ignore",
                      windowsHide: false,
                    });
                    child.unref();
                  }
                } catch {
                  /* ignore */
                }
              }, 1200).unref?.();
            }
          } catch {
            /* ignore */
          }
          healed.push({ pid: p.pid, name: p.name, handles: p.handles, action: "restarted-evkey" });
        }
      } else {
        const hEvk = api.OpenProcess(0x0200, false, p.pid);
        if (hEvk) {
          try {
            api.SetPriorityClass(hEvk, 0x00000020); // NORMAL_PRIORITY_CLASS
          } finally {
            api.CloseHandle(hEvk);
          }
        }
      }
    } else if (lower === "olk.exe" && p.handles > 15000) {
      if (terminatePidNative(api, p.pid)) {
        healed.push({ pid: p.pid, name: p.name, handles: p.handles, action: "killed-bloated-olk" });
      }
    } else if (lower === "chrome-headless-shell.exe") {
      const hPri = api.OpenProcess(0x0200, false, p.pid);
      if (hPri) {
        try {
          api.SetPriorityClass(hPri, 0x00000020); // NORMAL_PRIORITY_CLASS
        } finally {
          api.CloseHandle(hPri);
        }
      }
      const cmd = readNativeProcessCmd(api, p.pid);
      if (cmd && /\.cache[\\/]g1-support-pw-/i.test(cmd)) {
        if (terminatePidNative(api, p.pid, protectedPids)) {
          healed.push({ pid: p.pid, name: p.name, handles: p.handles, action: "reaped-stale-cache-headless-shell" });
        }
      }
    } else if (lower === "chrome.exe" || lower === "chrome-headless.exe") {
      // Zero-Throttle Root-Cause Kaizen (2026-11-10): keep all Chrome & headless Chrome processes at NORMAL_PRIORITY_CLASS (0x00000020)
      const hPri = api.OpenProcess(0x0200, false, p.pid);
      if (hPri) {
        try {
          api.SetPriorityClass(hPri, 0x00000020); // NORMAL_PRIORITY_CLASS
        } finally {
          api.CloseHandle(hPri);
        }
      }
      if (p.handles > 35000) {
        const fullCmd = readNativeProcessCmd(api, p.pid);
        if (fullCmd && /--type=renderer\b/i.test(fullCmd)) {
          if (terminatePidNative(api, p.pid, protectedPids)) {
            healed.push({ pid: p.pid, name: p.name, handles: p.handles, action: "killed-runaway-renderer" });
          }
        }
      }
    } else if (
      lower === "stealth browser console.exe" ||
      lower === "desk console.exe" ||
      lower === "telegram.exe" ||
      lower === "zalo.exe" ||
      lower === "7za.exe" ||
      lower === "esbuild.exe" ||
      lower === "ssh.exe" ||
      lower === "scp.exe" ||
      lower === "robocopy.exe" ||
      lower === "python.exe" ||
      lower === "antigravity.exe" ||
      lower === "cursor.exe" ||
      lower === "language_server_windows_x64.exe" ||
      lower === "language_server.exe" ||
      lower === "claude.exe" ||
      lower === "codex.exe"
    ) {
      // Zero-Throttle Root-Cause Kaizen (2026-11-10): keep all active IDE, compiler, and desktop processes
      // at NORMAL_PRIORITY_CLASS (0x00000020) without restricting CPU affinity masks.
      const hUi = api.OpenProcess(0x0200, false, p.pid);
      if (hUi) {
        try {
          api.SetPriorityClass(hUi, 0x00000020); // NORMAL_PRIORITY_CLASS
        } finally {
          api.CloseHandle(hUi);
        }
      }
    } else if (lower === "powershell.exe") {
      const hPri = api.OpenProcess(0x0200, false, p.pid);
      if (hPri) {
        try {
          api.SetPriorityClass(hPri, 0x00000020); // NORMAL_PRIORITY_CLASS
        } finally {
          api.CloseHandle(hPri);
        }
      }
      const cmd = readNativeProcessCmd(api, p.pid);
      if (cmd && /stealth-taskbar-apply-worker\.ps1/i.test(cmd)) {
        psTaskbarWorkers.push({ pid: p.pid, ppid: p.ppid, handles: p.handles, name: p.name });
      }
    } else if (lower === "wireproxy.exe") {
      const hPri = api.OpenProcess(0x0200, false, p.pid);
      if (hPri) {
        try {
          api.SetPriorityClass(hPri, 0x00000020); // NORMAL_PRIORITY_CLASS
        } finally {
          api.CloseHandle(hPri);
        }
      }
      const cmd = readNativeProcessCmd(api, p.pid);
      const m = cmd.match(/wireproxy-([a-z]{2})-(\d+)\.conf/i);
      const cc = m ? m[1].toUpperCase() : "UNK";
      const confMatch = cmd.match(/-c\s+(?:"([^"]+)"|([^\s]+))/i);
      const confPath = confMatch ? confMatch[1] || confMatch[2] || "" : "";
      const list = wireproxyByCountry.get(cc) || [];
      list.push({ pid: p.pid, handles: p.handles, name: p.name, confPath });
      wireproxyByCountry.set(cc, list);
    } else if (lower === "node.exe" || lower === "nodew.exe") {
      const hPri = api.OpenProcess(0x0200, false, p.pid);
      if (hPri) {
        try {
          api.SetPriorityClass(hPri, 0x00000020); // NORMAL_PRIORITY_CLASS
        } finally {
          api.CloseHandle(hPri);
        }
      }
      const cmd = readNativeProcessCmd(api, p.pid);
      if (!hasActiveG1UnlockSession && cmd && /\.cache[\\/]g1-support-pw-/i.test(cmd)) {
        if (terminatePidNative(api, p.pid)) {
          healed.push({ pid: p.pid, name: p.name, handles: p.handles, action: "reaped-stale-cache-watcher" });
        }
        continue;
      }
      // Reap hung inline one-liner Agent scripts (`node --input-type=module -` or `node -e`) older than 15 minutes
      if (cmd && /(?:--input-type=module\s+-|\s-e\s)/i.test(cmd)) {
        const ageMs = getProcessAgeMsNative(api, p.pid);
        if (ageMs > 15 * 60_000) {
          if (terminatePidNative(api, p.pid)) {
            for (const chPid of conhostChildrenByParent.get(p.pid) || []) {
              terminatePidNative(api, chPid);
            }
            healed.push({
              pid: p.pid,
              name: p.name,
              handles: p.handles,
              action: `reaped-hung-inline-node-${Math.round(ageMs / 60_000)}m`,
            });
          }
          continue;
        }
      }
      const viteMatch = cmd.match(/Tool[\\/](?:Storage[\\/])?(P\d{4}|S\d{3,4})-[^\\/]+.*node_modules[\\/]vite[\\/]bin[\\/]vite\.js/i);
      if (viteMatch) {
        const code = viteMatch[1].toUpperCase();
        // 30-Minute Idle Auto-Close is handled cleanly by hub-auth-dev-api-vite-plugin.mjs & profile-browser-orphan.cjs.
        // Here we only restart a Vite dev server if it suffers an extreme OS handle leak (> 120,000 handles).
        if (p.handles > 120000) {
          if (terminatePidNative(api, p.pid, protectedPids)) {
            for (const chPid of conhostChildrenByParent.get(p.pid) || []) {
              terminatePidNative(api, chPid, protectedPids);
            }
            const nodewBin = path.join(DEV_ROOT, ".tools", "nodew.exe");
            const leanScript = path.join(DEV_ROOT, "Tool", "scripts", "ensure-dev-lean.cjs");
            if (fs.existsSync(nodewBin) && fs.existsSync(leanScript)) {
              try {
                const child = spawn(nodewBin, [leanScript, code, "--vite-only", "--force"], {
                  cwd: DEV_ROOT,
                  detached: true,
                  stdio: "ignore",
                  windowsHide: true,
                });
                child.unref();
              } catch {
                /* ignore */
              }
            }
            healed.push({
              pid: p.pid,
              name: p.name,
              handles: p.handles,
              action: `restarted-bloated-vite-${code}`,
            });
          }
        }
      }
    }
  }
  // Deduplicate wireproxy.exe tunnels: keep at most 1 (newest PID) per country code
  for (const [, wpList] of wireproxyByCountry.entries()) {
    if (wpList.length > 1) {
      wpList.sort((a, b) => b.pid - a.pid);
      for (const dup of wpList.slice(1)) {
        if (terminatePidNative(api, dup.pid)) {
          for (const chPid of conhostChildrenByParent.get(dup.pid) || []) {
            terminatePidNative(api, chPid);
          }
          if (dup.confPath && fs.existsSync(dup.confPath)) {
            try {
              fs.unlinkSync(dup.confPath);
            } catch {
              /* ignore */
            }
          }
          healed.push({
            pid: dup.pid,
            name: dup.name,
            handles: dup.handles,
            action: "killed-duplicate-wireproxy-tunnel",
          });
        }
      }
    }
  }
  // Terminate any stealth-taskbar-apply-worker.ps1 whose parent process is gone, or excess duplicates (>1)
  if (psTaskbarWorkers.length > 0) {
    const aliveParentWorkers = [];
    for (const w of psTaskbarWorkers) {
      if (!allPids.has(w.ppid)) {
        if (terminatePidNative(api, w.pid)) {
          healed.push({ pid: w.pid, name: w.name, handles: w.handles, action: "killed-orphan-taskbar-worker" });
        }
      } else {
        aliveParentWorkers.push(w);
      }
    }
      if (aliveParentWorkers.length > 1) {
      aliveParentWorkers.sort((a, b) => b.pid - a.pid);
      for (const extra of aliveParentWorkers.slice(1)) {
        if (terminatePidNative(api, extra.pid, protectedPids)) {
          healed.push({ pid: extra.pid, name: extra.name, handles: extra.handles, action: "killed-duplicate-taskbar-worker" });
        }
      }
    }
  }
  if (healed.length > 0) {
    try {
      const auditPath = path.join(DEV_ROOT, "Tool", "P0002-Social-Hub", "data", "logs", "orphan-reaper-audit.jsonl");
      const dir = path.dirname(auditPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const ts = new Date().toISOString();
      const lines = healed.map((h) => JSON.stringify({ timestamp: ts, source: "P0001", ...h })).join("\n") + "\n";
      fs.appendFileSync(auditPath, lines, "utf8");
    } catch {
      /* ignore audit log error */
    }
  }
  return { ok: true, healed };
}

/** Track DWM (`dwm.exe`) kernel+user CPU ticks for zero-WMI Adaptive Headless Throttling (`ok 3`). */
let prevDwmSample = { pid: 0, atMs: 0, totalTicks: 0n, lastCpuSecPerSec: 0 };

export function measureDwmCpuLoadNative(existingScan = null) {
  const api = getWin32Api();
  if (!api || !api.GetProcessTimes) return 0;
  const scan = existingScan || scanNativeProcesses();
  const dwmProc = scan.processes.find((p) => String(p.name || "").toLowerCase() === "dwm.exe");
  if (!dwmProc || !dwmProc.pid) return 0;
  const h = api.OpenProcess(0x1000, false, dwmProc.pid);
  if (!h) return prevDwmSample.lastCpuSecPerSec || 0;
  try {
    const cTime = [0n];
    const eTime = [0n];
    const kTime = [0n];
    const uTime = [0n];
    if (!api.GetProcessTimes(h, cTime, eTime, kTime, uTime)) {
      return prevDwmSample.lastCpuSecPerSec || 0;
    }
    const totalTicks = BigInt(kTime[0] || 0n) + BigInt(uTime[0] || 0n);
    const now = Date.now();
    let cpuSecPerSec = prevDwmSample.lastCpuSecPerSec || 0;
    if (prevDwmSample.pid === dwmProc.pid && prevDwmSample.atMs > 0) {
      const elapsedMs = now - prevDwmSample.atMs;
      if (elapsedMs >= 400 && totalTicks >= prevDwmSample.totalTicks) {
        const deltaSec = Number(totalTicks - prevDwmSample.totalTicks) / 10_000_000;
        cpuSecPerSec = Math.round((deltaSec / (elapsedMs / 1000)) * 100) / 100;
        prevDwmSample = { pid: dwmProc.pid, atMs: now, totalTicks, lastCpuSecPerSec: cpuSecPerSec };
      }
    } else {
      prevDwmSample = { pid: dwmProc.pid, atMs: now, totalTicks, lastCpuSecPerSec: 0 };
    }
    return cpuSecPerSec;
  } catch {
    return prevDwmSample.lastCpuSecPerSec || 0;
  } finally {
    api.CloseHandle(h);
  }
}

/**
 * Adaptive Headless Throttling (`ok 3`):
 * Dynamically adjusts `maxHeadlessConcurrent` between `2`, `4`, and `6` based on live `dwm.exe` CPU load,
 * with `maxHeadlessIdleMs` between 2 and 4 minutes so multi-step Gmail/FB/Muse 3-chat warmup flows
 * (which take ~90–150s per profile) are never prematurely killed mid-flight.
 */
export function computeAdaptiveHeadlessCap(existingScan = null) {
  const dwmCpuSecPerSec = measureDwmCpuLoadNative(existingScan);
  if (dwmCpuSecPerSec >= 1.2) {
    return {
      dwmCpuSecPerSec,
      maxHeadlessConcurrent: 16,
      maxHeadlessIdleMs: 90_000,
      throttled: true,
      mode: "heavy-dwm-throttle",
    };
  }
  if (dwmCpuSecPerSec >= 0.6) {
    return {
      dwmCpuSecPerSec,
      maxHeadlessConcurrent: 28,
      maxHeadlessIdleMs: 120_000,
      throttled: true,
      mode: "moderate-dwm-throttle",
    };
  }
  return {
    dwmCpuSecPerSec,
    maxHeadlessConcurrent: 40,
    maxHeadlessIdleMs: 180_000,
    throttled: false,
    mode: "normal-sweet-spot",
  };
}

/**
 * Farm Supervisor definitions (`DEFAULT_FARM_JOBS`, telemetry & job spawning) live in
 * `Tool/P0004-Tool-Hub/scripts/lib/farm-supervisor.cjs` so `P0001` stays a pure System/Host Console.
 */
let farmSupervisorLib;
try {
  const farmSupervisorPath = path.join(DEV_ROOT, "Tool", "P0004-Tool-Hub", "scripts", "lib", "farm-supervisor.cjs");
  farmSupervisorLib = fs.existsSync(farmSupervisorPath) ? require(farmSupervisorPath) : null;
} catch {
  farmSupervisorLib = null;
}
const {
  readActiveAgentLocks = () => [],
  readFarmJobTelemetry = () => null,
  readFarmSupervisorConfig: readP0004FarmSupervisorConfig = () => ({ enabled: false, jobs: {} }),
  writeFarmSupervisorConfig: writeP0004FarmSupervisorConfig = (cfg) => cfg || { enabled: false, jobs: {} },
} = farmSupervisorLib || {};

const FARM_RESPAWN_COOLDOWN_MS = 3 * 60_000;
const farmLastSpawnAttemptByJob = new Map();

function resolveFarmCuiNodeExe() {
  const candidates = [
    path.join(DEV_ROOT, ".tools", "node-v22", "node.exe"),
    "C:\\Program Files\\nodejs\\node.exe",
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return process.execPath;
}

/**
 * Spawn a background farm daemon using standard CUI `node.exe` + `detached: true` + `windowsHide: true`
 * (`DETACHED_PROCESS`, 0 `conhost.exe`, 0 `IDC_APPSTARTING` blue spinning cursor — never `nodew.exe`!).
 */
function spawnFarmJobClean(job) {
  if (!job?.scriptRelPath) return null;
  const scriptAbs = path.join(DEV_ROOT, job.scriptRelPath);
  if (!fs.existsSync(scriptAbs)) return null;
  const nodeBin = resolveFarmCuiNodeExe();
  const isSelfElectron =
    nodeBin === process.execPath && Boolean(process.versions?.electron || process.env.ELECTRON_RUN_AS_NODE);
  const jobArgs = Array.isArray(job.args) ? job.args : [];
  const logDir = path.join(DEV_ROOT, "Tool", "P0002-Social-Hub", "data", "logs");
  const logFile = path.join(logDir, `farm-${job.id}.log`);
  const pidFile = path.join(logDir, `farm-${job.id}.pid`);
  try {
    fs.mkdirSync(logDir, { recursive: true });
    const outFd = fs.openSync(logFile, "a");
    const child = spawn(nodeBin, [scriptAbs, ...jobArgs], {
      cwd: DEV_ROOT,
      detached: true,
      stdio: ["ignore", outFd, outFd],
      windowsHide: true,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: isSelfElectron ? "1" : "" },
    });
    child.unref();
    try {
      fs.closeSync(outFd);
    } catch {
      /* ignore */
    }
    if (child.pid) {
      try {
        fs.writeFileSync(pidFile, `${child.pid}\n`, "utf8");
      } catch {
        /* ignore */
      }
    }
    return child.pid || null;
  } catch {
    return null;
  }
}

export function readFarmSupervisorConfig() {
  return readP0004FarmSupervisorConfig();
}

export function writeFarmSupervisorConfig(nextConfig) {
  return writeP0004FarmSupervisorConfig(nextConfig);
}

export function getFarmSupervisorStatus(existingScan = null, adaptive = null) {
  const api = getWin32Api();
  const scan = existingScan || scanNativeProcesses();
  const cfg = readFarmSupervisorConfig();
  const throttle = adaptive || computeAdaptiveHeadlessCap(scan);
  const activeLocks = readActiveAgentLocks(DEV_ROOT);

  const nodeProcs = [];
  if (api) {
    for (const p of scan.processes) {
      const lowerName = String(p.name || "").toLowerCase();
      if (lowerName === "node.exe" || lowerName === "nodew.exe") {
        const cmd = readNativeProcessCmd(api, p.pid);
        if (cmd && !cmd.includes("win-hidden-detach-runner.cjs")) {
          nodeProcs.push({ pid: p.pid, ppid: p.ppid, ramMB: p.ramMB, cmd });
        }
      }
    }
  }

  const jobs = cfg.jobs.map((job) => {
    const needles = String(job.matchNeedle || "")
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);
    const matches = nodeProcs.filter(
      (np) =>
        !np.cmd.includes("--input-type=module -") &&
        !np.cmd.includes(" -e ") &&
        needles.some((nd) => np.cmd.includes(nd)),
    );
    const seenShardKeys = new Set();
    const primaryMatches = [];
    const duplicatePids = [];
    for (const m of matches) {
      const shardMatch = m.cmd.match(/--shard=(\d+\/\d+)/i);
      const browsersMatch = m.cmd.match(/--browsers=([^\s"]+)/i);
      const instanceKey = shardMatch
        ? `shard:${shardMatch[1]}`
        : browsersMatch
          ? `browsers:${browsersMatch[1]}`
          : "default";
      if (!seenShardKeys.has(instanceKey)) {
        seenShardKeys.add(instanceKey);
        primaryMatches.push(m);
      } else {
        duplicatePids.push(m.pid);
      }
    }
    const telemetry = readFarmJobTelemetry(job.id, activeLocks, DEV_ROOT);
    return {
      ...job,
      running: primaryMatches.length > 0,
      pid: primaryMatches[0]?.pid || null,
      shardPids: primaryMatches.map((m) => m.pid),
      duplicatePids,
      ramMB: Math.round(primaryMatches.reduce((sum, m) => sum + (m.ramMB || 0), 0) * 10) / 10,
      telemetry,
    };
  });

  const ramTotal = os.totalmem();
  const ramUsedPct = ramTotal > 0 ? Math.round(((ramTotal - os.freemem()) / ramTotal) * 1000) / 10 : 0;
  const diskPressureGuard = readProfilesDiskPressure();

  return {
    enabled: cfg.enabled,
    updatedAt: cfg.updatedAt,
    adaptiveMode: throttle.mode,
    dwmCpuSecPerSec: throttle.dwmCpuSecPerSec,
    maxHeadlessConcurrent: throttle.maxHeadlessConcurrent,
    maxHeadlessIdleMs: throttle.maxHeadlessIdleMs,
    ramUsedPct,
    activeProfileLocks: activeLocks.map((l) => l.code),
    diskPressureGuard,
    nightlyMaintenance: {
      ...cfg.nightlyMaintenance,
      diskPressureGuard,
    },
    jobs,
  };
}

export async function runFarmSupervisorTick(existingScan = null) {
  const api = getWin32Api();
  const scan = existingScan || scanNativeProcesses();
  const throttle = computeAdaptiveHeadlessCap(scan);
  const status = getFarmSupervisorStatus(scan, throttle);
  const deduplicatedPids = [];
  const resumedJobs = [];

  // 1. Always deduplicate accidental multiple instances of the same farm script
  if (api) {
    for (const job of status.jobs) {
      if (job.duplicatePids && job.duplicatePids.length > 0) {
        for (const dupPid of job.duplicatePids) {
          if (terminatePidNative(api, dupPid)) {
            deduplicatedPids.push({ jobId: job.id, pid: dupPid });
          }
        }
      }
    }
  }

  if (!status.enabled) {
    return { ok: true, deduplicatedPids, resumedJobs, status };
  }

  // 2. Check PC health, boot grace window & Stealth :6003 readiness before auto-resuming stopped jobs
  const ramTotal = os.totalmem();
  const ramUsedPct = ramTotal > 0 ? ((ramTotal - os.freemem()) / ramTotal) * 100 : 0;
  if (throttle.dwmCpuSecPerSec >= 1.5 || ramUsedPct >= 85) {
    return { ok: true, pausedByHealth: true, deduplicatedPids, resumedJobs, status };
  }

  const uptimeSec = os.uptime();
  const nowMs = Date.now();
  const missingAutoJobs = status.jobs.filter((j) => {
    if (!j.autoResume || j.running) return false;
    // Never auto-launch heavy Chromium-spawning farm daemons during the first 5 minutes after Windows boot
    if (uptimeSec < 300 && j.id !== "muse-headless-adapter") return false;
    // Enforce 3-minute per-job respawn backoff so exiting/blocked scripts never rapid-loop every 20s tick
    const memLast = farmLastSpawnAttemptByJob.get(j.id) || 0;
    const cfgLast = j.lastStartedAt ? Date.parse(j.lastStartedAt) || 0 : 0;
    const lastAttempt = Math.max(memLast, cfgLast);
    if (lastAttempt > 0 && nowMs - lastAttempt < FARM_RESPAWN_COOLDOWN_MS) return false;
    return true;
  });
  if (missingAutoJobs.length === 0) {
    return { ok: true, deduplicatedPids, resumedJobs, status };
  }

  let stealthOnline = false;
  try {
    const hRes = await fetch("http://127.0.0.1:6003/api/health", { signal: AbortSignal.timeout(2000) });
    stealthOnline = hRes.ok;
  } catch {
    stealthOnline = false;
  }
  if (!stealthOnline) {
    return { ok: true, waitingForStealth: true, deduplicatedPids, resumedJobs, status };
  }

  const cfg = readFarmSupervisorConfig();
  let cfgChanged = false;
  // Stagger at most 1 heavy daemon launch per tick to prevent simultaneous Chromium process storms
  for (const job of missingAutoJobs.slice(0, 1)) {
    farmLastSpawnAttemptByJob.set(job.id, nowMs);
    const pid = spawnFarmJobClean(job);
    if (pid) {
      resumedJobs.push({ jobId: job.id, pid });
      const idx = cfg.jobs.findIndex((j) => j.id === job.id);
      if (idx >= 0) {
        cfg.jobs[idx].lastStartedAt = new Date(nowMs).toISOString();
        cfgChanged = true;
      }
    }
  }
  if (cfgChanged) writeFarmSupervisorConfig(cfg);

  return {
    ok: true,
    deduplicatedPids,
    resumedJobs,
    status: getFarmSupervisorStatus( null, throttle),
  };
}

export async function controlFarmSupervisor(payload = {}) {
  const api = getWin32Api();
  const cfg = readFarmSupervisorConfig();
  if (typeof payload.enabled === "boolean") {
    cfg.enabled = payload.enabled;
  }
  const jobId = String(payload.jobId || "").trim();
  const action = String(payload.action || "").trim().toLowerCase();
  if (jobId) {
    const idx = cfg.jobs.findIndex((j) => j.id === jobId);
    if (idx >= 0) {
      if (typeof payload.autoResume === "boolean") {
        cfg.jobs[idx].autoResume = payload.autoResume;
      }
      if (action === "stop") {
        cfg.jobs[idx].autoResume = false;
        cfg.jobs[idx].lastStoppedAt = new Date().toISOString();
        const curStatus = getFarmSupervisorStatus();
        const liveJob = curStatus.jobs.find((j) => j.id === jobId);
        if (api && liveJob) {
          for (const pid of [liveJob.pid, ...(liveJob.duplicatePids || [])].filter(Boolean)) {
            terminatePidNative(api, pid);
          }
        }
      } else if (action === "start") {
        cfg.jobs[idx].autoResume = true;
        const curStatus = getFarmSupervisorStatus();
        const liveJob = curStatus.jobs.find((j) => j.id === jobId);
        if (!liveJob?.running) {
          farmLastSpawnAttemptByJob.set(jobId, Date.now());
          const pid = spawnFarmJobClean(cfg.jobs[idx]);
          if (pid) cfg.jobs[idx].lastStartedAt = new Date().toISOString();
        }
      }
    }
  }
  writeFarmSupervisorConfig(cfg);
  if (payload.tick === true) {
    return runFarmSupervisorTick();
  }
  return { ok: true, status: getFarmSupervisorStatus() };
}

/** Track assigned Processor Group (0 or 1) per root Chrome PID and already-pinned thread IDs. */
const chromeRootGroupMap = new Map();
const pinnedChromeThreads = new Set();
const chromeJobHandleByPid = new Map();
let cachedEvKeyShieldJob = null;
let nextChromeGroupSeq = 0;

/**
 * Dual-Socket Xeon Processor Group 50/50 Load Balancer (<1.5ms native C/Win32 via `koffi`, 0 PowerShell):
 * Splits active `chrome.exe` browser process trees 50/50 across Processor Group 0 (36 threads) and Group 1 (36 threads)
 * so 40–50 concurrent headless browsers never saturate a single CPU socket or starve `dwm.exe`.
 */
export function balanceChromeProcessorGroupsNative() {
  // Zero-IPI Native NUMA Scheduler Mode:
  // Do NOT call TH32CS_SNAPTHREAD (12,000-thread kernel lock), SetThreadGroupAffinity, or per-PID JobObjects
  // in a background loop, as forced cross-socket thread migrations trigger kernel IPI storms and move User Headed
  // Chrome GPU/UI threads away from the primary GPU socket. Windows 10/11's native NUMA scheduler balances
  // processes across both Xeon Processor Groups automatically while autoHealSystemHandleLeaks() keeps
  // headless Chrome processes at BELOW_NORMAL_PRIORITY_CLASS (0x00004000).
  return { ok: true, skipped: false, movedThreads: 0, group0Roots: 0, group1Roots: 0 };
}

function measureDirSizeSync(dirPath) {
  let bytes = 0;
  try {
    const st = fs.statSync(dirPath);
    if (st.isFile()) return st.size;
    if (!st.isDirectory()) return 0;
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dirPath, ent.name);
      if (ent.isDirectory()) {
        bytes += measureDirSizeSync(full);
      } else if (ent.isFile()) {
        try {
          bytes += fs.statSync(full).size;
        } catch {
          /* ignore */
        }
      }
    }
  } catch {
    /* ignore */
  }
  return bytes;
}

const DISPOSABLE_PROFILE_SHADER_REL_PATHS = [
  "GraphiteDawnCache",
  "GrShaderCache",
  "ShaderCache",
  "DawnCache",
  "BrowserMetrics",
  "BrowserMetrics-spare.pma",
  path.join("Crashpad", "reports"),
  path.join("Crashpad", "attachments"),
  path.join("Default", "Cache"),
  path.join("Default", "Service Worker", "CacheStorage"),
  path.join("Default", "Service Worker", "ScriptCache"),
  path.join("Default", "Shared Dictionary"),
  path.join("Default", "DawnGraphiteCache"),
  path.join("Default", "DawnWebGPUCache"),
  path.join("Default", "GPUCache"),
  path.join("Default", "Code Cache", "js"),
  path.join("Default", "Code Cache", "wasm"),
];

const PROFILE_LOCK_FILES = ["lockfile", "SingletonLock", "SingletonCookie", "SingletonSocket", "SingletonBadge"];

function isProfileDirectoryLocked(profDir) {
  for (const lf of PROFILE_LOCK_FILES) {
    if (fs.existsSync(path.join(profDir, lf))) return true;
  }
  return false;
}

const DISK_PRESSURE_GUARD_THRESHOLD_GB = 60;
let lastDiskPressureGuardTriggerMs = 0;

export function readProfilesDiskPressure() {
  try {
    const st = fs.statfsSync("D:\\");
    const freeGB = Math.round(((st.bavail * st.bsize) / 1024 ** 3) * 100) / 100;
    const totalGB = Math.round(((st.blocks * st.bsize) / 1024 ** 3) * 100) / 100;
    const usedPct = totalGB > 0 ? Math.round(((totalGB - freeGB) / totalGB) * 1000) / 10 : 0;
    return {
      drive: "D:",
      freeGB,
      totalGB,
      usedPct,
      thresholdGB: DISK_PRESSURE_GUARD_THRESHOLD_GB,
      underPressure: freeGB > 0 && freeGB < DISK_PRESSURE_GUARD_THRESHOLD_GB,
    };
  } catch {
    return {
      drive: "D:",
      freeGB: null,
      totalGB: null,
      usedPct: null,
      thresholdGB: DISK_PRESSURE_GUARD_THRESHOLD_GB,
      underPressure: false,
    };
  }
}

export function readStorageAndIoTelemetry() {
  const drives = ["C:\\", "D:\\", "E:\\"];
  const volumes = [];
  let totalUsedGB = 0;
  let totalCapacityGB = 0;
  let maxLatencyMs = 0;
  let underPressure = false;

  for (const root of drives) {
    try {
      const t0 = performance.now();
      const st = fs.statfsSync(root);
      fs.statSync(root);
      const latencyMs = Math.round((performance.now() - t0) * 100) / 100;
      const freeGB = Math.round(((st.bavail * st.bsize) / 1024 ** 3) * 10) / 10;
      const totalGB = Math.round(((st.blocks * st.bsize) / 1024 ** 3) * 10) / 10;
      const usedGB = Math.round(Math.max(0, totalGB - freeGB) * 10) / 10;
      const usedPct = totalGB > 0 ? Math.round((usedGB / totalGB) * 1000) / 10 : 0;
      totalUsedGB = Math.round((totalUsedGB + usedGB) * 10) / 10;
      totalCapacityGB = Math.round((totalCapacityGB + totalGB) * 10) / 10;
      if (latencyMs > maxLatencyMs) maxLatencyMs = latencyMs;
      if (freeGB < 20) underPressure = true;
      volumes.push({
        drive: root.slice(0, 2),
        totalGB,
        usedGB,
        freeGB,
        usedPct,
        probeLatencyMs: latencyMs,
      });
    } catch {
      /* ignore missing drive */
    }
  }

  return {
    volumes,
    totalUsedGB,
    totalCapacityGB,
    totalFreeGB: Math.round(Math.max(0, totalCapacityGB - totalUsedGB) * 10) / 10,
    maxLatencyMs,
    ioStalled: maxLatencyMs >= 15,
    underPressure,
  };
}

let nightlyMaintenanceInFlight = false;

/**
 * Nightly Deep Maintenance (`ok 2` — 04:00 AM daily or on-demand `action: "deep-maintenance"`):
 * 1. Checkpoints SQLite WAL files (`PRAGMA wal_checkpoint(PASSIVE)`) on Stealth & Desk Console databases.
 * 2. Purges disposable GPU/Shader cache directories ONLY inside CLOSED Stealth profile directories
 *    (100% preserving Cookies, Local Storage, IndexedDB, Extensions, Preferences, and skipping all open profiles).
 * 3. Runs `trimBackgroundWorkingSet()` and `pruneWorkspaceJunk()`.
 */
export async function runNightlyDeepMaintenance(options = {}) {
  if (nightlyMaintenanceInFlight) {
    return { ok: true, skipped: true, reason: "already-running" };
  }
  nightlyMaintenanceInFlight = true;
  const maxProfiles =
    Number(options.maxProfiles) > 0 ? Number(options.maxProfiles) : Number.POSITIVE_INFINITY;
  try {
    // 1. Query running profiles on P0003 (:6003) so we NEVER touch open profile directories
    const runningIds = new Set();
    try {
      const rRes = await fetch("http://127.0.0.1:6003/api/sessions/running", {
        signal: AbortSignal.timeout(2500),
      });
      if (rRes.ok) {
        const rJson = await rRes.json();
        const sessions = Array.isArray(rJson?.data)
          ? rJson.data
          : Array.isArray(rJson?.sessions)
            ? rJson.sessions
            : [];
        for (const s of sessions) {
          if (s?.profileId) runningIds.add(String(s.profileId));
        }
      }
    } catch {
      /* ignore */
    }

    // 2. Prune >7-day debug screenshots & >14-day automation runs + Checkpoint SQLite WAL files via built-in `node:sqlite`
    let walCheckpointed = 0;
    let prunedRunArtifacts = 0;
    const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
    try {
      const screenshotDirs = [
        path.join(appData, "stealth-browser-console", "screenshots"),
        path.join(appData, "stealth-browser-console", "data", "screenshots"),
      ];
      const sevenDaysMs = 7 * 86400_000;
      for (const sDir of screenshotDirs) {
        if (!fs.existsSync(sDir)) continue;
        for (const fName of fs.readdirSync(sDir)) {
          const full = path.join(sDir, fName);
          try {
            const st = fs.statSync(full);
            if (st.isFile() && Date.now() - st.mtimeMs > sevenDaysMs) {
              fs.rmSync(full, { force: true });
              prunedRunArtifacts++;
            }
          } catch {
            /* ignore */
          }
        }
      }
      // Also sweep leaked playwright* / scoped_dir* / chromium* / p0019-* / desk-console* temp entries (>2h old) in os.tmpdir() and D:\Temp
      const tmpRoots = Array.from(new Set([os.tmpdir(), "D:\\Temp"].filter((d) => d && fs.existsSync(d))));
      const twoHoursMs = 2 * 3600_000;
      for (const tmpDir of tmpRoots) {
        for (const ent of fs.readdirSync(tmpDir, { withFileTypes: true })) {
          if (!/^(playwright|scoped_dir|puppeteer|chromium|chrome_BITS_|p0003-ck-|p0019-commen|desk-console|p0019-campai|audit-hist-|stealth-prof|p0009-|p0002-cp-|desk-picker-)/i.test(ent.name)) continue;
          const fullTmp = path.join(tmpDir, ent.name);
          try {
            const st = fs.statSync(fullTmp);
            if (Date.now() - st.mtimeMs > twoHoursMs) {
              if (ent.isDirectory() && isProfileDirectoryLocked(fullTmp)) continue;
              fs.rmSync(fullTmp, { recursive: true, force: true });
              prunedRunArtifacts++;
            }
          } catch {
            /* ignore if in use */
          }
        }
      }
      // Sweep stale (>7d) temporary folders/files in E:\Dev\.cache while preserving allowlisted state/auth dirs (`ok 2`)
      const devCacheDir = path.join(DEV_ROOT, ".cache");
      const CACHE_ALLOWLIST = new Set([
        "gcp-oauth",
        "rclone-oauth",
        "supabase-prod-backups",
        "lenovo-standby-archive",
        "g1-family-unlock-sessions.json",
        "g1-family-unlock-rr.json",
      ]);
      if (fs.existsSync(devCacheDir)) {
        for (const ent of fs.readdirSync(devCacheDir, { withFileTypes: true })) {
          if (CACHE_ALLOWLIST.has(ent.name)) continue;
          const fullCachePath = path.join(devCacheDir, ent.name);
          try {
            const st = fs.statSync(fullCachePath);
            if (Date.now() - st.mtimeMs > sevenDaysMs) {
              if (ent.isDirectory() && isProfileDirectoryLocked(fullCachePath)) continue;
              fs.rmSync(fullCachePath, { recursive: true, force: true });
              prunedRunArtifacts++;
            }
          } catch {
            /* ignore if locked */
          }
        }
      }
    } catch {
      /* ignore */
    }
    try {
      const dbCandidates = [
        path.join(appData, "stealth-browser-console", "data", "stealth-console.db"),
        path.join(appData, "desk-console", "desk-console.db"),
      ];
      for (const dbPath of dbCandidates) {
        if (fs.existsSync(dbPath)) {
          try {
            const db = openLocalSqlite(dbPath);
            db.exec("PRAGMA busy_timeout = 3000;");
            if (dbPath.includes("stealth-console.db")) {
              try {
                db.exec("DELETE FROM runs WHERE finished_at IS NOT NULL AND finished_at < datetime('now', '-14 days');");
              } catch {
                /* ignore if table/column differs */
              }
            }
            db.exec("PRAGMA wal_checkpoint(PASSIVE);");
            db.close();
            walCheckpointed++;
          } catch {
            /* ignore locked db */
          }
        }
      }
    } catch {
      /* node:sqlite unavailable */
    }

    // 3. Purge GPU/Shader/Code/Crashpad cache + Stale (>14d) Service Worker CacheStorage across 100% of closed profiles (async-yielding)
    const profilesRoot = "D:\\StealthBrowser\\profiles";
    const fourteenDaysMs = 14 * 86400_000;
    let cleanedProfiles = 0;
    let scannedProfiles = 0;
    let staleCacheStorageTrimmed = 0;
    let beforeFreeBytes = 0;
    try {
      const stBefore = fs.statfsSync("D:\\");
      beforeFreeBytes = stBefore.bavail * stBefore.bsize;
    } catch {
      beforeFreeBytes = 0;
    }
    if (fs.existsSync(profilesRoot)) {
      const dirNames = fs.readdirSync(profilesRoot);
      for (const dirName of dirNames) {
        if (cleanedProfiles >= maxProfiles) break;
        if (runningIds.has(dirName)) continue;
        const profDir = path.join(profilesRoot, dirName);
        // Strictly skip any profile directory that has an active Chromium lockfile (never touch open profiles regardless of uptime)
        if (isProfileDirectoryLocked(profDir)) continue;

        let profCleaned = false;
        for (const rel of DISPOSABLE_PROFILE_SHADER_REL_PATHS) {
          const targetDir = path.join(profDir, rel);
          if (fs.existsSync(targetDir)) {
            try {
              fs.rmSync(targetDir, { recursive: true, force: true });
              if (rel.includes("CacheStorage")) staleCacheStorageTrimmed++;
              profCleaned = true;
            } catch {
              /* ignore if in use */
            }
          }
        }

        if (profCleaned) cleanedProfiles++;
        scannedProfiles++;
        if (scannedProfiles % 20 === 0) {
          await new Promise((r) => setTimeout(r, 4));
        }
      }
    }

    let freedBytes = 0;
    try {
      const stAfter = fs.statfsSync("D:\\");
      const afterFreeBytes = stAfter.bavail * stAfter.bsize;
      if (beforeFreeBytes > 0 && afterFreeBytes > beforeFreeBytes) {
        freedBytes = afterFreeBytes - beforeFreeBytes;
      }
    } catch {
      freedBytes = 0;
    }

    const passFreedMB = Math.round((freedBytes / (1024 * 1024)) * 100) / 100;
    const nowIso = new Date().toISOString();
    const todayLocal = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD

    const cfg = readFarmSupervisorConfig();
    const prevClean = Number(cfg.nightlyMaintenance?.cleanedProfiles || 0);
    const prevFreed = Number(cfg.nightlyMaintenance?.freedMB || 0);
    const totalCleaned = passFreedMB > 0 ? prevClean + cleanedProfiles : Math.max(prevClean, scannedProfiles);
    const totalFreedMB = Math.round((prevFreed + passFreedMB) * 100) / 100;

    const prevStaleSw = Number(cfg.nightlyMaintenance?.staleCacheStorageTrimmed || 0);
    const prevPrunedArtifacts = Number(cfg.nightlyMaintenance?.prunedRunArtifacts || 0);

    cfg.nightlyMaintenance = {
      scheduleLocal: "04:00",
      lastRunAt: nowIso,
      lastRunDate: todayLocal,
      scannedProfiles,
      cleanedProfiles: totalCleaned,
      freedMB: totalFreedMB,
      lastPassCleanedProfiles: cleanedProfiles,
      lastPassFreedMB: passFreedMB,
      staleCacheStorageTrimmed: prevStaleSw + staleCacheStorageTrimmed,
      prunedRunArtifacts: prevPrunedArtifacts + prunedRunArtifacts,
      walCheckpointed,
    };
    writeFarmSupervisorConfig(cfg);

    return {
      ok: true,
      completedAt: nowIso,
      scannedProfiles,
      cleanedProfiles: totalCleaned,
      freedMB: totalFreedMB,
      lastPassCleanedProfiles: cleanedProfiles,
      lastPassFreedMB: passFreedMB,
      staleCacheStorageTrimmed: prevStaleSw + staleCacheStorageTrimmed,
      prunedRunArtifacts: prevPrunedArtifacts + prunedRunArtifacts,
      walCheckpointed,
    };
  } finally {
    nightlyMaintenanceInFlight = false;
  }
}

/**
 * Automatic background sweeper (every 20 seconds):
 * - Closes leaked non-blank tabs in Agent Smoke Pool (`9990–9999`)
 * - Closes invisible `headless: true` farm profiles idle >= 3 minutes OR exceeding `maxHeadlessConcurrent: 10`
 *   via zero-WMI CDP `Browser.close` (prevents 35+ concurrent Chromium GPU/DWM processes from saturating `dwm.exe`; never touches headed user windows `headless: false`).
 * - Runs `autoHealSystemHandleLeaks()` (<3ms) to prevent EVKey64 / olk / runaway renderer handle storms.
 * - Runs `balanceChromeProcessorGroupsNative()` (<1.5ms) to split Chrome browser trees 50/50 across Dual-Xeon Processor Groups 0 & 1.
 * - Triggers `runNightlyDeepMaintenance()` once daily at 04:00 AM local time across 100% of closed profiles.
 */
let lastAntigravitySweepMs = 0;
let cachedAntigravityStats = { atMs: 0, data: null };

export function readAntigravityBrainStats(force = false, existingScan = null) {
  const now = Date.now();
  let lsRamMB = cachedAntigravityStats.data?.lsRamMB || 0;
  if (existingScan?.processes) {
    lsRamMB = 0;
    for (const p of existingScan.processes) {
      if (/^language_server/i.test(String(p.name || ""))) {
        lsRamMB = Math.round((lsRamMB + (Number(p.ramMB) || 0)) * 10) / 10;
      }
    }
  }
  if (!force && cachedAntigravityStats.data && now - cachedAntigravityStats.atMs < 20_000) {
    return { ...cachedAntigravityStats.data, lsRamMB };
  }
  const agyRoot = path.join(os.homedir(), ".gemini", "antigravity");
  const brainDir = path.join(agyRoot, "brain");
  const convDir = path.join(agyRoot, "conversations");
  const sumDbPath = path.join(agyRoot, "conversation_summaries.db");
  let sessionCount = 0;
  let openTabCount = 0;
  let brainBytes = 0;
  let convBytes = 0;
  let sumDbBytes = 0;
  const bloatedIdSet = new Set();
  const openBloatedTabs = [];

  try {
    const summaryMap = new Map();
    if (fs.existsSync(sumDbPath)) {
      try {
        sumDbBytes = fs.statSync(sumDbPath).size;
      } catch {
        /* ignore */
      }
      let sdb = null;
      try {
        sdb = openLocalSqlite(sumDbPath, { readOnly: true });
        const rows = sdb
          .prepare("SELECT conversation_id, title, step_count FROM conversation_summaries")
          .all();
        for (const r of rows) {
          summaryMap.set(r.conversation_id, {
            title: String(r.title || "").trim(),
            steps: Number(r.step_count) || 0,
          });
        }
      } catch {
        /* ignore */
      } finally {
        try {
          sdb?.close();
        } catch {
          /* ignore */
        }
      }
    }

    if (fs.existsSync(brainDir)) {
      for (const id of fs.readdirSync(brainDir)) {
        if (id === "tempmediaStorage" || id.startsWith(".")) continue;
        const full = path.join(brainDir, id);
        let st;
        try {
          st = fs.statSync(full);
        } catch {
          continue;
        }
        if (!st.isDirectory()) continue;
        sessionCount += 1;
        const logsDir = path.join(full, ".system_generated", "logs");
        if (fs.existsSync(logsDir)) {
          for (const lf of fs.readdirSync(logsDir, { withFileTypes: true })) {
            const lfp = path.join(logsDir, lf.name);
            try {
              if (lf.isDirectory()) {
                for (const cf of fs.readdirSync(lfp)) {
                  try {
                    brainBytes += fs.statSync(path.join(lfp, cf)).size;
                  } catch {
                    /* ignore */
                  }
                }
              } else {
                const lst = fs.statSync(lfp);
                brainBytes += lst.size;
                if (lf.name === "transcript.jsonl" && lst.size >= 5 * 1024 * 1024) {
                  bloatedIdSet.add(id.slice(0, 8));
                }
              }
            } catch {
              /* ignore */
            }
          }
        }
        const scratchDir = path.join(full, "scratch");
        if (fs.existsSync(scratchDir)) {
          const stack = [scratchDir];
          while (stack.length) {
            const cur = stack.pop();
            let children = [];
            try {
              children = fs.readdirSync(cur, { withFileTypes: true });
            } catch {
              continue;
            }
            for (const c of children) {
              const cp = path.join(cur, c.name);
              try {
                if (c.isDirectory()) stack.push(cp);
                else brainBytes += fs.statSync(cp).size;
              } catch {
                /* ignore */
              }
            }
          }
        }
      }
    }
    if (fs.existsSync(convDir)) {
      const convFiles = new Set(fs.readdirSync(convDir));
      for (const f of convFiles) {
        const fp = path.join(convDir, f);
        try {
          const cst = fs.statSync(fp);
          convBytes += cst.size;
          if (f.endsWith(".db")) {
            const id = f.replace(/\.db$/i, "");
            const openInIde = convFiles.has(`${f}-wal`) || convFiles.has(`${f}-shm`);
            if (openInIde) openTabCount += 1;
            const dbMB = Math.round((cst.size / 1048576) * 10) / 10;
            const meta = summaryMap.get(id);
            const steps = meta?.steps || 0;
            const isBloated = dbMB >= 50 || steps >= 4000 || bloatedIdSet.has(id.slice(0, 8));
            if (isBloated) {
              bloatedIdSet.add(id.slice(0, 8));
              openBloatedTabs.push({
                id: id.slice(0, 8),
                title: (meta?.title || id.slice(0, 8)).slice(0, 34),
                steps,
                dbMB,
                openInIde,
              });
            }
          }
        } catch {
          /* ignore */
        }
      }
    }
  } catch {
    /* ignore */
  }

  openBloatedTabs.sort((a, b) => Number(b.openInIde) - Number(a.openInIde) || b.dbMB - a.dbMB);
  const bloatedIds = [...bloatedIdSet];
  const brainMB = Math.round((brainBytes / 1048576) * 10) / 10;
  const convMB = Math.round((convBytes / 1048576) * 10) / 10;
  const sumDbMB = Math.round((sumDbBytes / 1048576) * 10) / 10;
  const totalMB = Math.round((brainMB + convMB + sumDbMB) * 10) / 10;
  const data = {
    sessionCount,
    openTabCount,
    totalMB,
    brainMB,
    convMB,
    sumDbMB,
    bloatedCount: bloatedIds.length,
    bloatedIds: bloatedIds.slice(0, 5),
    openBloatedTabs: openBloatedTabs.slice(0, 5),
    lsRamMB,
  };
  cachedAntigravityStats = { atMs: now, data };
  return data;
}

export function sweepAntigravityStaleTranscripts(options = {}) {
  // Keep conversations touched by the user or agent within the last 48h (2 days); only delete closed sessions
  // with zero activity > 48h, ghost entries in conversation_summaries.db, and finished subagents (> 6h idle).
  const idleSessionMaxAgeMs = Number(options.idleSessionMaxAgeMs) || 48 * 3600_000;
  const subagentMaxAgeMs = 6 * 3600_000;
  const taskStepMaxAgeMs = Number(options.taskStepMaxAgeMs) || 24 * 3600_000; // 24h for closed session task/step files
  const agyRoot = path.join(os.homedir(), ".gemini", "antigravity");
  const brainDir = path.join(agyRoot, "brain");
  const convDir = path.join(agyRoot, "conversations");
  const annDir = path.join(agyRoot, "annotations");
  const presDir = path.join(agyRoot, "presence");
  const sumDbPath = path.join(agyRoot, "conversation_summaries.db");
  const now = Date.now();
  let removedSessions = 0;
  let prunedArtifacts = 0;

  const forceRemoveDir = (p) => {
    try {
      fs.rmSync(p, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
    if (fs.existsSync(p)) {
      try {
        execFileSync(
          "cmd.exe",
          ["/d", "/s", "/c", `attrib -r -s -h "${p}\\*" /s /d >nul 2>&1 & rd /s /q "${p}" >nul 2>&1`],
          { windowsHide: true, timeout: 5000 },
        );
      } catch {
        /* ignore */
      }
    }
    return !fs.existsSync(p);
  };

  try {
    const activeIds = new Set();
    const summaryMeta = new Map();
    if (fs.existsSync(sumDbPath)) {
      let sdb = null;
      try {
        sdb = openLocalSqlite(sumDbPath, { readOnly: true });
        const rows = sdb
          .prepare(
            "SELECT conversation_id, last_modified_time, last_user_input_time, parent_conversation_id FROM conversation_summaries",
          )
          .all();
        for (const r of rows) {
          summaryMeta.set(r.conversation_id, {
            modMs: Date.parse(r.last_modified_time) || 0,
            userMs: Date.parse(r.last_user_input_time) || 0,
            isSubagent: Boolean(r.parent_conversation_id),
          });
        }
      } catch {
        /* ignore */
      } finally {
        try {
          sdb?.close();
        } catch {
          /* ignore */
        }
      }
    }

    if (fs.existsSync(brainDir)) {
      for (const id of fs.readdirSync(brainDir)) {
        if (id === "tempmediaStorage" || id.startsWith(".")) continue;
        const full = path.join(brainDir, id);
        let st;
        try {
          st = fs.statSync(full);
        } catch {
          continue;
        }
        if (!st.isDirectory()) continue;

        const cDbPath = path.join(convDir, `${id}.db`);
        const isOpenInIde = fs.existsSync(`${cDbPath}-wal`) || fs.existsSync(`${cDbPath}-shm`);
        const meta = summaryMeta.get(id);
        const tPath = path.join(full, ".system_generated", "logs", "transcript.jsonl");
        let tMtime = 0;
        try {
          tMtime = fs.statSync(tPath).mtimeMs;
        } catch {
          /* ignore */
        }

        const effectiveLastActiveMs = Math.max(
          meta?.userMs || 0,
          meta?.modMs || 0,
          tMtime || 0,
          st.mtimeMs || 0,
          st.birthtimeMs || 0,
        );
        const isStaleSubagent =
          (meta?.isSubagent || (!meta && !tMtime)) &&
          now - Math.max(meta?.modMs || 0, tMtime || 0, st.mtimeMs || 0, st.birthtimeMs || 0) > subagentMaxAgeMs;
        const isStaleSession = now - effectiveLastActiveMs > idleSessionMaxAgeMs;

        if (!isOpenInIde && (isStaleSubagent || isStaleSession)) {
          if (forceRemoveDir(full)) {
            removedSessions += 1;
          }
          continue;
        }
        activeIds.add(id);
        // Never touch brain/<id>/scratch or any files in open/active conversations.
        // Only prune .system_generated/tasks or steps from a closed conversation idle > 24h.
        if (!isOpenInIde && now - effectiveLastActiveMs > 24 * 3600_000) {
          for (const sub of ["tasks", "steps"]) {
            const subDir = path.join(full, ".system_generated", sub);
            if (!fs.existsSync(subDir)) continue;
            for (const item of fs.readdirSync(subDir)) {
              const itemPath = path.join(subDir, item);
              try {
                const ist = fs.statSync(itemPath);
                if (now - ist.mtimeMs > taskStepMaxAgeMs) {
                  fs.rmSync(itemPath, { recursive: true, force: true });
                  prunedArtifacts += 1;
                }
              } catch {
                /* ignore */
              }
            }
          }
        }
      }
    }

    // Remove orphan files in conversations/, annotations/, and presence/ FIRST before cleaning conversation_summaries.db
    if (fs.existsSync(convDir)) {
      for (const name of fs.readdirSync(convDir)) {
        const baseId = name.replace(/\.(pb|json|db|bak).*$/i, "");
        if (activeIds.has(baseId)) continue;
        const full = path.join(convDir, name);
        try {
          fs.rmSync(full, { recursive: true, force: true });
          prunedArtifacts += 1;
        } catch {
          /* ignore */
        }
      }
    }
    if (fs.existsSync(annDir)) {
      for (const name of fs.readdirSync(annDir)) {
        const baseId = name.replace(/\.pbtxt$/i, "");
        if (activeIds.has(baseId)) continue;
        try {
          fs.rmSync(path.join(annDir, name), { force: true });
          prunedArtifacts += 1;
        } catch {
          /* ignore */
        }
      }
    }
    if (fs.existsSync(presDir)) {
      for (const name of fs.readdirSync(presDir)) {
        const baseId = name.replace(/\.lock$/i, "");
        if (activeIds.has(baseId)) continue;
        try {
          fs.rmSync(path.join(presDir, name), { force: true });
          prunedArtifacts += 1;
        } catch {
          /* ignore */
        }
      }
    }

    // Sync conversation_summaries.db + conversations_fts so deleted/ghost chats disappear from the Antigravity UI sidebar
    if (fs.existsSync(sumDbPath)) {
      let sdb = null;
      try {
        sdb = openLocalSqlite(sumDbPath);
        sdb.exec("PRAGMA busy_timeout = 3000;");
        const delSum = sdb.prepare("DELETE FROM conversation_summaries WHERE conversation_id = ?");
        const delFts = sdb.prepare("DELETE FROM conversations_fts WHERE conversation_id = ?");
        let dbRemoved = 0;
        sdb.exec("BEGIN IMMEDIATE;");
        const curRows = sdb.prepare("SELECT conversation_id FROM conversation_summaries").all();
        for (const r of curRows) {
          if (!activeIds.has(r.conversation_id)) {
            delSum.run(r.conversation_id);
            delFts.run(r.conversation_id);
            dbRemoved += 1;
          }
        }
        const ftsRows = sdb.prepare("SELECT DISTINCT conversation_id FROM conversations_fts").all();
        for (const r of ftsRows) {
          if (!activeIds.has(r.conversation_id)) {
            delFts.run(r.conversation_id);
            dbRemoved += 1;
          }
        }
        sdb.exec("COMMIT;");
        if (dbRemoved > 0) {
          removedSessions += dbRemoved;
        }
        try {
          const fl = sdb.prepare("PRAGMA freelist_count").get();
          if (dbRemoved > 0 || (Number(fl?.freelist_count) || 0) > 500) {
            sdb.exec("INSERT INTO conversations_fts(conversations_fts) VALUES('optimize');");
            sdb.exec("VACUUM;");
            sdb.exec("PRAGMA wal_checkpoint(TRUNCATE);");
          }
        } catch {
          /* ignore */
        }
      } catch {
        /* ignore */
      } finally {
        try {
          sdb?.close();
        } catch {
          /* ignore */
        }
      }
    }

    // Auto-compact closed trajectory DBs (> 20 MB, no active .db-wal/.db-shm) by trimming old gen_metadata/executor_metadata
    if (fs.existsSync(convDir)) {
      const convFiles = new Set(fs.readdirSync(convDir));
      for (const name of convFiles) {
        if (!name.endsWith(".db")) continue;
        if (convFiles.has(`${name}-wal`) || convFiles.has(`${name}-shm`)) continue;
        const full = path.join(convDir, name);
        try {
          const cst = fs.statSync(full);
          if (cst.size < 20 * 1048576 || now - cst.mtimeMs < 6 * 3600_000) continue;
          let cdb = null;
          try {
            cdb = openLocalSqlite(full);
            cdb.exec("PRAGMA busy_timeout = 1500;");
            const oldGen = cdb
              .prepare("SELECT COUNT(*) as c FROM gen_metadata WHERE idx < (SELECT COALESCE(MAX(idx),0) - 100 FROM steps)")
              .get();
            if (oldGen?.c > 50) {
              cdb.exec("DELETE FROM gen_metadata WHERE idx < (SELECT COALESCE(MAX(idx),0) - 100 FROM steps);");
              cdb.exec("DELETE FROM executor_metadata WHERE idx < (SELECT COALESCE(MAX(idx),0) - 100 FROM steps);");
              cdb.exec("VACUUM;");
              prunedArtifacts += 1;
            }
          } finally {
            try {
              cdb?.close();
            } catch {
              /* ignore */
            }
          }
        } catch {
          /* ignore */
        }
      }
    }
    // Rotate background farm logs > 2 MB down to tail 512 KB so Ops Console log reads stay instant
    const farmLogsDir = path.join(DEV_ROOT, "Tool", "P0002-Social-Hub", "data", "logs");
    if (fs.existsSync(farmLogsDir)) {
      for (const f of fs.readdirSync(farmLogsDir)) {
        if (!f.endsWith(".log")) continue;
        const fp = path.join(farmLogsDir, f);
        try {
          const st = fs.statSync(fp);
          if (st.size > 2 * 1024 * 1024) {
            const buf = fs.readFileSync(fp);
            fs.writeFileSync(fp, buf.subarray(buf.length - 512 * 1024));
            prunedArtifacts += 1;
          }
        } catch {
          /* ignore */
        }
      }
    }

    // 2. Cursor, Claude, Codex & Grok Bot unified cache / snapshot / queue optimization
    const home = os.homedir();
    const appData = process.env.APPDATA || path.join(home, "AppData", "Roaming");
    const disposableAgentDirs = [
      // Cursor (1.49 GB snapshots + GPU/Code caches)
      path.join(appData, "Cursor", "snapshots"),
      path.join(appData, "Cursor", "CachedData"),
      path.join(appData, "Cursor", "Cache"),
      path.join(appData, "Cursor", "Code Cache"),
      path.join(appData, "Cursor", "GPUCache"),
      path.join(appData, "Cursor", "DawnGraphiteCache"),
      path.join(appData, "Cursor", "Crashpad", "reports"),
      // Claude Desktop & Claude Code (489 MB Code Cache + Cache + logs)
      path.join(appData, "Claude", "Code Cache"),
      path.join(appData, "Claude", "Cache"),
      path.join(appData, "Claude", "GPUCache"),
      path.join(appData, "Claude", "GrShaderCache"),
      path.join(appData, "Claude", "logs"),
      // OpenAI Codex CLI (187 MB .tmp + cache)
      path.join(home, ".codex", ".tmp"),
      path.join(home, ".codex", "cache"),
    ];
    for (const d of disposableAgentDirs) {
      if (!fs.existsSync(d)) continue;
      for (const childName of fs.readdirSync(d)) {
        const childPath = path.join(d, childName);
        try {
          const cst = fs.statSync(childPath);
          if (now - cst.mtimeMs > 30 * 60_000) {
            fs.rmSync(childPath, { recursive: true, force: true });
            prunedArtifacts += 1;
          }
        } catch {
          /* ignore locked active files */
        }
      }
    }

    // Prune Claude Code & Cursor old JSONL session transcripts (> 48h idle)
    const claudeProjectsDir = path.join(home, ".claude", "projects");
    if (fs.existsSync(claudeProjectsDir)) {
      for (const proj of fs.readdirSync(claudeProjectsDir)) {
        const pDir = path.join(claudeProjectsDir, proj);
        try {
          if (!fs.statSync(pDir).isDirectory()) continue;
          for (const jf of fs.readdirSync(pDir)) {
            if (!jf.endsWith(".jsonl")) continue;
            const jPath = path.join(pDir, jf);
            const jst = fs.statSync(jPath);
            if (now - jst.mtimeMs > idleSessionMaxAgeMs) {
              fs.rmSync(jPath, { force: true });
              removedSessions += 1;
            }
          }
        } catch {
          /* ignore */
        }
      }
    }

    // Keep only latest 1 CLI version in Cursor agent-cli & Claude claude-code, and prune >7d Cursor History
    const cursorCli = path.join(appData, "Cursor", "User", "globalStorage", "anysphere.cursor-agent-worker", "agent-cli");
    if (fs.existsSync(cursorCli)) {
      for (const name of fs.readdirSync(cursorCli)) {
        if (name.endsWith(".zip")) {
          try {
            fs.rmSync(path.join(cursorCli, name), { force: true });
            prunedArtifacts += 1;
          } catch {
            /* ignore */
          }
        }
      }
      const verDir = path.join(cursorCli, ".local", "share", "cursor-agent", "versions");
      if (fs.existsSync(verDir)) {
        const vers = fs
          .readdirSync(verDir)
          .map((n) => ({ fp: path.join(verDir, n), mtimeMs: fs.statSync(path.join(verDir, n)).mtimeMs }))
          .sort((a, b) => b.mtimeMs - a.mtimeMs);
        for (const old of vers.slice(1)) {
          try {
            fs.rmSync(old.fp, { recursive: true, force: true });
            prunedArtifacts += 1;
          } catch {
            /* ignore */
          }
        }
      }
    }
    const claudeCli = path.join(appData, "Claude", "claude-code");
    if (fs.existsSync(claudeCli)) {
      const vers = fs
        .readdirSync(claudeCli)
        .map((n) => ({ fp: path.join(claudeCli, n), mtimeMs: fs.statSync(path.join(claudeCli, n)).mtimeMs }))
        .sort((a, b) => b.mtimeMs - a.mtimeMs);
      for (const old of vers.slice(1)) {
        try {
          fs.rmSync(old.fp, { recursive: true, force: true });
          prunedArtifacts += 1;
        } catch {
          /* ignore */
        }
      }
    }
    const cursorHist = path.join(appData, "Cursor", "User", "History");
    if (fs.existsSync(cursorHist)) {
      const sevenDaysMs = 7 * 86400_000;
      for (const h of fs.readdirSync(cursorHist)) {
        const hp = path.join(cursorHist, h);
        try {
          if (now - fs.statSync(hp).mtimeMs > sevenDaysMs) {
            fs.rmSync(hp, { recursive: true, force: true });
            prunedArtifacts += 1;
          }
        } catch {
          /* ignore */
        }
      }
    }

    // Grok Bot / Multi-Agent Telegram Bridge: compact consumed inbox & cap agent-chat-turns.jsonl <= 2 MB
    const tgInboxPath = path.join(DEV_ROOT, "Tool", ".ship", "telegram-inbox.jsonl");
    if (fs.existsSync(tgInboxPath)) {
      try {
        const ist = fs.statSync(tgInboxPath);
        if (ist.size > 256 * 1024) {
          const lines = fs.readFileSync(tgInboxPath, "utf8").split(/\r?\n/).filter(Boolean);
          const kept = lines.filter((l) => {
            try {
              const obj = JSON.parse(l);
              if (!obj.consumed) return true;
              const t = Date.parse(obj.consumedAt || obj.at || "");
              return Number.isFinite(t) && now - t < 24 * 3600_000;
            } catch {
              return false;
            }
          });
          if (kept.length < lines.length) {
            fs.writeFileSync(tgInboxPath, kept.join("\n") + (kept.length ? "\n" : ""), "utf8");
            prunedArtifacts += lines.length - kept.length;
          }
        }
      } catch {
        /* ignore */
      }
    }
    const tgTurnsPath = path.join(DEV_ROOT, "Tool", ".ship", "agent-chat-turns.jsonl");
    if (fs.existsSync(tgTurnsPath)) {
      try {
        const tst = fs.statSync(tgTurnsPath);
        if (tst.size > 2 * 1024 * 1024) {
          const buf = fs.readFileSync(tgTurnsPath);
          fs.writeFileSync(tgTurnsPath, buf.subarray(buf.length - 512 * 1024));
          prunedArtifacts += 1;
        }
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
  return { ok: true, removedSessions, prunedArtifacts };
}

const lastTaskAutoHealMap = new Map();

export async function autoHealFailedScheduledTasks() {
  const retried = [];
  try {
    const tasks = await listDevTasks(true);
    const now = Date.now();
    for (const t of tasks || []) {
      const status = String(t.status || "").toLowerCase();
      if (status === "disabled" || status === "running") continue;
      if (String(t.lastResult ?? "0") === "0") continue;
      const prevAt = Number(lastTaskAutoHealMap.get(t.name) || 0);
      if (now - prevAt < 30 * 60_000) continue;
      lastTaskAutoHealMap.set(t.name, now);
      try {
        await runTask(t.name);
        retried.push(t.name);
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
  return { ok: true, retried };
}

export function startAutoPcMaintenanceWatch() {
  ensurePlaywrightHeadlessShellsGuiSubsystem();
  if (autoMaintenanceTimer) return;
  autoMaintenanceTimer = setInterval(() => {
    let adaptive = { maxHeadlessIdleMs: 3 * 60_000, maxHeadlessConcurrent: 10 };
    try {
      const scan = scanNativeProcesses();
      autoHealSystemHandleLeaks(scan);
      balanceChromeProcessorGroupsNative();
      void runFarmSupervisorTick(scan).catch(() => undefined);
      if (Date.now() - lastAntigravitySweepMs > 10 * 60_000) {
        lastAntigravitySweepMs = Date.now();
        ensurePlaywrightHeadlessShellsGuiSubsystem();
        sweepAntigravityStaleTranscripts();
        void autoHealFailedScheduledTasks().catch(() => undefined);
      }
      adaptive = computeAdaptiveHeadlessCap(scan);

      // Check 04:00 AM+ local Nightly Deep Maintenance trigger (with catch-up if PC woke after 04:00)
      const now = new Date();
      if (now.getHours() >= 4) {
        const todayLocal = now.toLocaleDateString("en-CA");
        const cfg = readFarmSupervisorConfig();
        if (cfg.nightlyMaintenance?.lastRunDate !== todayLocal && !nightlyMaintenanceInFlight) {
          void runNightlyDeepMaintenance().catch(() => undefined);
        }
      }

      // Disk Pressure Guard (`ok 3`): Auto-trigger Deep Maintenance if D:\ Free Space drops below 25 GB
      const diskGuard = readProfilesDiskPressure();
      if (
        diskGuard.underPressure &&
        !nightlyMaintenanceInFlight &&
        Date.now() - lastDiskPressureGuardTriggerMs > 15 * 60_000
      ) {
        lastDiskPressureGuardTriggerMs = Date.now();
        void runNightlyDeepMaintenance({ reason: "disk-pressure-guard" }).catch(() => undefined);
      }
    } catch {
      /* ignore */
    }
    void cleanSmokePoolBrowsers({
      maxHeadlessIdleMs: adaptive.maxHeadlessIdleMs,
      maxHeadlessConcurrent: adaptive.maxHeadlessConcurrent,
    }).catch(() => undefined);
  }, 20_000);
  if (typeof autoMaintenanceTimer.unref === "function") {
    autoMaintenanceTimer.unref();
  }
}

export async function pruneWorkspaceJunk() {
  const script = path.join(DEV_ROOT, "Tool", "scripts", "prune-workspace-junk.mjs");
  if (!fs.existsSync(script)) {
    return { ok: false, pruned: false, error: "prune-workspace-junk.mjs not found" };
  }
  try {
    const { stdout } = await execFileAsync(process.execPath, [script, "--apply", "--root-only"], {
      cwd: DEV_ROOT,
      windowsHide: true,
      timeout: 8000,
    });
    return { ok: true, pruned: true, output: String(stdout || "").trim() };
  } catch (err) {
    return { ok: false, pruned: false, error: String(err?.message || err) };
  }
}

export async function optimizePcHost(options = {}) {
  const action = String(options.action || "all").toLowerCase();
  const results = {};

  if (action === "all" || action === "clean-smoke") {
    const scan = scanNativeProcesses();
    results.handleHealer = autoHealSystemHandleLeaks(scan);
    results.processorBalance = balanceChromeProcessorGroupsNative();
    const adaptive = computeAdaptiveHeadlessCap(scan);
    results.adaptiveThrottle = adaptive;
    results.farmSupervisor = await runFarmSupervisorTick(scan);
    results.smoke = await cleanSmokePoolBrowsers({
      maxHeadlessIdleMs: adaptive.maxHeadlessIdleMs,
      maxHeadlessConcurrent: adaptive.maxHeadlessConcurrent,
    });
  }
  if (action === "all" || action === "prune-junk") {
    results.junk = await pruneWorkspaceJunk();
    results.antigravitySweep = sweepAntigravityStaleTranscripts({
      idleSessionMaxAgeMs: 48 * 3600_000,
      taskStepMaxAgeMs: 2 * 60_000,
    });
    readAntigravityBrainStats(true);
  }
  if (action === "sweep-antigravity") {
    results.antigravitySweep = sweepAntigravityStaleTranscripts({
      idleSessionMaxAgeMs: 48 * 3600_000,
      taskStepMaxAgeMs: 2 * 60_000,
    });
    readAntigravityBrainStats(true);
  }
  if (action === "all" || action === "trim-ram") {
    results.ram = trimBackgroundWorkingSet();
  }
  if (action === "deep-maintenance") {
    results.deepMaintenance = await runNightlyDeepMaintenance({
      maxProfiles: Number(options.maxProfiles) || 0,
    });
    results.ram = trimBackgroundWorkingSet();
    results.junk = await pruneWorkspaceJunk();
  }

  const diagnostics = await diagnosePcHost();
  return {
    ok: true,
    action,
    completedAt: new Date().toISOString(),
    results,
    diagnostics,
  };
}
