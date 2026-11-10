"use strict";

/**
 * Canonical electron-builder pack guard for Desktop tools (`P0001`, `P0003`, `P0009`, `P0010`, `P0018`).
 *
 * Protects against two failure modes discovered in multi-agent `E:\Dev` builds:
 * 1. `--config.electronDist=<unpacked dir>` in `electron-builder` skips `cleanupAfterUnpack`,
 *    leaving `resources/default_app.asar` inside `win-unpacked/resources/`.
 * 2. Concurrent edits to symlinked workspace packages (e.g. `packages/hub-ui`) while
 *    `electron-builder` streams `node_modules` into `resources/app.asar` shift byte offsets
 *    relative to the ASAR JSON header, corrupting `package.json` / `electron/main.cjs` at the
 *    tail of `app.asar` and causing Electron to fall back to `default_app.asar`.
 */
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const SHARED_RENDERER_NODE_MODULES_EXCLUDES = Object.freeze([
  "!**/node_modules/@tool-workspace/**",
  "!**/node_modules/{lucide-react,react,react-dom,vite,@vitejs,@supabase,@tanstack}/**",
]);

function removeDefaultAppArtifacts(appOutDir) {
  if (!appOutDir) return [];
  const removed = [];
  const candidates = [
    path.join(appOutDir, "resources", "default_app.asar"),
    path.join(appOutDir, "version"),
  ];
  for (const target of candidates) {
    try {
      if (fs.existsSync(target)) {
        fs.rmSync(target, { force: true });
        removed.push(target);
      }
    } catch {
      /* ignore */
    }
  }
  return removed;
}

function lookupAsarEntry(rootHeader, relPosixPath) {
  const parts = String(relPosixPath || "")
    .replace(/^\.?\//, "")
    .split("/")
    .filter(Boolean);
  let cursor = rootHeader;
  for (const part of parts) {
    cursor = cursor?.files?.[part];
    if (!cursor) return null;
  }
  return cursor;
}

function verifyAsarIntegrity(asarPath) {
  if (!fs.existsSync(asarPath)) {
    throw new Error(`[electron-pack-guard] Missing packaged asar: ${asarPath}`);
  }
  const fd = fs.openSync(asarPath, "r");
  try {
    const headerBuf = Buffer.alloc(16);
    const bytesRead = fs.readSync(fd, headerBuf, 0, 16, 0);
    if (bytesRead < 16) {
      throw new Error(`[electron-pack-guard] Truncated asar header in ${asarPath}`);
    }
    const headerSize = 8 + headerBuf.readUInt32LE(4);
    const jsonLen = headerBuf.readUInt32LE(12);
    const jsonBuf = Buffer.alloc(jsonLen);
    fs.readSync(fd, jsonBuf, 0, jsonLen, 16);
    const header = JSON.parse(jsonBuf.toString("utf8"));

    const pkgEntry = lookupAsarEntry(header, "package.json") || lookupAsarEntry(header, "app/package.json");
    if (!pkgEntry || !pkgEntry.size) {
      throw new Error("[electron-pack-guard] app.asar header missing package.json entry");
    }
    const pkgBuf = Buffer.alloc(pkgEntry.size);
    fs.readSync(fd, pkgBuf, 0, pkgEntry.size, headerSize + Number(pkgEntry.offset));
    let parsedPkg;
    try {
      parsedPkg = JSON.parse(pkgBuf.toString("utf8"));
    } catch (err) {
      throw new Error(
        `[electron-pack-guard] Corrupted package.json inside app.asar (byte-offset shift from concurrent file mutation during pack): ${err.message}`,
      );
    }
    const mainRel = String(parsedPkg.main || "index.js").replace(/\\/g, "/");
    const mainEntry =
      lookupAsarEntry(header, mainRel) ||
      lookupAsarEntry(header, `app/${mainRel}`);
    if (!mainEntry || (!mainEntry.size && !mainEntry.unpacked)) {
      throw new Error(`[electron-pack-guard] app.asar header missing main entry (${mainRel})`);
    }
    if (!mainEntry.unpacked && mainEntry.size > 0) {
      const mainBuf = Buffer.alloc(mainEntry.size);
      fs.readSync(fd, mainBuf, 0, mainEntry.size, headerSize + Number(mainEntry.offset));
      const blockSize = mainEntry.integrity?.blockSize || 4194304;
      if (mainEntry.integrity?.blocks?.[0] && mainEntry.size <= blockSize) {
        const actualHash = crypto.createHash("sha256").update(mainBuf).digest("hex");
        if (actualHash !== mainEntry.integrity.blocks[0]) {
          throw new Error(
            `[electron-pack-guard] app.asar ${mainRel} SHA-256 mismatch (concurrent file mutation during pack)`,
          );
        }
      }
      const mainSrc = mainBuf
        .toString("utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");
      const relReqRe = /\brequire\s*\(\s*["'](\.\.?\/[^"']+)["']\s*\)/g;
      const mainDir = path.posix.dirname(mainRel);
      let reqMatch;
      while ((reqMatch = relReqRe.exec(mainSrc)) !== null) {
        const spec = reqMatch[1];
        const baseResolved = path.posix.normalize(path.posix.join(mainDir, spec));
        if (baseResolved.startsWith("..")) continue;
        const candidates = [
          baseResolved,
          `${baseResolved}.cjs`,
          `${baseResolved}.js`,
          `${baseResolved}.json`,
          `${baseResolved}/index.cjs`,
          `${baseResolved}/index.js`,
        ];
        const foundInAsar = candidates.some(
          (cand) => lookupAsarEntry(header, cand) || lookupAsarEntry(header, `app/${cand}`),
        );
        if (!foundInAsar) {
          throw new Error(
            `[electron-pack-guard] app.asar is missing relative module "${spec}" (resolved: ${baseResolved}) required by ${mainRel} — add its directory to package.json build.files`,
          );
        }
      }
    }
    return {
      ok: true,
      name: parsedPkg.name || "",
      version: parsedPkg.version || "",
      main: mainRel,
    };
  } finally {
    fs.closeSync(fd);
  }
}

const DEFAULT_FORBIDDEN_CJS_DYNAMIC_IMPORTS = new Set([
  "playwright-core",
  "better-sqlite3",
  "sql.js",
  "koffi",
]);

function scanForbiddenDynamicImportsInCjsDir(
  electronDir,
  forbiddenSpecifiers = DEFAULT_FORBIDDEN_CJS_DYNAMIC_IMPORTS,
) {
  const issues = [];
  if (!electronDir || !fs.existsSync(electronDir)) return issues;
  const specSet =
    forbiddenSpecifiers instanceof Set ? forbiddenSpecifiers : new Set(forbiddenSpecifiers);
  const stack = [electronDir];
  const dynImportRe = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;

  while (stack.length) {
    const dir = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (
          ent.name === "node_modules" ||
          ent.name === "packaged-node_modules" ||
          ent.name === ".git"
        ) {
          continue;
        }
        stack.push(full);
        continue;
      }
      if (!ent.isFile() || !ent.name.endsWith(".cjs") || ent.name.endsWith(".test.cjs")) {
        continue;
      }
      const raw = fs.readFileSync(full, "utf8");
      const stripped = raw
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");
      let match;
      dynImportRe.lastIndex = 0;
      while ((match = dynImportRe.exec(stripped)) !== null) {
        const spec = match[1];
        const pkgName = spec.startsWith("@")
          ? spec.split("/").slice(0, 2).join("/")
          : spec.split("/")[0];
        if (specSet.has(spec) || specSet.has(pkgName)) {
          issues.push(
            `${path.relative(electronDir, full).replace(/\\/g, "/")}: bare dynamic import of "${spec}" in CommonJS bypasses Module._resolveFilename in packaged app.asar — use require("${spec}") instead`,
          );
        }
      }
    }
  }
  return issues;
}

function findAnyNativeNodeBinary(dir) {
  if (!dir || !fs.existsSync(dir)) return null;
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    let ents = [];
    try {
      ents = fs.readdirSync(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of ents) {
      const p = path.join(cur, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === ".git") continue;
        stack.push(p);
      } else if (ent.name.endsWith(".node")) {
        return p;
      }
    }
  }
  return null;
}

function verifyPackagedNativeAndDynamicImports(appOutDir, projectDir) {
  if (projectDir) {
    const electronDir = path.join(projectDir, "electron");
    const dynIssues = scanForbiddenDynamicImportsInCjsDir(electronDir);
    if (dynIssues.length > 0) {
      throw new Error(
        `[electron-pack-guard] Forbidden dynamic import() in CommonJS:\n  - ${dynIssues.join("\n  - ")}`,
      );
    }
  }
  if (!appOutDir) return;
  const candidateNmRoots = [
    path.join(appOutDir, "resources", "app.asar.unpacked", "node_modules"),
    path.join(appOutDir, "resources", "app", "node_modules"),
  ];
  for (const nmRoot of candidateNmRoots) {
    if (!fs.existsSync(nmRoot)) continue;
    const sqliteDir = path.join(nmRoot, "better-sqlite3");
    if (fs.existsSync(sqliteDir) && !findAnyNativeNodeBinary(sqliteDir)) {
      throw new Error(
        `[electron-pack-guard] Missing better_sqlite3.node inside packaged ${sqliteDir}`,
      );
    }
    const sqlJsDir = path.join(nmRoot, "sql.js");
    if (
      fs.existsSync(sqlJsDir) &&
      !fs.existsSync(path.join(sqlJsDir, "dist", "sql-wasm.wasm"))
    ) {
      throw new Error(
        `[electron-pack-guard] Missing sql-wasm.wasm inside packaged ${sqlJsDir}/dist`,
      );
    }
  }
}

async function afterExtract(context) {
  if (context?.appOutDir) {
    removeDefaultAppArtifacts(context.appOutDir);
  }
}

async function afterPack(context) {
  const appOutDir = context?.appOutDir;
  if (!appOutDir) return;
  removeDefaultAppArtifacts(appOutDir);
  const asarPath = path.join(appOutDir, "resources", "app.asar");
  const unpackedPkgPath = path.join(appOutDir, "resources", "app", "package.json");
  if (fs.existsSync(asarPath)) {
    verifyAsarIntegrity(asarPath);
  } else if (fs.existsSync(unpackedPkgPath)) {
    JSON.parse(fs.readFileSync(unpackedPkgPath, "utf8"));
  }
  verifyPackagedNativeAndDynamicImports(appOutDir, context?.packager?.projectDir || "");
}

module.exports = {
  SHARED_RENDERER_NODE_MODULES_EXCLUDES,
  DEFAULT_FORBIDDEN_CJS_DYNAMIC_IMPORTS,
  removeDefaultAppArtifacts,
  verifyAsarIntegrity,
  scanForbiddenDynamicImportsInCjsDir,
  verifyPackagedNativeAndDynamicImports,
  afterExtract,
  afterPack,
  default: afterPack,
};
