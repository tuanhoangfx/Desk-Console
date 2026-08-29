import fs from "node:fs";
import path from "node:path";
import { dataRoot } from "./store.mjs";
import { DEV_ROOT } from "./windows.mjs";

function safeId(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function terminalsDir() {
  const dir = path.join(dataRoot(), "terminals");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Live terminal log per ops target — append on Start/Run from Desk host. */
export function terminalLogPath(targetId, kind = "task") {
  const id = safeId(targetId);
  return path.join(terminalsDir(), `${kind}-${id}.log`);
}

export function appendTerminalLine(targetId, kind, line) {
  const file = terminalLogPath(targetId, kind);
  const stamp = new Date().toISOString();
  const text = String(line || "").trimEnd();
  fs.appendFileSync(file, `[${stamp}] ${text}\n`, "utf8");
  return file;
}

/** After schtasks /Run — poll status into terminal log (proposal 1). */
export function pollTaskTerminalFeedback(taskName) {
  const name = String(taskName || "").replace(/^\\/, "");
  if (!name) return;
  void (async () => {
    const { queryNamedTask } = await import("./windows.mjs");
    for (const waitMs of [1500, 4000, 10000, 25000]) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      try {
        const row = await queryNamedTask(name);
        if (!row) continue;
        appendTerminalLine(
          name,
          "task",
          `schtasks status=${row.status || "—"} lastResult=${row.lastResult || "—"} lastRun=${row.lastRun || "—"}`,
        );
        const code = String(row.lastResult || "").trim();
        if (code && code !== "267009" && code !== "267014") break;
      } catch {
        /* retry */
      }
    }
  })();
}

export function listProductDevLogCandidates(code) {
  const upper = String(code || "").toUpperCase();
  if (!upper) return [];
  const toolRoot = path.join(DEV_ROOT, "Tool");
  const rows = [];
  try {
    for (const entry of fs.readdirSync(toolRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (!entry.name.toUpperCase().startsWith(upper)) continue;
      const base = path.join(toolRoot, entry.name);
      for (const name of [".dev-vite.log", ".dev-worker.log", "dev-terminal.log"]) {
        rows.push(path.join(base, name));
      }
    }
  } catch {
    /* ignore */
  }
  return rows;
}
