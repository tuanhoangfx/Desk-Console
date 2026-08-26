#!/usr/bin/env node
import { spawn } from "node:child_process";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function probe(url) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 600 }, (res) => {
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

function run(cmd, args, extra = {}) {
  const child = spawn(cmd, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    ...extra,
  });
  child.on("exit", (code) => {
    if (code && code !== 0) process.exitCode = code;
  });
  return child;
}

if (!(await probe("http://127.0.0.1:6010/api/health"))) {
  run(process.execPath, [path.join(root, "host", "server.mjs")]);
}
run("pnpm", ["exec", "vite", "--host", "127.0.0.1", "--port", "5180"]);
