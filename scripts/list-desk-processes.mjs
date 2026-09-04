#!/usr/bin/env node
/** List / kill packaged Desk Console processes (avoid PowerShell $ stripping in agent shell). */
import { spawnSync } from "node:child_process";

const mode = process.argv[2] || "list";

const ps = `
$procs = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
  Where-Object {
    $_.Name -match '^(electron|Desk Console|desk-console)\\.exe$' -or
    ($_.CommandLine -and $_.CommandLine -match 'Desk-Console|desk-console|Desk Console')
  }
$n = 0
foreach ($p in $procs) {
  $line = ($p.CommandLine -replace '\\s+', ' ').Substring(0, [Math]::Min(180, ($p.CommandLine -replace '\\s+', ' ').Length))
  Write-Output ("PID=" + $p.ProcessId + " NAME=" + $p.Name + " CMD=" + $line)
  if ($env:DESK_KILL -eq '1') {
    $isDev = $p.CommandLine -match 'desk-console-dev|P0001-Desk-Console|electron\\\\cli\\.js'
    $isPackaged = $p.Name -eq 'Desk Console.exe' -or ($p.CommandLine -match 'Desk Console.exe|\\\\Desk Console\\\\|app\\.asar' -and $p.CommandLine -notmatch 'node_modules\\\\electron')
    if ($isPackaged -and -not $isDev) {
      Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
      $n++
    }
  }
}
Write-Output ("killed=" + $n)
`;

const env = { ...process.env };
if (mode === "kill") env.DESK_KILL = "1";

const r = spawnSync("powershell", ["-NoProfile", "-Command", ps], {
  encoding: "utf8",
  windowsHide: true,
  env,
  timeout: 20000,
});
process.stdout.write(r.stdout || "");
process.stderr.write(r.stderr || "");
process.exit(r.status ?? 1);
