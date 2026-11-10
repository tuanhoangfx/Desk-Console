#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deskElectronEnv } from "./lib/desk-electron-env.mjs";
import { DESK_VITE_PORT } from "./lib/dev-port-guard.mjs";
import { clearPidFile } from "./lib/dev-desktop-process.mjs";
import { winSpawnOpts } from "./lib/win-spawn.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(root, "package.json"));
const electronBin = require("electron");
const { startHiddenDetachedProcess } = require("../scripts/lib/win-shell-env.cjs");

const killPs = `
$killed = 0
$root = '${root.replace(/\\/g, "\\\\").replace(/'/g, "''")}'
Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | ForEach-Object {
  $n = $_.Name
  $c = [string]$_.CommandLine
  $id = $_.ProcessId
  $hit = $false
  if ($n -eq 'Desk Console.exe') { $hit = $true }
  if ($n -match '^node(w)?\\.exe$' -and $c -and $c -match 'P0001-Desk-Console[\\\\/]host[\\\\/]server\\.mjs') { $hit = $true }
  if ($n -eq 'electron.exe' -and $c) {
    if ($c -match 'desk-console' -or $c -match 'P0001-Desk-Console' -or $c -match 'desk-console-dev') { $hit = $true }
    if ($c -match 'electron\\\\cli\\.js') { $hit = $true }
    # Main often: ...\\electron.exe .  (no product path in argv)
    if ($c -match 'electron\\.exe"?\\s+\\.\\s*$') { $hit = $true }
    if ($root -and $c -match [regex]::Escape(($root -replace '\\\\','\\\\'))) { $hit = $true }
  }
  if ($hit) {
    Stop-Process -Id $id -Force -ErrorAction SilentlyContinue
    $script:killed++
  }
}
$lockDev = Join-Path $env:APPDATA 'desk-console-dev\\lockfile'
$lockProd = Join-Path $env:APPDATA 'desk-console\\lockfile'
foreach ($lock in @($lockDev, $lockProd)) {
  if (Test-Path $lock) { Remove-Item $lock -Force -ErrorAction SilentlyContinue }
}
Write-Output $killed
`;

const r = spawnSync("powershell", ["-NoProfile", "-Command", killPs], {
  encoding: "utf8",
  windowsHide: true,
  timeout: 25000,
});
console.log(`[desk-restart] killed=${String(r.stdout || "").trim()} stderr=${String(r.stderr || "").trim().slice(0, 200)}`);
clearPidFile();
spawnSync(process.execPath, [path.join(root, "scripts", "ensure-dev.cjs")], winSpawnOpts({ cwd: root, stdio: "inherit" }));
spawnSync(process.execPath, ["-e", "setTimeout(()=>{},600)"], winSpawnOpts({ stdio: "ignore" }));

const env = deskElectronEnv({
  VITE_DEV_SERVER_URL: `http://127.0.0.1:${DESK_VITE_PORT}/`,
  DESK_APP_VERSION: require("../package.json").version,
});

const cdpPort = String(process.env.DESK_ELECTRON_CDP_PORT || "9311").trim();
const pidFile = path.join(os.tmpdir(), "p0001-desk-electron-dev.pid");
const pid = startHiddenDetachedProcess({
  command: electronBin,
  args: [`--remote-debugging-port=${cdpPort}`, root],
  cwd: root,
  pidFile,
  env: {
    ...env,
    DEV_DETACH_SHOW_WINDOW: "1",
    DEV_DETACH_VIA_EXPLORER: "1",
  },
});
console.log(`[desk-restart] electron pid=${pid} cdp=http://127.0.0.1:${cdpPort}`);
