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
};

export type TaskRow = {
  id: string;
  name: string;
  status: string;
  lastRun: string;
  lastResult: string;
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

export const deskApi = {
  health: () => req<{ ok: boolean; cursorRunning: boolean }>("/api/health"),
  hotkeys: () => req<DeskHotkeys>("/api/hotkeys"),
  saveHotkeys: (body: { picker?: string }) =>
    req<DeskHotkeys>("/api/hotkeys", { method: "PUT", body: JSON.stringify(body) }),
  resetHotkeys: () => req<DeskHotkeys>("/api/hotkeys/reset", { method: "POST" }),
  clips: async (lifecycle: "live" | "trash" = "live") => ({
    rows: rowsOf(await req<{ rows: ClipRow[] }>(`/api/clips?lifecycle=${lifecycle}`)),
  }),
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
  runners: async () => ({ rows: rowsOf(await req<{ rows: RunnerRow[] }>("/api/runners")) }),
  runnerAction: (code: string, mode: "start" | "restart" | "recover" | "stop") =>
    req(`/api/runners/${encodeURIComponent(code)}/${mode}`, { method: "POST" }),
  tasks: async () => ({ rows: rowsOf(await req<{ rows: TaskRow[] }>("/api/tasks")) }),
  taskAction: (name: string, action: "run" | "enable" | "disable") =>
    req(`/api/tasks/${encodeURIComponent(name)}/${action}`, { method: "POST" }),
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
      syncPlane: "local";
      accountLabel: string;
      stores: string[];
    }>("/api/meta"),
};
