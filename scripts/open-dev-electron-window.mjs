#!/usr/bin/env node
/** Open Desk Console dev Electron when Vite is up but tray window closed. P0003 parity. */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { deskElectronEnv } from "./lib/desk-electron-env.mjs";
import { DESK_VITE_PORT } from "./lib/dev-port-guard.mjs";
import { winSpawnOpts } from "./lib/win-spawn.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(root, "package.json"));
const electronCli = require.resolve("electron/cli.js");
const node = process.execPath;

const child = spawn(
  node,
  [electronCli, "."],
  winSpawnOpts({
    cwd: root,
    detached: true,
    stdio: "ignore",
    env: deskElectronEnv({ VITE_DEV_SERVER_URL: `http://127.0.0.1:${DESK_VITE_PORT}/` }),
  }),
);
child.unref();
console.log(`[open-dev-electron-window] spawned electron pid=${child.pid}`);
