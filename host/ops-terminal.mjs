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

/** Host log SSOT — prefixes match hub-ui hubConsoleCmd/Ok/Meta. */
export function opsConsoleCmd(text) {
  return `$ ${String(text || "").trim()}`;
}

export function opsConsoleOk(text) {
  return `→ ${String(text || "").trim()}`;
}

export function opsConsoleMeta(text) {
  return `[spawn] ${String(text || "").trim()}`;
}

export function appendTerminalLine(targetId, kind, line) {
  const file = terminalLogPath(targetId, kind);
  const stamp = new Date().toISOString();
  const text = String(line || "").trimEnd();
  fs.appendFileSync(file, `[${stamp}] ${text}\n`, "utf8");
  return file;
}

export function appendTerminalLines(targetId, kind, lines) {
  for (const line of lines) {
    if (String(line || "").trim()) appendTerminalLine(targetId, kind, line);
  }
}

/** Schtasks /Run stdout+stderr → task terminal log (CRT normalize on read). */
export function appendTaskSchtasksOutput(taskName, stdout, stderr) {
  const name = String(taskName || "").replace(/^\\/, "");
  if (!name) return;
  const chunks = [...String(stdout || "").split(/\r?\n/), ...String(stderr || "").split(/\r?\n/)]
    .map((line) => line.trim())
    .filter(Boolean);
  for (const line of chunks) {
    const body = /^(SUCCESS|INFO):/i.test(line) ? opsConsoleOk(line) : opsConsoleMeta(line);
    appendTerminalLine(name, "task", body);
  }
}

/** After schtasks /Run — poll status + optional task log tail into terminal log. */
export function pollTaskTerminalFeedback(taskName) {
  const name = String(taskName || "").replace(/^\\/, "");
  if (!name) return;
  void (async () => {
    const { queryNamedTask } = await import("./windows.mjs");
    const { resolveOpsLogPath } = await import("./ops-log-paths.mjs");
    appendTerminalLine(name, "task", opsConsoleMeta(`poll schtasks status for ${name}`));
    let logOffset = 0;
    const logFile = resolveOpsLogPath(name, "task");
    if (fs.existsSync(logFile)) {
      try {
        logOffset = fs.statSync(logFile).size;
      } catch {
        logOffset = 0;
      }
    }
    for (const waitMs of [1500, 4000, 10000, 25000]) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      try {
        const row = await queryNamedTask(name);
        if (!row) continue;
        appendTerminalLine(
          name,
          "task",
          opsConsoleOk(`schtasks status=${row.status || "—"} lastResult=${row.lastResult || "—"} lastRun=${row.lastRun || "—"}`),
        );
        const code = String(row.lastResult || "").trim();
        if (fs.existsSync(logFile)) {
          try {
            const stat = fs.statSync(logFile);
            if (stat.size > logOffset) {
              const chunk = fs.readFileSync(logFile, "utf8").slice(logOffset);
              logOffset = stat.size;
              for (const line of chunk.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)) {
                appendTerminalLine(name, "task", line);
              }
            }
          } catch {
            /* ignore tail read */
          }
        }
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
