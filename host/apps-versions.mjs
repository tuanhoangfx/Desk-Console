/**
 * P0001 Desk Console — Local App Versions, Installer Vault, Update Guard, SxS Builds & VSIX SSOT Adapter.
 * Bridges the shared monorepo installer/version inspector in `Tool/P0010-IDE-Console` into P0001 Desk Console.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DEV_ROOT } from "./windows.mjs";
import {
  cleanZaloDataCache,
  formatBytes,
  formatZaloAccountLabel,
  inspectZaloDesktopInstances,
  launchZaloDesktopInstance,
  listDesktopProcessStatsFast,
  measureDirectorySizeCached,
  offloadZaloDataToDriveD,
  probeRemoteZaloDataStats,
  refreshSavedCredCacheAsync,
  repairZaloShortcuts,
  scheduleDirectorySizeWarm,
  stopZaloDesktopInstance,
  syncZaloDesktopInstances,
  syncZaloFleetIfDue,
} from "./zalo-desktop-instances.mjs";
import {
  BUILTIN_THEME_MOD_PRESETS,
  ensureClosedSxsPatchedIfEnabled,
  getAntigravityThemeModQuickSnapshot,
  readIdeConsoleQuotaByEmailMap,
  resolveHighestTierLabel,
  runAntigravityThemeModAction,
  saveAntigravityThemeModConfig,
} from "./antigravity-theme-mod.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function formatCompactQuotaSyncTime(isoStr) {
  if (!isoStr) return "";
  const ms = Date.parse(isoStr);
  if (!Number.isFinite(ms)) return "";
  const d = new Date(ms);
  const pad2 = (n) => String(n).padStart(2, "0");
  return `Sync ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function resolveMonorepoRoot() {
  const candidates = [
    DEV_ROOT,
    path.resolve(__dirname, "../../.."),
    "E:\\Dev",
  ].filter(Boolean);
  for (const root of candidates) {
    const p = path.join(root, "Tool", "P0010-IDE-Console", "scripts", "lib", "ide-installation-inspector.mjs");
    if (fs.existsSync(p)) return root;
  }
  return DEV_ROOT || path.resolve(__dirname, "../../..");
}

const MONOREPO_ROOT = resolveMonorepoRoot();

function getInspectorPath() {
  return path.join(
    MONOREPO_ROOT,
    "Tool",
    "P0010-IDE-Console",
    "scripts",
    "lib",
    "ide-installation-inspector.mjs",
  );
}

let cachedMod = null;
let appsSnapshotCache = { ts: 0, payload: null };
let cachedAgProcRows = { ts: 0, rows: [] };
let cachedBrokenTaskbarPins = { ts: 0, rows: [] };
let activeBackgroundProbe = null;
let savedCredPrimedOnce = false;

export function invalidateAppsSnapshotCache() {
  appsSnapshotCache = { ts: 0, payload: null };
}

async function loadInspectorModule() {
  if (cachedMod) return cachedMod;
  const inspectorPath = getInspectorPath();
  if (!fs.existsSync(inspectorPath)) {
    return null;
  }
  cachedMod = await import(pathToFileURL(inspectorPath).href);
  return cachedMod;
}

async function warmAppsBackgroundProbesAsync(mod, { force = false } = {}) {
  if (process.platform !== "win32" || !mod) return;
  if (activeBackgroundProbe) return activeBackgroundProbe;
  const now = Date.now();
  const procDue = force || now - cachedAgProcRows.ts >= 20_000;
  const pinDue = force || now - cachedBrokenTaskbarPins.ts >= 60_000;
  if (!procDue && !pinDue) return;

  activeBackgroundProbe = (async () => {
    try {
      const { execFile } = await import("node:child_process");
      const { promisify } = await import("node:util");
      const execFileAsync = promisify(execFile);
      if (procDue) {
        try {
          const { stdout } = await execFileAsync(
            "powershell.exe",
            [
              "-NoProfile",
              "-WindowStyle",
              "Hidden",
              "-Command",
              "Get-CimInstance Win32_Process -Filter \"Name='Antigravity.exe'\" | Select-Object ProcessId,ExecutablePath,CommandLine,@{Name='CreationDate';Expression={if($_.CreationDate){$_.CreationDate.ToUniversalTime().ToString('o')}else{''}}} | ConvertTo-Json -Compress",
            ],
            { windowsHide: true, timeout: 8000 },
          );
          const trimmed = String(stdout || "").trim();
          if (trimmed) {
            const parsed = JSON.parse(trimmed);
            cachedAgProcRows = {
              ts: Date.now(),
              rows: Array.isArray(parsed) ? parsed : [parsed],
            };
          } else {
            cachedAgProcRows = { ts: Date.now(), rows: [] };
          }
        } catch {
          cachedAgProcRows = { ts: Date.now(), rows: cachedAgProcRows.rows };
        }
      }
      if (pinDue && typeof mod.inspectBrokenSxsTaskbarShortcuts === "function") {
        try {
          const pins = mod.inspectBrokenSxsTaskbarShortcuts({});
          cachedBrokenTaskbarPins = {
            ts: Date.now(),
            rows: Array.isArray(pins) ? pins : [],
          };
        } catch {
          cachedBrokenTaskbarPins = { ts: Date.now(), rows: cachedBrokenTaskbarPins.rows };
        }
      }
    } finally {
      activeBackgroundProbe = null;
    }
  })();
  return activeBackgroundProbe;
}

function resolveProductStatus(item, isRunning = false) {
  if (!item?.installed) return "Down";
  if (item?.primaryLockConflict) return "Conflict";
  if (item?.pendingUpdatePresent) return "Update";
  if (isRunning) return "Running";
  return "Ready";
}

function resolveSxsStatus(inst, isRunning = Boolean(inst?.isRunning)) {
  if (!inst?.exePath) return "Down";
  return isRunning ? "Running" : "Ready";
}

function summarizeProcStatsForExe(procs, exePath) {
  if (!exePath || !Array.isArray(procs) || procs.length === 0) {
    return { pids: [], memoryBytes: 0, memoryMb: 0 };
  }
  const targetDir = path.dirname(path.resolve(exePath)).toLowerCase() + path.sep;
  const normExe = path.resolve(exePath).toLowerCase();
  const matched = procs.filter((p) => {
    const pExe = String(p?.exePath || "").toLowerCase();
    return pExe === normExe || pExe.startsWith(targetDir);
  });
  const pids = matched.map((p) => Number(p.pid)).filter((n) => Number.isFinite(n) && n > 0);
  const memoryBytes = matched.reduce((acc, p) => acc + (Number(p.workingSetBytes) || 0), 0);
  return {
    pids,
    memoryBytes,
    memoryMb: memoryBytes > 0 ? Math.round(memoryBytes / (1024 * 1024)) : 0,
  };
}

function formatRamUsage(memoryBytes, memoryMb) {
  const mb =
    Number.isFinite(Number(memoryMb)) && Number(memoryMb) > 0
      ? Math.round(Number(memoryMb))
      : Number.isFinite(Number(memoryBytes)) && Number(memoryBytes) > 0
        ? Math.round(Number(memoryBytes) / (1024 * 1024))
        : 0;
  if (mb <= 0) return "";
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb} MB`;
}

function statCreatedAtIso(targetPath, fallbackIso) {
  if (!targetPath) return fallbackIso;
  try {
    if (fs.existsSync(targetPath)) {
      const st = fs.statSync(targetPath);
      const ts = st.birthtimeMs > 0 ? st.birthtimeMs : st.mtimeMs;
      if (Number.isFinite(ts) && ts > 0) return new Date(ts).toISOString();
    }
  } catch {
    /* ignore */
  }
  return fallbackIso;
}

export function readIdeVaultDriveJobStatus(options = {}) {
  try {
    const appData = options.roamingAppData || process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
    const jobsPath = options.jobsPath || path.join(appData, "folder-sync", "jobs.json");
    if (!fs.existsSync(jobsPath)) return null;
    const raw = JSON.parse(fs.readFileSync(jobsPath, "utf8"));
    const list = Array.isArray(raw) ? raw : Array.isArray(raw?.jobs) ? raw.jobs : [];
    const jb =
      list.find((j) => String(j?.code || "").toUpperCase() === "JB0006") ||
      list.find((j) => String(j?.remote || "") === "gdrive:IDE-Installers-Vault");
    if (!jb) return null;
    return {
      jobId: jb.id || null,
      code: jb.code || "JB0006",
      name: jb.name || "IDE Installers & VSIX Vault",
      remote: jb.remote || "gdrive:IDE-Installers-Vault",
      localPath: jb.localPath || null,
      status: jb.status || "idle",
      syncedCount: Number(jb.treeCounts?.synced ?? 0),
      lastRunAt: jb.lastRunAt || null,
      lastSuccessfulSyncAt: jb.lastSuccessfulSyncAt || null,
      lastResultOk: jb.lastResult ? Boolean(jb.lastResult.ok) : null,
    };
  } catch {
    return null;
  }
}

export async function getManagedAppsSnapshot({ includeReleases = false, forceReleases = false, jobsPath = null } = {}) {
  const mod = await loadInspectorModule();
  if (!mod) {
    return {
      ok: false,
      available: false,
      error: "Requires Developer Workspace (E:\\Dev) to inspect local IDE versions.",
      rows: [],
      releases: [],
      snapshot: null,
    };
  }

  const canServeCached =
    !includeReleases &&
    !forceReleases &&
    !jobsPath &&
    appsSnapshotCache.payload &&
    Date.now() - appsSnapshotCache.ts < 8000;
  if (canServeCached) {
    void warmAppsBackgroundProbesAsync(mod);
    return appsSnapshotCache.payload;
  }

  const snapshot = mod.inspectLocalIdeInstallations({
    monorepoRoot: MONOREPO_ROOT,
    skipProcessProbe: cachedAgProcRows.ts === 0,
    ...(cachedAgProcRows.ts > 0 ? { processRows: cachedAgProcRows.rows } : {}),
    skipTaskbarPinProbe: true,
  });
  void warmAppsBackgroundProbesAsync(mod, { force: Boolean(forceReleases) });

  const checkedAt = snapshot.checkedAt || new Date().toISOString();
  const vsixExtensions = snapshot.vsixVault?.extensions || [];
  const agDesk = {
    ...(snapshot.antigravityDesktop || {}),
    brokenTaskbarPins: cachedBrokenTaskbarPins.rows,
  };
  const agIde = snapshot.antigravityIde || {};
  const cursorInst = snapshot.cursor || {};
  const claudeInst = snapshot.claudeCode || {};
  const desktopProcs = listDesktopProcessStatsFast({ force: Boolean(forceReleases) });
  const currentWinUser = os.userInfo().username || process.env.USERNAME || "CzP";

  const runningAgSxs = (agDesk.sxsInstances || []).filter((inst) => inst.isRunning).map((inst) => inst.version);
  const sxsEmails = (agDesk.sxsInstances || [])
    .map((inst) => String(inst.boundEmail || "").trim().toLowerCase())
    .filter((em) => em && em !== "inherited primary session");
  const { byEmail: quotaByEmail, currentEmail: primaryQuotaEmail } = readIdeConsoleQuotaByEmailMap({
    ...(sxsEmails.length > 0 ? { emails: sxsEmails } : {}),
    forceRefresh: Boolean(forceReleases),
  });
  const primaryQuota = primaryQuotaEmail ? quotaByEmail.get(primaryQuotaEmail) || null : null;
  const themeMod = getAntigravityThemeModQuickSnapshot({
    runningVersions: runningAgSxs,
    forceRefresh: Boolean(forceReleases),
  });
  const globalPresetMeta = BUILTIN_THEME_MOD_PRESETS.find((p) => p.id === themeMod.config?.preset);
  const globalPresetLabel = globalPresetMeta?.label || themeMod.config?.preset || "Cyber Horizon";
  const hookPath = path.join(MONOREPO_ROOT, "Tool", "scripts", "antigravity-theme-mod", "electron-hook.cjs");
  let themeHookMtimeMs = 0;
  try {
    if (fs.existsSync(hookPath)) themeHookMtimeMs = fs.statSync(hookPath).mtimeMs || 0;
  } catch {
    themeHookMtimeMs = 0;
  }
  const themeHookMtimeAt = themeHookMtimeMs > 0 ? new Date(themeHookMtimeMs).toISOString() : null;
  const procStartMsByPid = new Map();
  for (const pr of cachedAgProcRows.rows || []) {
    const pid = Number(pr?.ProcessId ?? pr?.processId);
    const createdMs = pr?.CreationDate ? Date.parse(String(pr.CreationDate)) : NaN;
    if (Number.isFinite(pid) && pid > 0 && Number.isFinite(createdMs) && createdMs > 0) {
      procStartMsByPid.set(pid, createdMs);
    }
  }
  const resolveEarliestStartMs = (pids) => {
    let earliest = 0;
    for (const pid of pids || []) {
      const ms = procStartMsByPid.get(Number(pid)) || 0;
      if (ms > 0 && (earliest === 0 || ms < earliest)) earliest = ms;
    }
    return earliest;
  };

  let releases = [];
  let cursorReleases = [];
  if (includeReleases) {
    if (typeof mod.listRemoteAntigravityReleases === "function") {
      const feed = await mod.listRemoteAntigravityReleases({ forceRefresh: Boolean(forceReleases) }).catch(() => null);
      if (feed?.ok && Array.isArray(feed.releases)) {
        releases = feed.releases;
      }
    }
    if (typeof mod.listRemoteCursorReleases === "function") {
      const curFeed = await mod.listRemoteCursorReleases().catch(() => null);
      if (curFeed?.ok && Array.isArray(curFeed.releases)) {
        cursorReleases = curFeed.releases;
      }
    }
  }

  if (!savedCredPrimedOnce) {
    await refreshSavedCredCacheAsync({ force: Boolean(forceReleases) });
    savedCredPrimedOnce = true;
  } else {
    void refreshSavedCredCacheAsync({ force: Boolean(forceReleases) });
  }
  const zaloSnapshot = inspectZaloDesktopInstances({
    runningProcesses: desktopProcs.filter((p) => /^zalo(cap|call|attest)?\.exe$/i.test(p.name)),
  });
  const zaloRows = (zaloSnapshot.instances || []).map((inst) => ({
    id: inst.id,
    name: inst.name,
    product: "zalo",
    kind: inst.kind === "primary" ? "primary" : "instance",
    brandId: "zalo",
    version: inst.activeVersion || null,
    latestVersion: inst.latestVersion || null,
    outdated: Boolean(inst.outdated),
    installedVersions: inst.installedVersions || [],
    winUser: inst.winUser || null,
    accountLabel: inst.accountLabel || formatZaloAccountLabel(inst.winUser),
    installed: Boolean(inst.installed),
    isRunning: Boolean(inst.isRunning),
    runningPids: inst.runningPids || [],
    memoryBytes: Number(inst.memoryBytes) || 0,
    memoryMb: Number(inst.memoryMb) || 0,
    ramLabel: inst.isRunning ? formatRamUsage(inst.memoryBytes, inst.memoryMb) : "",
    sizeBytes: inst.sizeBytes || 0,
    sizeLabel: inst.sizeLabel || "",
    zaloDataPath: inst.zaloDataPath || null,
    zaloDataAccessible: Boolean(inst.zaloDataAccessible),
    zaloDataBytes: Number(inst.zaloDataBytes) || 0,
    zaloDataLabel: inst.zaloDataLabel || "",
    zaloDataOnCBytes: Number(inst.zaloDataOnCBytes) || 0,
    zaloDataOnCLabel: inst.zaloDataOnCLabel || "",
    zaloDataOnDBytes: Number(inst.zaloDataOnDBytes) || 0,
    zaloDataOnDLabel: inst.zaloDataOnDLabel || "",
    zaloDataJunctions: inst.zaloDataJunctions || null,
    zaloDataCacheBytes: Number(inst.zaloDataCacheBytes) || 0,
    zaloDataCacheLabel: inst.zaloDataCacheLabel || "",
    startMenuShortcutExists: Boolean(inst.startMenuShortcutExists),
    desktopShortcutExists: Boolean(inst.desktopShortcutExists),
    savedCredReady: Boolean(inst.savedCredReady),
    savecredCommand: inst.savecredCommand || null,
    shortcutName: inst.shortcutName || null,
    status: inst.status,
    updatePinned: !inst.outdated && Boolean(inst.launcherSynced),
    aclLocked: false,
    pendingUpdatePresent: Boolean(inst.outdated || !inst.launcherSynced),
    pendingFileName: inst.outdated && inst.latestVersion ? `Zalo-${inst.latestVersion}` : null,
    exePath: inst.exePath || null,
    isolatedHomeDir: inst.dirPath || null,
    installerItems: [],
    stateSnapshots: [],
    vsixExtensions: [],
    detail: inst.detail,
    log: inst.log,
    createdAt: statCreatedAtIso(inst.dirPath, inst.createdAt || checkedAt),
    updated: inst.updated || checkedAt,
  }));

  const agPrimaryDir = agDesk.exePath ? path.dirname(agDesk.exePath) : null;
  const agPrimarySizeBytes = agPrimaryDir ? measureDirectorySizeCached(agPrimaryDir, { syncCompute: false }) : 0;
  const agPrimaryMem = summarizeProcStatsForExe(desktopProcs, agDesk.exePath);
  const agPrimaryRunningPids =
    Array.isArray(agDesk.primaryRunningPids) && agDesk.primaryRunningPids.length > 0
      ? agDesk.primaryRunningPids
      : agPrimaryMem.pids;
  const agPrimaryIsRunning = agPrimaryRunningPids.length > 0;
  const agPrimaryStartMs = agPrimaryIsRunning ? resolveEarliestStartMs(agPrimaryRunningPids) : 0;

  const cursorDir = path.join(
    process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"),
    "Programs",
    "cursor",
  );
  const cursorExePath = fs.existsSync(path.join(cursorDir, "Cursor.exe")) ? path.join(cursorDir, "Cursor.exe") : null;
  const cursorSizeBytes = fs.existsSync(cursorDir) ? measureDirectorySizeCached(cursorDir, { syncCompute: false }) : 0;
  const cursorMem = summarizeProcStatsForExe(desktopProcs, cursorExePath);

  const claudeProcs = desktopProcs.filter((p) => /^claude\.exe$/i.test(p.name));
  const claudeMemBytes = claudeProcs.reduce((acc, p) => acc + (Number(p.workingSetBytes) || 0), 0);
  const claudeIsRunning = claudeProcs.length > 0;

  const ideDirsToWarm = [
    agPrimaryDir,
    cursorDir,
    ...(agDesk.sxsInstances || []).map((inst) => (inst.exePath ? path.dirname(inst.exePath) : inst.isolatedHomeDir)),
    ...zaloRows.map((z) => z.isolatedHomeDir),
  ].filter(Boolean);
  void scheduleDirectorySizeWarm(ideDirsToWarm).then((updated) => {
    if (updated) appsSnapshotCache = { ts: 0, payload: null };
  });

  const rows = [
    {
      id: "app:antigravity",
      name: "Antigravity Vault",
      product: "antigravity",
      kind: "primary",
      brandIconSrc: "/assets/brand-icons/antigravity.svg",
      version: agDesk.version || null,
      previousUsedVersion: agDesk.previousUsedVersion || null,
      accountLabel: `Vault (${currentWinUser})`,
      installed: Boolean(agDesk.installed),
      isRunning: agPrimaryIsRunning,
      runningPids: agPrimaryRunningPids,
      memoryBytes: agPrimaryMem.memoryBytes,
      memoryMb: agPrimaryMem.memoryMb,
      ramLabel: agPrimaryIsRunning ? formatRamUsage(agPrimaryMem.memoryBytes, agPrimaryMem.memoryMb) : "",
      status: resolveProductStatus(agDesk, agPrimaryIsRunning),
      updatePinned: Boolean(agDesk.updatePinned),
      extensionsPinned: Boolean(agIde.extensionsPinned),
      aclLocked: Boolean(agDesk.pendingAclLocked),
      pendingUpdatePresent: Boolean(agDesk.pendingUpdatePresent),
      pendingFileName: agDesk.pendingFileName || null,
      primaryLockConflict: null,
      brokenTaskbarPins: agDesk.brokenTaskbarPins || [],
      exePath: agDesk.exePath || null,
      sizeBytes: agPrimarySizeBytes,
      sizeLabel: formatBytes(agPrimarySizeBytes),
      themePreset: themeMod.config?.preset || "cyber-horizon",
      themePresetLabel: globalPresetLabel,
      quotaGeminiPct: primaryQuota?.geminiPct ?? null,
      quotaClaudePct: primaryQuota?.claudePct ?? null,
      quotaTierLabel: primaryQuota?.tierLabel || null,
      quotaAiCredits: primaryQuota?.aiCredits ?? null,
      quotaAiCreditsLimit: primaryQuota?.aiCreditsLimit ?? null,
      quotaCreditsLabel: primaryQuota?.creditsLabel || null,
      quotaResetTime: primaryQuota?.resetTime || null,
      quotaUpdatedAt: primaryQuota?.updatedAt || null,
      quotaLabel: primaryQuota?.quotaLabel || null,
      themeHookMtimeAt,
      processStartedAt: agPrimaryStartMs > 0 ? new Date(agPrimaryStartMs).toISOString() : null,
      themeHookRestartNeeded: false,
      installerItems: agDesk.installerItems || [],
      stateSnapshots: agDesk.stateSnapshots || [],
      vsixExtensions: vsixExtensions.filter((x) => x.scope === "shared" || x.scope === "antigravity"),
      detail: [
        agIde.version ? `IDE v${agIde.version}` : "",
        agDesk.updatePinned ? (agDesk.pendingAclLocked ? "Pinned + ACL" : "Updates Pinned") : "Updates Unpinned",
        `${(agDesk.sxsInstances || []).length} SxS builds`,
        primaryQuota?.tierLabel || "",
        primaryQuota?.quotaLabel || "",
        primaryQuota?.creditsLabel || "",
        formatCompactQuotaSyncTime(primaryQuota?.updatedAt),
      ]
        .filter(Boolean)
        .join(" · "),
      log: Array.isArray(agDesk.brokenTaskbarPins) && agDesk.brokenTaskbarPins.length > 0
        ? `${agDesk.brokenTaskbarPins.length} Taskbar shortcut(s) missing --launch-sxs (click Repair Taskbar)`
        : agDesk.pendingUpdatePresent
          ? `Pending updater staged: ${agDesk.pendingFileName || "installer"}`
          : `${(agDesk.installerItems || []).length} archived installer(s) · ${(agDesk.sxsInstances || []).length} versioned runtime(s) · ${(agDesk.stateSnapshots || []).length} state snapshot(s)`,
      createdAt: statCreatedAtIso(agDesk.exePath, checkedAt),
      updated: primaryQuota?.updatedAt || checkedAt,
    },
    ...(agDesk.sxsInstances || []).map((inst) => {
      const koffiMem = summarizeProcStatsForExe(desktopProcs, inst.exePath);
      const isRunning = Boolean(inst.isRunning || koffiMem.pids.length > 0);
      const runningPids =
        Array.isArray(inst.runningPids) && inst.runningPids.length > 0 ? inst.runningPids : koffiMem.pids;
      const pidCount = runningPids.length;
      const memoryBytes = Number(inst.memoryBytes) || koffiMem.memoryBytes || 0;
      const memoryMb = Number(inst.memoryMb) || koffiMem.memoryMb || 0;
      const ramLabel = isRunning ? formatRamUsage(memoryBytes, memoryMb) : "";
      const sxsDir = inst.exePath ? path.dirname(inst.exePath) : inst.isolatedHomeDir;
      const sxsSizeBytes = sxsDir ? measureDirectorySizeCached(sxsDir, { syncCompute: false }) : 0;
      const sxsEmailKey = String(inst.boundEmail || "").trim().toLowerCase();
      const sxsQuota = sxsEmailKey && sxsEmailKey !== "inherited primary session"
        ? quotaByEmail.get(sxsEmailKey) || null
        : primaryQuota;
      const resolvedQuotaTier = resolveHighestTierLabel(sxsQuota?.tierLabel, inst.boundTier) || null;
      const sxsPatched = Boolean(themeMod.byVersion?.[inst.version]?.patched);
      const sxsStartMs = isRunning ? resolveEarliestStartMs(runningPids) : 0;
      const themeHookRestartNeeded = Boolean(
        sxsPatched && isRunning && themeHookMtimeMs > 0 && sxsStartMs > 0 && themeHookMtimeMs > sxsStartMs + 1500,
      );
      return {
        id: `sxs:${inst.version}`,
        name: `Antigravity v${inst.version}`,
        product: "antigravity",
        kind: "sxs",
        brandIconSrc: "/assets/brand-icons/antigravity.svg",
        version: inst.version,
        accountLabel: inst.boundEmail || "Unbound",
        installed: Boolean(inst.exePath),
        isRunning,
        runningPids,
        memoryBytes,
        memoryMb,
        ramLabel,
        sizeBytes: sxsSizeBytes,
        sizeLabel: formatBytes(sxsSizeBytes),
        status: resolveSxsStatus(inst, isRunning),
        updatePinned: true,
        aclLocked: false,
        pendingUpdatePresent: false,
        exePath: inst.exePath || null,
        visualTheme: inst.visualTheme || "SxS",
        themePatched: sxsPatched,
        themeHasBackup: Boolean(themeMod.byVersion?.[inst.version]?.hasBackup),
        themePreset: themeMod.byVersion?.[inst.version]?.presetId || themeMod.config?.preset || "cyber-horizon",
        themePresetLabel: themeMod.byVersion?.[inst.version]?.presetLabel || globalPresetLabel,
        themeOverride: Boolean(themeMod.byVersion?.[inst.version]?.isOverride),
        themeHookMtimeAt,
        processStartedAt: sxsStartMs > 0 ? new Date(sxsStartMs).toISOString() : null,
        themeHookRestartNeeded,
        boundEmail: inst.boundEmail || null,
        boundTier: inst.boundTier || null,
        quotaGeminiPct: sxsQuota?.geminiPct ?? null,
        quotaClaudePct: sxsQuota?.claudePct ?? null,
        quotaTierLabel: resolvedQuotaTier,
        quotaAiCredits: sxsQuota?.aiCredits ?? null,
        quotaAiCreditsLimit: sxsQuota?.aiCreditsLimit ?? null,
        quotaCreditsLabel: sxsQuota?.creditsLabel || null,
        quotaResetTime: sxsQuota?.resetTime || null,
        quotaUpdatedAt: sxsQuota?.updatedAt || null,
        quotaLabel: sxsQuota?.quotaLabel || null,
        desktopShortcutExists: Boolean(inst.desktopShortcutExists),
        startMenuShortcutExists: Boolean(inst.startMenuShortcutExists),
        isolatedHomeDir: inst.isolatedHomeDir || null,
        sxsInstance: inst,
        updated: sxsQuota?.updatedAt || checkedAt,
        detail: [
          `${themeMod.byVersion?.[inst.version]?.presetLabel || globalPresetLabel}${
            sxsPatched ? (themeHookRestartNeeded ? " · Mod (Restart needed)" : " · Mod") : ""
          }`,
          isRunning ? `${pidCount} proc(s)` : "SxS Isolated",
          resolvedQuotaTier || "",
          sxsQuota?.quotaLabel || "",
          sxsQuota?.creditsLabel || "",
          formatCompactQuotaSyncTime(sxsQuota?.updatedAt),
        ]
          .filter(Boolean)
          .join(" · "),
        log: isRunning
          ? `Running (${ramLabel ? `RAM ${ramLabel} · ` : ""}PID ${runningPids.join(", ") || "live"}) · ${
              inst.desktopShortcutExists && inst.startMenuShortcutExists
                ? "Desktop + Start Menu .lnk ready"
                : inst.startMenuShortcutExists
                  ? "Start Menu .lnk ready"
                  : inst.desktopShortcutExists
                    ? "Desktop .lnk ready"
                    : "No .lnk"
            }`
          : `Ready · ${
              inst.desktopShortcutExists && inst.startMenuShortcutExists
                ? "Desktop + Start Menu .lnk ready"
                : inst.startMenuShortcutExists
                  ? "Start Menu .lnk ready"
                  : inst.desktopShortcutExists
                    ? "Desktop .lnk ready"
                    : "No .lnk shortcut"
            }`,
        createdAt: statCreatedAtIso(inst.exePath || inst.isolatedHomeDir, inst.boundAt || checkedAt),
        updated: inst.boundAt || checkedAt,
      };
    }),
    {
      id: "app:cursor",
      name: "Cursor Desktop",
      product: "cursor",
      kind: "primary",
      brandId: "cursor",
      version: cursorInst.version || null,
      commit: cursorInst.commit || null,
      accountLabel: `Local (${currentWinUser})`,
      installed: Boolean(cursorInst.installed),
      isRunning: cursorMem.pids.length > 0,
      runningPids: cursorMem.pids,
      memoryBytes: cursorMem.memoryBytes,
      memoryMb: cursorMem.memoryMb,
      ramLabel: cursorMem.pids.length > 0 ? formatRamUsage(cursorMem.memoryBytes, cursorMem.memoryMb) : "",
      status: resolveProductStatus(cursorInst, cursorMem.pids.length > 0),
      updatePinned: Boolean(cursorInst.updatePinned),
      extensionsPinned: Boolean(cursorInst.extensionsPinned),
      aclLocked: false,
      pendingUpdatePresent: Boolean(cursorInst.pendingUpdatePresent),
      pendingFileName: cursorInst.pendingFileName || null,
      exePath: cursorExePath,
      sizeBytes: cursorSizeBytes,
      sizeLabel: formatBytes(cursorSizeBytes),
      installerItems: cursorInst.installerItems || [],
      stateSnapshots: cursorInst.stateSnapshots || [],
      vsixExtensions: vsixExtensions.filter((x) => x.scope === "shared" || x.scope === "cursor"),
      detail: [
        `update.mode=${cursorInst.updateMode || "default"}`,
        cursorInst.extensionsPinned ? "Ext Auto-Update OFF" : "Ext Auto-Update ON",
      ].join(" · "),
      log: `${(cursorInst.installerItems || []).length} archived installer(s) · ${(cursorInst.stateSnapshots || []).length} state snapshot(s)`,
      createdAt:
        cursorInst.stateSnapshots?.[0]?.createdAt ||
        cursorInst.installerItems?.[0]?.mtimeIso ||
        statCreatedAtIso(cursorExePath, checkedAt),
      updated: checkedAt,
    },
    {
      id: "app:claude-code",
      name: "Claude Code CLI",
      product: "claudeCode",
      kind: "cli",
      brandId: "claude",
      version: claudeInst.version || null,
      accountLabel: claudeInst.hasCredentials ? "OAuth Creds Active" : `CLI (${currentWinUser})`,
      installed: Boolean(claudeInst.installed),
      isRunning: claudeIsRunning,
      runningPids: claudeProcs.map((p) => Number(p.pid)).filter(Boolean),
      memoryBytes: claudeMemBytes,
      memoryMb: claudeMemBytes > 0 ? Math.round(claudeMemBytes / (1024 * 1024)) : 0,
      ramLabel: claudeIsRunning ? formatRamUsage(claudeMemBytes, 0) : "",
      status: !claudeInst.installed ? "Down" : claudeIsRunning ? "Running" : "Ready",
      updatePinned: false,
      aclLocked: false,
      pendingUpdatePresent: false,
      exePath: null,
      installerItems: [],
      stateSnapshots: [],
      vsixExtensions: [],
      detail: claudeInst.installed
        ? claudeInst.binaryInstalled
          ? "Global NPM CLI"
          : "Credentials linked"
        : "CLI not detected",
      log: claudeInst.binaryInstalled
        ? "NPM/Global CLI active"
        : claudeInst.hasCredentials
          ? "~/.claude/.credentials.json linked"
          : "Run npm install -g @anthropic-ai/claude-code",
      createdAt: checkedAt,
      updated: checkedAt,
    },
    ...zaloRows,
  ];

  const driveVaultSync = readIdeVaultDriveJobStatus({ jobsPath });

  const out = {
    ok: true,
    available: true,
    checkedAt,
    rows,
    releases,
    cursorReleases,
    driveVaultSync,
    themeMod: {
      config: themeMod.config,
      presets: themeMod.presets,
      patchedCount: themeMod.patchedCount,
      totalCount: themeMod.totalCount,
    },
    snapshot,
  };
  if (!includeReleases && !jobsPath) {
    appsSnapshotCache = { ts: Date.now(), payload: out };
  }
  return out;
}

export async function syncAntigravityVaultIfDue({
  force = false,
  intervalMs = 6 * 3600_000,
  unpackLatestCount = 3,
  notifyTelegram = true,
  triggerDriveSyncFn = null,
} = {}) {
  const mod = await loadInspectorModule();
  if (!mod) {
    return { ok: false, skipped: true, error: "Inspector module unavailable" };
  }
  if (typeof mod.syncAllIdeReleaseVaultsIfDue === "function") {
    const out = await mod.syncAllIdeReleaseVaultsIfDue({
      monorepoRoot: MONOREPO_ROOT,
      force,
      intervalMs,
      unpackLatestCount,
      notifyTelegram,
      ...(typeof triggerDriveSyncFn === "function" ? { triggerDriveSyncFn } : {}),
    });
    if (out?.ok !== false) ensureClosedSxsPatchedIfEnabled();
    return out;
  }
  if (typeof mod.syncAntigravityReleaseVaultIfDue === "function") {
    const out = await mod.syncAntigravityReleaseVaultIfDue({
      monorepoRoot: MONOREPO_ROOT,
      force,
      intervalMs,
      unpackLatestCount,
    });
    if (out?.ok !== false) ensureClosedSxsPatchedIfEnabled();
    return out;
  }
  return { ok: false, skipped: true, error: "Inspector vault sync unavailable" };
}

export async function runManagedAppAction(action, payload = {}) {
  const mod = await loadInspectorModule();
  if (!mod) {
    return {
      ok: false,
      error: "Requires Developer Workspace (E:\\Dev) to manage IDE installations.",
    };
  }

  const handlers = {
    "pin-updates": async () =>
      mod.pinLocalIdeUpdates({
        pin: payload.pin !== false,
        purgePending: payload.purgePending !== false,
        lockCursor: payload.lockCursor !== false,
        hardLockAcl: typeof payload.hardLockAcl === "boolean" ? payload.hardLockAcl : null,
      }),
    "launch-installer": async () =>
      mod.launchArchivedIdeInstaller({
        monorepoRoot: MONOREPO_ROOT,
        product: payload.product === "cursor" ? "cursor" : "antigravity",
        version: payload.version,
        dryRun: Boolean(payload.dryRun),
      }),
    "fetch-release": async () => {
      if (payload.product === "cursor" && typeof mod.fetchCursorReleaseToVault === "function") {
        return mod.fetchCursorReleaseToVault({
          monorepoRoot: MONOREPO_ROOT,
          version: payload.version,
          force: Boolean(payload.force),
        });
      }
      const out = await mod.fetchAntigravityReleaseToVault({
        monorepoRoot: MONOREPO_ROOT,
        version: payload.version,
        force: Boolean(payload.force),
      });
      if (out?.ok !== false) ensureClosedSxsPatchedIfEnabled();
      return out;
    },
    "fetch-all-releases": async () => {
      if (payload.product === "cursor" && typeof mod.fetchCursorReleaseToVault === "function") {
        const curOut = await mod.fetchCursorReleaseToVault({
          monorepoRoot: MONOREPO_ROOT,
          force: Boolean(payload.force),
        });
        return {
          ...curOut,
          message: curOut?.ok
            ? curOut.alreadyArchived
              ? `Cursor v${curOut.version} already archived`
              : `Archived Cursor v${curOut.version} to vault`
            : curOut?.error || "Cursor release download failed",
        };
      }
      const out = await mod.fetchAllPublicAntigravityReleases({
        monorepoRoot: MONOREPO_ROOT,
        limit: typeof payload.limit === "number" ? payload.limit : 0,
        unpackLatestCount: typeof payload.unpackLatestCount === "number" ? payload.unpackLatestCount : 3,
        dryRun: Boolean(payload.dryRun),
      });
      if (!payload.dryRun && out?.ok !== false) ensureClosedSxsPatchedIfEnabled();
      const smAdded = Array.isArray(out?.startMenuVersions) ? out.startMenuVersions : [];
      const tilesAdded = Array.isArray(out?.startTilesPinned) ? out.startTilesPinned : [];
      const smMsg = smAdded.length > 0 ? ` · Start Menu: ${smAdded.map((v) => `v${v}`).join(", ")}` : "";
      const tileMsg = tilesAdded.length > 0 ? ` · Start Tiles: +${tilesAdded.map((v) => `v${v}`).join(", ")}` : "";
      const unavailMsg = out?.skippedUnavailableCount ? ` · ${out.skippedUnavailableCount} unavailable (404)` : "";
      if (
        !payload.dryRun &&
        typeof mod.notifyIdeVaultUpdatesTelegram === "function" &&
        ((out?.downloaded || []).some((d) => !d.alreadyArchived) || smAdded.length > 0 || tilesAdded.length > 0)
      ) {
        void mod.notifyIdeVaultUpdatesTelegram(
          {
            antigravityDownloaded: (out.downloaded || []).filter((d) => !d.alreadyArchived).map((d) => d.version),
            startMenuAdded: smAdded,
            startTilesPinned: tilesAdded,
          },
          { monorepoRoot: MONOREPO_ROOT },
        );
      }
      return {
        ...out,
        message: out?.ok
          ? `Archived ${out.downloadedCount ?? 0} new build(s) (${out.totalPublicCount ?? 0} feed)${smMsg}${tileMsg}${unavailMsg}`
          : out?.error || `Archive finished with ${out?.failedCount ?? 0} failure(s)${smMsg}`,
      };
    },
    "sync-start-menu-latest": async () => {
      const iconPref =
        typeof payload.useBadgeIcon === "boolean"
          ? { useBadgeIcon: payload.useBadgeIcon, useExeIcon: !payload.useBadgeIcon }
          : {};
      const out = mod.ensureLatestAntigravityStartMenuShortcuts({
        monorepoRoot: MONOREPO_ROOT,
        latestCount: typeof payload.latestCount === "number" ? payload.latestCount : 3,
        ...iconPref,
        dryRun: Boolean(payload.dryRun),
      });
      if (!payload.dryRun && out?.ok !== false) ensureClosedSxsPatchedIfEnabled();
      const added = Array.isArray(out?.ensuredVersions) ? out.ensuredVersions : [];
      const tiles = Array.isArray(out?.startTilesPinned) ? out.startTilesPinned : [];
      const ready = Array.isArray(out?.alreadyReadyVersions) ? out.alreadyReadyVersions : [];
      return {
        ...out,
        message:
          added.length > 0 || tiles.length > 0
            ? `Start Menu updated (${[
                added.length > 0 ? `folder: ${added.map((v) => `v${v}`).join(", ")}` : "",
                tiles.length > 0 ? `tiles: ${tiles.map((v) => `v${v}`).join(", ")}` : "",
              ]
                .filter(Boolean)
                .join(" · ")})`
            : `Latest Start Menu & Tiles already up to date (${ready.map((v) => `v${v}`).join(", ") || "none"})`,
      };
    },
    "launch-sxs": async () =>
      mod.launchSideBySideAntigravity({
        monorepoRoot: MONOREPO_ROOT,
        version: payload.version,
        relaunch: Boolean(payload.relaunch),
        ...(typeof payload.useBadgeIcon === "boolean"
          ? { useBadgeIcon: payload.useBadgeIcon, useExeIcon: !payload.useBadgeIcon }
          : {}),
      }),
    "stop-sxs": async () =>
      mod.stopSideBySideAntigravity({
        monorepoRoot: MONOREPO_ROOT,
        version: payload.version,
      }),
    "launch-primary": async () =>
      mod.launchPrimaryAntigravity({
        monorepoRoot: MONOREPO_ROOT,
        dryRun: Boolean(payload.dryRun),
      }),
    "repair-taskbar-pins": async () =>
      mod.repairBrokenSxsTaskbarShortcuts({
        monorepoRoot: MONOREPO_ROOT,
        version: payload.version || null,
        ...(typeof payload.useBadgeIcon === "boolean"
          ? { useBadgeIcon: payload.useBadgeIcon, useExeIcon: !payload.useBadgeIcon }
          : {}),
      }),
    "create-shortcut": async () =>
      mod.ensureSideBySideShortcuts({
        monorepoRoot: MONOREPO_ROOT,
        version: payload.version,
        ...(typeof payload.useBadgeIcon === "boolean"
          ? { useBadgeIcon: payload.useBadgeIcon, useExeIcon: !payload.useBadgeIcon }
          : {}),
      }),
    snapshot: async () =>
      mod.snapshotIdeUserState({
        monorepoRoot: MONOREPO_ROOT,
        product: payload.product === "cursor" ? "cursor" : "antigravity",
        reason: payload.reason || "manual",
      }),
    restore: async () =>
      mod.restoreIdeUserState({
        monorepoRoot: MONOREPO_ROOT,
        product: payload.product === "cursor" ? "cursor" : "antigravity",
        snapshotId: payload.snapshotId,
      }),
    "vsix-sync": async () =>
      mod.syncLocalVsixVault({
        monorepoRoot: MONOREPO_ROOT,
        force: Boolean(payload.force),
      }),
    "vsix-install": async () =>
      mod.installArchivedVsix({
        monorepoRoot: MONOREPO_ROOT,
        product: payload.product === "cursor" ? "cursor" : "antigravity",
        fileNameOrId: payload.fileNameOrId,
      }),
    "sync-zalo-instances": async () =>
      syncZaloDesktopInstances({
        instanceIds: Array.isArray(payload.instanceIds) ? payload.instanceIds : null,
        includePrimary: Boolean(payload.includePrimary),
        stopRunning: payload.stopRunning !== false,
        pruneOld: payload.pruneOld !== false,
        verifySha1: payload.verifySha1 !== false,
      }),
    "launch-zalo": async () =>
      launchZaloDesktopInstance({
        id: payload.id,
        relaunch: Boolean(payload.relaunch),
      }),
    "stop-zalo": async () =>
      stopZaloDesktopInstance({
        id: payload.id,
      }),
    "repair-zalo-shortcuts": async () =>
      repairZaloShortcuts({
        instanceIds: Array.isArray(payload.instanceIds) ? payload.instanceIds : null,
        createStartMenu: payload.createStartMenu !== false,
        createDesktop: Boolean(payload.createDesktop),
      }),
    "clean-zalo-cache": async () =>
      cleanZaloDataCache({
        instanceIds: Array.isArray(payload.instanceIds) ? payload.instanceIds : null,
      }),
    "probe-zalo-remote-data": async () =>
      probeRemoteZaloDataStats({
        instanceIds: Array.isArray(payload.instanceIds) ? payload.instanceIds : null,
      }),
    "offload-zalo-data": async () =>
      offloadZaloDataToDriveD({
        instanceId: payload.instanceId || payload.id || "zalo:primary",
        folder: payload.folder,
        force: Boolean(payload.force),
      }),
    "sync-drive-vault": async () => {
      if (typeof payload.triggerDriveSyncFn === "function") {
        const res = await payload.triggerDriveSyncFn();
        return {
          ...res,
          ok: res?.ok !== false && res?.triggered !== false,
          message: res?.triggered
            ? `Triggered ${res.code || "JB0006"} sync to gdrive:IDE-Installers-Vault`
            : res?.error || "JB0006 Folder Sync job not found",
        };
      }
      const status = readIdeVaultDriveJobStatus({ jobsPath: payload.jobsPath || null });
      return status?.jobId
        ? {
            ok: true,
            triggered: false,
            ...status,
            message: `${status.code}: ${status.syncedCount} synced (${status.remote})`,
          }
        : { ok: false, error: "JB0006 Folder Sync job not found" };
    },
    "theme-apply": async () => {
      const res = runAntigravityThemeModAction("apply", payload.version ? { version: payload.version } : {});
      const results = res?.results || [];
      const changed = results.filter((r) => r.status === "installed").length;
      const skipped = results.filter((r) => r.status === "skipped-running").length;
      return {
        ...res,
        message: payload.version
          ? `Theme Mod applied to v${String(payload.version).replace(/^v/i, "")} (${results[0]?.status || "ok"})`
          : `Theme Mod applied: ${changed} patched${skipped > 0 ? `, ${skipped} running skipped` : ""}`,
      };
    },
    "theme-restore": async () => {
      const res = runAntigravityThemeModAction("restore", payload.version ? { version: payload.version } : {});
      const results = res?.results || [];
      const changed = results.filter((r) => r.status === "restored").length;
      const skipped = results.filter((r) => r.status === "skipped-running").length;
      return {
        ...res,
        message: payload.version
          ? `Stock ASAR restored for v${String(payload.version).replace(/^v/i, "")} (${results[0]?.status || "ok"})`
          : `Stock ASAR restored: ${changed} updated${skipped > 0 ? `, ${skipped} running skipped` : ""}`,
      };
    },
    "theme-config": async () => {
      const res = saveAntigravityThemeModConfig(payload || {});
      return {
        ...res,
        message: payload?.clearScopeOverride
          ? `Reset ${payload.scopeKey} override to global (${res.config?.preset || "cyber-horizon"})`
          : `Saved Theme Mod preset (${res.config?.preset || "cyber-horizon"})`,
      };
    },
  };

  const fn = handlers[String(action || "").trim()];
  if (!fn) {
    return { ok: false, error: `Unknown app management action: ${action}` };
  }

  const result = await fn();
  appsSnapshotCache = { ts: 0, payload: null };
  const refreshed = await getManagedAppsSnapshot({
    includeReleases: action === "fetch-release" || action === "fetch-all-releases",
  });
  return {
    ...result,
    ok: result?.ok !== false,
    appsState: refreshed,
  };
}

export { cleanZaloDataCache, syncZaloFleetIfDue };
