#!/usr/bin/env node
/**
 * Restart Desk Console desktop dev (Electron). P0003 dev-desktop-reload parity.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { killDeskDev } from "./lib/dev-desktop-process.mjs";
import { winSpawnOpts } from "./lib/win-spawn.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(script, args = []) {
  const result = spawnSync(process.execPath, [path.join(root, "scripts", script), ...args], winSpawnOpts({
    cwd: root,
    stdio: "inherit",
  }));
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log("[dev-desktop-reload] stopping dev…");
killDeskDev();
spawnSync(process.execPath, ["-e", "setTimeout(()=>{},1500)"], winSpawnOpts({ stdio: "ignore" }));
run("dev-node.mjs");
