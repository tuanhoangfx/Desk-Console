import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { DEV_ROOT, startDetached } from "./windows.mjs";
import { appendTerminalLine, terminalLogPath } from "./ops-terminal.mjs";

const execFileAsync = promisify(execFile);

const PORTS_PATH = path.join(DEV_ROOT, "Tool", "scripts", "lib", "workspace-ports.json");
const PROBE_MS = 350;
const CACHE_MS = 4000;

let cache = { at: 0, rows: [] };
let inflight = null;

export function loadPorts() {
  return JSON.parse(fs.readFileSync(PORTS_PATH, "utf8"));
}

function probe(url, timeoutMs = PROBE_MS) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      res.resume();
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
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
  const targets = runnerTargets();
  const ups = await Promise.all(targets.map((row) => probe(row.url)));
  const rows = targets.map((row, i) => ({ ...row, up: ups[i] }));
  cache = { at: Date.now(), rows };
  return rows;
}

export async function listRunners() {
  if (cache.rows.length && Date.now() - cache.at < CACHE_MS) return cache.rows;
  if (inflight) return cache.rows.length ? cache.rows : inflight;
  inflight = refreshRunners().finally(() => {
    inflight = null;
  });
  if (cache.rows.length) return cache.rows;
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
  appendTerminalLine(upper, "runner", `stop ${upper} :${port}`);
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
    appendTerminalLine(upper, "runner", `recover ${upper} via ensure-dev-lean`);
    return startDetached([recover, upper, "--vite-only"]);
  }
  if (mode === "restart") args.push("--force");
  const logFile = terminalLogPath(upper, "runner");
  appendTerminalLine(upper, "runner", `${mode} ${upper} → ensure-dev-product`);
  const out = fs.openSync(logFile, "a");
  const child = spawn(process.execPath, args, {
    cwd: DEV_ROOT,
    detached: true,
    stdio: ["ignore", out, out],
    windowsHide: true,
  });
  child.unref();
  return child.pid;
}
