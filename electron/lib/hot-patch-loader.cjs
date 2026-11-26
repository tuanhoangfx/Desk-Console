"use strict";

/**
 * Shared Zero-Restart Hot-Patch Loader & EPIPE Process Guard (`P0001`, `P0003`, `P0006`, `P0009`, `P0010`):
 * - Prevents broken pipe (`Error: write EPIPE`) on stdout/stderr/child pipes from triggering
 *   an Electron main-process Uncaught Exception modal.
 * - Resolves updated `electron/*.cjs` modules, `host/*.mjs` entries, `package.json`, and `dist/*`
 *   assets from `<resourcesPath>/hot-patch/` when present, while protecting stateful singletons
 *   (`main.cjs`, `init.cjs`, `session-manager.cjs`, etc.) from `require.cache` eviction.
 */
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");

const STATEFUL_SINGLETON_BASENAMES = new Set([
  "main.cjs",
  "init.cjs",
  "profile-service.cjs",
  "session-manager.cjs",
  "api-server.cjs",
  "ensure-packaged-module-paths.cjs",
  "hot-patch-loader.cjs",
  "taskbar-apply-worker.cjs",
  "profile-taskbar-native.cjs",
  "taskbar-badge-guard.cjs",
  "profile-window-title.cjs",
  "powershell-exec.cjs",
]);

function isEpipeLikeError(err) {
  if (!err) return false;
  const code = String(err.code || "");
  const msg = String(err.message || err || "");
  return code === "EPIPE" || code === "ERR_STREAM_DESTROYED" || msg.includes("write EPIPE");
}

function appendGuardBootLog(tag, err, opts = {}) {
  try {
    const detail = err && err.stack ? String(err.stack) : String(err || "unknown");
    try {
      process.stderr?.write?.(`[hot-patch-loader:${tag}] ${detail}\n`);
    } catch {
      /* ignore broken stderr pipe */
    }
    let logFile = typeof opts.logFile === "string" ? opts.logFile.trim() : "";
    if (!logFile) {
      let userDataDir = "";
      try {
        const electron = require("electron");
        userDataDir = electron?.app?.getPath?.("userData") || "";
      } catch {
        /* outside Electron main */
      }
      if (userDataDir) {
        logFile = path.join(userDataDir, "runtime", "desktop-boot.log");
      }
    }
    if (!logFile) return;
    fs.mkdirSync(path.dirname(logFile), { recursive: true });
    fs.appendFileSync(logFile, `${new Date().toISOString()} [${tag}] ${detail}\n`, "utf8");
  } catch {
    /* never throw from process error guard */
  }
}

function installEpipeProcessGuard(opts = {}) {
  if (globalThis.__STEALTH_EPIPE_GUARD_INSTALLED__ && !opts.logFile) return;
  globalThis.__STEALTH_EPIPE_GUARD_INSTALLED__ = true;
  try {
    process.stdout?.on?.("error", (err) => {
      if (isEpipeLikeError(err)) return;
      appendGuardBootLog("stdout:error", err, opts);
    });
    process.stderr?.on?.("error", (err) => {
      if (isEpipeLikeError(err)) return;
    });
    process.on("uncaughtException", (err) => {
      if (isEpipeLikeError(err)) return;
      appendGuardBootLog("uncaughtException", err, opts);
    });
    process.on("unhandledRejection", (reason) => {
      if (isEpipeLikeError(reason)) return;
      appendGuardBootLog("unhandledRejection", reason, opts);
    });
  } catch {
    /* ignore */
  }
}
installEpipeProcessGuard();

function compareSemverSafe(a, b) {
  const pa = String(a || "")
    .replace(/^v/i, "")
    .split(".")
    .map((n) => Number.parseInt(n, 10) || 0);
  const pb = String(b || "")
    .replace(/^v/i, "")
    .split(".")
    .map((n) => Number.parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i += 1) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

function readPackageVersionSafe(pkgPath) {
  try {
    if (!pkgPath || !fs.existsSync(pkgPath)) return "";
    return String(JSON.parse(fs.readFileSync(pkgPath, "utf8"))?.version || "").trim();
  } catch {
    return "";
  }
}

function removeStaleHotPatchSafely(hotDir) {
  try {
    const nmLink = path.join(hotDir, "node_modules");
    if (fs.existsSync(nmLink)) {
      const st = fs.lstatSync(nmLink);
      if (st.isSymbolicLink()) {
        try {
          fs.unlinkSync(nmLink);
        } catch {
          fs.rmdirSync(nmLink);
        }
      }
    }
    fs.rmSync(hotDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

function resolveHotPatchRoot(opts = {}) {
  const envDir = process.env.HUB_HOT_PATCH_DIR || process.env.STEALTH_HOT_PATCH_DIR;
  if (envDir && fs.existsSync(envDir)) {
    return path.resolve(envDir);
  }
  if (opts && typeof opts.hotPatchDir === "string" && opts.hotPatchDir && fs.existsSync(opts.hotPatchDir)) {
    return path.resolve(opts.hotPatchDir);
  }
  if (
    typeof process.resourcesPath === "string" &&
    process.resourcesPath &&
    !/[\\/]node_modules[\\/]electron[\\/]dist[\\/]resources$/i.test(process.resourcesPath)
  ) {
    const candidate = path.join(process.resourcesPath, "hot-patch");
    if (fs.existsSync(candidate)) {
      const hotVer = readPackageVersionSafe(path.join(candidate, "package.json"));
      const baseVer = readPackageVersionSafe(path.join(process.resourcesPath, "app.asar", "package.json"));
      if (baseVer && hotVer && compareSemverSafe(baseVer, hotVer) > 0) {
        removeStaleHotPatchSafely(candidate);
        return "";
      }
      return candidate;
    }
  }
  return "";
}

function remapAsarPathToHotPatch(resolvedPath) {
  if (typeof resolvedPath !== "string" || !resolvedPath.includes("app.asar")) return resolvedPath;
  const hotRoot = resolveHotPatchRoot();
  if (!hotRoot) return resolvedPath;
  const norm = resolvedPath.replace(/\//g, "\\");
  const marker = "\\app.asar\\";
  const idx = norm.toLowerCase().indexOf(marker);
  if (idx < 0) return resolvedPath;
  const rel = norm.slice(idx + marker.length);
  if (rel.startsWith("node_modules\\") || rel.startsWith("electron\\packaged-node_modules\\")) {
    return resolvedPath;
  }
  const candidate = path.join(hotRoot, rel);
  try {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  } catch {
    /* ignore */
  }
  return resolvedPath;
}

let _hookInstalled = false;
const _loadedMtimes = new Map();

function installHotPatchResolveHook() {
  if (_hookInstalled) return;
  _hookInstalled = true;
  const origResolve = Module._resolveFilename;
  Module._resolveFilename = function hotPatchResolveFilename(request, parent, isMain, options) {
    const resolved = origResolve.call(this, request, parent, isMain, options);
    const mapped = remapAsarPathToHotPatch(resolved);
    if (mapped !== resolved) {
      try {
        _loadedMtimes.set(mapped, fs.statSync(mapped).mtimeMs || 0);
      } catch {
        /* ignore */
      }
    }
    return mapped;
  };
}

function reloadHotPatchedModules({ force = false } = {}) {
  const hotRoot = resolveHotPatchRoot();
  const evicted = [];
  const cacheKeys = Object.keys(require.cache || {});

  for (const key of cacheKeys) {
    const base = path.basename(key);
    if (STATEFUL_SINGLETON_BASENAMES.has(base)) continue;
    const norm = key.replace(/\//g, "\\");
    const isHotFile = hotRoot && norm.toLowerCase().startsWith(hotRoot.toLowerCase());
    const isAsarElectronFile =
      norm.toLowerCase().includes("\\app.asar\\electron\\") &&
      !norm.toLowerCase().includes("\\packaged-node_modules\\");
    const isWorkspaceElectronFile =
      /[\\/]p\d{4}-[^\\/]+[\\/]electron[\\/]/i.test(norm) &&
      !norm.toLowerCase().includes("\\packaged-node_modules\\") &&
      !norm.toLowerCase().includes("\\node_modules\\");

    if (!isHotFile && !isAsarElectronFile && !isWorkspaceElectronFile) continue;

    const targetHotFile = isHotFile || isWorkspaceElectronFile ? key : remapAsarPathToHotPatch(key);
    if (!targetHotFile || !fs.existsSync(targetHotFile)) continue;

    let mtime;
    try {
      mtime = fs.statSync(targetHotFile).mtimeMs || 0;
    } catch {
      continue;
    }
    const prevMtime = _loadedMtimes.get(targetHotFile) || 0;
    if (force || isAsarElectronFile || mtime > prevMtime) {
      delete require.cache[key];
      _loadedMtimes.set(targetHotFile, mtime);
      evicted.push(path.relative(hotRoot || "", targetHotFile) || base);
    }
  }

  return {
    ok: true,
    hotPatchRoot: hotRoot || null,
    evictedCount: evicted.length,
    evicted,
    reloadedAt: new Date().toISOString(),
  };
}

function promoteStagedHotPatchDist(hotRoot) {
  if (!hotRoot) return false;
  const nextDist = path.join(hotRoot, "dist.next");
  const curDist = path.join(hotRoot, "dist");
  const prevDist = path.join(hotRoot, "dist.prev");
  try {
    if (!fs.existsSync(path.join(nextDist, "index.html"))) return false;
    if (fs.existsSync(prevDist)) {
      fs.rmSync(prevDist, { recursive: true, force: true });
    }
    if (fs.existsSync(curDist)) {
      fs.renameSync(curDist, prevDist);
    }
    fs.renameSync(nextDist, curDist);
    if (fs.existsSync(prevDist)) {
      try {
        fs.rmSync(prevDist, { recursive: true, force: true });
      } catch {
        /* ignore cleanup race */
      }
    }
    return true;
  } catch {
    try {
      if (!fs.existsSync(path.join(curDist, "index.html")) && fs.existsSync(path.join(prevDist, "index.html"))) {
        fs.renameSync(prevDist, curDist);
      }
    } catch {
      /* ignore rollback error */
    }
    return false;
  }
}

function resolveHotPatchedDistIndexHtml(defaultDistIndexPath) {
  const hotRoot = resolveHotPatchRoot();
  if (hotRoot) {
    promoteStagedHotPatchDist(hotRoot);
    const hotIndex = path.join(hotRoot, "dist", "index.html");
    if (fs.existsSync(hotIndex)) return hotIndex;
  }
  return defaultDistIndexPath;
}

function resolveHotPatchedDistDir(defaultDistDir) {
  const hotRoot = resolveHotPatchRoot();
  if (hotRoot) {
    promoteStagedHotPatchDist(hotRoot);
    const hotDist = path.join(hotRoot, "dist");
    if (fs.existsSync(path.join(hotDist, "index.html"))) return hotDist;
  }
  return defaultDistDir;
}

function resolveHotPatchedEntry(relPath, defaultAbsPath) {
  const hotRoot = resolveHotPatchRoot();
  if (hotRoot && relPath) {
    const normalizedRel = String(relPath).replace(/^[\\/]+/, "");
    const candidate = path.join(hotRoot, normalizedRel);
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate;
      }
    } catch {
      /* ignore */
    }
  }
  return defaultAbsPath;
}

function resolveHotPatchedPackageVersion(defaultVersion = "") {
  const hotRoot = resolveHotPatchRoot();
  if (hotRoot) {
    try {
      const pkgPath = path.join(hotRoot, "package.json");
      if (fs.existsSync(pkgPath)) {
        const ver = String(JSON.parse(fs.readFileSync(pkgPath, "utf8"))?.version || "").trim();
        if (ver) return ver;
      }
    } catch {
      /* ignore */
    }
  }
  return defaultVersion;
}

module.exports = {
  installEpipeProcessGuard,
  resolveHotPatchRoot,
  promoteStagedHotPatchDist,
  installHotPatchResolveHook,
  reloadHotPatchedModules,
  resolveHotPatchedDistIndexHtml,
  resolveHotPatchedDistDir,
  resolveHotPatchedEntry,
  resolveHotPatchedPackageVersion,
};
