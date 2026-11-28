#!/usr/bin/env node
/**
 * P0001 electron-builder pack.
 * Fast (`--fast` / Agent DESKTOP_RELEASE_SIGN=0): compression=store + skip Authenticode (rcedit kept).
 * User (DESKTOP_RELEASE_SIGN=1): do not set signExecutable=false — Authenticode when cert present.
 * `--sync-installed`: stops running Desk Console / Folder Sync, syncs win-unpacked into
 * `%LOCALAPPDATA%\Programs\desk-console`, and relaunches Desk Console.exe.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchInteractiveTrayApp } from "../../scripts/lib/agent-inline-kit.mjs";
import { listProcessesNative, terminatePidNative } from "../../scripts/lib/win-native-proc-net.mjs";
import { stagePackagedOAuthClient } from "./lib/stage-oauth-client.mjs";

const rawRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = typeof fs.realpathSync?.native === "function" ? fs.realpathSync.native(rawRoot) : fs.realpathSync(rawRoot);
stagePackagedOAuthClient(root);
const syncSharedPath = path.resolve(root, "..", "scripts", "lib", "sync-electron-shared-libs.cjs");
if (fs.existsSync(syncSharedPath)) {
  spawnSync(process.execPath, [syncSharedPath, "--code", "P0001"], { cwd: root, stdio: "inherit" });
}
const dir = process.argv.includes("--dir");
const fast = process.argv.includes("--fast") || dir;
const syncInstalled = process.argv.includes("--sync-installed");
const skipUi = process.argv.includes("--skip-ui") && fs.existsSync(path.join(root, "dist", "index.html"));
const outIdx = process.argv.indexOf("--out");
const outDir = outIdx >= 0 ? process.argv[outIdx + 1] : "";
const preIdx = process.argv.indexOf("--prepackaged");
const prepackaged = preIdx >= 0 ? process.argv[preIdx + 1] : "";
const publish = process.argv.includes("--publish")
  ? process.argv[process.argv.indexOf("--publish") + 1]
  : "never";
/** P0010 SSOT: sign unless explicitly DESKTOP_RELEASE_SIGN=0 (Agent lane). */
const skipSign = process.env.DESKTOP_RELEASE_SIGN === "0";

function killDesktopLocks() {
  if (process.platform !== "win32") return;
  const userProfile = process.env.USERPROFILE || "";
  const appData = process.env.APPDATA || "";
  const localAppData = process.env.LOCALAPPDATA || "";
  for (const lnk of [
    userProfile && path.join(userProfile, "Desktop", "Folder Sync.lnk"),
    appData && path.join(appData, "Microsoft", "Windows", "Start Menu", "Programs", "Folder Sync.lnk"),
    appData && path.join(appData, "Microsoft", "Windows", "Start Menu", "Programs", "Startup", "Folder Sync.lnk"),
  ].filter(Boolean)) {
    try {
      if (fs.existsSync(lnk)) fs.rmSync(lnk, { force: true });
    } catch {
      /* ignore */
    }
  }
  for (const legacyDir of [
    localAppData && path.join(localAppData, "Programs", "folder-sync"),
    localAppData && path.join(localAppData, "Programs", "Folder Sync"),
  ].filter(Boolean)) {
    try {
      if (fs.existsSync(legacyDir)) fs.rmSync(legacyDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }

  const natProcs = listProcessesNative({ includeExePath: true, includeCmdline: true });
  if (natProcs) {
    const exactNames = new Set(["desk console.exe", "folder sync.exe", "rclone.exe"]);
    for (const proc of natProcs) {
      if (proc.pid === process.pid) continue;
      const nameLower = String(proc.name || "").toLowerCase();
      const hay = `${proc.exePath || ""} ${proc.cmd || ""}`.toLowerCase();
      const matched =
        exactNames.has(nameLower) ||
        hay.includes("desk console") ||
        hay.includes("folder sync") ||
        (/host[\\/]server\.mjs/.test(hay) &&
          (hay.includes("p0001") || hay.includes("p0009") || hay.includes("desk-console") || hay.includes("folder-sync")));
      if (matched) terminatePidNative(proc.pid);
    }
    return;
  }

  const ps = [
    "Get-Process -Name 'Desk Console','Folder Sync','rclone' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue",
    "$needles = @('desk-console', 'folder-sync', 'p0001-desk-console', 'p0009-folder-sync')",
    "Get-CimInstance Win32_Process | Where-Object {",
    "  $p = ($_.ExecutablePath + ' ' + $_.CommandLine).ToLower()",
    "  ($p -like '*desk console*' -or $p -like '*folder sync*' -or ($p -like '*host*server.mjs*' -and ($p -like '*p0001*' -or $p -like '*p0009*' -or $p -like '*desk-console*' -or $p -like '*folder-sync*')))",
    "} | ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } catch {} }",
  ].join("; ");
  spawnSync("powershell.exe", ["-NoProfile", "-Command", ps], { windowsHide: true, stdio: "ignore" });
}

async function verifyInstalledHostSmoke() {
  for (let i = 0; i < 24; i += 1) {
    try {
      const h = await fetch("http://127.0.0.1:6010/api/health", { signal: AbortSignal.timeout(1500) });
      if (h.ok) {
        const opt = await fetch("http://127.0.0.1:6010/api/pc/optimize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "sweep-antigravity" }),
          signal: AbortSignal.timeout(15000),
        });
        const optJson = await opt.json().catch(() => null);
        const rpc = optJson?.results?.antigravityRpcSync;
        if (opt.ok && optJson?.ok && rpc?.ok) {
          console.log(
            `[sync-installed] Antigravity RPC smoke OK: serversFound=${rpc.serversFound} serversSynced=${rpc.serversSynced} syncedDeleted=${rpc.syncedDeleted}`,
          );
          return;
        }
        throw new Error(`sweep-antigravity HTTP ${opt.status}: ${JSON.stringify(optJson)}`);
      }
    } catch (err) {
      if (i === 23) {
        throw err;
      }
    }
    await new Promise((r) => setTimeout(r, 500));
  }
}

async function syncToInstalledDir(unpackedDir) {
  if (!syncInstalled || process.platform !== "win32") return;
  const localAppData = process.env.LOCALAPPDATA || "";
  if (!localAppData) return;
  const installDir = path.join(localAppData, "Programs", "desk-console");
  const exePath = path.join(unpackedDir, "Desk Console.exe");
  if (!fs.existsSync(exePath)) {
    console.warn(`[sync-installed] missing ${exePath} — skipping install sync`);
    return;
  }
  console.log(`[sync-installed] stopping running Desk Console / Folder Sync processes...`);
  killDesktopLocks();
  fs.mkdirSync(installDir, { recursive: true });
  console.log(`[sync-installed] syncing ${unpackedDir} → ${installDir}`);
  const robo = spawnSync("robocopy", [unpackedDir, installDir, "/MIR", "/R:2", "/W:1", "/NFL", "/NDL", "/NJH", "/NJS"], {
    windowsHide: true,
    stdio: "inherit",
  });
  // robocopy exit codes 0..7 are success
  if ((robo.status ?? 8) >= 8) {
    fs.cpSync(unpackedDir, installDir, { recursive: true, force: true });
  }
  const installedExe = path.join(installDir, "Desk Console.exe");
  if (fs.existsSync(installedExe)) {
    console.log(`[sync-installed] launching ${installedExe} on interactive desktop`);
    launchInteractiveTrayApp(installedExe, ["--hidden"], {
      cwd: installDir,
      taskName: "Dev-Desk-Console-Launch",
    });
    await verifyInstalledHostSmoke();
  }
}

if (syncInstalled) {
  killDesktopLocks();
}

const viteCli = path.join(root, "node_modules", "vite", "bin", "vite.js");
const ebCli = path.join(root, "node_modules", "electron-builder", "cli.js");

if (!skipUi) {
  const build = fs.existsSync(viteCli)
    ? spawnSync(process.execPath, [viteCli, "build"], { cwd: root, stdio: "inherit" })
    : spawnSync("pnpm", ["build"], { cwd: root, stdio: "inherit", shell: true });
  if (build.status !== 0) process.exit(build.status ?? 1);
}

const ebArgs = ["--win", "--x64", "--publish", publish];
{
  const verifyGraphPath = path.resolve(root, "..", "scripts", "verify-chunk-graph.mjs");
  const distAssets = path.join(root, "dist", "assets");
  if (fs.existsSync(verifyGraphPath) && fs.existsSync(distAssets)) {
    const vg = spawnSync(process.execPath, [verifyGraphPath, "--dist", distAssets], { cwd: root, stdio: "inherit" });
    if (vg.status !== 0) process.exit(vg.status ?? 1);
  }
}
if (dir) ebArgs.push("--dir");
if (fast && publish !== "always") {
  ebArgs.push("-c.compression=store");
}
if (skipSign) {
  // Authenticode off only — never signAndEditExecutable=false (skips rcedit → Electron atom).
  ebArgs.push("-c.win.signExecutable=false");
  console.log("run-electron-package: skip Authenticode (DESKTOP_RELEASE_SIGN=0)");
} else {
  console.log("run-electron-package: Authenticode enabled (DESKTOP_RELEASE_SIGN≠0)");
}
if (outDir) ebArgs.push(`-c.directories.output=${outDir}`);
if (prepackaged) ebArgs.push("--prepackaged", prepackaged);

const fallback = path.join(root, outDir || "dist-desktop", "win-unpacked");
const renameRetryPreload = path.resolve(root, "..", "scripts", "lib", "win-rename-retry.cjs").replace(/\\/g, "/");
const packEnv = { ...process.env };
if (fs.existsSync(renameRetryPreload)) {
  const reqFlag = `--require "${renameRetryPreload}"`;
  packEnv.NODE_OPTIONS = packEnv.NODE_OPTIONS ? `${packEnv.NODE_OPTIONS} ${reqFlag}` : reqFlag;
}
function syncPostPublishIfNeeded() {
  if (publish !== "always" || process.env.P0001_RELEASE_DESKTOP_PS1 === "1") return;
  try {
    const pkgVer = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version;
    const tag = `v${pkgVer}`;
    const postGh = path.resolve(root, "..", "scripts", "post-gh-release.mjs");
    if (fs.existsSync(postGh)) {
      spawnSync(process.execPath, [postGh, "--product-root", root, "--tag", tag], { cwd: root, stdio: "inherit" });
    }
    const deployLenovo = path.resolve(root, "..", "scripts", "deploy-lenovo-static.mjs");
    if (fs.existsSync(deployLenovo)) {
      spawnSync(
        process.execPath,
        [deployLenovo, "--code", "P0001-SITE", "--code", "P0001-INTRO", "--force-build"],
        { cwd: path.resolve(root, "../.."), stdio: "inherit" },
      );
    }
  } catch (err) {
    console.warn(`[P0001] post-publish sync warning: ${err?.message || err}`);
  }
}

function cleanStaleHotPatchArtifacts(unpackedDir) {
  const resDir = path.join(unpackedDir, "resources");
  if (!fs.existsSync(resDir)) return;
  const hotPatchDir = path.join(resDir, "hot-patch");
  const hotNodeModules = path.join(hotPatchDir, "node_modules");
  try {
    if (fs.existsSync(hotNodeModules)) {
      const st = fs.lstatSync(hotNodeModules);
      if (st.isSymbolicLink()) fs.rmdirSync(hotNodeModules);
    }
  } catch {
    try {
      fs.unlinkSync(hotNodeModules);
    } catch {
      /* ignore */
    }
  }
  for (const target of [
    hotPatchDir,
    path.join(resDir, "app.asar.staged"),
    path.join(resDir, "app.asar.staged.sha256.json"),
  ]) {
    try {
      if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

if (!prepackaged) {
  cleanStaleHotPatchArtifacts(fallback);
}

const pack = fs.existsSync(ebCli)
  ? spawnSync(process.execPath, [ebCli, ...ebArgs], { cwd: root, stdio: "inherit", env: packEnv })
  : spawnSync("pnpm", ["exec", "electron-builder", ...ebArgs], { cwd: root, stdio: "inherit", shell: true, env: packEnv });
if (pack.status === 0) {
  await syncToInstalledDir(fallback);
  syncPostPublishIfNeeded();
  process.exit(0);
}

const tmp = `${fallback}.tmp`;
if (fs.existsSync(path.join(tmp, "electron.exe")) || fs.existsSync(path.join(fallback, "electron.exe")) || fs.existsSync(path.join(fallback, "Desk Console.exe"))) {
  if (fs.existsSync(path.join(tmp, "electron.exe")) && !fs.existsSync(path.join(fallback, "electron.exe")) && !fs.existsSync(path.join(fallback, "Desk Console.exe"))) {
    fs.cpSync(tmp, fallback, { recursive: true });
  }
  try {
    if (fs.existsSync(tmp)) fs.rmSync(tmp, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
  const assemble = spawnSync(process.execPath, [path.join(root, "scripts", "assemble-unpacked.mjs"), "--out", fallback], {
    cwd: root,
    stdio: "inherit",
  });
  if (assemble.status !== 0) process.exit(assemble.status ?? 1);
  if (dir || prepackaged) {
    await syncToInstalledDir(fallback);
    process.exit(0);
  }
  cleanStaleHotPatchArtifacts(fallback);
  const prepackArgs = ebArgs.filter((a) => a !== "--dir").concat(["--prepackaged", fallback]);
  const nsisPack = fs.existsSync(ebCli)
    ? spawnSync(process.execPath, [ebCli, ...prepackArgs], { cwd: root, stdio: "inherit", env: packEnv })
    : spawnSync("pnpm", ["exec", "electron-builder", ...prepackArgs], { cwd: root, stdio: "inherit", shell: true, env: packEnv });
  if (nsisPack.status === 0) {
    await syncToInstalledDir(fallback);
  }
  process.exit(nsisPack.status ?? 1);
}
process.exit(pack.status ?? 1);
