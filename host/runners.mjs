import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { DEV_ROOT, startDetached } from "./windows.mjs";
import { appendTerminalLine, opsConsoleCmd, opsConsoleMeta, opsConsoleOk, terminalLogPath } from "./ops-terminal.mjs";

const require = createRequire(import.meta.url);
const { resolveNodeExe } = require(path.join(DEV_ROOT, "Tool", "scripts", "lib", "win-shell-env.cjs"));

const execFileAsync = promisify(execFile);

const PORTS_PATH = path.join(DEV_ROOT, "Tool", "scripts", "lib", "workspace-ports.json");
const PROBE_MS = 900;
const HTTP_PROBE_MS = 1500;
const CACHE_MS = 6000;
const FLIP_DOWN_STREAK = 3;

let cache = { at: 0, rows: [] };
let inflight = null;
/** @type {Map<string, { up: boolean; failStreak: number }>} */
const probeGate = new Map();

/** Fast Up on first success; Down only after FLIP_DOWN_STREAK consecutive failures (P0003 parity). */
export function stabilizeRunnerProbe(id, probedUp) {
  const key = String(id || "");
  const prev = probeGate.get(key);
  if (!prev) {
    probeGate.set(key, { up: probedUp, failStreak: 0 });
    return probedUp;
  }
  if (probedUp) {
    prev.up = true;
    prev.failStreak = 0;
    return true;
  }
  if (!prev.up) return false;
  prev.failStreak += 1;
  if (prev.failStreak >= FLIP_DOWN_STREAK) {
    prev.up = false;
    prev.failStreak = 0;
  }
  return prev.up;
}

export function loadPorts() {
  return JSON.parse(fs.readFileSync(PORTS_PATH, "utf8"));
}

/** TCP listen probe — first gate before HTTP (Vite may accept socket before route is ready). */
function probePort(port, timeoutMs = PROBE_MS) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port, timeout: timeoutMs });
    const finish = (up) => {
      socket.removeAllListeners();
      try {
        socket.destroy();
      } catch {
        /* ignore */
      }
      resolve(up);
    };
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
    socket.once("timeout", () => finish(false));
  });
}

async function probeHttp(url, timeoutMs = HTTP_PROBE_MS) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, { signal: ctrl.signal, redirect: "manual" });
    clearTimeout(timer);
    return res.status > 0 && res.status < 500;
  } catch {
    return false;
  }
}

async function probeTarget(row) {
  const tcp = await probePort(row.port);
  if (!tcp) return false;
  if (!row.url) return true;
  if (await probeHttp(row.url)) return true;
  return probeHttp(row.url);
}

function runnerMeta(row, doc = loadPorts()) {
  if (row.kind === "worker") {
    const workerKey = String(row.id).replace(/^worker:/, "");
    const w = doc.workers?.[workerKey];
    return {
      toolRoot: w?.toolRoot ?? "",
      stack: "worker",
      probePath: w?.healthPath ?? "/",
      openPath: w?.healthPath ?? "",
    };
  }
  const p = doc.products?.[row.code];
  return {
    toolRoot: p?.root ?? "",
    stack: p?.stack ?? "",
    probePath: p?.probePath ?? "/",
    openPath: p?.openPath ?? "",
  };
}

export function runnerTargets(doc = loadPorts()) {
  const rows = [];
  for (const [code, p] of Object.entries(doc.products || {})) {
    if (p.tier === "storage" || p.tier === "archived") continue;
    const port = Number(p.port);
    if (!port) continue;
    const probePath = p.probePath || "/";
    const url = `http://127.0.0.1:${port}${probePath.startsWith("/") ? probePath : `/${probePath}`}`;
    rows.push({
      id: code,
      code,
      name: p.name || code,
      kind: "ui",
      port,
      url,
    });
  }
  for (const [key, w] of Object.entries(doc.workers || {})) {
    const port = Number(w.port);
    if (!port) continue;
    const health = w.healthPath || "/";
    const url = `http://127.0.0.1:${port}${health.startsWith("/") ? health : `/${health}`}`;
    rows.push({
      id: `worker:${key}`,
      code: w.code || key,
      name: w.label || key,
      kind: "worker",
      port,
      url,
    });
  }
  return rows.sort((a, b) => a.code.localeCompare(b.code) || a.kind.localeCompare(b.kind));
}

async function refreshRunners() {
  const doc = loadPorts();
  const targets = runnerTargets(doc);
  const probed = await Promise.all(targets.map((row) => probeTarget(row)));
  const probedAt = new Date().toISOString();
  const rows = targets.map((row, i) => ({
    ...row,
    ...runnerMeta(row, doc),
    up: stabilizeRunnerProbe(row.id, probed[i]),
    probedAt,
  }));
  cache = { at: Date.now(), rows };
  return rows;
}

export async function listRunners() {
  const now = Date.now();
  if (cache.rows.length && now - cache.at < CACHE_MS) return cache.rows;
  if (inflight) return inflight;
  inflight = refreshRunners().finally(() => {
    inflight = null;
  });
  return inflight;
}

export function resolveRunnerPort(code, doc = loadPorts()) {
  const upper = String(code).toUpperCase();
  const product = doc.products?.[upper];
  if (product?.port) return Number(product.port);
  for (const [key, worker] of Object.entries(doc.workers || {})) {
    const workerCode = String(worker.code || key).toUpperCase();
    if (workerCode === upper) return Number(worker.port);
  }
  return null;
}

export async function stopRunner(code) {
  const upper = String(code).toUpperCase();
  const port = resolveRunnerPort(upper);
  if (!port) return { ok: false, error: "not found" };
  appendTerminalLine(upper, "runner", opsConsoleCmd(`stop-process :${port} ${upper}`));
  try {
    const ps = [
      "$c = Get-NetTCPConnection -LocalPort " + port + " -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1",
      "if ($c) { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue; 'stopped' } else { 'idle' }",
    ].join("; ");
    const { stdout } = await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", ps],
      { windowsHide: true, timeout: 8000 },
    );
    cache = { at: 0, rows: [] };
    return { ok: true, port, state: String(stdout || "").trim() || "stopped" };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function startRunner(code, mode = "start") {
  const upper = String(code).toUpperCase();
  const script = path.join(DEV_ROOT, "Tool", "scripts", "ensure-dev-product.cjs");
  const args = [script, upper];
  if (mode === "recover") {
    const recover = path.join(DEV_ROOT, "Tool", "scripts", "ensure-dev-lean.cjs");
    appendTerminalLine(upper, "runner", opsConsoleCmd(`recover ${upper} via ensure-dev-lean`));
    return startDetached([recover, upper, "--vite-only"]);
  }
  if (mode === "restart") args.push("--force");
  const logFile = terminalLogPath(upper, "runner");
  appendTerminalLine(upper, "runner", opsConsoleCmd(`node Tool/scripts/ensure-dev-product.cjs ${upper}${mode === "restart" ? " --force" : ""}`));
  appendTerminalLine(upper, "runner", opsConsoleOk(`ensure-dev-product ${upper} pid pending`));
  const out = fs.openSync(logFile, "a");
  const nodeExe = resolveNodeExe();
  const child = spawn(nodeExe, args, {
    cwd: DEV_ROOT,
    detached: true,
    stdio: ["ignore", out, out],
    windowsHide: true,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "" },
  });
  child.unref();
  return child.pid;
}
