#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = process.argv.includes("--dir");
const fast = process.argv.includes("--fast") || dir;
const skipUi = process.argv.includes("--skip-ui") && fs.existsSync(path.join(root, "dist", "index.html"));
const outIdx = process.argv.indexOf("--out");
const outDir = outIdx >= 0 ? process.argv[outIdx + 1] : "";
const preIdx = process.argv.indexOf("--prepackaged");
const prepackaged = preIdx >= 0 ? process.argv[preIdx + 1] : "";
const publish = process.argv.includes("--publish")
  ? process.argv[process.argv.indexOf("--publish") + 1]
  : "never";

if (!skipUi) {
  const build = spawnSync("pnpm", ["build"], { cwd: root, stdio: "inherit", shell: true });
  if (build.status !== 0) process.exit(build.status ?? 1);
}

const args = ["exec", "electron-builder", "--win", "--x64", "--publish", publish];
if (dir) args.push("--dir");
if (fast) {
  args.push("-c.compression=store", "-c.win.signExecutable=false");
}
if (outDir) args.push(`-c.directories.output=${outDir}`);
if (prepackaged) args.push("--prepackaged", prepackaged);

const pack = spawnSync("pnpm", args, { cwd: root, stdio: "inherit", shell: true });
if (pack.status === 0) process.exit(0);
if (dir) {
  const fallback = path.join(root, outDir || "dist-desktop", "win-unpacked");
  const tmp = `${fallback}.tmp`;
  if (fs.existsSync(path.join(tmp, "electron.exe")) && !fs.existsSync(path.join(fallback, "electron.exe"))) {
    fs.cpSync(tmp, fallback, { recursive: true });
  }
  const assemble = spawnSync(process.execPath, [path.join(root, "scripts", "assemble-unpacked.mjs"), "--out", fallback], {
    cwd: root,
    stdio: "inherit",
  });
  process.exit(assemble.status ?? 1);
}
process.exit(pack.status ?? 1);
