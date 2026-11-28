import { execFile, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { DEV_ROOT as WINDOWS_DEV_ROOT } from "./windows.mjs";

const execFileAsync = promisify(execFile);
const HOST_DIR = path.dirname(fileURLToPath(import.meta.url));
const RESOLVED_DEV_ROOT =
  WINDOWS_DEV_ROOT ||
  (fs.existsSync("E:\\Dev\\Tool\\scripts\\pc-workstation-backup.mjs")
    ? "E:\\Dev"
    : path.resolve(HOST_DIR, "..", "..", ".."));

export const DEFAULT_PC_BACKUP_ROOT = process.env.PC_BACKUP_ROOT || "D:\\Backups-PC";
export const DEFAULT_PC_BACKUP_SCRIPT = path.join(
  RESOLVED_DEV_ROOT,
  "Tool",
  "scripts",
  "pc-workstation-backup.mjs",
);
export const DEFAULT_PC_HEALTH_SCRIPT = path.join(
  RESOLVED_DEV_ROOT,
  "Tool",
  "scripts",
  "monitor-supabase-backup-health.mjs",
);
export const DEFAULT_PC_RESTORE_SCRIPT = path.join(
  RESOLVED_DEV_ROOT,
  "Tool",
  "scripts",
  "restore-workstation-pc.mjs",
);
export const DEFAULT_HASLEO_SCRIPT = path.join(
  RESOLVED_DEV_ROOT,
  "Tool",
  "scripts",
  "hasleo-system-image.mjs",
);
export const DEFAULT_START_TILES_LIB = path.join(
  RESOLVED_DEV_ROOT,
  "Tool",
  "scripts",
  "lib",
  "windows-start-tiles.mjs",
);
export const DEFAULT_START_TILEGRID_GOLDEN_BIN = path.join(
  RESOLVED_DEV_ROOT,
  "Tool",
  "scripts",
  "assets",
  "start-tilegrid-golden.bin",
);
export const PC_BACKUP_TASK_NAME = "Dev-PC-Data-Backup";

export function readStartLayoutGoldenSummary(goldenPath = DEFAULT_START_TILEGRID_GOLDEN_BIN) {
  try {
    const target = fs.existsSync(goldenPath)
      ? goldenPath
      : fs.existsSync(path.join(DEFAULT_PC_BACKUP_ROOT, "start-tilegrid-golden.bin"))
        ? path.join(DEFAULT_PC_BACKUP_ROOT, "start-tilegrid-golden.bin")
        : "";
    if (!target) return { exists: false, path: goldenPath, bytes: 0, updatedAt: null };
    const st = fs.statSync(target);
    return {
      exists: st.size >= 64,
      path: target,
      bytes: st.size,
      updatedAt: st.mtime.toISOString(),
    };
  } catch {
    return { exists: false, path: goldenPath, bytes: 0, updatedAt: null };
  }
}

export async function manageStartMenuLayout(action = "restore", opts = {}) {
  const mode = String(action || "restore").toLowerCase() === "backup" ? "backup" : "restore";
  if (!fs.existsSync(DEFAULT_START_TILES_LIB)) {
    return { ok: false, error: `Missing ${DEFAULT_START_TILES_LIB}` };
  }
  try {
    const mod = await import(pathToFileURL(DEFAULT_START_TILES_LIB).href);
    const res =
      mode === "backup"
        ? mod.backupCloudStoreStartTilegridLive({
            targetPath: opts.targetPath || DEFAULT_START_TILEGRID_GOLDEN_BIN,
          })
        : mod.restoreCloudStoreStartTilegridLive({
            sourcePath: opts.sourcePath || DEFAULT_START_TILEGRID_GOLDEN_BIN,
          });
    return {
      ...res,
      startLayoutGolden: readStartLayoutGoldenSummary(opts.targetPath || opts.sourcePath || DEFAULT_START_TILEGRID_GOLDEN_BIN),
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

let hasleoCache = { at: 0, value: null, inFlight: null };
const HASLEO_TTL_MS = 10 * 60_000;
let schtaskCache = { at: 0, value: null, inFlight: null };
const SCHTASK_TTL_MS = 60_000;

let activeChildPid = null;

function isPidAlive(pid) {
  const num = Number(pid);
  if (!Number.isInteger(num) || num <= 0) return false;
  try {
    process.kill(num, 0);
    return true;
  } catch (err) {
    return err?.code === "EPERM";
  }
}

function readLogTail(logPath, maxLines = 20) {
  try {
    if (!logPath || !fs.existsSync(logPath)) return [];
    const st = fs.statSync(logPath);
    const bytes = Math.min(st.size, 16 * 1024);
    const fd = fs.openSync(logPath, "r");
    try {
      const buf = Buffer.alloc(bytes);
      fs.readSync(fd, buf, 0, bytes, Math.max(0, st.size - bytes));
      return buf
        .toString("utf8")
        .split(/\r?\n/)
        .map((l) => l.trimEnd())
        .filter(Boolean)
        .slice(-maxLines);
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return [];
  }
}

function listLocalArchives(archivesDir) {
  try {
    if (!fs.existsSync(archivesDir)) return [];
    return fs
      .readdirSync(archivesDir)
      .filter((f) => f.startsWith("pc-critical-") && f.endsWith(".tar.gz"))
      .sort()
      .reverse()
      .map((name) => {
        try {
          const st = fs.statSync(path.join(archivesDir, name));
          return { name, bytes: st.size, mtime: st.mtime.toISOString() };
        } catch {
          return { name, bytes: 0, mtime: null };
        }
      });
  } catch {
    return [];
  }
}

export function normalizePcBackupState(rawState = {}, opts = {}) {
  const {
    backupRoot = DEFAULT_PC_BACKUP_ROOT,
    scriptExists = false,
    schtask = null,
    healthDrill = null,
    systemImage = null,
    pixelTgxManifest = null,
    archives = [],
    logTail = [],
    isPidAliveFn = isPidAlive,
    nowMs = Date.now(),
  } = opts;

  const s = rawState && typeof rawState === "object" ? { ...rawState } : {};
  let status = String(s.status || "never");
  let error = s.error || null;

  if (status === "running") {
    const alive = isPidAliveFn(s.pid || activeChildPid);
    if (!alive) {
      status = s.lastSuccessAt ? "error" : "never";
      error = "Backup process stopped before finishing";
    }
  } else if (status !== "ok" && status !== "error") {
    status = s.lastSuccessAt ? "ok" : "never";
  }

  const lastSuccessAt = s.lastSuccessAt || (s.ok === true ? s.at || s.finishedAt || null : null);
  const ageHours =
    lastSuccessAt && Number.isFinite(Date.parse(lastSuccessAt))
      ? Math.round(((nowMs - Date.parse(lastSuccessAt)) / 3_600_000) * 10) / 10
      : null;

  let health = "unconfigured";
  if (status === "running") {
    health = "running";
  } else if (lastSuccessAt && ageHours != null) {
    if (status === "error") health = "warning";
    else if (ageHours > 36) health = "overdue";
    else if (!s.offsiteGdriveOk || !s.offsiteLenovoOk) health = "partial";
    else health = "protected";
  } else if (status === "error") {
    health = "warning";
  }

  const percent =
    status === "running"
      ? Math.max(0, Math.min(99, Number(s.percent ?? 0)))
      : status === "ok"
        ? 100
        : Number(s.percent ?? 0);

  return {
    ok: true,
    backupRoot,
    scriptAvailable: Boolean(scriptExists),
    status,
    health,
    mode: s.mode || "full",
    phase: s.phase || (status === "never" ? "idle" : status),
    phaseLabel:
      status === "running"
        ? s.phaseLabel || "Running PC backup…"
        : health === "protected"
          ? "Protected · Local + Google Drive + Home Server"
          : health === "partial"
            ? "Backed up · Some offsite target warning"
            : health === "overdue"
              ? `Backup overdue (${ageHours}h old)`
              : status === "error"
                ? error || "Last backup ended with errors"
                : "Not backed up yet",
    percent,
    pid: status === "running" ? s.pid || activeChildPid : null,
    startedAt: s.startedAt || null,
    finishedAt: s.finishedAt || null,
    lastSuccessAt,
    ageHours,
    durationMs: s.durationMs ?? null,
    transferred: s.transferred || null,
    total: s.total || null,
    speed: s.speed || null,
    eta: s.eta || null,
    filesDone: s.filesDone ?? null,
    filesTotal: s.filesTotal ?? null,
    archiveName: s.archiveName || archives[0]?.name || null,
    archiveBytes: s.archiveBytes ?? archives[0]?.bytes ?? 0,
    stealthCoreName: s.stealthCoreName || null,
    stealthCoreBytes: Number(s.stealthCoreBytes || 0),
    stealthCoreProfileCount: Number(s.stealthCoreProfileCount || 0),
    stealthCoreAt: s.stealthCoreAt || null,
    pixelTgxAccountCount: Number(
      s.pixelTgxAccountCount ||
        healthDrill?.pixelTgxAccountCount ||
        (Array.isArray(pixelTgxManifest?.accounts) ? pixelTgxManifest.accounts.length : 0) ||
        0,
    ),
    pixelTgxBytes: Math.round(
      Number(
        s.pixelTgxBytes ||
          pixelTgxManifest?.sizeBytes ||
          Number(pixelTgxManifest?.sizeMb || 0) * 1024 * 1024 ||
          0,
      ),
    ),
    pixelTgxAt: s.pixelTgxAt || pixelTgxManifest?.backedUpAt || pixelTgxManifest?.capturedAt || null,
    localBytes: s.localBytes ?? 0,
    localMirrorBytes: s.localMirrorBytes ?? 0,
    localArchiveCount: archives.length || Number(s.localArchiveCount || 0),
    offsiteGdriveOk: Boolean(s.offsiteGdriveOk),
    offsiteGdriveTarget: s.offsiteGdriveTarget || "gdrive:workstation-pc-backups",
    offsiteGdriveRetained: Number(s.offsiteGdriveRetained || 0),
    offsiteLenovoOk: Boolean(s.offsiteLenovoOk),
    offsiteLenovoTarget: s.offsiteLenovoTarget || "PC@100.88.80.113:D:/backups/workstation-pc",
    offsiteLenovoRetained: Number(s.offsiteLenovoRetained || 0),
    dirtyGitCount: Number(s.dirtyGitCount || 0),
    cleanGitCount: Number(s.cleanGitCount || 0),
    systemRecoveryOk: Boolean(s.systemRecoveryOk),
    vssActive: Boolean(s.vssActive),
    vssDrives: Array.isArray(s.vssDrives) ? s.vssDrives : [],
    steps: Array.isArray(s.steps) ? s.steps : [],
    error,
    schtask: schtask
      ? {
          name: schtask.name || PC_BACKUP_TASK_NAME,
          status: schtask.status || "Ready",
          schedule: schtask.schedule || "Daily 03:30",
          lastRun: schtask.lastRun || "",
          nextRun: schtask.nextRun || "",
          lastResult: schtask.lastResult || "0",
        }
      : null,
    logPath: s.logPath || path.join(backupRoot, "pc-backup.log"),
    logTail,
    healthDrill: healthDrill && typeof healthDrill === "object" ? healthDrill : null,
    systemImage: systemImage && typeof systemImage === "object" ? systemImage : null,
    startLayoutGolden: readStartLayoutGoldenSummary(),
  };
}

export async function readPcBackupStatus(opts = {}) {
  const backupRoot = opts.backupRoot || DEFAULT_PC_BACKUP_ROOT;
  const scriptPath = opts.scriptPath || DEFAULT_PC_BACKUP_SCRIPT;
  const statePath = path.join(backupRoot, "backup-state.json");
  const healthPath = path.join(backupRoot, "backup-health-last.json");
  const archivesDir = path.join(backupRoot, "archives");
  const logPath = path.join(backupRoot, "pc-backup.log");

  let rawState = {};
  try {
    if (fs.existsSync(statePath)) {
      rawState = JSON.parse(fs.readFileSync(statePath, "utf8"));
    }
  } catch {
    rawState = {};
  }

  let healthDrill = opts.healthDrill || null;
  if (!healthDrill) {
    try {
      if (fs.existsSync(healthPath)) {
        healthDrill = JSON.parse(fs.readFileSync(healthPath, "utf8"));
      }
    } catch {
      healthDrill = null;
    }
  }

  let pixelTgxManifest = opts.pixelTgxManifest || null;
  if (!pixelTgxManifest) {
    try {
      const manifestPath = path.join(backupRoot, "Pixel6a-TelegramX", "manifest.json");
      if (fs.existsSync(manifestPath)) {
        pixelTgxManifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      }
    } catch {
      pixelTgxManifest = null;
    }
  }

  let schtask = opts.schtask || null;
  if (!schtask && typeof opts.listTasksFn === "function") {
    const isCustomTest = Boolean(opts.backupRoot || opts.scriptPath);
    if (isCustomTest) {
      try {
        const rows = await opts.listTasksFn();
        schtask = (Array.isArray(rows) ? rows : []).find(
          (r) => String(r?.name || r?.id || "").toLowerCase() === PC_BACKUP_TASK_NAME.toLowerCase(),
        ) || null;
      } catch {
        schtask = null;
      }
    } else {
      const now = Date.now();
      const refreshSchtask = async () => {
        try {
          const rows = await opts.listTasksFn();
          const found = (Array.isArray(rows) ? rows : []).find(
            (r) => String(r?.name || r?.id || "").toLowerCase() === PC_BACKUP_TASK_NAME.toLowerCase(),
          ) || null;
          schtaskCache = { at: Date.now(), value: found, inFlight: null };
          return found;
        } catch {
          schtaskCache.inFlight = null;
          return schtaskCache.value;
        }
      };
      if (schtaskCache.at > 0 && now - schtaskCache.at < SCHTASK_TTL_MS) {
        schtask = schtaskCache.value;
      } else if (schtaskCache.at > 0) {
        schtask = schtaskCache.value;
        if (!schtaskCache.inFlight) {
          schtaskCache.inFlight = refreshSchtask();
        }
      } else {
        if (!schtaskCache.inFlight) {
          schtaskCache.inFlight = refreshSchtask();
        }
        schtask = await schtaskCache.inFlight;
      }
    }
  }

  return normalizePcBackupState(rawState, {
    backupRoot,
    scriptExists: fs.existsSync(scriptPath),
    schtask,
    healthDrill,
    pixelTgxManifest,
    systemImage: opts.systemImage !== undefined ? opts.systemImage : hasleoCache.value,
    archives: listLocalArchives(archivesDir),
    logTail: readLogTail(rawState?.logPath || logPath, 18),
    isPidAliveFn: opts.isPidAliveFn || isPidAlive,
    nowMs: opts.nowMs || Date.now(),
  });
}

export async function readHasleoSystemImageStatus(opts = {}) {
  const force = Boolean(opts.force);
  const now = Date.now();
  if (!force && hasleoCache.value && now - hasleoCache.at < HASLEO_TTL_MS) {
    return hasleoCache.value;
  }
  const scriptPath = opts.hasleoScript || DEFAULT_HASLEO_SCRIPT;
  if (!fs.existsSync(scriptPath)) {
    return { ok: false, state: "missing-script", ready: false, summary: "hasleo-system-image.mjs missing", tasks: [], secondaryDisks: [] };
  }
  const fetchFresh = async () => {
    try {
      const { stdout } = await execFileAsync(resolveBackupNodeExe(), [scriptPath, "--status", "--json"], {
        windowsHide: true,
        timeout: 20_000,
      });
      const parsed = JSON.parse(String(stdout || "{}").trim() || "{}");
      hasleoCache = { at: Date.now(), value: parsed, inFlight: null };
      return parsed;
    } catch (err) {
      hasleoCache.inFlight = null;
      return hasleoCache.value || { ok: false, state: "error", ready: false, summary: err instanceof Error ? err.message : String(err), tasks: [], secondaryDisks: [] };
    }
  };
  if (!force && hasleoCache.value) {
    if (!hasleoCache.inFlight) {
      hasleoCache.inFlight = fetchFresh();
    }
    return hasleoCache.value;
  }
  if (!hasleoCache.inFlight) {
    hasleoCache.inFlight = fetchFresh();
  }
  return hasleoCache.inFlight;
}

export async function runHasleoSystemImageRun(opts = {}) {
  const scriptPath = opts.hasleoScript || DEFAULT_HASLEO_SCRIPT;
  if (!fs.existsSync(scriptPath)) {
    return { ok: false, error: `Missing ${scriptPath}` };
  }
  const args = [scriptPath, "--run", "--silent", "--json"];
  if (opts.guid) args.push("--guid", String(opts.guid));
  if (opts.type != null) args.push("--type", String(opts.type));
  try {
    const { stdout } = await execFileAsync(resolveBackupNodeExe(), args, {
      windowsHide: true,
      timeout: 60 * 60_000,
    });
    const out = JSON.parse(String(stdout || "{}").trim() || "{}");
    await readHasleoSystemImageStatus({ force: true });
    return out;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function listPcBackupSnapshots(source = "all", opts = {}) {
  const restoreScript = opts.restoreScript || DEFAULT_PC_RESTORE_SCRIPT;
  if (!fs.existsSync(restoreScript)) {
    return { ok: false, error: `Missing ${restoreScript}`, critical: {}, stealthCore: {} };
  }
  const safeSrc = ["all", "local", "gdrive", "lenovo"].includes(String(source).toLowerCase())
    ? String(source).toLowerCase()
    : "all";
  try {
    const { stdout } = await execFileAsync(
      resolveBackupNodeExe(),
      [restoreScript, "--list", "--source", safeSrc, "--json"],
      {
        windowsHide: true,
        timeout: 45_000,
        maxBuffer: 8 * 1024 * 1024,
        env: { ...process.env, PC_BACKUP_ROOT: opts.backupRoot || DEFAULT_PC_BACKUP_ROOT },
      },
    );
    return JSON.parse(String(stdout || "{}").trim() || "{}");
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      critical: {},
      stealthCore: {},
    };
  }
}

export async function runPcBackupRestore(opts = {}) {
  const restoreScript = opts.restoreScript || DEFAULT_PC_RESTORE_SCRIPT;
  if (!fs.existsSync(restoreScript)) {
    return { ok: false, error: `Missing ${restoreScript}` };
  }
  const source = ["local", "gdrive", "lenovo"].includes(String(opts.source || "gdrive").toLowerCase())
    ? String(opts.source).toLowerCase()
    : "gdrive";
  const args = [restoreScript, "--apply", "--source", source];
  if (opts.snapshot) args.push("--snapshot", String(opts.snapshot));
  if (opts.target) args.push("--target", String(opts.target));
  if (opts.stealthCore) args.push("--stealth-core");
  if (opts.restoreLive) args.push("--restore-live");
  try {
    const { stdout } = await execFileAsync(resolveBackupNodeExe(), args, {
      windowsHide: true,
      timeout: 10 * 60_000,
      maxBuffer: 8 * 1024 * 1024,
      env: { ...process.env, PC_BACKUP_ROOT: opts.backupRoot || DEFAULT_PC_BACKUP_ROOT },
    });
    return JSON.parse(String(stdout || "{}").trim() || "{}");
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function runPcBackupDrill(opts = {}) {
  const healthScript = opts.healthScript || DEFAULT_PC_HEALTH_SCRIPT;
  if (!fs.existsSync(healthScript)) {
    return {
      ok: false,
      error: `Health script missing at ${healthScript}`,
      status: await readPcBackupStatus(opts),
    };
  }
  try {
    const { stdout } = await execFileAsync(
      process.execPath,
      [healthScript, "--pc-only", "--json"],
      {
        windowsHide: true,
        timeout: 60_000,
        maxBuffer: 4 * 1024 * 1024,
        env: { ...process.env, PC_BACKUP_ROOT: opts.backupRoot || DEFAULT_PC_BACKUP_ROOT },
      },
    );
    const parsed = JSON.parse(String(stdout || "{}").trim() || "{}");
    const drill = parsed?.pcWorkstationBackup || null;
    return {
      ok: Boolean(parsed?.ok),
      drill,
      status: await readPcBackupStatus(opts),
    };
  } catch (err) {
    let parsed = null;
    try {
      parsed = JSON.parse(String(err?.stdout || "{}").trim() || "{}");
    } catch {
      parsed = null;
    }
    const drill = parsed?.pcWorkstationBackup || null;
    return {
      ok: false,
      error: drill?.alerts?.[0] || (err instanceof Error ? err.message : String(err)),
      drill,
      status: await readPcBackupStatus(opts),
    };
  }
}

function resolveBackupNodeExe() {
  const candidates = [
    process.env.DESK_NODE_EXE,
    "C:\\Program Files\\nodejs\\node.exe",
    process.execPath,
  ].filter(Boolean);
  return candidates.find((c) => fs.existsSync(c)) || process.execPath;
}

export async function startPcBackupRun(opts = {}) {
  const mode = String(opts.mode || "full").toLowerCase() === "critical" ? "critical" : "full";
  const backupRoot = opts.backupRoot || DEFAULT_PC_BACKUP_ROOT;
  const scriptPath = opts.scriptPath || DEFAULT_PC_BACKUP_SCRIPT;

  if (!fs.existsSync(scriptPath)) {
    return {
      ok: false,
      started: false,
      error: `Backup script missing at ${scriptPath}`,
      status: await readPcBackupStatus(opts),
    };
  }

  const current = await readPcBackupStatus(opts);
  if (current.status === "running") {
    return {
      ok: true,
      started: false,
      alreadyRunning: true,
      mode: current.mode,
      status: current,
    };
  }

  fs.mkdirSync(backupRoot, { recursive: true });
  const statePath = path.join(backupRoot, "backup-state.json");
  let existingRaw = {};
  try {
    if (fs.existsSync(statePath)) existingRaw = JSON.parse(fs.readFileSync(statePath, "utf8")) || {};
  } catch {
    existingRaw = {};
  }
  const preState = {
    ...existingRaw,
    status: "running",
    mode,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    phase: "critical-bundle",
    phaseLabel: `Starting ${mode === "critical" ? "Quick Critical" : "Full Workstation"} backup…`,
    percent: 2,
    error: null,
  };
  fs.writeFileSync(statePath, `${JSON.stringify(preState, null, 2)}\n`, "utf8");

  // When running Full backup on default production path, delegate to elevated S4U Scheduled Task
  // (Dev-PC-Data-Backup) if registered so Windows VSS (Win32_ShadowCopy) runs with Highest privileges
  // and zero interactive cursor spinner.
  if (mode === "full" && !opts.backupRoot && !opts.scriptPath && opts.useScheduledTask !== false) {
    try {
      await execFileAsync("schtasks.exe", ["/Run", "/TN", PC_BACKUP_TASK_NAME], {
        windowsHide: true,
        timeout: 8_000,
      });
      await new Promise((r) => setTimeout(r, 1200));
      const post = await readPcBackupStatus(opts);
      if (post.status === "running" && post.pid) {
        return {
          ok: true,
          started: true,
          viaScheduledTask: true,
          alreadyRunning: false,
          mode,
          pid: post.pid,
          status: post,
        };
      }
    } catch {
      /* fallback to direct node spawn below */
    }
  }

  const child = spawn(
    resolveBackupNodeExe(),
    [scriptPath, "--apply", "--mode", mode],
    {
      windowsHide: true,
      detached: process.platform !== "win32",
      stdio: "ignore",
      env: { ...process.env, PC_BACKUP_ROOT: backupRoot },
    },
  );
  activeChildPid = child.pid || null;
  if (child.pid) {
    try {
      const updated = { ...preState, pid: child.pid };
      fs.writeFileSync(statePath, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
    } catch {
      /* ignore */
    }
  }
  child.on("exit", () => {
    if (activeChildPid === child.pid) activeChildPid = null;
  });
  child.unref();

  return {
    ok: true,
    started: true,
    alreadyRunning: false,
    mode,
    pid: child.pid || null,
    status: await readPcBackupStatus(opts),
  };
}
