import { listRunners } from "./runners.mjs";
import { listDevTasks } from "./windows.mjs";

export async function listOpsRows() {
  const [tasks, runners] = await Promise.all([listDevTasks(), listRunners()]);
  const taskRows = tasks.map((row) => ({
    id: `task:${row.id}`,
    kind: "task",
    targetId: row.id,
    name: row.name,
    status: row.status || "—",
    detail: `last ${row.lastResult || "—"}`,
    updated: row.lastRun || row.nextRun || "",
    lastRun: row.lastRun || "",
    lastResult: row.lastResult || "",
    nextRun: row.nextRun || "",
    up: undefined,
    port: undefined,
    url: undefined,
    code: undefined,
  }));
  const runnerRows = runners.map((row) => ({
    id: `runner:${row.id}`,
    kind: "runner",
    targetId: row.id,
    code: row.code,
    name: `${row.code} · ${row.name}`,
    status: row.up ? "Up" : "Down",
    detail: `${row.kind} :${row.port}`,
    updated: row.url,
    lastRun: "",
    lastResult: "",
    nextRun: "",
    up: row.up,
    port: row.port,
    url: row.url,
  }));
  return [...taskRows, ...runnerRows].sort((a, b) => a.name.localeCompare(b.name));
}

export function parseOpsRef(ref) {
  const raw = String(ref || "");
  if (raw.startsWith("task:")) return { kind: "task", targetId: raw.slice(5) };
  if (raw.startsWith("runner:")) return { kind: "runner", targetId: raw.slice(7) };
  if (/^Dev-/i.test(raw)) return { kind: "task", targetId: raw };
  return { kind: "runner", targetId: raw };
}
