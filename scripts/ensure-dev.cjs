#!/usr/bin/env node
/**
 * Start Desk host :6010 + Vite :5180 if down. Does not kill healthy listeners.
 */
const http = require("node:http");
const path = require("node:path");
const { startHiddenDetachedProcess, resolveNodeExe } = require("../../../scripts/lib/win-shell-env.cjs");

const root = path.resolve(__dirname, "..");
const force = process.argv.includes("--force");

function probe(url) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 800 }, (res) => {
      res.resume();
      resolve(res.statusCode != null && res.statusCode < 500);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

function startNode(args, logFile) {
  startHiddenDetachedProcess({
    command: resolveNodeExe(),
    args,
    cwd: root,
    logFile,
    env: process.env,
  });
}

async function wait(url, ms = 45_000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (await probe(url)) return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

async function main() {
  const hostOk = !force && (await probe("http://127.0.0.1:6010/api/health"));
  if (!hostOk) startNode([path.join(root, "host", "server.mjs")], path.join(root, ".dev-host.log"));
  const uiOk = !force && (await probe("http://127.0.0.1:5180/"));
  if (!uiOk) {
    startNode(
      [path.join(root, "node_modules", "vite", "bin", "vite.js"), "--host", "127.0.0.1", "--port", "5180"],
      path.join(root, ".dev-vite.log"),
    );
  }
  const host = await wait("http://127.0.0.1:6010/api/health");
  const ui = await wait("http://127.0.0.1:5180/");
  console.log(JSON.stringify({ ok: host && ui, host, ui }));
  process.exit(host && ui ? 0 : 1);
}

main();
