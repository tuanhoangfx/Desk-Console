#!/usr/bin/env node
/**
 * Desk Console dev orchestrator — P0003 dev-node parity.
 * Spawns host :6011 (isolated) + Vite :5180 + Electron via electron/cli.js (no pnpm exec / -e).
 *
 * Usage: node scripts/dev-node.mjs   (pnpm dev)
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { deskElectronEnv } from "./lib/desk-electron-env.mjs";
import { DESK_VITE_PORT, isPortListening, waitForPort } from "./lib/dev-port-guard.mjs";
import { winSpawnOpts } from "./lib/win-spawn.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const node = process.execPath;
const viteBin = path.join(root, "node_modules", "vite", "bin", "vite.js");
const require = createRequire(path.join(root, "package.json"));
const electronCli = require.resolve("electron/cli.js");
const hostEntry = path.join(root, "host", "server.mjs");
const LOG_FILE = path.join(root, ".dev-vite.log");
const interactive = Boolean(process.stdout.isTTY && !process.env.DESK_DEV_LOG);

function probeHealth(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/api/health`, { timeout: 800 }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

function childStdio() {
  if (interactive) return "inherit";
  const logFd = fs.openSync(LOG_FILE, "a");
  fs.writeFileSync(LOG_FILE, `\n--- dev-node ${new Date().toISOString()} ---\n`, { flag: "a" });
  return ["ignore", logFd, logFd];
}

let vite;
let electron;
let host;
let shuttingDown = false;
let electronLaunched = false;

const deskEnv = deskElectronEnv({
  VITE_DEV_SERVER_URL: `http://127.0.0.1:${DESK_VITE_PORT}/`,
  DESK_APP_VERSION: require("../package.json").version,
});
const hostPort = Number(deskEnv.DESK_API_PORT || 6011);

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (electron && !electron.killed) electron.kill();
  if (vite && !vite.killed) vite.kill();
  if (host && !host.killed) host.kill();
  process.exit(code ?? 0);
}

async function ensureHost() {
  if (await probeHealth(hostPort)) {
    console.log(`[dev-node] host :${hostPort} already listening — attach`);
    return;
  }
  host = spawn(
    node,
    [hostEntry],
    winSpawnOpts({
      cwd: root,
      stdio: childStdio(),
      env: { ...deskEnv, ELECTRON_RUN_AS_NODE: "1" },
    }),
  );
  host.on("exit", (code, signal) => {
    if (shuttingDown) return;
    console.warn(`[dev-node] host exited (code=${code ?? "null"} signal=${signal ?? "null"})`);
  });
  const deadline = Date.now() + 12_000;
  while (Date.now() < deadline) {
    if (await probeHealth(hostPort)) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`host :${hostPort} did not become healthy`);
}

function spawnVite() {
  vite = spawn(
    node,
    [viteBin, "--host", "127.0.0.1", "--port", String(DESK_VITE_PORT), "--strictPort"],
    winSpawnOpts({ cwd: root, stdio: childStdio() }),
  );
  vite.on("exit", (code, signal) => {
    if (shuttingDown) return;
    console.error(`[dev-node] Vite exited (code=${code ?? "null"} signal=${signal ?? "null"}) — shutting down`);
    shutdown(code ?? 1);
  });
}

async function ensureVite() {
  if (await isPortListening(DESK_VITE_PORT)) {
    console.log(`[dev-node] :${DESK_VITE_PORT} already listening — attach`);
    return;
  }
  spawnVite();
  await waitForPort(DESK_VITE_PORT);
}

function spawnElectron() {
  if (electronLaunched && electron && !electron.killed) return;
  electronLaunched = true;
  console.log(
    `[dev-node] electron isolated userData=${deskEnv.DESK_USER_DATA} api=:${hostPort} ui=:${DESK_VITE_PORT}`,
  );
  electron = spawn(node, [electronCli, "."], winSpawnOpts({
    cwd: root,
    stdio: childStdio(),
    env: deskEnv,
  }));
  electron.on("exit", (code, signal) => {
    if (shuttingDown) return;
    console.warn(
      `[dev-node] Electron exited (code=${code ?? "null"} signal=${signal ?? "null"}) — Vite stays on :${DESK_VITE_PORT}. ` +
        `Relaunch: pnpm dev:desktop-reload  (Ctrl+C to stop stack)`,
    );
    electron = null;
    electronLaunched = false;
  });
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

try {
  await ensureHost();
  await ensureVite();
  console.log(`[dev-node] DEV_READY web=http://127.0.0.1:${DESK_VITE_PORT}/ api=http://127.0.0.1:${hostPort}/`);
  spawnElectron();
} catch (error) {
  console.error("[dev-node]", error instanceof Error ? error.message : error);
  shutdown(1);
}
