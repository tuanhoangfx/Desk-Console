#!/usr/bin/env node
/**
 * Reload Desk Console desktop (Zero-Shell-Kill hot-patch by default).
 * - Unless `--restart` / `--packaged`, first tries `desk-console-dev/desktop-control.json` (or `:6011/api/system/hot-reload`) without killing Dev Electron.
 * - If packaged `Desk Console.exe` is running (or `--hot-patch` / `--packaged`), delegates to `desktop-exe-ssot.mjs --code P0001 --action hot-patch`.
 * - Falls back to `killDeskDev()` + `startDevDetached()` only when `--restart` is passed or no control bridge is active.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { forwardHotReloadToDesktopControl } from "../electron/lib/desktop-runtime-bridge.mjs";
import { isProcessImageAlive } from "../../scripts/lib/desktop-exe-products.mjs";
import { killDeskDev, startDevDetached } from "./lib/dev-desktop-process.mjs";
import { winSpawnOpts } from "./lib/win-spawn.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const forceRestart = args.includes("--restart");
const skipBuild = args.includes("--skip-build");
const forcePackaged = args.includes("--packaged") || args.includes("--hot-patch");

function run(scriptPath, scriptArgs = []) {
  const result = spawnSync(
    process.execPath,
    [scriptPath, ...scriptArgs],
    winSpawnOpts({ cwd: root, stdio: "inherit" }),
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (!forceRestart && !forcePackaged) {
  const appData = process.env.APPDATA || "";
  const devControlRes = appData
    ? await forwardHotReloadToDesktopControl({
        userDataDir: path.join(appData, "desk-console-dev"),
        body: { force: true, reloadUi: true, reloadHost: true },
      })
    : { ok: false };
  if (devControlRes?.ok) {
    console.log(`[dev-desktop-reload] zero-kill dev hot-reload OK: ${JSON.stringify(devControlRes)}`);
    process.exit(0);
  }
}

if (!forceRestart && (forcePackaged || isProcessImageAlive("Desk Console.exe"))) {
  const ssotScript = path.resolve(root, "..", "scripts", "desktop-exe-ssot.mjs");
  const hpArgs = ["--code", "P0001", "--action", "hot-patch"];
  if (skipBuild) hpArgs.push("--skip-build");
  console.log("[dev-desktop-reload] applying Zero-Shell-Kill hot-patch to Desk Console.exe...");
  run(ssotScript, hpArgs);
  process.exit(0);
}

console.log("[dev-desktop-reload] restarting detached dev...");
killDeskDev();
spawnSync(process.execPath, ["-e", "setTimeout(()=>{},1200)"], winSpawnOpts({ stdio: "ignore" }));
const pid = startDevDetached();
console.log(`[dev-desktop-reload] detached dev started (pid=${pid})`);
