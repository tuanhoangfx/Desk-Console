"use strict";

/**
 * Shared Zero-Restart Hot-Patch Loader & EPIPE Process Guard (`P0001`, `P0003`, `P0006`, `P0009`):
 * - Prevents broken pipe (`Error: write EPIPE`) on stdout/stderr/child pipes from triggering
 *   an Electron main-process Uncaught Exception modal.
 * - Resolves updated `electron/*.cjs` modules and `dist/*` assets from `<resourcesPath>/hot-patch/`
 *   when explicitly opted in, while protecting stateful singletons (`taskbar-apply-worker.cjs`,
 *   `init.cjs`, `session-manager.cjs`, etc.) from cache eviction.
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

function installEpipeProcessGuard() {
  if (globalThis.__STEALTH_EPIPE_GUARD_INSTALLED__) return;
  globalThis.__STEALTH_EPIPE_GUARD_INSTALLED__ = true;
  try {
    process.stdout?.on?.("error", (err) => {
      if (err && (err.code === "EPIPE" || err.code === "ERR_STREAM_DESTROYED")) return;
    });
    process.stderr?.on?.("error", (err) => {
      if (err && (err.code === "EPIPE" || err.code === "ERR_STREAM_DESTROYED")) return;
    });
    process.on("uncaughtException", (err) => {
      if (err && (err.code === "EPIPE" || String(err.message || "").includes("write EPIPE"))) {
        return;
      }
    });
  } catch {
    /* ignore */
  }
}
installEpipeProcessGuard();

function resolveHotPatchRoot() {
  if (process.env.STEALTH_HOT_PATCH_DIR && fs.existsSync(process.env.STEALTH_HOT_PATCH_DIR)) {
    return path.resolve(process.env.STEALTH_HOT_PATCH_DIR);
  }
  if (typeof process.resourcesPath === "string" && process.resourcesPath) {
    const candidate = path.join(process.resourcesPath, "hot-patch");
    if (fs.existsSync(candidate)) return candidate;
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
      norm.toLowerCase().includes("\\p0003-stealth-browser-console\\electron\\") &&
      !norm.toLowerCase().includes("\\packaged-node_modules\\") &&
      !norm.toLowerCase().includes("\\node_modules\\");

    if (!isHotFile && !isAsarElectronFile && !isWorkspaceElectronFile) continue;

    const targetHotFile = isHotFile || isWorkspaceElectronFile ? key : remapAsarPathToHotPatch(key);
    if (!targetHotFile || !fs.existsSync(targetHotFile)) continue;

    let mtime = 0;
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

function resolveHotPatchedDistIndexHtml(defaultDistIndexPath) {
  const hotRoot = resolveHotPatchRoot();
  if (hotRoot) {
    const hotIndex = path.join(hotRoot, "dist", "index.html");
    if (fs.existsSync(hotIndex)) return hotIndex;
  }
  return defaultDistIndexPath;
}

module.exports = {
  installEpipeProcessGuard,
  resolveHotPatchRoot,
  installHotPatchResolveHook,
  reloadHotPatchedModules,
  resolveHotPatchedDistIndexHtml,
};
