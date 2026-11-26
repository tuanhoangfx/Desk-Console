/**
 * @dev/hub-desktop-host-kit — Sovereign Local Host Runtime Bridge (`desktop-runtime-bridge.mjs`)
 *
 * Synced into `<productRoot>/electron/lib/desktop-runtime-bridge.mjs` via `Tool/scripts/lib/sync-electron-shared-libs.cjs`
 * so Sovereign Node 22 Host servers & background daemons (`P0010`, `P0001`, `P0006`, `P0009`) run cleanly both:
 * 1. Inside `E:\Dev` workspace (leveraging `.tools/nodew.exe`, `ensure-hidden-console.mjs`, `worker-singleton-guard.mjs`, and `.env.shared`).
 * 2. Standalone / packaged inside Electron `app.asar` (routing writable state & locks into `~/.<appHome>/` without `ENOENT` or `../../` import crashes).
 */

import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

export function isPackagedAsarPath(targetPath) {
  if (process.env.HUB_DESKTOP_PACKAGED === "1") return true;
  const norm = String(targetPath || "").replace(/\\/g, "/").toLowerCase();
  return (
    norm.includes(".asar/") ||
    norm.endsWith(".asar") ||
    norm.includes("/hot-patch/") ||
    norm.endsWith("/hot-patch")
  );
}

/**
 * Forward an HTTP `POST /api/system/hot-reload` request from an ESM host child process
 * (`host/server.mjs`) to its parent Electron `createDesktopHotReloadControlBridge` using
 * `<userDataDir>/desktop-control.json`.
 */
export async function forwardHotReloadToDesktopControl({ userDataDir, body = {} } = {}) {
  const dirs = [];
  if (userDataDir) dirs.push(path.resolve(userDataDir));
  if (process.env.HUB_DESKTOP_CONTROL_FILE) {
    dirs.unshift(path.dirname(path.resolve(process.env.HUB_DESKTOP_CONTROL_FILE)));
  }
  const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
  for (const dir of dirs) {
    const ctlPath = path.join(dir, "desktop-control.json");
    if (!fs.existsSync(ctlPath)) continue;
    try {
      const ctl = JSON.parse(fs.readFileSync(ctlPath, "utf8"));
      if (!ctl?.port || !ctl?.token) continue;
      if (ctl.pid && !isPidAlive(ctl.pid)) continue;
      const res = await fetch(`http://127.0.0.1:${ctl.port}/hot-reload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Hub-Control-Token": String(ctl.token),
        },
        body: JSON.stringify(body || {}),
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      /* try next candidate */
    }
  }
  void appData;
  return { ok: false, reason: "desktop_control_bridge_offline" };
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
  const rawMonorepoRoot = path.resolve(productRoot, "..", "..");
  const monorepoRoot = fs.existsSync(path.join(rawMonorepoRoot, "Tool", "scripts"))
    ? rawMonorepoRoot
    : ([process.env.DEV_ROOT, "E:\\Dev"].find(
        (p) => p && fs.existsSync(path.join(p, "Tool", "scripts")),
      ) || rawMonorepoRoot);
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
    if (fs.existsSync(wsDatabox)) {
      try {
        const mod = await import(pathToFileURL(wsDatabox).href);
        if (typeof mod.resolveDataboxAuth === "function") {
          const auth = mod.resolveDataboxAuth();
          const origin = String(auth?.origin || auth?.url || auth?.apiUrl || "").replace(/\/+$/, "");
          const key = String(auth?.key || auth?.serviceKey || "");
          if (origin && key) {
            return { ...auth, origin, url: origin, apiUrl: origin, key, serviceRoleKey: key };
          }
        }
      } catch {
        /* fall through */
      }
    }
    let url =
      process.env.DATABOX_SUPABASE_URL ||
      process.env.DATABOX_API_URL ||
      process.env.LINUX_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      process.env.VITE_TWOFA_SUPABASE_URL ||
      "";
    let key =
      process.env.DATABOX_SUPABASE_SERVICE_ROLE_KEY ||
      process.env.DATABOX_SERVICE_ROLE_KEY ||
      process.env.LINUX_SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.VITE_TWOFA_SUPABASE_ANON_KEY ||
      "";
    const envCandidates = [];
    for (const rootDir of [monorepoRoot, process.env.DEV_ROOT, os.homedir(), appHomeDir, "E:\\Dev"]) {
      if (!rootDir) continue;
      for (const fileName of [".env.shared", ".env.local", ".env"]) {
        const candidate = path.join(rootDir, fileName);
        if (!envCandidates.includes(candidate)) envCandidates.push(candidate);
      }
    }
    for (const envFile of envCandidates) {
      if (url && key) break;
      if (!fs.existsSync(envFile)) continue;
      try {
        const lines = fs.readFileSync(envFile, "utf8").split(/\r?\n/);
        for (const line of lines) {
          const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
          if (!m) continue;
          const k = m[1];
          const v = m[2].replace(/^['"]|['"]$/g, "").trim();
          if (!v) continue;
          if (
            !url &&
            (k === "DATABOX_SUPABASE_URL" ||
              k === "LINUX_SUPABASE_URL" ||
              k === "DATABOX_API_URL" ||
              k === "VITE_TWOFA_SUPABASE_URL")
          ) {
            url = v;
          }
          if (
            !key &&
            (k === "DATABOX_SUPABASE_SERVICE_ROLE_KEY" ||
              k === "LINUX_SUPABASE_SERVICE_ROLE_KEY" ||
              k === "DATABOX_SERVICE_ROLE_KEY" ||
              k === "VITE_TWOFA_SUPABASE_ANON_KEY")
          ) {
            key = v;
          }
        }
      } catch {
        /* ignore */
      }
    }
    const origin = String(url || "").replace(/\/+$/, "");
    return { apiUrl: origin, serviceRoleKey: key, origin, url: origin, key };
  }

  const hubSessionFile = path.join(appHomeDir, "hub-session.json");

  function readHubUserSession() {
    const raw = readValidJsonState(
      hubSessionFile,
      (d) => Boolean(d && typeof d === "object" && typeof d.accessToken === "string" && d.accessToken.trim()),
    );
    return raw || null;
  }

  function saveHubUserSession(payload) {
    if (!payload || typeof payload !== "object" || !String(payload.accessToken || "").trim()) {
      clearHubUserSession();
      return null;
    }
    const next = {
      accessToken: String(payload.accessToken).trim(),
      refreshToken: String(payload.refreshToken || "").trim(),
      expiresAt: typeof payload.expiresAt === "number" ? payload.expiresAt : null,
      userId: payload.userId ? String(payload.userId).trim() : null,
      email: payload.email ? String(payload.email).trim() : null,
      updatedAt: new Date().toISOString(),
    };
    writeJsonStateAtomic(hubSessionFile, next);
    return next;
  }

  function clearHubUserSession() {
    try {
      if (fs.existsSync(hubSessionFile)) fs.unlinkSync(hubSessionFile);
    } catch {
      /* ignore */
    }
  }

  const hubAuthTelemetryFile = path.join(appHomeDir, "hub-auth-telemetry.json");

  function readHubAuthTelemetry() {
    const raw = readValidJsonState(
      hubAuthTelemetryFile,
      (d) => Boolean(d && typeof d === "object" && typeof d.code === "string" && typeof d.totalMs === "number"),
    );
    return raw || null;
  }

  function saveHubAuthTelemetry(payload) {
    if (!payload || typeof payload !== "object" || !String(payload.code || "").trim()) {
      return null;
    }
    const numOrNull = (v) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : null);
    const next = {
      code: String(payload.code).trim().toUpperCase(),
      outcome: String(payload.outcome || "app").trim(),
      initialCached: Boolean(payload.initialCached),
      initialExpired: Boolean(payload.initialExpired),
      policyMs: numOrNull(payload.policyMs),
      sessionMs: numOrNull(payload.sessionMs),
      accessCheckMs: numOrNull(payload.accessCheckMs),
      totalMs: numOrNull(payload.totalMs) ?? 0,
      timedOut: Boolean(payload.timedOut),
      expiredCleared: Boolean(payload.expiredCleared),
      startedAtIso: payload.startedAtIso ? String(payload.startedAtIso) : null,
      settledAtIso: payload.settledAtIso ? String(payload.settledAtIso) : null,
      ...(payload.errorMessage ? { errorMessage: String(payload.errorMessage).slice(0, 400) } : {}),
      updatedAt: new Date().toISOString(),
    };
    writeJsonStateAtomic(hubAuthTelemetryFile, next);
    return next;
  }

  /** Decode and validate Hub Supabase JWT structure + expiry without external deps. */
  function decodeHubJwtClaims(rawToken, { nowSec = Math.floor(Date.now() / 1000), skewSec = 60 } = {}) {
    const token = String(rawToken || "").trim();
    if (!token) return { ok: false, error: "empty_token" };
    const parts = token.split(".");
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
      return { ok: false, error: "malformed_jwt" };
    }
    try {
      const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
      const payload = JSON.parse(Buffer.from(`${b64}${pad}`, "base64").toString("utf8"));
      if (!payload || typeof payload !== "object") {
        return { ok: false, error: "invalid_jwt_payload" };
      }
      const sub = typeof payload.sub === "string" ? payload.sub.trim() : "";
      if (!sub) return { ok: false, error: "missing_sub" };
      const exp = typeof payload.exp === "number" ? payload.exp : Number(payload.exp);
      if (Number.isFinite(exp) && exp > 0 && exp + skewSec < nowSec) {
        return { ok: false, error: "token_expired", exp };
      }
      return {
        ok: true,
        claims: payload,
        user: {
          id: sub,
          email: typeof payload.email === "string" ? payload.email.trim() || null : null,
          role: typeof payload.role === "string" ? payload.role : null,
          exp: Number.isFinite(exp) ? exp : null,
        },
      };
    } catch {
      return { ok: false, error: "invalid_jwt_encoding" };
    }
  }

  /**
   * Verify HTTP request Hub authentication via:
   * 1. Explicit `Authorization: Bearer <jwt>` (ALWAYS rejected on invalid/expired JWT), OR
   * 2. Active persisted non-expired `hub-session.json` when no Bearer header was provided.
   */
  function verifyHubRequestAuth(req, { requireAuth = false, skewSec = 60 } = {}) {
    const authHeader = String(req?.headers?.authorization || "").trim();
    const xHubToken = String(req?.headers?.["x-hub-token"] || "").trim();
    if (authHeader || xHubToken) {
      let bearer = xHubToken;
      if (authHeader) {
        const m = /^Bearer\s+(.+)$/i.exec(authHeader);
        if (!m || !m[1].trim()) {
          return {
            ok: false,
            status: 401,
            error: "Invalid Authorization header format (expected Bearer token)",
            code: "invalid_auth_header",
            source: "bearer",
            hubUser: null,
          };
        }
        bearer = m[1].trim();
      }
      const decoded = decodeHubJwtClaims(bearer, { skewSec });
      if (!decoded.ok) {
        return {
          ok: false,
          status: 401,
          error: decoded.error === "token_expired" ? "Hub session expired" : "Invalid Hub Bearer token",
          code: decoded.error,
          source: "bearer",
          hubUser: null,
        };
      }
      return { ok: true, status: 200, source: "bearer", hubUser: decoded.user, token: bearer };
    }

    const sess = readHubUserSession();
    if (sess?.accessToken) {
      const nowSec = Math.floor(Date.now() / 1000);
      const exp = typeof sess.expiresAt === "number" ? sess.expiresAt : Number(sess.expiresAt);
      const decoded = decodeHubJwtClaims(sess.accessToken, { nowSec, skewSec });
      if (decoded.ok || (!Number.isFinite(exp) || exp === 0 || exp + skewSec >= nowSec)) {
        // Reject explicitly expired persisted sessions when JWT has exp in the past
        if (decoded.error === "token_expired" || (Number.isFinite(exp) && exp > 0 && exp + skewSec < nowSec)) {
          return {
            ok: !requireAuth,
            status: requireAuth ? 401 : 200,
            error: "Persisted Hub session expired",
            code: "session_expired",
            source: "session-file",
            hubUser: null,
          };
        }
        return {
          ok: true,
          status: 200,
          source: "session-file",
          hubUser: {
            id: sess.userId || decoded.user?.id || null,
            email: sess.email || decoded.user?.email || null,
            exp: Number.isFinite(exp) && exp > 0 ? exp : decoded.user?.exp ?? null,
          },
          token: sess.accessToken,
        };
      }
    }

    if (requireAuth) {
      return {
        ok: false,
        status: 401,
        error: "Hub authentication required",
        code: "hub_auth_required",
        source: "none",
        hubUser: null,
      };
    }
    return { ok: true, status: 200, source: "none", hubUser: null };
  }

  const _hubOnlineCache = new Map();

  function resolveHubSupabaseAuthConfig() {
    const candidates = [
      path.join(productRoot, ".env.local"),
      path.join(monorepoRoot, ".env.shared"),
      "E:\\Dev\\.env.shared",
    ];
    const readKey = (keys) => {
      for (const k of keys) {
        const direct = String(process.env[k] || "").trim();
        if (direct) return direct;
      }
      for (const fp of candidates) {
        if (!fp || !fs.existsSync(fp)) continue;
        try {
          const content = fs.readFileSync(fp, "utf8");
          for (const k of keys) {
            const m = content.match(new RegExp(`^${k}=(.+)$`, "m"));
            if (m?.[1]?.trim()) return m[1].trim().replace(/^["']|["']$/g, "");
          }
        } catch {
          /* ignore */
        }
      }
      return "";
    };
    const url = (
      readKey(["HUB_SUPABASE_URL", "VITE_HUB_SUPABASE_URL"]) || "https://hub-api.infi28.com"
    ).replace(/\/+$/, "");
    const anonKey = readKey(["HUB_SUPABASE_ANON_KEY", "VITE_HUB_SUPABASE_ANON_KEY"]);
    return { url, anonKey };
  }

  async function verifyHubTokenOnline(
    rawToken,
    { ttlMs = 5 * 60 * 1000, timeoutMs = 4000, fetchFn = globalThis.fetch } = {},
  ) {
    const token = String(rawToken || "").trim();
    if (!token) return { ok: false, status: 401, error: "Empty Bearer token", code: "empty_token" };
    const cfg = resolveHubSupabaseAuthConfig();
    if (!cfg.url || !cfg.anonKey || typeof fetchFn !== "function") {
      return { ok: true, verifiedOnline: false, skipped: true };
    }
    const cacheKey = `${cfg.url}|${crypto.createHash("sha256").update(token).digest("hex")}`;
    const now = Date.now();
    const cached = _hubOnlineCache.get(cacheKey);
    if (cached && cached.expiresAtMs > now) {
      return { ...cached.result, cached: true };
    }
    try {
      const res = await fetchFn(`${cfg.url}/auth/v1/user`, {
        method: "GET",
        headers: {
          apikey: cfg.anonKey,
          Authorization: `Bearer ${token}`,
        },
        signal: typeof AbortSignal?.timeout === "function" ? AbortSignal.timeout(timeoutMs) : undefined,
      });
      if (res.status === 401 || res.status === 403) {
        const result = {
          ok: false,
          status: 401,
          verifiedOnline: true,
          error: "Hub rejected Bearer token",
          code: "token_rejected_by_hub",
          hubUser: null,
        };
        _hubOnlineCache.set(cacheKey, { expiresAtMs: now + 60_000, result });
        return result;
      }
      if (res.ok) {
        const data = await res.json().catch(() => null);
        const result = {
          ok: true,
          status: 200,
          verifiedOnline: true,
          user: {
            id: typeof data?.id === "string" ? data.id : null,
            email: typeof data?.email === "string" ? data.email : null,
          },
        };
        _hubOnlineCache.set(cacheKey, { expiresAtMs: now + ttlMs, result });
        return result;
      }
      return { ok: true, verifiedOnline: false, httpStatus: res.status };
    } catch {
      if (process.env.HUB_JWT_STRICT_ONLINE === "1") {
        return {
          ok: false,
          status: 401,
          verifiedOnline: false,
          error: "Hub online verification unreachable",
          code: "hub_online_unreachable",
          hubUser: null,
        };
      }
      return { ok: true, verifiedOnline: false, offlineFallback: true };
    }
  }

  async function verifyHubRequestAuthAsync(req, { requireAuth = false, skewSec = 60, verifyOnline = true, fetchFn } = {}) {
    const base = verifyHubRequestAuth(req, { requireAuth, skewSec });
    if (!base.ok || base.source === "none" || !verifyOnline || !base.token) {
      return base;
    }
    const online = await verifyHubTokenOnline(base.token, { fetchFn });
    if (!online.ok) {
      return {
        ok: false,
        status: online.status || 401,
        error: online.error || "Hub rejected Bearer token",
        code: online.code || "token_rejected_by_hub",
        source: base.source,
        verifiedOnline: true,
        hubUser: null,
      };
    }
    return {
      ...base,
      verifiedOnline: Boolean(online.verifiedOnline),
      hubUser: online.user?.id
        ? {
            id: online.user.id,
            email: online.user.email || base.hubUser?.email || null,
            exp: base.hubUser?.exp ?? null,
          }
        : base.hubUser,
    };
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
    readHubUserSession,
    saveHubUserSession,
    clearHubUserSession,
    readHubAuthTelemetry,
    saveHubAuthTelemetry,
    decodeHubJwtClaims,
    verifyHubRequestAuth,
    verifyHubTokenOnline,
    verifyHubRequestAuthAsync,
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
