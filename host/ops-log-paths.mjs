import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { appendTerminalLine, listProductDevLogCandidates, terminalLogPath } from "./ops-terminal.mjs";

const TEMP = os.tmpdir();

/** SSOT map: ops target id → log file (hidden nodew / schtasks output). */
const TASK_LOGS = [
  { test: /cursor.*(prune|storage|purge)/i, file: "cursor-chat-auto-prune.log" },
  { test: /home-server-external-probe/i, file: "home-server-external-probe.log" },
  { test: /supabase-phase-d/i, file: "supabase-phase-d-reminder.log" },
  { test: /supabase-staging/i, file: "supabase-staging-snak.log" },
  { test: /desk-console-host/i, file: "desk-console-host.log" },
  { test: /vite-memory-gate/i, file: "vite-memory-gate.log" },
];

function runnerCode(id) {
  const raw = String(id || "");
  if (raw.startsWith("worker:")) return raw.slice(7).toUpperCase();
  return raw.toUpperCase();
}

function legacyLogPath(targetId, kind) {
  const id = String(targetId || "");
  if (kind === "task") {
    const name = id.replace(/^\\/, "");
    for (const row of TASK_LOGS) {
      if (row.test.test(name)) return path.join(TEMP, row.file);
    }
    return path.join(TEMP, `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.log`);
  }
  if (kind === "runner") {
    const code = runnerCode(id);
    return [
      path.join(TEMP, `ensure-dev-${code}.log`),
      path.join(TEMP, `vite-${code.toLowerCase()}.log`),
      path.join(TEMP, `${code.toLowerCase()}-dev.log`),
      ...listProductDevLogCandidates(code),
    ];
  }
  return [];
}

export function resolveOpsLogPath(targetId, kind) {
  const live = terminalLogPath(targetId, kind);
  if (fs.existsSync(live)) return live;
  const legacy = legacyLogPath(targetId, kind);
  if (Array.isArray(legacy)) {
    for (const file of legacy) {
      if (fs.existsSync(file)) return file;
    }
    return legacy[0] || live;
  }
  if (legacy && fs.existsSync(legacy)) return legacy;
  return live;
}

export function resolveOpsLogSources(targetId, kind) {
  const seen = new Set();
  const files = [];
  const push = (file) => {
    const key = path.resolve(String(file || ""));
    if (!key || seen.has(key)) return;
    seen.add(key);
    files.push(key);
  };
  push(terminalLogPath(targetId, kind));
  const legacy = legacyLogPath(targetId, kind);
  if (Array.isArray(legacy)) legacy.forEach(push);
  else push(legacy);
  return files;
}

export function tailLogFile(filePath, maxLines = 200) {
  const file = String(filePath || "");
  if (!file || !fs.existsSync(file)) {
    return { path: file, exists: false, lines: [] };
  }
  try {
    const raw = fs.readFileSync(file, "utf8");
    const lines = raw.split(/\r?\n/).filter((line) => line.length > 0);
    return { path: file, exists: true, lines: lines.slice(-maxLines) };
  } catch {
    return { path: file, exists: false, lines: [] };
  }
}

export function tailOpsTerminal(targetId, kind, maxLines = 300) {
  const sources = resolveOpsLogSources(targetId, kind);
  const merged = [];
  for (const file of sources) {
    const tail = tailLogFile(file, maxLines);
    if (tail.lines.length) merged.push(...tail.lines);
  }
  const lines = merged.slice(-maxLines);
  const primary = sources.find((f) => fs.existsSync(f)) || sources[0] || "";
  return { path: primary, exists: lines.length > 0 || Boolean(primary && fs.existsSync(primary)), lines, sources };
}

export function logLinesToConsoleEntries(lines, channel = "ops") {
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const iso = line.match(/^\[([0-9]{4}-[0-9]{2}-[0-9]{2}T[^\]]+)\]/)?.[1];
    const level = /\berror\b|failed|ENOENT/i.test(line) ? "error" : /\bwarn\b/i.test(line) ? "warn" : "info";
    out.push({
      id: `log-${i}-${line.slice(0, 24)}`,
      at: iso || new Date().toISOString(),
      level,
      channel,
      message: line,
    });
  }
  return out;
}

export { appendTerminalLine };
