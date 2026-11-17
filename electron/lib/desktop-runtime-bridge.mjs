/**
 * @dev/hub-desktop-host-kit — Sovereign Local Host Runtime Bridge (`desktop-runtime-bridge.mjs`)
 *
 * Synced into `<productRoot>/electron/lib/desktop-runtime-bridge.mjs` via `Tool/scripts/lib/sync-electron-shared-libs.cjs`
 * so Sovereign Node 22 Host servers & background daemons (`P0010`, `P0001`, `P0006`, `P0009`) run cleanly both:
 * 1. Inside `E:\Dev` workspace (leveraging `.tools/nodew.exe`, `ensure-hidden-console.mjs`, `worker-singleton-guard.mjs`, and `.env.shared`).
 * 2. Standalone / packaged inside Electron `app.asar` (routing writable state & locks into `~/.<appHome>/` without `ENOENT` or `../../` import crashes).
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

export function isPackagedAsarPath(targetPath) {
  const norm = String(targetPath || "").replace(/\\/g, "/").toLowerCase();
  return norm.includes(".asar/") || norm.endsWith(".asar");
}

function isPidAlive(pid) {
  const n = Number(pid);
  if (!Number.isFinite(n) || n <= 0) return false;
  try {
    process.kill(n, 0);
    return true;
  } catch {
    return false;
  }
}

export function readValidJsonState(stateFile, validateFn = null) {
  try {
    if (!fs.existsSync(stateFile)) return null;
    const parsed = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    if (typeof validateFn === "function" && !validateFn(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeJsonStateAtomic(stateFile, payload) {
  fs.mkdirSync(path.dirname(stateFile), { recursive: true });
  const tmpFile = `${stateFile}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpFile, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  try {
    fs.renameSync(tmpFile, stateFile);
  } catch {
    fs.copyFileSync(tmpFile, stateFile);
    try {
      fs.unlinkSync(tmpFile);
    } catch {
      /* ignore */
    }
  }
}

/**
 * Create a self-contained Sovereign Runtime Bridge for a Desktop + Local Host product.
 *
 * @param {{
 *   productRoot: string,
 *   homeDirName: string,
 *   stateFileName?: string,
 *   stateEnvVar?: string,
 * }} config
 */
export function createSovereignRuntimeBridge(config) {
  const productRoot = path.resolve(config.productRoot);
  const monorepoRoot = path.resolve(productRoot, "..", "..");
  const appHomeDir = path.join(os.homedir(), config.homeDirName || ".hub_desktop_app");
  const stateFileName = config.stateFileName || "state.json";
  const stateEnvVar = config.stateEnvVar || "";
  const require = createRequire(import.meta.url);

  function isPackagedAsar() {
    return isPackagedAsarPath(productRoot);
  }

  function resolveStateFilePath() {
    if (stateEnvVar && process.env[stateEnvVar]) {
      return path.resolve(process.env[stateEnvVar]);
    }
    if (isPackagedAsar()) {
      fs.mkdirSync(appHomeDir, { recursive: true });
      return path.join(appHomeDir, stateFileName);
    }
    return path.join(productRoot, "data", stateFileName);
  }

  async function ensureHiddenConsoleSafe() {
    const wsHelper = path.join(monorepoRoot, "Tool", "scripts", "lib", "ensure-hidden-console.mjs");
    if (!isPackagedAsar() && fs.existsSync(wsHelper)) {
      try {
        const mod = await import(pathToFileURL(wsHelper).href);
        if (typeof mod.ensureHiddenConsoleOnWin32 === "function") {
          mod.ensureHiddenConsoleOnWin32();
          return;
        }
      } catch {
        /* ignore */
      }
    }
  }

  async function applyProcessShieldSafe() {
    const wsGuard = path.join(monorepoRoot, "Tool", "scripts", "lib", "worker-singleton-guard.mjs");
    if (!isPackagedAsar() && fs.existsSync(wsGuard)) {
      try {
        const mod = await import(pathToFileURL(wsGuard).href);
        mod.applyAntiFreezeProcessShield?.(process.pid);
      } catch {
        /* ignore */
      }
    }
  }

  async function acquireSingletonLockSafe(lockName, options = {}) {
    const wsGuard = path.join(monorepoRoot, "Tool", "scripts", "lib", "worker-singleton-guard.mjs");
    if (!isPackagedAsar() && fs.existsSync(wsGuard)) {
      try {
        const mod = await import(pathToFileURL(wsGuard).href);
        if (typeof mod.acquireWorkerSingletonGuard === "function") {
          return mod.acquireWorkerSingletonGuard(lockName, options);
        }
      } catch {
        /* fall through to local lockfile */
      }
    }

    const lockDir = path.join(appHomeDir, ".locks");
    fs.mkdirSync(lockDir, { recursive: true });
    const lockFile = path.join(lockDir, `${lockName}.lock.json`);
    try {
      if (fs.existsSync(lockFile)) {
        const prev = JSON.parse(fs.readFileSync(lockFile, "utf8"));
        if (prev?.pid && prev.pid !== process.pid && isPidAlive(prev.pid)) {
          return { acquired: false, existing: prev, release: () => {} };
        }
      }
    } catch {
      /* ignore stale lock */
    }
    const record = { pid: process.pid, startedAt: new Date().toISOString(), lockName };
    try {
      fs.writeFileSync(lockFile, JSON.stringify(record, null, 2), "utf8");
    } catch {
      /* ignore */
    }
    const release = () => {
      try {
        if (fs.existsSync(lockFile)) {
          const cur = JSON.parse(fs.readFileSync(lockFile, "utf8"));
          if (cur?.pid === process.pid) fs.unlinkSync(lockFile);
        }
      } catch {
        /* ignore */
      }
    };
    process.once("exit", release);
    return { acquired: true, existing: null, release };
  }

  function spawnHiddenNodeSafe({ command, args = [], cwd = productRoot, env = process.env, logFile = "" }) {
    const wsShell = path.join(monorepoRoot, "Tool", "scripts", "lib", "win-shell-env.cjs");
    if (!isPackagedAsar() && fs.existsSync(wsShell)) {
      try {
        const { startHiddenDetachedProcess } = require(wsShell);
        if (typeof startHiddenDetachedProcess === "function") {
          return startHiddenDetachedProcess({ command, args, cwd, env, ...(logFile ? { logFile } : {}) });
        }
      } catch {
        /* fall through */
      }
    }
    const nodewCandidate = path.join(monorepoRoot, ".tools", "nodew.exe");
    const exe = !command || command === process.execPath
      ? (fs.existsSync(nodewCandidate) ? nodewCandidate : process.execPath)
      : command;
    const child = spawn(exe, args, {
      cwd,
      env,
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.unref();
    return { pid: child.pid };
  }

  async function resolveDataboxAuthSafe() {
    const wsDatabox = path.join(monorepoRoot, "Tool", "scripts", "lib", "databox-plane-ssot.mjs");
    if (!isPackagedAsar() && fs.existsSync(wsDatabox)) {
      try {
        const mod = await import(pathToFileURL(wsDatabox).href);
        if (typeof mod.resolveDataboxAuth === "function") {
          return mod.resolveDataboxAuth("linux");
        }
      } catch {
        /* fall through */
      }
    }
    const envShared = path.join(monorepoRoot, ".env.shared");
    let url = process.env.DATABOX_API_URL || process.env.SUPABASE_URL || "";
    let key = process.env.DATABOX_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    if ((!url || !key) && !isPackagedAsar() && fs.existsSync(envShared)) {
      try {
        const lines = fs.readFileSync(envShared, "utf8").split(/\r?\n/);
        for (const line of lines) {
          const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
          if (!m) continue;
          const k = m[1];
          const v = m[2].replace(/^['"]|['"]$/g, "");
          if (!url && (k === "LINUX_SUPABASE_URL" || k === "DATABOX_API_URL")) url = v;
          if (!key && (k === "LINUX_SUPABASE_SERVICE_ROLE_KEY" || k === "DATABOX_SERVICE_ROLE_KEY")) key = v;
        }
      } catch {
        /* ignore */
      }
    }
    return { apiUrl: url, serviceRoleKey: key };
  }

  return {
    productRoot,
    monorepoRoot,
    appHomeDir,
    isPackagedAsar,
    resolveStateFilePath,
    ensureHiddenConsoleSafe,
    applyProcessShieldSafe,
    acquireSingletonLockSafe,
    spawnHiddenNodeSafe,
    resolveDataboxAuthSafe,
    readValidJsonState,
    writeJsonStateAtomic,
    pickAvailablePort: (startPort, options) => pickAvailablePort(startPort, options),
  };
}

/**
 * Probe and pick the first available TCP port with dual-stack (IPv4 + IPv6) safety,
 * optional atomic reservation, and configurable port bounds.
 *
 * @param {number} startPort Starting port to probe.
 * @param {{
 *   hosts?: string[],
 *   endPort?: number,
 *   maxAttempts?: number,
 *   reserve?: boolean,
 *   autoReleaseMs?: number,
 * }} [options]
 * @returns {Promise<number | { port: number, servers: import("node:net").Server[], release: () => Promise<void> }>}
 */
export async function pickAvailablePort(startPort, options = {}) {
  const {
    hosts = ["127.0.0.1", "::1"],
    endPort = 65535,
    maxAttempts = 1000,
    reserve = false,
    autoReleaseMs = 0,
  } = options;

  const parsedStart = Math.max(1, Number(startPort) || 1);
  const parsedEnd = Math.min(65535, Math.max(parsedStart, Number(endPort) || 65535));
  const maxPort = Math.min(parsedEnd, parsedStart + Math.max(1, Number(maxAttempts) || 1000) - 1);

  const checkSingleHost = (port, host) => {
    return new Promise((resolve) => {
      const server = createServer();
      server.unref();

      server.once("error", () => {
        resolve({ ok: false });
      });

      server.listen(port, host, () => {
        resolve({ ok: true, server });
      });
    });
  };

  const closeServers = (servers) => {
    return Promise.all(
      servers.map((s) => new Promise((r) => s.close(() => r())))
    ).then(() => {});
  };

  for (let port = parsedStart; port <= maxPort; port++) {
    const openedServers = [];
    let isAvailableOnAllHosts = true;

    for (const host of hosts) {
      const res = await checkSingleHost(port, host);
      if (res.ok && res.server) {
        openedServers.push(res.server);
      } else {
        isAvailableOnAllHosts = false;
        break;
      }
    }

    if (isAvailableOnAllHosts) {
      if (reserve) {
        let released = false;
        let releaseTimer = null;
        const release = async () => {
          if (released) return;
          released = true;
          if (releaseTimer) clearTimeout(releaseTimer);
          await closeServers(openedServers);
        };

        if (Number(autoReleaseMs) > 0) {
          releaseTimer = setTimeout(() => {
            release().catch(() => {});
          }, Number(autoReleaseMs));
          if (typeof releaseTimer.unref === "function") releaseTimer.unref();
        }

        return {
          port,
          servers: openedServers,
          release,
        };
      }
      await closeServers(openedServers);
      return port;
    }

    await closeServers(openedServers);
  }

  throw new Error(
    `No available TCP port found from ${parsedStart} to ${maxPort} on hosts [${hosts.join(", ")}]`
  );
}
