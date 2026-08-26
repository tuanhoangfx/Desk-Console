function apiOrigin(): string {
  if (typeof window === "undefined") return "";
  const bridged = String(
    (window as Window & { deskConsole?: { apiOrigin?: string } }).deskConsole?.apiOrigin || "",
  ).trim();
  if (bridged) return bridged;
  if (window.location.protocol === "file:") return "http://127.0.0.1:6010";
  if (window.location.hostname === "127.0.0.1" && window.location.port === "5180") {
    return "http://127.0.0.1:6010";
  }
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
  createdAt: string;
  updatedAt: string;
};

export type CaptureRow = {
  id: string;
  mode: string;
  fileName: string;
  bytes: number;
  createdAt: string;
};

export type RunnerRow = {
  id: string;
  code: string;
  name: string;
  kind: string;
  port: number;
  url: string;
  up: boolean;
};

export type TaskRow = {
  id: string;
  name: string;
  status: string;
  lastRun: string;
  lastResult: string;
  nextRun: string;
};

export type DeskHotkeys = {
  ok: boolean;
  picker: string;
  capture: string;
  labels: { picker: string; capture: string };
  defaults: { picker: string; capture: string; labels: { picker: string; capture: string } };
};

export const deskApi = {
  health: () => req<{ ok: boolean; cursorRunning: boolean }>("/api/health"),
  hotkeys: () => req<DeskHotkeys>("/api/hotkeys"),
  saveHotkeys: (body: { picker?: string; capture?: string }) =>
    req<DeskHotkeys>("/api/hotkeys", { method: "PUT", body: JSON.stringify(body) }),
  resetHotkeys: () => req<DeskHotkeys>("/api/hotkeys/reset", { method: "POST" }),
  clips: async () => ({ rows: rowsOf(await req<{ rows: ClipRow[] }>("/api/clips")) }),
  saveClip: (text?: string) =>
    req<{ row: ClipRow }>("/api/clips", { method: "POST", body: JSON.stringify({ text, source: text ? "manual" : "clipboard" }) }),
  saveSample: (text: string, name?: string) =>
    req<{ row: ClipRow }>("/api/samples", { method: "POST", body: JSON.stringify({ text, name }) }),
  deleteClip: (id: string) => req(`/api/clips/${id}`, { method: "DELETE" }),
  pinClip: (id: string, pinned = true) =>
    req(`/api/clips/${id}/pin`, { method: "POST", body: JSON.stringify({ pinned }) }),
  promoteClip: (id: string) => req<{ row: ClipRow }>(`/api/clips/${id}/sample`, { method: "POST" }),
  copyClip: (id: string) => req(`/api/clips/${id}/copy`, { method: "POST" }),
  pasteClip: (id: string) => req<{ pasted?: boolean }>(`/api/clips/${id}/paste`, { method: "POST" }),
  armPicker: () => req<{ hwnd?: string }>("/api/clips/picker/arm", { method: "POST" }),
  captures: async () => ({ rows: rowsOf(await req<{ rows: CaptureRow[] }>("/api/captures")) }),
  capture: (mode: "screen" | "window" | "region" = "screen") =>
    req<{ row: CaptureRow }>("/api/captures", { method: "POST", body: JSON.stringify({ mode }) }),
  cropCapture: (id: string, box: { x: number; y: number; width: number; height: number }) =>
    req<{ row: CaptureRow }>(`/api/captures/${id}/crop`, { method: "POST", body: JSON.stringify(box) }),
  deleteCapture: (id: string) => req(`/api/captures/${id}`, { method: "DELETE" }),
  captureSrc: (id: string) => `${apiOrigin()}/api/captures/${id}/file`,
  runners: async () => ({ rows: rowsOf(await req<{ rows: RunnerRow[] }>("/api/runners")) }),
  runnerAction: (code: string, mode: "start" | "restart" | "recover") =>
    req(`/api/runners/${encodeURIComponent(code)}/${mode}`, { method: "POST" }),
  tasks: async () => ({ rows: rowsOf(await req<{ rows: TaskRow[] }>("/api/tasks")) }),
  taskAction: (name: string, action: "run" | "enable" | "disable") =>
    req(`/api/tasks/${encodeURIComponent(name)}/${action}`, { method: "POST" }),
  cursorGc: (close = false) => req("/api/cursor/gc", { method: "POST", body: JSON.stringify({ close }) }),
};
