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
    const raw = fs.readFileSync(pkgPath, "utf8");
    if (!raw || raw.includes("\u0000")) return "";
    return String(JSON.parse(raw)?.version || "").trim();
  } catch {
    return "";
  }
}

const CORRUPT_CHECK_TEXT_EXT_RE = /\.(?:json|cjs|mjs|js|html|css)$/i;

function isLikelyCorruptTextOrCodeFile(filePath) {
  try {
    const st = fs.statSync(filePath);
    if (!st.isFile()) return true;
    if (!CORRUPT_CHECK_TEXT_EXT_RE.test(filePath)) return false;
    if (st.size === 0) return true;
    const sampleLen = Math.min(st.size, 512);
    const buf = Buffer.allocUnsafe(sampleLen);
    const fd = fs.openSync(filePath, "r");
    let bytesRead = 0;
    try {
      bytesRead = fs.readSync(fd, buf, 0, sampleLen, 0);
    } finally {
      fs.closeSync(fd);
    }
    if (bytesRead <= 0) return true;
    for (let i = 0; i < bytesRead; i += 1) {
      if (buf[i] === 0) return true;
    }
    if (path.basename(filePath).toLowerCase() === "package.json") {
      JSON.parse(fs.readFileSync(filePath, "utf8"));
    }
    return false;
  } catch {
    return true;
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

function isExplicitHotPatchDirCorrupt(dir) {
  const pkgPath = path.join(dir, "package.json");
  if (!fs.existsSync(pkgPath)) return false;
  return !readPackageVersionSafe(pkgPath);
}

function resolveHotPatchRoot(opts = {}) {
  const envDir = process.env.HUB_HOT_PATCH_DIR || process.env.STEALTH_HOT_PATCH_DIR;
  if (envDir && fs.existsSync(envDir)) {
    const resolvedEnv = path.resolve(envDir);
    if (isExplicitHotPatchDirCorrupt(resolvedEnv)) return "";
    return resolvedEnv;
  }
  if (opts && typeof opts.hotPatchDir === "string" && opts.hotPatchDir && fs.existsSync(opts.hotPatchDir)) {
    const resolvedOpt = path.resolve(opts.hotPatchDir);
    if (isExplicitHotPatchDirCorrupt(resolvedOpt)) return "";
    return resolvedOpt;
  }
  if (
    typeof process.resourcesPath === "string" &&
    process.resourcesPath &&
    !/[\\/]node_modules[\\/]electron[\\/]dist[\\/]resources$/i.test(process.resourcesPath)
  ) {
    const candidate = path.join(process.resourcesPath, "hot-patch");
    if (fs.existsSync(candidate)) {
      const hotVer = readPackageVersionSafe(path.join(candidate, "package.json"));
      if (!hotVer) {
        appendGuardBootLog(
          "corrupt-hot-patch",
          new Error(`Quarantining corrupt or unversioned hot-patch directory: ${candidate}`),
          opts,
        );
        removeStaleHotPatchSafely(candidate);
        return "";
      }
      const baseVer = readPackageVersionSafe(path.join(process.resourcesPath, "app.asar", "package.json"));
      if (baseVer && compareSemverSafe(baseVer, hotVer) > 0) {
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
    if (fs.existsSync(candidate) && !isLikelyCorruptTextOrCodeFile(candidate)) {
      return candidate;
    }
  } catch {
    /* ignore */
  }
  return resolvedPath;
}

let _hookInstalled = false;
const _loadedMtimes = new Map();

function remapHotPatchParentToAsar(parent, hotRoot) {
  if (!parent || typeof parent.filename !== "string") return parent;
  const fallbackHotRoot =
    hotRoot ||
    (typeof process.resourcesPath === "string" && process.resourcesPath
      ? path.join(process.resourcesPath, "hot-patch")
      : "");
  if (fallbackHotRoot) {
    const resBase = path.dirname(fallbackHotRoot);
    const asarRoot = path.join(resBase, "app.asar");
    const normFile = path.resolve(parent.filename);
    const normHot = path.resolve(fallbackHotRoot);
    if (
      normFile.toLowerCase() === normHot.toLowerCase() ||
      normFile.toLowerCase().startsWith(`${normHot.toLowerCase()}${path.sep}`)
    ) {
      const rel = path.relative(normHot, normFile);
      return { ...parent, filename: path.join(asarRoot, rel) };
    }
  }
  const markerMatch = parent.filename.match(/^(.*)[\\/]hot-patch([\\/].*)?$/i);
  if (markerMatch) {
    return { ...parent, filename: path.join(markerMatch[1], "app.asar", markerMatch[2] || "") };
  }
  return parent;
}

function installHotPatchResolveHook() {
  if (_hookInstalled) return;
  _hookInstalled = true;
  const origResolve = Module._resolveFilename;
  Module._resolveFilename = function hotPatchResolveFilename(request, parent, isMain, options) {
    let resolved;
    try {
      resolved = origResolve.call(this, request, parent, isMain, options);
    } catch (err) {
      if (err && err.code === "ERR_INVALID_PACKAGE_CONFIG" && parent) {
        const hotRoot = resolveHotPatchRoot();
        const asarParent = remapHotPatchParentToAsar(parent, hotRoot);
        if (asarParent !== parent) {
          resolved = origResolve.call(this, request, asarParent, isMain, options);
        } else {
          throw err;
        }
      } else {
        throw err;
      }
    }
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
    if (fs.existsSync(hotIndex) && !isLikelyCorruptTextOrCodeFile(hotIndex)) return hotIndex;
  }
  return defaultDistIndexPath;
}

function resolveHotPatchedDistDir(defaultDistDir) {
  const hotRoot = resolveHotPatchRoot();
  if (hotRoot) {
    promoteStagedHotPatchDist(hotRoot);
    const hotDist = path.join(hotRoot, "dist");
    const hotIndex = path.join(hotDist, "index.html");
    if (fs.existsSync(hotIndex) && !isLikelyCorruptTextOrCodeFile(hotIndex)) return hotDist;
  }
  return defaultDistDir;
}

function resolveHotPatchedEntry(relPath, defaultAbsPath) {
  const hotRoot = resolveHotPatchRoot();
  if (hotRoot && relPath) {
    const normalizedRel = String(relPath).replace(/^[\\/]+/, "");
    const candidate = path.join(hotRoot, normalizedRel);
    try {
      if (fs.existsSync(candidate) && !isLikelyCorruptTextOrCodeFile(candidate)) {
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
    const ver = readPackageVersionSafe(path.join(hotRoot, "package.json"));
    if (ver) return ver;
  }
  return defaultVersion;
}

module.exports = {
  installEpipeProcessGuard,
  isLikelyCorruptTextOrCodeFile,
  removeStaleHotPatchSafely,
  resolveHotPatchRoot,
  promoteStagedHotPatchDist,
  installHotPatchResolveHook,
  reloadHotPatchedModules,
  resolveHotPatchedDistIndexHtml,
  resolveHotPatchedDistDir,
  resolveHotPatchedEntry,
  resolveHotPatchedPackageVersion,
};
