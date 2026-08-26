#!/usr/bin/env node
/**
 * Fast local Windows test pack — copy UI/host into an already-extracted Electron
 * runtime. Avoids electron-builder's win-unpacked.tmp rename (EPERM / Defender).
 * Ship / NSIS stays `release-desktop.ps1` (P0003 Fast).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.resolve(root, process.argv.includes("--out") ? process.argv[process.argv.indexOf("--out") + 1] : "dist-desk-win/win-unpacked");

const electronExe = path.join(out, "electron.exe");
const productExe = path.join(out, "Desk Console.exe");
if (!fs.existsSync(electronExe) && !fs.existsSync(productExe)) {
  console.error(`[assemble] missing Electron runtime in ${out}`);
  process.exit(1);
}

const appDir = path.join(out, "resources", "app");
fs.rmSync(appDir, { recursive: true, force: true });
fs.mkdirSync(appDir, { recursive: true });

for (const rel of ["electron", "host", "dist", "package.json"]) {
  const src = path.join(root, rel);
  if (!fs.existsSync(src)) {
    console.error(`[assemble] missing ${rel}`);
    process.exit(1);
  }
  fs.cpSync(src, path.join(appDir, rel === "package.json" ? "package.json" : rel), { recursive: true });
}

if (fs.existsSync(electronExe) && !fs.existsSync(productExe)) {
  fs.copyFileSync(electronExe, productExe);
}

console.log(`[assemble] ${productExe}`);
