import {
  withDesktopHubAuthHeaders,
  type DesktopAuthBootTelemetry,
} from "@tool-workspace/hub-identity";
import { fetchDeskHost, resolveDeskApiOrigin } from "./host-fetch-recovery";

function apiOrigin(): string {
  return resolveDeskApiOrigin();
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = withDesktopHubAuthHeaders(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetchDeskHost(path, {
    ...init,
    headers,
    signal: init?.signal ?? AbortSignal.timeout(8000),
  });
  const data = (await res.json().catch(() => ({}))) as T & { ok?: boolean; error?: string };
  if (!res.ok) throw new Error(data.error || `${res.status} ${path}`);
  return data;
}

function rowsOf<T>(data: { rows?: T[] } | null | undefined): T[] {
  return Array.isArray(data?.rows) ? data.rows : [];
}

export type ClipKind = "history" | "sample";

export type ClipRow = {
  id: string;
  name?: string;
  text: string;
  contentType?: "text" | "image";
  hasImage?: boolean;
  imageDataUrl?: string;
  imageUrl?: string;
  imageMediaFile?: string;
  imageWidth?: number;
  imageHeight?: number;
  kind?: ClipKind;
  pinned: boolean;
  source: string;
  project?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export function resolveClipImageSrc(row: ClipRow | null | undefined): string {
  if (!row) return "";
  if (row.imageDataUrl) return row.imageDataUrl;
  if (row.imageUrl) return row.imageUrl;
  if (row.hasImage || row.contentType === "image" || row.imageMediaFile) {
    const v = row.imageMediaFile ? `?v=${encodeURIComponent(row.imageMediaFile)}` : "";
    return `${apiOrigin()}/api/clips/${encodeURIComponent(row.id)}/image${v}`;
  }
  return "";
}

export type RunnerRow = {
  id: string;
  code: string;
  name: string;
  kind: string;
  port: number;
  url: string;
  up: boolean;
  createdAt?: string;
  updatedAt?: string;
  toolRoot?: string;
  stack?: string;
  probePath?: string;
  openPath?: string;
  probedAt?: string;
  /** Host start spawn tracking — UI clears Starting when exit ≠ 0. */
  startPid?: number;
  startStartedAt?: number;
  startExitedAt?: number;
  startExitCode?: number | null;
};

export type TaskRow = {
  id: string;
  name: string;
  kind?: "daemon" | "schtask";
  createdAt?: string;
  schedule?: string;
  scheduleType?: string;
  modifier?: string;
  startTime?: string;
  description?: string;
  command?: string;
  status: string;
  lastRun: string;
  lastRunIso?: string;
  lastResult: string;
  lastDurationMs?: number | null;
  lastFreedMb?: number | null;
  lastSummary?: string;
  activityLog?: import("@tool-workspace/hub-ui").HubEntityLogEntry[];
  nextRun: string;
};

export type OpsRow = {
  id: string;
  kind: "task" | "runner";
  targetId: string;
  name: string;
  status: string;
  detail: string;
  updated: string;
  lastRun?: string;
  lastResult?: string;
  nextRun?: string;
  up?: boolean;
  port?: number;
  url?: string;
  code?: string;
};

export type OpsHistoryEntry = {
  id: string;
  at: string;
  kind: "task" | "runner";
  targetId: string;
  action: string;
  ok: boolean;
  message: string;
  reclaimedBytes?: number;
  pid?: number;
};

/** Format reclaimed disk bytes concisely for P0001 Dashboard & Ops History badges. */
export function formatDiskBytesLabel(bytes: number | undefined | null): string {
  const n = Number(bytes || 0);
  if (!Number.isFinite(n) || n <= 0) return "";
  return n >= 1024 * 1024
    ? `${(n / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(n / 1024))} KB`;
}

export type OpsConsoleEntry = {
  id: string;
  at: string;
  level: string;
  channel: string;
  message: string;
};

export type DeskHotkeys = {
  ok: boolean;
  picker: string;
  labels: { picker: string };
  defaults: { picker: string; labels: { picker: string } };
};

/** Device CPU / RAM — `GET /api/host-metrics` (P0003 header parity). */
export type DeskHostMetrics = {
  ok: boolean;
  cpuPercent: number;
  cpuReady: boolean;
  ramUsedBytes: number;
  ramTotalBytes: number;
  ramPercent: number;
  processorGroupCount?: number;
  logicalProcessorCount?: number;
  sampledAt: number;
};

export type PcAlert = {
  id: string;
  severity: "critical" | "warn" | "info";
  title: string;
  detail: string;
  action: string;
};

export type PcProcessRow = {
  pid: number;
  ppid: number;
  name: string;
  threads: number;
  ramMB: number;
  handles: number;
  gdi: number;
  user: number;
  group: string;
};

export type PcFamilyRow = {
  label: string;
  count: number;
  ramMB: number;
  handles: number;
  gdi: number;
  user: number;
};

export type PcAdaptiveThrottle = {
  dwmCpuSecPerSec: number;
  maxHeadlessConcurrent: number;
  maxHeadlessIdleMs: number;
  throttled: boolean;
  mode: string;
};

export type FarmJobRow = {
  id: string;
  name: string;
  scriptRelPath: string;
  args: string[];
  autoResume: boolean;
  running: boolean;
  pid: number | null;
  duplicatePids?: number[];
  ramMB?: number;
  lastStartedAt?: string | null;
  lastStoppedAt?: string | null;
};

export type FarmSupervisorStatus = {
  enabled: boolean;
  updatedAt: string;
  adaptiveMode: string;
  dwmCpuSecPerSec: number;
  maxHeadlessConcurrent: number;
  jobs: FarmJobRow[];
};

export type PcDiagnosticsPayload = {
  ok: boolean;
  sampledAt: string;
  scanMs: number;
  summary: {
    processCount: number;
    totalHandles: number;
    totalGdi: number;
    totalUser: number;
    ramUsedBytes: number;
    ramFreeBytes: number;
    ramTotalBytes: number;
    ramPercent: number;
    topology: {
      groupCount: number;
      logicalCpuCount: number;
      groupThreads: number[];
      affinityCounts: Record<string, number>;
    };
    smokePool: {
      reachable: boolean;
      runningCount: number;
      totalSmokeTabs: number;
      leakedHeadlessFarmCount?: number;
      profiles: Array<{ id: string; code: string; debugPort: number; pageTabs: number }>;
    };
    adaptiveThrottle?: PcAdaptiveThrottle;
    antigravityBrain?: {
      sessionCount: number;
      openTabCount?: number;
      totalMB: number;
      brainMB: number;
      convMB: number;
      sumDbMB?: number;
      bloatedCount: number;
      bloatedIds?: string[];
      openBloatedTabs?: Array<{
        id: string;
        title: string;
        steps: number;
        dbMB: number;
        openInIde: boolean;
      }>;
      lsRamMB: number;
    };
    suppressedConsolePopups?: number;
  };
  farmSupervisor?: FarmSupervisorStatus;
  alerts: PcAlert[];
  families: PcFamilyRow[];
  topProcesses: PcProcessRow[];
};

export type PcOptimizeAction =
  | "all"
  | "trim-ram"
  | "clean-smoke"
  | "prune-junk"
  | "sweep-antigravity"
  | "deep-maintenance";

export type PcBackupStep = {
  id: string;
  label: string;
  status: "pending" | "running" | "ok" | "warn" | "error" | "skipped" | string;
  ok: boolean | null;
  detail?: string;
};

export type PcBackupStatusPayload = {
  ok: boolean;
  backupRoot: string;
  scriptAvailable: boolean;
  status: "never" | "running" | "ok" | "error" | string;
  health: "unconfigured" | "running" | "protected" | "partial" | "overdue" | "warning" | string;
  mode: "full" | "critical" | string;
  phase: string;
  phaseLabel: string;
  percent: number;
  pid: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  lastSuccessAt: string | null;
  ageHours: number | null;
  durationMs: number | null;
  transferred: string | null;
  total: string | null;
  speed: string | null;
  eta: string | null;
  filesDone: number | null;
  filesTotal: number | null;
  archiveName: string | null;
  archiveBytes: number;
  stealthCoreName?: string | null;
  stealthCoreBytes?: number;
  stealthCoreProfileCount?: number;
  stealthCoreAt?: string | null;
  pixelTgxAccountCount?: number;
  pixelTgxBytes?: number;
  pixelTgxAt?: string | null;
  localBytes: number;
  localMirrorBytes: number;
  localArchiveCount: number;
  offsiteGdriveOk: boolean;
  offsiteGdriveTarget: string;
  offsiteGdriveRetained: number;
  offsiteLenovoOk: boolean;
  offsiteLenovoTarget: string;
  offsiteLenovoRetained: number;
  dirtyGitCount: number;
  cleanGitCount: number;
  systemRecoveryOk: boolean;
  vssActive?: boolean;
  vssDrives?: string[];
  steps: PcBackupStep[];
  error: string | null;
  schtask: {
    name: string;
    status: string;
    schedule: string;
    lastRun: string;
    nextRun: string;
    lastResult: string;
  } | null;
  logPath: string;
  logTail: string[];
  healthDrill?: {
    ok: boolean;
    checkedAt: string;
    lastSuccessAt: string | null;
    ageHours: number | null;
    archiveName: string | null;
    localArchiveCount: number;
    drillOk: boolean;
    drillEntries: number;
    drillHasRecovery: boolean;
    stealthArchiveName?: string | null;
    stealthDrillOk?: boolean;
    stealthDrillEntries?: number;
    pixelTgxDrillOk?: boolean;
    pixelTgxDrillEntries?: number;
    pixelTgxAccountCount?: number;
    cloudArchiveCount: number;
    cloudLatestArchivePresent: boolean;
    cloudStatePresent: boolean;
    cloudMirrorDirs: string[];
    alerts: string[];
  } | null;
  systemImage?: {
    ok: boolean;
    hasleoInstalled: boolean;
    state: "ready" | "awaiting-disk" | "awaiting-task" | "missing-hasleo" | "error" | string;
    ready: boolean;
    summary: string;
    secondaryDisks?: Array<{ Number: number; FriendlyName: string; BusType: string; SizeGB: number }>;
    tasks?: Array<{ guid: string; name: string }>;
  } | null;
};

export type HardwareSensorGpu = {
  name: string;
  tempC: number | null;
  hotSpotC?: number | null;
  fanPercent: number | null;
  fanRpm?: number | null;
  powerDrawW: number | null;
  powerLimitW: number | null;
  utilPercent: number | null;
  memUtilPercent: number | null;
  vramUsedMB: number | null;
  vramTotalMB: number | null;
  graphicsClockMHz: number | null;
  memoryClockMHz: number | null;
  pstate: string | null;
  pcieGen: number | null;
  pcieGenMax: number | null;
  pcieLinkWidth: number | null;
  pcieLinkWidthMax: number | null;
  pcieDowngraded?: boolean;
  throttleFlags: string;
};

export type HardwareSensorCpuSocket = {
  name: string;
  packageTempC: number | null;
  coreMaxTempC: number | null;
  coreAvgTempC: number | null;
  packagePowerW: number | null;
  loadPercent: number | null;
};

export type HardwareSensorStorage = {
  name: string;
  tempC: number | null;
  tempMaxC?: number | null;
  lifePercent: number | null;
  powerOnHours?: number | null;
  healthOk?: boolean;
  recordedAt?: string;
  source: "lhm" | "crystaldiskinfo" | "watchdog" | string;
};

export type HardwareSensorsPayload = {
  ok: boolean;
  sampledAt: string;
  health: "healthy" | "warn" | "critical" | string;
  lhmReachable: boolean;
  tools: {
    lhm: boolean;
    occt: boolean;
    crystaldiskinfo: boolean;
  };
  tuning?: {
    powerPlanGuid: string | null;
    powerPlanName: string | null;
    cpuMinPct: number | null;
    cpuMaxPct?: number | null;
    gpuPowerMizerLevel: number | null;
    gpuPowerMizerMode: string | null;
    gpuDrsPowerMode?: number | null;
    gpuDrsPowerModeLabel?: string | null;
    nicEeeEnabled: boolean | null;
  } | null;
  sensorLogger?: {
    running: boolean;
    pid: number | null;
    csvRows: number;
    lastSampleAt: string | null;
    cpuLoadPct: number | null;
    v12: number | null;
    v33?: number | null;
    v33MinRecent?: number | null;
    v33BelowCount?: number;
    topProc: string | null;
  } | null;
  cpu: {
    sockets: HardwareSensorCpuSocket[];
    packageTempC: number | null;
    coreMaxTempC: number | null;
    totalPackagePowerW: number | null;
  };
  gpu: HardwareSensorGpu | null;
  storage: HardwareSensorStorage[];
  motherboard: {
    name: string;
    temps: Array<{ name: string; valueC: number }>;
    fans: Array<{ name: string; rpm: number }>;
    voltage12V: number | null;
    voltage33V?: number | null;
    voltageAvccV?: number | null;
  } | null;
  stability: {
    unexpectedShutdowns7d: number;
    wheaErrors7d: number;
    displayTdrs7d: number;
    recentEvents: Array<{
      at: string;
      id: number;
      provider: string;
      message: string;
    }>;
  };
  alerts: Array<{
    severity: "warn" | "critical" | string;
    code: string;
    message: string;
  }>;
};

export type HardwareHistoryPoint = {
  ts: string;
  gpuTempC: number | null;
  gpuHotSpotC: number | null;
  gpuPowerW: number | null;
  cpuTempC: number | null;
  ssdTempC: number | null;
  pcieWidth: number | null;
  v12?: number | null;
  v33?: number | null;
  cpuLoadPct?: number | null;
  topProc?: string | null;
};

export type PcBackupSnapshotEntry = {
  name: string;
  bytes: number;
  mtime: string | null;
  source: "local" | "gdrive" | "lenovo" | string;
};

export type PcBackupSnapshotsResponse = {
  ok: boolean;
  source: string;
  critical: Record<string, PcBackupSnapshotEntry[]>;
  stealthCore: Record<string, PcBackupSnapshotEntry[]>;
  error?: string;
};

export type PcOptimizeResult = {
  ok: boolean;
  action: string;
  completedAt: string;
  results: {
    ram?: {
      ok: boolean;
      trimmedProcesses: number;
      beforeFreeBytes: number;
      afterFreeBytes: number;
      freedRamBytes: number;
    };
    smoke?: {
      ok: boolean;
      closedTabs: number;
      checkedProfiles: number;
    };
    junk?: {
      ok: boolean;
      pruned: boolean;
      output?: string;
    };
    antigravitySweep?: {
      ok: boolean;
      removedSessions: number;
      prunedArtifacts: number;
      reclaimedBytes?: number;
    };
    antigravityRpcSync?: {
      ok: boolean;
      serversFound: number;
      serversSynced: number;
      syncedDeleted: number;
    };
    deepMaintenance?: {
      ok: boolean;
      skipped?: boolean;
      lastPassFreedMB?: number;
      lastPassCleanedProfiles?: number;
    };
  };
  diagnostics: PcDiagnosticsPayload;
};

function mergeOpsRows(runners: RunnerRow[], tasks: TaskRow[]): OpsRow[] {
  const taskRows: OpsRow[] = tasks.map((row) => ({
    id: `task:${row.id}`,
    kind: "task",
    targetId: row.id,
    name: row.name,
    status: row.status || "",
    detail: row.lastResult ? `last ${row.lastResult}` : "",
    updated: row.lastRun || row.nextRun || "",
    lastRun: row.lastRun,
    lastResult: row.lastResult,
    nextRun: row.nextRun,
  }));
  const runnerRows: OpsRow[] = runners.map((row) => ({
    id: `runner:${row.id}`,
    kind: "runner",
    targetId: row.id,
    code: row.code,
    name: `${row.code} · ${row.name}`,
    status: row.up ? "Up" : "Down",
    detail: `${row.kind} :${row.port}`,
    updated: row.updatedAt || row.probedAt || "",
    up: row.up,
    port: row.port,
    url: row.url,
  }));
  return [...taskRows, ...runnerRows].sort((a, b) => a.name.localeCompare(b.name));
}

export type TelemetryHistoryPoint = {
  ts: string;
  hourKey: string;
  dayKey: string;
  syncedJobs: number;
  totalJobs: number;
  signedDrives: number;
  totalDrives: number;
  clipsCount: number;
  runnersUp: number;
  readyCrons: number;
  diskFreeGb: number;
  ramFreeGb: number;
};

export const deskApi = {
  health: () =>
    req<{ ok: boolean; cursorRunning: boolean; authTelemetry?: DesktopAuthBootTelemetry | null }>(
      "/api/health",
    ),
  hotkeys: () => req<DeskHotkeys>("/api/hotkeys"),
  saveHotkeys: (body: { picker?: string }) =>
    req<DeskHotkeys>("/api/hotkeys", { method: "PUT", body: JSON.stringify(body) }),
  resetHotkeys: () => req<DeskHotkeys>("/api/hotkeys/reset", { method: "POST" }),
  clips: async (lifecycle: "live" | "trash" = "live", summary = true) => ({
    rows: rowsOf(
      await req<{ rows: ClipRow[] }>(`/api/clips?lifecycle=${lifecycle}${summary ? "&summary=1" : ""}`),
    ),
  }),
  clip: (id: string) => req<{ ok: boolean; row: ClipRow }>(`/api/clips/${encodeURIComponent(id)}`),
  saveClip: (text?: string) =>
    req<{ row: ClipRow }>("/api/clips", { method: "POST", body: JSON.stringify({ text, source: text ? "manual" : "clipboard" }) }),
  saveSample: (text: string, name?: string) =>
    req<{ row: ClipRow }>("/api/samples", { method: "POST", body: JSON.stringify({ text, name }) }),
  deleteClip: (id: string) => req(`/api/clips/${id}`, { method: "DELETE" }),
  restoreClip: (id: string) => req<{ row: ClipRow }>(`/api/clips/${id}/restore`, { method: "POST" }),
  purgeClipForever: (id: string) => req(`/api/clips/${id}/forever`, { method: "DELETE" }),
  pinClip: (id: string, pinned = true) =>
    req(`/api/clips/${id}/pin`, { method: "POST", body: JSON.stringify({ pinned }) }),
  promoteClip: (id: string) => req<{ row: ClipRow }>(`/api/clips/${id}/sample`, { method: "POST" }),
  copyClip: (id: string) => req(`/api/clips/${id}/copy`, { method: "POST" }),
  pasteClip: (id: string) => req<{ pasted?: boolean; error?: string }>(`/api/clips/${id}/paste`, { method: "POST" }),
  armPicker: () => req<{ hwnd?: string }>("/api/clips/picker/arm", { method: "POST" }),
  listClips: async (lifecycle: "live" | "trash" = "live", summary = true) =>
    (await deskApi.clips(lifecycle, summary)).rows,
  runners: async () => ({ rows: rowsOf(await req<{ rows: RunnerRow[] }>("/api/runners")) }),
  listRunners: async () => (await deskApi.runners()).rows,
  getRunnerWatchdog: () =>
    req<{ ok: boolean; watchdog?: { enabled?: boolean; pinned?: string[] } }>("/api/runners/watchdog"),
  runnerAction: (idOrCode: string, mode: "start" | "restart" | "recover" | "stop") =>
    req(`/api/runners/${encodeURIComponent(idOrCode)}/${mode}`, {
      method: "POST",
      signal: AbortSignal.timeout(25_000),
    }),
  tasks: async () => ({ rows: rowsOf(await req<{ rows: TaskRow[] }>("/api/tasks")) }),
  listTasks: async () => (await deskApi.tasks()).rows,
  createTask: (body: {
    name: string;
    scheduleType: string;
    modifier?: string;
    startTime?: string;
    command: string;
    description?: string;
    scheduleLabel?: string;
  }) =>
    req<{ ok: boolean; name: string; task?: TaskRow }>("/api/tasks", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateTask: (
    name: string,
    body: {
      enabled?: boolean;
      scheduleType?: string;
      modifier?: string;
      startTime?: string;
      scheduleLabel?: string;
      description?: string;
      command?: string;
    },
  ) =>
    req<{ ok: boolean; name: string; task?: TaskRow }>(`/api/tasks/${encodeURIComponent(name)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  deleteTask: (name: string) =>
    req<{ ok: boolean; name: string; disabledBuiltin?: boolean }>(
      `/api/tasks/${encodeURIComponent(name)}`,
      { method: "DELETE" },
    ),
  taskAction: (name: string, action: "run" | "enable" | "disable") =>
    req(`/api/tasks/${encodeURIComponent(name)}/${action}`, { method: "POST" }),
  runTask: (name: string) => deskApi.taskAction(name, "run"),
  setTaskEnabled: (name: string, enable: boolean) =>
    deskApi.taskAction(name, enable ? "enable" : "disable"),
  ops: async () => {
    try {
      const data = await req<{ rows: OpsRow[] }>("/api/ops");
      if (Array.isArray(data.rows) && data.rows.length > 0) return { rows: data.rows };
    } catch {
      /* stale host without /api/ops — merge legacy endpoints */
    }
    const [runners, tasks] = await Promise.all([deskApi.runners(), deskApi.tasks()]);
    return { rows: mergeOpsRows(runners.rows, tasks.rows) };
  },
  opsHistory: async (target?: string) => {
    const q = target ? `?target=${encodeURIComponent(target)}` : "";
    return req<{ entries: OpsHistoryEntry[] }>(`/api/ops/history${q}`);
  },
  opsLogs: async (target: string, kind?: "task" | "runner") => {
    const params = new URLSearchParams({ target });
    if (kind) params.set("kind", kind);
    return req<{ path: string; exists: boolean; sources?: string[]; lines?: string[]; entries: OpsConsoleEntry[] }>(
      `/api/ops/logs?${params}`,
    );
  },
  opsTerminalStreamUrl: (target: string, kind?: "task" | "runner") => {
    const origin = apiOrigin();
    if (!origin) return "";
    const params = new URLSearchParams({ target });
    if (kind) params.set("kind", kind);
    return `${origin}/api/ops/terminal/stream?${params}`;
  },
  cursorGc: (close = false) => req("/api/cursor/gc", { method: "POST", body: JSON.stringify({ close }) }),
  meta: () =>
    req<{
      ok: boolean;
      port: number;
      dataRoot: string;
      syncDataRoot?: string;
      syncPlane: "local";
      accountLabel: string;
      hasDevWorkspace?: boolean;
      stores: string[];
    }>("/api/meta"),
  hostMetrics: () => req<DeskHostMetrics>("/api/host-metrics"),
  hardwareSensors: (force = false) =>
    req<HardwareSensorsPayload>(`/api/hardware/sensors${force ? "?force=1" : ""}`, {
      signal: AbortSignal.timeout(12000),
    }),
  hardwareHistory: () =>
    req<{ ok: boolean; rows: HardwareHistoryPoint[] }>("/api/hardware/history").then((r) => rowsOf(r)),
  launchHardwareTool: (tool: "lhm" | "occt" | "crystaldiskinfo") =>
    req<{ ok: boolean; tool?: string; path?: string; error?: string }>("/api/hardware/launch", {
      method: "POST",
      body: JSON.stringify({ tool }),
    }),
  telemetryHistory: () =>
    req<{ ok: boolean; rows: TelemetryHistoryPoint[] }>("/api/telemetry/history").then((r) => rowsOf(r)),
  pcDiagnostics: () =>
    req<PcDiagnosticsPayload>("/api/pc/diagnostics", { signal: AbortSignal.timeout(25000) }),
  pcBackupStatus: () =>
    req<PcBackupStatusPayload>("/api/pc/backup", { signal: AbortSignal.timeout(10000) }),
  runPcBackup: (mode: "full" | "critical" = "full") =>
    req<{
      ok: boolean;
      started: boolean;
      alreadyRunning?: boolean;
      mode?: string;
      pid?: number | null;
      error?: string;
      status: PcBackupStatusPayload;
    }>("/api/pc/backup/run", {
      method: "POST",
      body: JSON.stringify({ mode }),
      signal: AbortSignal.timeout(10000),
    }),
  runPcBackupDrill: () =>
    req<{
      ok: boolean;
      error?: string;
      drill: PcBackupStatusPayload["healthDrill"];
      status: PcBackupStatusPayload;
    }>("/api/pc/backup/drill", {
      method: "POST",
      body: "{}",
      signal: AbortSignal.timeout(45000),
    }),
  pcBackupSnapshots: (source: "all" | "local" | "gdrive" | "lenovo" = "all") =>
    req<PcBackupSnapshotsResponse>(`/api/pc/backup/snapshots?source=${encodeURIComponent(source)}`, {
      signal: AbortSignal.timeout(45000),
    }),
  runPcBackupRestore: (payload: {
    source: "local" | "gdrive" | "lenovo";
    snapshot?: string;
    stealthCore?: boolean;
    restoreLive?: boolean;
    target?: string;
  }) =>
    req<{
      ok: boolean;
      error?: string;
      criticalSnapshot?: string;
      stealthCoreSnapshot?: string | null;
      extractedCriticalDir?: string;
      extractedStealthCoreDir?: string | null;
      restoreLive?: boolean;
      restoredLive?: Array<{ to: string; files: number }>;
      gitPatchesHint?: string;
    }>("/api/pc/backup/restore", {
      method: "POST",
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(300_000),
    }),
  runHasleoSystemImage: (payload?: { guid?: string; type?: string }) =>
    req<{ ok: boolean; error?: string; guid?: string }>("/api/pc/backup/system-image/run", {
      method: "POST",
      body: JSON.stringify(payload || {}),
      signal: AbortSignal.timeout(60_000),
    }),
  pcOptimize: (action: PcOptimizeAction | "deep-maintenance" = "all") =>
    req<PcOptimizeResult>("/api/pc/optimize", {
      method: "POST",
      body: JSON.stringify({ action }),
      signal: AbortSignal.timeout(30000),
    }),
  farmSupervisor: () => req<{ ok: boolean; status: FarmSupervisorStatus }>("/api/pc/farm-supervisor"),
  controlFarmSupervisor: (payload: {
    enabled?: boolean;
    jobId?: string;
    action?: "start" | "stop";
    autoResume?: boolean;
    tick?: boolean;
  }) =>
    req<{ ok: boolean; status: FarmSupervisorStatus }>("/api/pc/farm-supervisor", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  siblings: () =>
    req<{
      ok: boolean;
      siblings: Array<{ code: string; name: string; available: boolean; exe: string; source: string }>;
    }>("/api/siblings"),
  openSibling: (code: string) =>
    req<{ ok: boolean; code: string; name?: string; exe?: string; error?: string }>(
      `/api/siblings/${encodeURIComponent(code)}/open`,
      { method: "POST" },
    ),
  appsVersions: (opts?: { releases?: boolean; force?: boolean }) => {
    const params = new URLSearchParams();
    if (opts?.releases) params.set("releases", "1");
    if (opts?.force) params.set("force", "1");
    const q = params.toString();
    return req<ManagedAppsResponse>(`/api/apps/versions${q ? `?${q}` : ""}`);
  },
  appsAction: (action: string, payload: Record<string, unknown> = {}) =>
    req<{ ok: boolean; message?: string; error?: string; appsState?: ManagedAppsResponse }>("/api/apps/action", {
      method: "POST",
      body: JSON.stringify({ action, ...payload }),
      signal: AbortSignal.timeout(action === "fetch-all-releases" ? 300000 : 45000),
    }),
};

export type ManagedAppRow = {
  id: string;
  name: string;
  product: "antigravity" | "cursor" | "claudeCode";
  kind: "primary" | "sxs" | "cli";
  version: string | null;
  previousUsedVersion?: string | null;
  commit?: string | null;
  installed: boolean;
  isRunning?: boolean;
  runningPids?: number[];
  memoryBytes?: number;
  memoryMb?: number;
  status: string;
  updatePinned: boolean;
  extensionsPinned?: boolean;
  aclLocked: boolean;
  pendingUpdatePresent: boolean;
  pendingFileName?: string | null;
  primaryLockConflict?: { pid: number; version: string; exePath: string; reason: string } | null;
  brokenTaskbarPins?: Array<{ shortcutPath: string; fileName: string; version: string; targetPath: string }>;
  exePath: string | null;
  visualTheme?: string;
  boundEmail?: string | null;
  boundTier?: string | null;
  desktopShortcutExists?: boolean;
  startMenuShortcutExists?: boolean;
  isolatedHomeDir?: string | null;
  installerItems?: Array<{ version: string; fileName: string; path: string; sizeBytes?: number; mtimeIso?: string }>;
  stateSnapshots?: Array<{ id: string; product: string; createdAt: string; reason: string; sizeBytes?: number }>;
  vsixExtensions?: Array<{ id: string; fileName: string; version: string; scope: string; path: string; sizeBytes?: number }>;
  detail: string;
  log: string;
  createdAt?: string;
  updated: string;
};

export type ManagedAppReleaseItem = {
  version: string;
  executionId?: string;
  downloadUrl?: string | null;
  archived: boolean;
  fileName: string;
  sizeBytes?: number;
};

export type ManagedAppsResponse = {
  ok: boolean;
  available: boolean;
  error?: string;
  checkedAt?: string;
  rows: ManagedAppRow[];
  releases?: ManagedAppReleaseItem[];
  snapshot?: Record<string, unknown> | null;
};
