/** Dev desktop process — pid file + safe kill. P0003 dev-desktop-process parity. */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

import { deskElectronEnv } from "./desk-electron-env.mjs";
import { DESK_HOST_PORT_DEV, DESK_VITE_PORT } from "./dev-port-guard.mjs";
import { winSpawnOpts } from "./win-spawn.mjs";

const require = createRequire(import.meta.url);
const { DEV_DIR } = require("../../electron/lib/user-data-root.cjs");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const PID_FILE = path.join(root, ".dev-desktop.pid");
export const LOG_FILE = path.join(root, ".dev-desktop.log");
const WATCH_PID_FILE = path.join(root, ".dev-desktop-watch.pid");

const DEV_SCRIPT_RE = /dev-node\.mjs|dev-desktop-only\.mjs|dev-desktop-reload\.mjs|dev-stack\.mjs/i;
const ELECTRON_CLI_RE = /electron[/\\]cli\.js/i;
const PRODUCT_ROOT_RE = /P0001-Desk-Console/i;

export function isDeskDevCommandLine(commandLine) {
  const cmd = String(commandLine || "");
  if (!cmd) return false;
  if (PRODUCT_ROOT_RE.test(cmd) && DEV_SCRIPT_RE.test(cmd)) return true;
  if (ELECTRON_CLI_RE.test(cmd) && /\s\.\s*$/.test(cmd.trim())) return true;
  return false;
}

export function isDeskDevElectronProcess(commandLine) {
  const cmd = String(commandLine || "");
  if (!cmd) return false;
  return /electron\.exe/i.test(cmd) && new RegExp(DEV_DIR, "i").test(cmd);
}

export function readDevPid() {
  try {
    const n = Number(fs.readFileSync(PID_FILE, "utf8").trim());
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export function isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readProcessCommandLine(pid) {
  if (process.platform !== "win32") return "";
  const result = spawnSync(
    "powershell",
    [
      "-NoProfile",
      "-Command",
      `(Get-CimInstance Win32_Process -Filter 'ProcessId=${pid}' -ErrorAction SilentlyContinue).CommandLine`,
    ],
    winSpawnOpts({ encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }),
  );
  return String(result.stdout || "").trim();
}

export function isDeskDevPid(pid) {
  if (!pid || !isPidAlive(pid)) return false;
  const cmd = readProcessCommandLine(pid);
  if (cmd) return isDeskDevCommandLine(cmd) || isDeskDevElectronProcess(cmd);
  return false;
}

export function isDeskDevRunning() {
  const pid = readDevPid();
  return Boolean(pid && isDeskDevPid(pid));
}

export function clearPidFile() {
  try {
    fs.unlinkSync(PID_FILE);
  } catch {
    /* ignore */
  }
}

function killWatchBuild() {
  try {
    const pid = Number(fs.readFileSync(WATCH_PID_FILE, "utf8").trim());
    if (Number.isFinite(pid) && pid > 0 && isPidAlive(pid)) {
      if (process.platform === "win32") {
        spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], winSpawnOpts({ stdio: "ignore" }));
      } else {
        process.kill(pid, "SIGTERM");
      }
    }
  } catch {
    /* ignore */
  }
  try {
    fs.unlinkSync(WATCH_PID_FILE);
  } catch {
    /* ignore */
  }
}

function killOrphanDevElectron() {
  if (process.platform !== "win32") return;
  spawnSync(
    "powershell",
    [
      "-NoProfile",
      "-Command",
      [
        "$procs = Get-CimInstance Win32_Process -Filter \"Name='electron.exe'\" -ErrorAction SilentlyContinue",
        `| Where-Object { $_.CommandLine -match '${DEV_DIR}' }`,
        "foreach ($p in $procs) { Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue }",
      ].join(" "),
    ],
    winSpawnOpts({ stdio: "ignore" }),
  );
}

export function killDeskDev() {
  const pid = readDevPid();
  if (pid && isDeskDevPid(pid)) {
    try {
      if (process.platform === "win32") {
        spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], winSpawnOpts({ stdio: "ignore" }));
      } else {
        process.kill(pid, "SIGTERM");
      }
    } catch {
      /* ignore */
    }
  } else if (pid) {
    console.warn(`[desk-dev] skip taskkill PID ${pid} — not a Desk dev orchestrator`);
  }
  clearPidFile();
  killOrphanDevElectron();
  killWatchBuild();
}

export function startDevDetached() {
  const logFd = fs.openSync(LOG_FILE, "a");
  fs.writeFileSync(LOG_FILE, `\n--- dev start ${new Date().toISOString()} ---\n`, { flag: "a" });
  const child = spawn(process.execPath, [path.join(root, "scripts", "dev-node.mjs")], winSpawnOpts({
    cwd: root,
    detached: true,
    stdio: ["ignore", logFd, logFd],
    env: deskElectronEnv({ DESK_DEV_LOG: "1" }),
  }));
  child.unref();
  fs.writeFileSync(PID_FILE, String(child.pid));
  return child.pid;
}

export function focusDeskWindow() {
  if (process.platform !== "win32") return;
  if (process.env.DESK_DEV_NO_FOCUS === "1") return;
  spawnSync(
    "powershell",
    [
      "-NoProfile",
      "-Command",
      [
        "$p = Get-Process electron -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -match 'Desk Console' } | Select-Object -First 1",
        "if ($p -and $p.MainWindowHandle -ne 0) {",
        "  Add-Type 'using System; using System.Runtime.InteropServices; public class W { [DllImport(\"user32.dll\")] public static extern bool SetForegroundWindow(IntPtr h); }'",
        "  [void][W]::SetForegroundWindow($p.MainWindowHandle)",
        "}",
      ].join(" "),
    ],
    winSpawnOpts({ stdio: "ignore" }),
  );
}

export { DESK_VITE_PORT, DESK_HOST_PORT_DEV };
