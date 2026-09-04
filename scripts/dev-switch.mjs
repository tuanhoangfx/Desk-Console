#!/usr/bin/env node
/**
 * Switch from packaged Desk Console → dev stack.
 * Packaged (incl. known-good) owns Ctrl+Shift+Q until quit — UI changes stay invisible otherwise.
 */
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { killDeskDev } from "./lib/dev-desktop-process.mjs";
import { winSpawnOpts } from "./lib/win-spawn.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function closePackagedDesk() {
  if (process.platform !== "win32") return 0;
  const ps = `
$killed = 0
$procs = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
  $_.Name -eq 'Desk Console.exe' -or
  ($_.CommandLine -and $_.CommandLine -match 'Desk Console\\.exe' -and $_.CommandLine -notmatch 'node_modules\\\\electron')
}
foreach ($p in $procs) {
  $cmd = [string]$p.CommandLine
  $isDev = $cmd -match 'desk-console-dev|electron\\\\cli\\.js|P0001-Desk-Console\\\\electron'
  if ($isDev) { continue }
  Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
  $killed++
}
Write-Output $killed
`;
  const r = spawnSync("powershell", ["-NoProfile", "-Command", ps], {
    encoding: "utf8",
    windowsHide: true,
    timeout: 20000,
  });
  return Number(String(r.stdout || "0").trim().split(/\r?\n/).pop()) || 0;
}

console.log("[dev-switch] closing packaged Desk Console (known-good / NSIS)…");
const closed = closePackagedDesk();
if (closed > 0) console.log(`[dev-switch] closed ${closed} packaged process(es)`);
else console.log("[dev-switch] no packaged Desk Console.exe found");

killDeskDev();
spawnSync(process.execPath, ["-e", "setTimeout(()=>{},1500)"], winSpawnOpts({ stdio: "ignore" }));

console.log("[dev-switch] starting pnpm-parity stack (host :6011 + Vite :5180 + Electron)…");
const child = spawn(process.execPath, [path.join(root, "scripts", "dev-node.mjs")], winSpawnOpts({
  cwd: root,
  stdio: "inherit",
  detached: false,
}));
child.on("exit", (code) => process.exit(code ?? 0));
