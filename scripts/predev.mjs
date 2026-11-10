#!/usr/bin/env node
/** Block common broken Electron launch patterns before dev stack starts. */
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(root, "package.json"));

let electronPkgDir;
try {
  electronPkgDir = path.dirname(require.resolve("electron/package.json"));
} catch {
  console.error("[predev] electron not installed — run: pnpm install (from repo root or P0001)");
  process.exit(1);
}

const pkgVersion = String(require(path.join(electronPkgDir, "package.json")).version || "").trim();
const distDir = path.join(electronPkgDir, "dist");
const versionFile = path.join(distDir, "version");
const exePath = path.join(distDir, "electron.exe");

if (!fs.existsSync(exePath) || !fs.existsSync(versionFile)) {
  console.error(`[predev] electron dist missing under ${distDir} — reinstall: pnpm add -D electron@${pkgVersion || "37"}`);
  process.exit(1);
}

const distVersion = fs.readFileSync(versionFile, "utf8").trim();
if (pkgVersion && distVersion && pkgVersion !== distVersion) {
  console.error(
    `[predev] electron version drift: package.json=${pkgVersion} dist/version=${distVersion} — reinstall electron`,
  );
  process.exit(1);
}

/** Windows PE FileVersion must match dist/version (mixed binary → V8 snapshot crash). Cached by (size, mtimeMs) to avoid ~800ms PowerShell cold start on every predev. */
if (process.platform === "win32") {
  try {
    const exeStat = fs.statSync(exePath);
    const cachePath = path.join(root, "node_modules", ".cache", "electron-pe-version.json");
    let fileVersion = "";
    try {
      const cached = JSON.parse(fs.readFileSync(cachePath, "utf8"));
      if (cached && cached.size === exeStat.size && cached.mtimeMs === exeStat.mtimeMs && cached.fileVersion) {
        fileVersion = String(cached.fileVersion);
      }
    } catch {
      /* cache miss */
    }
    if (!fileVersion) {
      const { execFileSync } = require("node:child_process");
      const ps = [
        `$v = (Get-Item -LiteralPath '${exePath.replace(/'/g, "''")}').VersionInfo.FileVersion`,
        `if (-not $v) { exit 2 }`,
        `Write-Output $v`,
      ].join("; ");
      fileVersion = String(
        execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps], {
          encoding: "utf8",
          windowsHide: true,
          timeout: 15_000,
        }),
      )
        .trim()
        .split(/\r?\n/)
        .filter(Boolean)
        .pop();
      if (fileVersion) {
        fs.mkdirSync(path.dirname(cachePath), { recursive: true });
        fs.writeFileSync(
          cachePath,
          JSON.stringify({ size: exeStat.size, mtimeMs: exeStat.mtimeMs, fileVersion }),
          "utf8",
        );
      }
    }
    if (fileVersion && distVersion && fileVersion !== distVersion) {
      console.error(
        `[predev] electron.exe FileVersion=${fileVersion} ≠ dist/version=${distVersion} (V8 mismatch risk) — reinstall electron@${distVersion}`,
      );
      process.exit(1);
    }
  } catch (err) {
    console.warn("[predev] skip FileVersion probe:", err instanceof Error ? err.message : err);
  }
}

const argv = process.argv.join(" ");
if (/\belectron\b.*\s-e\s/.test(argv) || argv.includes("win-paste.cjs';")) {
  console.error("[predev] Forbidden: electron -e inline script — use: pnpm dev");
  process.exit(1);
}
