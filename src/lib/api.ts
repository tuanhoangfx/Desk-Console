function apiOrigin(): string {
  if (typeof window === "undefined") return "";
  const bridged = String(
    (window as Window & { deskConsole?: { apiOrigin?: string } }).deskConsole?.apiOrigin || "",
  ).trim();
  if (bridged) return bridged;
  if (window.location.protocol === "file:") return "http://127.0.0.1:6010";
  // Vite dev — same-origin `/api` proxy (host/server.mjs).
  return "";
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${apiOrigin()}${path}`, {
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

export type RunnerRow = {
  id: string;
  code: string;
  name: string;
  kind: string;
  port: number;
  url: string;
  up: boolean;
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
  pid?: number;
};

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

export type PcOptimizeAction = "all" | "trim-ram" | "clean-smoke" | "prune-junk" | "sweep-antigravity";

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
  };
  diagnostics: PcDiagnosticsPayload;
};

function mergeOpsRows(runners: RunnerRow[], tasks: TaskRow[]): OpsRow[] {
  const taskRows: OpsRow[] = tasks.map((row) => ({
    id: `task:${row.id}`,
    kind: "task",
    targetId: row.id,
    name: row.name,
    status: row.status || "—",
    detail: `last ${row.lastResult || "—"}`,
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
    updated: row.url,
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
  health: () => req<{ ok: boolean; cursorRunning: boolean }>("/api/health"),
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
  runnerAction: (code: string, mode: "start" | "restart" | "recover" | "stop") =>
    req(`/api/runners/${encodeURIComponent(code)}/${mode}`, { method: "POST" }),
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
  telemetryHistory: () =>
    req<{ ok: boolean; rows: TelemetryHistoryPoint[] }>("/api/telemetry/history").then((r) => rowsOf(r)),
  pcDiagnostics: () =>
    req<PcDiagnosticsPayload>("/api/pc/diagnostics", { signal: AbortSignal.timeout(25000) }),
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
};
