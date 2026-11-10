#!/usr/bin/env node
/** Open Desk Console dev Electron when Vite is up but tray window closed. P0003 parity. */
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { deskElectronEnv } from "./lib/desk-electron-env.mjs";
import { DESK_VITE_PORT, isPortListening, waitForPort } from "./lib/dev-port-guard.mjs";
import { winSpawnOpts } from "./lib/win-spawn.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(root, "package.json"));
const electronBin = require("electron");
const viteBin = path.join(root, "node_modules", "vite", "bin", "vite.js");
const { spawnInteractiveDesktopProcess } = require(path.join(root, "..", "scripts", "lib", "win-shell-env.cjs"));
const replaceRunning = process.argv.includes("--replace");
const env = deskElectronEnv({ VITE_DEV_SERVER_URL: `http://127.0.0.1:${DESK_VITE_PORT}/` });

if (replaceRunning && process.platform === "win32") {
  const killPs = [
    "$pids = New-Object System.Collections.Generic.HashSet[int]",
    "Get-CimInstance Win32_Process -Filter \"Name='electron.exe'\" -ErrorAction SilentlyContinue | ForEach-Object {",
    "  $c = [string]$_.CommandLine",
    "  if ($c -like '*P0001-Desk-Console*' -or $c -like '*desk-console-dev*' -or $c -match 'electron\\.exe\"?\\s+\\.\\s*$') {",
    "    [void]$pids.Add([int]$_.ProcessId)",
    "    if ($_.ParentProcessId -gt 0 -and $c -like '*--type=*') { [void]$pids.Add([int]$_.ParentProcessId) }",
    "  }",
    "}",
    "foreach ($id in $pids) { & taskkill /PID $id /T /F 2>$null | Out-Null }",
    "$lockDev = Join-Path $env:APPDATA 'desk-console-dev\\lockfile'",
    "if (Test-Path $lockDev) { Remove-Item $lockDev -Force -ErrorAction SilentlyContinue }",
    "Start-Sleep -Milliseconds 600",
  ].join("; ");
  spawnSync(
    "powershell",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", killPs],
    winSpawnOpts({ stdio: "ignore" }),
  );
}

if (!(await isPortListening(DESK_VITE_PORT))) {
  console.log(`[open-dev-electron-window] Vite :${DESK_VITE_PORT} not listening — starting Vite dev server...`);
  const viteChild = spawn(
    process.execPath,
    [viteBin, "--host", "127.0.0.1", "--port", String(DESK_VITE_PORT), "--strictPort"],
    winSpawnOpts({ cwd: root, detached: true, stdio: "ignore" }),
  );
  viteChild.unref();
  await waitForPort(DESK_VITE_PORT, 20_000).catch((err) => {
    console.warn(`[open-dev-electron-window] Vite wait warning: ${err.message}`);
  });
}

const winPid = spawnInteractiveDesktopProcess({
  exePath: electronBin,
  args: [root],
  cwd: root,
  env,
});
if (winPid) {
  console.log(`[open-dev-electron-window] spawned interactive winsta0\\default electron pid=${winPid}`);
} else {
  const child = spawn(
    electronBin,
    [root],
    {
      ...winSpawnOpts({
        cwd: root,
        detached: true,
        stdio: "ignore",
        env,
      }),
      windowsHide: false,
    },
  );
  child.unref();
  console.log(`[open-dev-electron-window] spawned electron pid=${child.pid}`);
}
