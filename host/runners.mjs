import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { DEV_ROOT } from "./windows.mjs";
import { dataRoot } from "./store.mjs";
import { appendOpsHistory } from "./ops-history.mjs";
import {
  appendTerminalLine,
  opsConsoleCmd,
  opsConsoleErr,
  opsConsoleOk,
  terminalLogPath,
} from "./ops-terminal.mjs";

const require = createRequire(import.meta.url);
function getResolveNodeExe() {
  try {
    const winShellPath = path.join(DEV_ROOT, "Tool", "scripts", "lib", "win-shell-env.cjs");
    if (fs.existsSync(winShellPath)) {
      const { resolveNodeExe } = require(winShellPath);
      if (typeof resolveNodeExe === "function") return resolveNodeExe;
    }
  } catch {
    /* ignore */
  }
  return () => process.execPath;
}
const resolveNodeExe = getResolveNodeExe();

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
/** Last start/restart spawn outcome — UI clears Starting when exit ≠ 0. */
/** @type {Map<string, { pid: number; startedAt: number; exitedAt?: number; exitCode?: number | null }>} */
const startOutcome = new Map();
/** @type {Map<string, number>} */
const lastWatchdogHealAt = new Map();
const WATCHDOG_COOLDOWN_MS = 45_000;
const DEFAULT_PINNED_RUNNERS = ["P0002", "P0004", "P0016", "P0020"];

function watchdogStatePath() {
  return path.join(dataRoot(), "runner-watchdog.json");
}

export function readRunnerWatchdogState() {
  const file = watchdogStatePath();
  try {
    if (fs.existsSync(file)) {
      const raw = JSON.parse(fs.readFileSync(file, "utf8"));
      const pinned = Array.isArray(raw?.pinned)
        ? [...new Set(raw.pinned.map((c) => String(c || "").trim().toUpperCase()).filter(Boolean))]
        : DEFAULT_PINNED_RUNNERS;
      return {
        enabled: raw?.enabled !== false,
        pinned,
        lastTickAt: raw?.lastTickAt || null,
        lastHealed: Array.isArray(raw?.lastHealed) ? raw.lastHealed : [],
      };
    }
  } catch {
    /* ignore */
  }
  return {
    enabled: true,
    pinned: [...DEFAULT_PINNED_RUNNERS],
    lastTickAt: null,
    lastHealed: [],
  };
}

export function writeRunnerWatchdogState(patch = {}) {
  const curr = readRunnerWatchdogState();
  const next = {
    enabled: typeof patch.enabled === "boolean" ? patch.enabled : curr.enabled,
    pinned: Array.isArray(patch.pinned)
      ? [...new Set(patch.pinned.map((c) => String(c || "").trim().toUpperCase()).filter(Boolean))]
      : curr.pinned,
    lastTickAt: patch.lastTickAt !== undefined ? patch.lastTickAt : curr.lastTickAt,
    lastHealed: Array.isArray(patch.lastHealed) ? patch.lastHealed : curr.lastHealed,
  };
  try {
    const file = watchdogStatePath();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  } catch {
    /* ignore */
  }
  return next;
}

export function setRunnerWatchdogPinned(code, pinned = true) {
  const upper = String(code || "").trim().toUpperCase();
  if (!upper) return readRunnerWatchdogState();
  const curr = readRunnerWatchdogState();
  const set = new Set(curr.pinned);
  if (pinned) set.add(upper);
  else set.delete(upper);
  cache = { at: 0, rows: [] };
  return writeRunnerWatchdogState({ pinned: [...set] });
}

export function setRunnerWatchdogEnabled(enabled) {
  return writeRunnerWatchdogState({ enabled: Boolean(enabled) });
}

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
  try {
    if (fs.existsSync(PORTS_PATH)) {
      return JSON.parse(fs.readFileSync(PORTS_PATH, "utf8"));
    }
  } catch {
    /* ignore */
  }
  return { products: {}, workers: {} };
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
  const pinnedSet = new Set(readRunnerWatchdogState().pinned);
  const rows = targets.map((row, i) => {
    const upperCode = String(row.code).toUpperCase();
    const outcome = startOutcome.get(upperCode) || startOutcome.get(String(row.id).toUpperCase());
    return {
      ...row,
      ...runnerMeta(row, doc),
      up: stabilizeRunnerProbe(row.id, probed[i]),
      pinned: pinnedSet.has(upperCode),
      probedAt,
      startPid: outcome?.pid,
      startStartedAt: outcome?.startedAt,
      startExitedAt: outcome?.exitedAt,
      startExitCode: outcome?.exitCode,
    };
  });
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
  setRunnerWatchdogPinned(upper, false);
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
  if (mode === "start" || mode === "restart") {
    setRunnerWatchdogPinned(upper, true);
  }
  const lean = path.join(DEV_ROOT, "Tool", "scripts", "ensure-dev-lean.cjs");
  /** Desk Start = vite-only: never cascade dependsOn (P0005→P0016 audit can fail the whole tree). */
  const args = [lean, upper, "--vite-only"];
  if (mode === "recover") {
    appendTerminalLine(upper, "runner", opsConsoleCmd(`recover ${upper} via ensure-dev-lean --vite-only`));
  } else if (mode === "restart") {
    args.push("--force");
    appendTerminalLine(upper, "runner", opsConsoleCmd(`ensure-dev-lean ${upper} --vite-only --force`));
  } else {
    appendTerminalLine(upper, "runner", opsConsoleCmd(`ensure-dev-lean ${upper} --vite-only`));
  }
  const logFile = terminalLogPath(upper, "runner");
  appendTerminalLine(upper, "runner", opsConsoleOk(`ensure-dev-lean ${upper} pid pending`));
  const out = fs.openSync(logFile, "a");
  const nodeExe = resolveNodeExe();
  const startedAt = Date.now();
  const child = spawn(nodeExe, args, {
    cwd: DEV_ROOT,
    detached: true,
    stdio: ["ignore", out, out],
    windowsHide: true,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "" },
  });
  child.unref();
  const pid = child.pid;
  startOutcome.set(upper, { pid, startedAt });
  cache = { at: 0, rows: [] };
  child.on("exit", (exitCode, signal) => {
    const codeNum = exitCode == null && signal ? 2048 : exitCode;
    const prev = startOutcome.get(upper) || { pid, startedAt };
    startOutcome.set(upper, {
      ...prev,
      exitedAt: Date.now(),
      exitCode: codeNum,
    });
    cache = { at: 0, rows: [] };
    if (codeNum && codeNum !== 0) {
      appendTerminalLine(upper, "runner", opsConsoleErr(`Runner [${upper}] start error: ${codeNum}`));
      appendOpsHistory({
        kind: "runner",
        targetId: upper,
        action: mode,
        ok: false,
        message: `Runner [${upper}] start error ${codeNum}`,
        pid,
        exitCode: codeNum,
      });
    } else {
      // ensure-dev-lean parent exits 0 after Vite detach — runner stays Up; not a crash.
      appendTerminalLine(
        upper,
        "runner",
        opsConsoleOk(`${mode} ${upper} ensure detached (Vite stays up)`),
      );
    }
  });
  child.on("error", (err) => {
    const message = err instanceof Error ? err.message : String(err);
    startOutcome.set(upper, { pid: pid || 0, startedAt, exitedAt: Date.now(), exitCode: 2048 });
    cache = { at: 0, rows: [] };
    appendTerminalLine(upper, "runner", opsConsoleErr(`Runner [${upper}] start error: 2048 (${message})`));
    appendOpsHistory({
      kind: "runner",
      targetId: upper,
      action: mode,
      ok: false,
      message: `Runner [${upper}] start error 2048`,
      pid,
      exitCode: 2048,
    });
  });
  return pid;
}

let watchdogInflight = null;
/** @type {Map<string, number>} */
const watchdogHungStreak = new Map();

export async function runRunnerWatchdogTick(opts = {}) {
  if (watchdogInflight) return watchdogInflight;
  watchdogInflight = (async () => {
    const state = readRunnerWatchdogState();
    const now = Date.now();
    const tickIso = new Date(now).toISOString();
    if (!state.enabled || !fs.existsSync(PORTS_PATH)) {
      return { ok: true, skipped: true, state };
    }
    const doc = loadPorts();
    const targets = runnerTargets(doc);
    const byCode = new Map(targets.filter((r) => r.kind === "ui").map((r) => [String(r.code).toUpperCase(), r]));
    const healed = [];
    const checked = [];

    for (const rawCode of state.pinned) {
      const code = String(rawCode || "").trim().toUpperCase();
      const target = byCode.get(code);
      if (!target) continue;
      const tcpUp = await probePort(target.port);
      const httpUp = tcpUp ? (target.url ? await probeHttp(target.url, 4000) : true) : false;
      checked.push({ code, port: target.port, up: httpUp, tcpUp });
      if (httpUp) {
        watchdogHungStreak.set(code, 0);
        continue;
      }

      const outcome = startOutcome.get(code);
      const startingRecently =
        outcome && outcome.startedAt && !outcome.exitedAt && now - outcome.startedAt < WATCHDOG_COOLDOWN_MS;
      const healedRecently =
        !opts.force && lastWatchdogHealAt.has(code) && now - lastWatchdogHealAt.get(code) < WATCHDOG_COOLDOWN_MS;
      if (startingRecently || healedRecently) continue;

      if (tcpUp) {
        const streak = (watchdogHungStreak.get(code) || 0) + 1;
        watchdogHungStreak.set(code, streak);
        if (!opts.force && streak < 2) continue;
      }
      watchdogHungStreak.set(code, 0);
      lastWatchdogHealAt.set(code, now);
      const mode = tcpUp ? "restart" : "recover";
      const pid = startRunner(code, mode);
      const entry = { code, port: target.port, mode, pid, healedAt: tickIso };
      healed.push(entry);
      appendOpsHistory({
        kind: "runner",
        targetId: code,
        action: mode,
        ok: true,
        message: `Watchdog auto-${mode === "restart" ? "restarted hung" : "recovered"} ${code} (:${target.port})`,
        pid,
      });
    }

    const nextState = writeRunnerWatchdogState({
      lastTickAt: tickIso,
      lastHealed: healed.length ? healed : state.lastHealed,
    });
    return { ok: true, skipped: false, checked, healed, state: nextState };
  })().finally(() => {
    watchdogInflight = null;
  });
  return watchdogInflight;
}

let watchdogTimer = null;

export function startRunnerWatchdog(intervalMs = 30_000) {
  if (watchdogTimer) return watchdogTimer;
  if (!fs.existsSync(PORTS_PATH)) return null;
  const firstTimer = setTimeout(() => {
    runRunnerWatchdogTick().catch(() => undefined);
  }, 5_000);
  if (typeof firstTimer.unref === "function") firstTimer.unref();
  watchdogTimer = setInterval(() => {
    runRunnerWatchdogTick().catch(() => undefined);
  }, intervalMs);
  if (typeof watchdogTimer.unref === "function") watchdogTimer.unref();
  return watchdogTimer;
}
