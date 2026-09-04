#!/usr/bin/env node
/**
 * Desktop dev without Vite HMR — load dist/ + vite build --watch (P0003 dev-desktop-only parity).
 *
 * Usage: node scripts/dev-desktop-only.mjs [--no-watch] [--skip-build] [--keep-dev]
 */
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { deskElectronEnv } from "./lib/desk-electron-env.mjs";
import {
  focusDeskWindow,
  isDeskDevRunning,
  killDeskDev,
  LOG_FILE,
  PID_FILE,
} from "./lib/dev-desktop-process.mjs";
import { winSpawnOpts } from "./lib/win-spawn.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WATCH_PID_FILE = path.join(root, ".dev-desktop-watch.pid");
const WATCH_LOG_FILE = path.join(root, ".dev-desktop-watch.log");
const node = process.execPath;
const viteBin = path.join(root, "node_modules", "vite", "bin", "vite.js");
const args = process.argv.slice(2);
const watch = !args.includes("--no-watch");
const skipBuild = args.includes("--skip-build");
const keepDev = args.includes("--keep-dev");
const require = createRequire(path.join(root, "package.json"));
const electronCli = require.resolve("electron/cli.js");
const hostEntry = path.join(root, "host", "server.mjs");

function runBuildOnce() {
  console.log("[dev-desktop-only] vite build…");
  const result = spawnSync(node, [viteBin, "build"], winSpawnOpts({ cwd: root, stdio: "inherit" }));
  if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
}

function startWatchBuild() {
  const logFd = fs.openSync(WATCH_LOG_FILE, "a");
  fs.writeFileSync(WATCH_LOG_FILE, `\n--- watch start ${new Date().toISOString()} ---\n`, { flag: "a" });
  const child = spawn(node, [viteBin, "build", "--watch"], winSpawnOpts({
    cwd: root,
    detached: true,
    stdio: ["ignore", logFd, logFd],
  }));
  child.unref();
  fs.writeFileSync(WATCH_PID_FILE, String(child.pid));
  console.log(`[dev-desktop-only] vite build --watch pid=${child.pid}`);
}

function isWatchRunning() {
  try {
    const pid = Number(fs.readFileSync(WATCH_PID_FILE, "utf8").trim());
    if (!Number.isFinite(pid) || pid <= 0) return false;
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function startHost(env) {
  spawn(node, [hostEntry], winSpawnOpts({
    cwd: root,
    detached: true,
    stdio: "ignore",
    env: { ...env, ELECTRON_RUN_AS_NODE: "1" },
  })).unref();
}

function startElectron(env) {
  const logFd = fs.openSync(LOG_FILE, "a");
  fs.writeFileSync(LOG_FILE, `\n--- dev-desktop-only ${new Date().toISOString()} ---\n`, { flag: "a" });
  const child = spawn(node, [electronCli, "."], winSpawnOpts({
    cwd: root,
    detached: true,
    stdio: ["ignore", logFd, logFd],
    env,
  }));
  child.unref();
  fs.writeFileSync(PID_FILE, String(child.pid));
  console.log(`[dev-desktop-only] electron pid=${child.pid}`);
}

const deskEnv = deskElectronEnv({
  VITE_DEV_SERVER_URL: "",
  DESK_LOAD_DIST: "1",
  DESK_DIST_WATCH: watch ? "1" : "0",
});

const devAlreadyRunning = keepDev && isDeskDevRunning();

if (devAlreadyRunning) {
  console.log("[dev-desktop-only] --keep-dev: Electron dev still running — skip kill/restart");
} else {
  console.log("[dev-desktop-only] stopping prior dev…");
  killDeskDev();
}

if (!skipBuild || !fs.existsSync(path.join(root, "dist", "index.html"))) {
  runBuildOnce();
} else {
  console.log("[dev-desktop-only] skip build — dist/index.html exists");
}

startHost(deskEnv);

if (watch && !isWatchRunning()) startWatchBuild();
else if (watch && devAlreadyRunning) console.log("[dev-desktop-only] vite build --watch already running");

if (!devAlreadyRunning) startElectron(deskEnv);
focusDeskWindow();

console.log("\n[dev-desktop-only] ready — dist watch reloads window (exe stays open)");
console.log("  Edit UI → vite rebuilds dist → Electron reloads");
console.log("  After electron/ edits: pnpm dev:desktop-reload");
