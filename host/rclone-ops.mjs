import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { JOB_TRASH_WINDOW_MS, rcloneExcludeArgs } from "./job-watch.mjs";
import { assignDriveCodes, nextDriveCode } from "./job-code.mjs";
import {
  buildRcloneNetworkArgs,
  buildRcloneProxyEnv,
  normalizeBwlimit,
  normalizeProxyUrl,
  readNetworkSettings,
  redactProxyUrl,
} from "./network-qos.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const DATA_ROOT =
  process.env.FOLDER_SYNC_DATA_ROOT ||
  path.join(process.env.APPDATA || path.join(os.homedir(), ".config"), "folder-sync");

export const TRASH_ROOT = path.join(DATA_ROOT, "trash");
export const BACKUP_ROOT = path.join(DATA_ROOT, "backups");
export const CONFLICT_ROOT = path.join(DATA_ROOT, "conflicts");

/** @type {Map<string, import('node:child_process').ChildProcess>} */
export const running = new Map();

/** @type {Map<string, { stdout: string, stderr: string, progress: ReturnType<typeof parseRcloneProgress>, startedAt: string }>} */
export const liveJobOutput = new Map();

/** @type {Set<(jobId: string, state: { stdout: string, stderr: string, progress: ReturnType<typeof parseRcloneProgress>, startedAt: string } | null) => void>} */
const liveOutputListeners = new Set();
const liveEmitTimers = new Map();

export function subscribeLiveJobOutput(listener) {
  liveOutputListeners.add(listener);
  return () => {
    liveOutputListeners.delete(listener);
  };
}

function notifyLiveOutputListeners(jobId, state) {
  for (const listener of liveOutputListeners) {
    try {
      listener(jobId, state);
    } catch {
      /* ignore listener errors */
    }
  }
}

function scheduleLiveOutputEmit(jobId, immediate = false) {
  if (!jobId || liveOutputListeners.size === 0) return;
  const existing = liveEmitTimers.get(jobId);
  if (immediate) {
    if (existing) {
      clearTimeout(existing);
      liveEmitTimers.delete(jobId);
    }
    notifyLiveOutputListeners(jobId, liveJobOutput.get(jobId) || null);
    return;
  }
  if (existing) return;
  const timer = setTimeout(() => {
    liveEmitTimers.delete(jobId);
    notifyLiveOutputListeners(jobId, liveJobOutput.get(jobId) || null);
  }, 150);
  if (typeof timer.unref === "function") timer.unref();
  liveEmitTimers.set(jobId, timer);
}

const RCLONE_STATS_LINE_RE =
  /(?:Transferred:\s*)?([\d.]+\s*[KMGTPE]?i?B)\s*\/\s*([\d.]+\s*[KMGTPE]?i?B),\s*(\d+%|-),\s*([\d.]+\s*[KMGTPE]?i?B\/s),\s*ETA\s*([^\s(]+)(?:\s*\(xfr#(\d+)\/(\d+)\))?/i;

/**
 * Parse the most recent rclone `--stats-one-line` progress line from stdout/stderr.
 * @param {string} text
 */
export function parseRcloneProgress(text) {
  const raw = String(text || "");
  if (!raw) return null;
  const lines = raw.split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const m = RCLONE_STATS_LINE_RE.exec(lines[i]);
    if (!m) continue;
    const transferred = m[1].trim();
    const total = m[2].trim();
    const pctRaw = m[3].trim();
    const percent = pctRaw.endsWith("%") ? Number.parseInt(pctRaw, 10) : null;
    const speed = m[4].trim();
    const etaRaw = m[5].trim();
    const eta = etaRaw === "-" ? null : etaRaw;
    const filesDone = m[6] != null ? Number.parseInt(m[6], 10) : null;
    const filesTotal = m[7] != null ? Number.parseInt(m[7], 10) : null;
    return {
      percent: Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : null,
      transferred,
      total,
      speed,
      eta,
      filesDone: Number.isFinite(filesDone) ? filesDone : null,
      filesTotal: Number.isFinite(filesTotal) ? filesTotal : null,
    };
  }
  return null;
}

export function ensureDataRoots() {
  for (const dir of [DATA_ROOT, TRASH_ROOT, BACKUP_ROOT, CONFLICT_ROOT]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

let cachedRcloneBin = undefined;
let cachedRcloneEnvKey = "";

export function whichRclone() {
  const envKey = `${process.env.RCLONE_PATH || ""}|${process.env.FOLDER_SYNC_RESOURCES || ""}`;
  if (cachedRcloneBin !== undefined && cachedRcloneEnvKey === envKey) {
    if (!cachedRcloneBin || (!cachedRcloneBin.includes(path.sep) && !cachedRcloneBin.includes("/")) || fs.existsSync(cachedRcloneBin)) {
      return cachedRcloneBin;
    }
  }
  const exeName = process.platform === "win32" ? "rclone.exe" : "rclone";
  const resourcesRoot = process.env.FOLDER_SYNC_RESOURCES || path.join(__dirname, "..", "resources");
  const candidates = [
    process.env.RCLONE_PATH,
    path.join(resourcesRoot, "rclone", exeName),
    path.join(__dirname, "..", "resources", "rclone", exeName),
    // Packaged Electron: host may run from app.asar.unpacked; rclone lives in resources/rclone.
    process.resourcesPath ? path.join(process.resourcesPath, "rclone", exeName) : null,
    process.platform === "win32" ? "rclone.exe" : "rclone",
  ].filter(Boolean);

  for (const bin of candidates) {
    if (bin.includes(path.sep) || bin.includes("/")) {
      try {
        if (fs.existsSync(bin) && fs.statSync(bin).size > 0) {
          cachedRcloneBin = bin;
          cachedRcloneEnvKey = envKey;
          return bin;
        }
      } catch {
        /* keep looking */
      }
      continue;
    }
    cachedRcloneBin = bin;
    cachedRcloneEnvKey = envKey;
    return bin;
  }
  cachedRcloneBin = null;
  cachedRcloneEnvKey = envKey;
  return null;
}

/**
 * @param {string[]} args
 * @param {{ timeoutMs?: number, jobId?: string, remoteName?: string, jobNetwork?: { proxyUrl?: string, bwlimit?: string }, env?: NodeJS.ProcessEnv }} [opts]
 */
export function runRclone(args, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 120_000;
  return new Promise((resolve) => {
    const bin = whichRclone();
    if (!bin) {
      resolve({ ok: false, code: -1, stdout: "", stderr: "rclone not found on PATH or resources/rclone" });
      return;
    }
    let inferredRemote = opts.remoteName ? cleanRemoteName(opts.remoteName) : "";
    if (!inferredRemote && Array.isArray(args)) {
      const specArg = args.find((a) => typeof a === "string" && /^[A-Za-z0-9_-]+:/.test(a));
      if (specArg) inferredRemote = remoteNameFromSpec(specArg);
    }
    const ledgerRow = inferredRemote ? readDriveAccountLedger()[inferredRemote] : undefined;
    const proxyEnv = buildRcloneProxyEnv(readNetworkSettings(), ledgerRow, opts.jobNetwork);
    const child = spawn(bin, args, {
      detached: process.platform === "win32",
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, ...proxyEnv, ...(opts.env || {}) },
    });
    if (opts.jobId) {
      running.set(opts.jobId, child);
      liveJobOutput.set(opts.jobId, {
        stdout: "",
        stderr: "",
        progress: null,
        startedAt: new Date().toISOString(),
      });
      scheduleLiveOutputEmit(opts.jobId, true);
    }

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      try {
        child.kill();
      } catch {
        /* ignore */
      }
      if (opts.jobId) {
        liveJobOutput.delete(opts.jobId);
        scheduleLiveOutputEmit(opts.jobId, true);
      }
      resolve({ ok: false, code: -1, stdout, stderr: stderr || "timeout" });
    }, timeoutMs);

    child.stdout.on("data", (d) => {
      const chunk = String(d);
      stdout += chunk;
      if (opts.jobId) {
        const cur = liveJobOutput.get(opts.jobId);
        if (cur) {
          cur.stdout = stdout.slice(-20_000);
          const nextProgress = parseRcloneProgress(chunk) || parseRcloneProgress(cur.stdout.slice(-1000));
          if (nextProgress) cur.progress = nextProgress;
          scheduleLiveOutputEmit(opts.jobId);
        }
      }
    });
    child.stderr.on("data", (d) => {
      const chunk = String(d);
      stderr += chunk;
      if (opts.jobId) {
        const cur = liveJobOutput.get(opts.jobId);
        if (cur) {
          cur.stderr = stderr.slice(-20_000);
          const nextProgress = parseRcloneProgress(chunk) || parseRcloneProgress(cur.stderr.slice(-1000));
          if (nextProgress) cur.progress = nextProgress;
          scheduleLiveOutputEmit(opts.jobId);
        }
      }
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      if (opts.jobId) {
        running.delete(opts.jobId);
        liveJobOutput.delete(opts.jobId);
        scheduleLiveOutputEmit(opts.jobId, true);
      }
      resolve({ ok: false, code: -1, stdout, stderr: String(err?.message || err) });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (opts.jobId) {
        running.delete(opts.jobId);
        liveJobOutput.delete(opts.jobId);
        scheduleLiveOutputEmit(opts.jobId, true);
      }
      resolve({ ok: code === 0, code: code ?? -1, stdout, stderr });
    });
  });
}

export function stopJob(jobId) {
  const child = running.get(jobId);
  if (!child) return { ok: false, error: "not_running" };
  try {
    child.kill();
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
  running.delete(jobId);
  liveJobOutput.delete(jobId);
  scheduleLiveOutputEmit(jobId, true);
  return { ok: true };
}

let cachedConfigFilePath = null;
let configDumpCache = { mtimeMs: -2, size: -2, at: 0, ok: false, parsed: null, raw: "", stderr: "" };
let inflightConfigDump = null;

export function invalidateRcloneConfigCache() {
  configDumpCache = { mtimeMs: -2, size: -2, at: 0, ok: false, parsed: null, raw: "", stderr: "" };
}

/** Path of rclone.conf. Cached in memory once located. Does not start OAuth. */
export async function rcloneConfigPath() {
  const fromEnv = String(process.env.RCLONE_CONFIG || "").trim();
  if (fromEnv) {
    cachedConfigFilePath = fromEnv;
    return fromEnv;
  }
  if (cachedConfigFilePath && fs.existsSync(cachedConfigFilePath)) {
    return cachedConfigFilePath;
  }
  const defaultWin =
    process.platform === "win32" && process.env.APPDATA
      ? path.join(process.env.APPDATA, "rclone", "rclone.conf")
      : null;
  if (defaultWin && fs.existsSync(defaultWin)) {
    cachedConfigFilePath = defaultWin;
    return defaultWin;
  }
  const located = await runRclone(["config", "file"], { timeoutMs: 10_000 });
  const blob = `${located.stdout || ""}\n${located.stderr || ""}`;
  const match = blob.match(/[A-Za-z]:\\[^\r\n]*rclone\.conf|\/[^\r\n]*rclone\.conf/);
  const found = match ? match[0].trim() : defaultWin;
  if (found) cachedConfigFilePath = found;
  return found;
}

async function dumpRcloneConfig() {
  const cfgPath = cachedConfigFilePath || (process.platform === "win32" && process.env.APPDATA ? path.join(process.env.APPDATA, "rclone", "rclone.conf") : null);
  let stat = null;
  if (cfgPath) {
    try {
      stat = fs.statSync(cfgPath);
      cachedConfigFilePath = cfgPath;
    } catch {
      stat = null;
    }
  }
  if (
    configDumpCache.parsed &&
    ((stat && stat.mtimeMs === configDumpCache.mtimeMs && stat.size === configDumpCache.size) ||
      (!stat && Date.now() - configDumpCache.at < 2000))
  ) {
    return {
      ok: configDumpCache.ok,
      parsed: configDumpCache.parsed,
      stdout: configDumpCache.raw,
      stderr: configDumpCache.stderr,
    };
  }
  if (inflightConfigDump) return inflightConfigDump;
  inflightConfigDump = (async () => {
    try {
      const dump = await runRclone(["config", "dump"], { timeoutMs: 15_000 });
      if (!dump.ok && !dump.stdout.trim()) {
        return { ok: false, parsed: null, stdout: dump.stdout, stderr: dump.stderr };
      }
      let parsed = {};
      try {
        parsed = JSON.parse(dump.stdout || "{}");
      } catch {
        return { ok: false, parsed: null, stdout: dump.stdout, stderr: "config_dump_parse", parseError: true };
      }
      let freshStat = null;
      if (cachedConfigFilePath) {
        try {
          freshStat = fs.statSync(cachedConfigFilePath);
        } catch {
          freshStat = null;
        }
      }
      configDumpCache = {
        mtimeMs: freshStat ? freshStat.mtimeMs : -1,
        size: freshStat ? freshStat.size : -1,
        at: Date.now(),
        ok: dump.ok,
        parsed,
        raw: dump.stdout,
        stderr: dump.stderr,
      };
      return { ok: dump.ok, parsed, stdout: dump.stdout, stderr: dump.stderr };
    } finally {
      inflightConfigDump = null;
    }
  })();
  return inflightConfigDump;
}

export async function listRemotes() {
  const dumped = await dumpRcloneConfig();
  if (!dumped.parsed) {
    if (dumped.parseError) {
      return { ok: false, remotes: [], error: "config_dump_parse", raw: dumped.stdout };
    }
    return { ok: false, remotes: [], error: dumped.stderr || "config_dump_failed" };
  }
  const remotes = Object.entries(dumped.parsed).map(([name, cfg]) => ({
    name,
    type: String(cfg?.type || ""),
    teamDrive: Boolean(cfg?.team_drive),
  }));
  return { ok: true, remotes, rcloneConfig: dumped.ok };
}

/** Create a Drive remote without opening a browser. OAuth is a separate local reconnect. */
export async function ensureDriveRemote(name = "gdrive") {
  const clean = cleanRemoteName(name);
  const listed = await listRemotes();
  const exists = listed.remotes.some((r) => r.name === clean);
  if (!exists) {
    const created = await runRclone(
      ["config", "create", clean, "drive", "scope=drive", "config_is_local=false"],
      { timeoutMs: 30_000 },
    );
    invalidateRcloneConfigCache();
    if (!created.ok) {
      return { ok: false, step: "create", name: clean, ...created };
    }
    recordDriveAccount(clean, {
      message: "Created",
      changes: [{ field: "name", after: clean }],
    });
  }
  const shared = await copySharedDriveClient(clean);
  if (!shared.ok) return { ok: false, step: "oauth_client", name: clean, error: shared.error };
  return { ok: true, name: clean, existed: exists, clientCopied: Boolean(shared.copied) };
}

/** A new Drive remote reuses the Google client already stored on another Drive. */
export async function copySharedDriveClient(name) {
  const clean = cleanRemoteName(name);
  const dumped = await dumpRcloneConfig();
  if (!dumped.parsed) {
    return { ok: false, error: "rclone config could not be read" };
  }
  const parsed = dumped.parsed;
  const cfg = parsed[clean];
  if (String(cfg?.client_id || "").trim() && String(cfg?.client_secret || "").trim()) {
    return { ok: true, copied: false };
  }
  const shared = findSharedDriveOAuthClient(parsed);
  if (!shared) return { ok: true, copied: false };
  const filePath = await rcloneConfigPath();
  if (!filePath) return { ok: false, error: "rclone config file was not found" };
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const text = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  const next = patchDriveRemoteConfig(text, clean, shared);
  if (next !== text) {
    fs.writeFileSync(filePath, next, "utf8");
    invalidateRcloneConfigCache();
  }
  return { ok: true, copied: next !== text };
}

/** Drop one `[remote]` section. Other remotes, including their tokens, stay. */
export function removeRemoteSection(text, remoteName) {
  const source = String(text || "");
  const nl = source.includes("\r\n") ? "\r\n" : "\n";
  const name = String(remoteName || "").trim();
  const out = [];
  let skipping = false;
  for (const line of source.split(/\r?\n/)) {
    const header = line.match(/^\[(.+)\]\s*$/);
    if (header) skipping = header[1] === name;
    if (!skipping) out.push(line);
  }
  let next = out.join(nl).replace(new RegExp(`(?:${nl}){3,}`, "g"), `${nl}${nl}`);
  if (source.endsWith("\n") && next && !next.endsWith("\n")) next += nl.slice(-1) === "\n" ? nl : "\n";
  return next;
}

/**
 * Rewrite one remote inside rclone.conf text.
 * `local: false` while Folder Sync owns port 53682 — rclone must not start its own auth server.
 * `local: true` only after the token line is already stored.
 */
function readLocalEnvValue(key) {
  const fromProc = String(process.env[key] || "").trim();
  if (fromProc) return fromProc;
  for (const rel of ["../.env.local", "../../.env.shared"]) {
    try {
      const p = path.resolve(__dirname, rel);
      if (!fs.existsSync(p)) continue;
      const lines = fs.readFileSync(p, "utf8").split(/\r?\n/);
      for (const line of lines) {
        const idx = line.indexOf("=");
        if (idx <= 0) continue;
        if (line.slice(0, idx).trim() === key) {
          const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
          if (val) return val;
        }
      }
    } catch {
      /* ignore local env read errors */
    }
  }
  return "";
}

export function defaultDriveOAuthClient() {
  const envId = readLocalEnvValue("DESK_GOOGLE_OAUTH_CLIENT_ID");
  const envSecret = readLocalEnvValue("DESK_GOOGLE_OAUTH_CLIENT_SECRET");
  if (envId && envSecret) {
    return { clientId: envId, clientSecret: envSecret, scope: "drive" };
  }
  const jsonCandidates = [
    path.join(__dirname, "oauth-client.runtime.json"),
    path.join(process.env.APPDATA || path.join(os.homedir(), ".config"), "desk-console", "oauth-client.json"),
  ];
  for (const fp of jsonCandidates) {
    try {
      if (!fs.existsSync(fp)) continue;
      const parsed = JSON.parse(fs.readFileSync(fp, "utf8"));
      const clientId = String(parsed?.clientId || "").trim();
      const clientSecret = String(parsed?.clientSecret || "").trim();
      if (clientId && clientSecret) {
        return {
          clientId,
          clientSecret,
          scope: String(parsed?.scope || "drive").trim() || "drive",
        };
      }
    } catch {
      /* ignore invalid runtime oauth json */
    }
  }
  return {
    clientId: "",
    clientSecret: "",
    scope: "drive",
  };
}

/** Google client already stored on any Drive remote (or built-in Desktop OAuth fallback for fresh PCs). */
export function findSharedDriveOAuthClient(parsed) {
  for (const cfg of Object.values(parsed || {})) {
    if (String(cfg?.type || "") !== "drive") continue;
    const clientId = String(cfg.client_id || "").trim();
    const clientSecret = String(cfg.client_secret || "").trim();
    if (!clientId || !clientSecret) continue;
    return {
      clientId,
      clientSecret,
      scope: String(cfg.scope || "drive").trim() || "drive",
    };
  }
  return defaultDriveOAuthClient();
}

export function patchDriveRemoteConfig(text, remoteName, { token, local, clientId, clientSecret, scope } = {}) {
  const source = String(text || "");
  const nl = source.includes("\r\n") ? "\r\n" : "\n";
  const lines = source.split(/\r?\n/);
  const tokenLine = token == null ? "" : `token = ${JSON.stringify(token)}`;
  const localLine = local == null ? "" : `config_is_local = ${local ? "true" : "false"}`;
  const clientIdLine = clientId == null ? "" : `client_id = ${clientId}`;
  const clientSecretLine = clientSecret == null ? "" : `client_secret = ${clientSecret}`;
  const scopeLine = scope == null ? "" : `scope = ${scope}`;
  let section = "";
  let seen = false;
  let wroteToken = token == null;
  let wroteLocal = local == null;
  let wroteClientId = clientId == null;
  let wroteClientSecret = clientSecret == null;
  let wroteScope = scope == null;
  const out = [];

  function finishSection() {
    if (section !== remoteName) return;
    if (!wroteClientId) out.push(clientIdLine);
    if (!wroteClientSecret) out.push(clientSecretLine);
    if (!wroteScope) out.push(scopeLine);
    if (!wroteToken) out.push(tokenLine);
    if (!wroteLocal) out.push(localLine);
    wroteToken = true;
    wroteLocal = true;
    wroteClientId = true;
    wroteClientSecret = true;
    wroteScope = true;
  }

  for (const line of lines) {
    const header = line.match(/^\[(.+)\]\s*$/);
    if (header) {
      finishSection();
      section = header[1];
      if (section === remoteName) seen = true;
      out.push(line);
      continue;
    }
    if (section === remoteName && token != null && /^\s*token\s*=/.test(line)) {
      out.push(tokenLine);
      wroteToken = true;
      continue;
    }
    if (section === remoteName && local != null && /^\s*config_is_local\s*=/.test(line)) {
      out.push(localLine);
      wroteLocal = true;
      continue;
    }
    if (section === remoteName && clientId != null && /^\s*client_id\s*=/.test(line)) {
      out.push(clientIdLine);
      wroteClientId = true;
      continue;
    }
    if (section === remoteName && clientSecret != null && /^\s*client_secret\s*=/.test(line)) {
      out.push(clientSecretLine);
      wroteClientSecret = true;
      continue;
    }
    if (section === remoteName && scope != null && /^\s*scope\s*=/.test(line)) {
      out.push(scopeLine);
      wroteScope = true;
      continue;
    }
    out.push(line);
  }
  finishSection();
  if (!seen) {
    if (out.length && out[out.length - 1] !== "") out.push("");
    out.push(`[${remoteName}]`, "type = drive");
    if (clientId != null) out.push(clientIdLine);
    if (clientSecret != null) out.push(clientSecretLine);
    if (scope != null) out.push(scopeLine);
    if (token != null) out.push(tokenLine);
    if (local != null) out.push(localLine);
  }
  const body = out.join(nl);
  return body.endsWith(nl) ? body : body + nl;
}

/**
 * Folder Sync owns the Google redirect. rclone must not open http://127.0.0.1:53682/
 * while that listener is up (`config update` / `config reconnect` do that and then
 * fail with "config failed to refresh token").
 */
export async function enableLocalDriveOAuth(name = "gdrive") {
  const ensured = await ensureDriveRemote(name);
  if (!ensured.ok) return ensured;
  const filePath = await rcloneConfigPath();
  if (!filePath) return { ok: true, name: ensured.name, patched: false };
  let text = "";
  try {
    text = fs.readFileSync(filePath, "utf8");
  } catch (e) {
    return { ok: false, step: "oauth_local", name: ensured.name, error: String(e?.message || e) };
  }
  const next = patchDriveRemoteConfig(text, ensured.name, { local: false });
  if (next !== text) {
    fs.writeFileSync(filePath, next, "utf8");
    invalidateRcloneConfigCache();
  }
  return { ok: true, name: ensured.name, patched: next !== text, configPath: filePath };
}

const driveAccountCache = new Map();
const driveAccountInflight = new Map();
const DRIVE_ACCOUNT_TTL_MS = 45_000;

export function invalidateDriveAccountCache(name) {
  if (!name) {
    driveAccountCache.clear();
    return;
  }
  driveAccountCache.delete(cleanRemoteName(name));
}

export async function resolveDriveOAuthClientForRemote(name = "gdrive") {
  const clean = cleanRemoteName(name);
  const dumped = await dumpRcloneConfig();
  const parsed = dumped.parsed || {};
  const cfg = parsed[clean];
  if (cfg) {
    const filePath = await rcloneConfigPath();
    if (filePath && fs.existsSync(filePath)) {
      try {
        const text = fs.readFileSync(filePath, "utf8");
        const next = patchDriveRemoteConfig(text, clean, { local: false });
        if (next !== text) {
          fs.writeFileSync(filePath, next, "utf8");
          invalidateRcloneConfigCache();
        }
      } catch {
        // best-effort
      }
    }
    let token = cfg.token;
    if (typeof token === "string") {
      try {
        token = JSON.parse(token);
      } catch {
        token = {};
      }
    }
    const ownClientId = String(cfg.client_id || "").trim();
    const ownClientSecret = String(cfg.client_secret || "").trim();
    const shared = (!ownClientId || !ownClientSecret) ? findSharedDriveOAuthClient(parsed) : null;
    return {
      name: clean,
      existed: true,
      clientId: ownClientId || shared?.clientId || "",
      clientSecret: ownClientSecret || shared?.clientSecret || "",
      scope: String(cfg.scope || shared?.scope || "drive").trim() || "drive",
      refreshToken: String(token?.refresh_token || ""),
    };
  }
  const shared = findSharedDriveOAuthClient(parsed);
  return {
    name: clean,
    existed: false,
    clientId: shared?.clientId || "",
    clientSecret: shared?.clientSecret || "",
    scope: shared?.scope || "drive",
    refreshToken: "",
  };
}

/** Store a Drive token in rclone.conf. Creates the remote section if it did not exist yet. */
export async function writeDriveToken(name, token, client = {}) {
  const clean = cleanRemoteName(name);
  const filePath = await rcloneConfigPath();
  if (!filePath) throw new Error("rclone config file was not found");
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const text = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  const next = patchDriveRemoteConfig(text, clean, {
    token,
    local: true,
    clientId: client?.clientId || undefined,
    clientSecret: client?.clientSecret || undefined,
    scope: client?.scope || undefined,
  });
  fs.writeFileSync(filePath, next, "utf8");
  invalidateRcloneConfigCache();
  invalidateDriveAccountCache(clean);
  recordDriveAccount(clean, {
    message: "Signed in",
    changes: [{ field: "status", before: "Sign in", after: "Signed in" }],
  });
  return filePath;
}

const DRIVE_ACCOUNTS_PATH = path.join(DATA_ROOT, "drive-accounts.json");
let ledgerCache = { mtimeMs: -1, size: -1, data: null };

export function readDriveAccountLedger() {
  try {
    const stat = fs.statSync(DRIVE_ACCOUNTS_PATH);
    if (ledgerCache.data && stat.mtimeMs === ledgerCache.mtimeMs && stat.size === ledgerCache.size) {
      return structuredClone(ledgerCache.data);
    }
    const parsed = JSON.parse(fs.readFileSync(DRIVE_ACCOUNTS_PATH, "utf8"));
    const data = parsed && typeof parsed === "object" ? parsed : {};
    ledgerCache = { mtimeMs: stat.mtimeMs, size: stat.size, data };
    return structuredClone(data);
  } catch {
    return {};
  }
}

/** First sight stores Created. A message appends one Order-style log row and refreshes Update. */
export function recordDriveAccount(name, event) {
  const clean = cleanRemoteName(name);
  const all = readDriveAccountLedger();
  const now = new Date().toISOString();
  const prev = all[clean];
  const existingRows = Object.entries(all).map(([k, v]) => ({ name: k, ...(v || {}) }));
  const assignedCode = prev?.code || nextDriveCode(existingRows);
  const row = {
    code: assignedCode,
    createdAt: prev?.createdAt || now,
    updatedAt: prev?.updatedAt || prev?.createdAt || now,
    deletedAt: prev?.deletedAt || null,
    email: prev?.email || null,
    displayName: prev?.displayName || null,
    proxyUrl: prev?.proxyUrl || "",
    bwlimit: prev?.bwlimit || "",
    note: prev?.note || "",
    activityLog: Array.isArray(prev?.activityLog) ? prev.activityLog.slice(-39) : [],
  };
  if (event?.message) {
    row.activityLog.push({
      at: now,
      message: String(event.message),
      changes: Array.isArray(event.changes) ? event.changes : undefined,
      actor: { label: "Folder Sync", source: "system" },
    });
    row.updatedAt = now;
  }
  if (!prev || !prev.code || event?.message) {
    all[clean] = row;
    ensureDriveLedgerCodes(all);
    writeDriveAccountLedger(all);
  }
  return all[clean] || row;
}

function ensureDriveLedgerCodes(all, names = []) {
  const keys = Array.from(new Set([...Object.keys(all || {}), ...names.map((n) => cleanRemoteName(n))]));
  const rows = keys.map((k) => ({ name: k, ...(all[k] || {}) }));
  const assigned = assignDriveCodes(rows);
  if (assigned.changed) {
    for (const item of assigned.accounts) {
      if (all[item.name]) {
        all[item.name].code = item.code;
      }
    }
  }
  return assigned.changed;
}

/**
 * Remove a Drive remote that has no token and no job.
 * Signed-in remotes stay until the user signs out by replacing them.
 */
function writeDriveAccountLedger(all) {
  fs.mkdirSync(DATA_ROOT, { recursive: true });
  fs.writeFileSync(DRIVE_ACCOUNTS_PATH, `${JSON.stringify(all, null, 2)}\n`, "utf8");
  try {
    const stat = fs.statSync(DRIVE_ACCOUNTS_PATH);
    ledgerCache = { mtimeMs: stat.mtimeMs, size: stat.size, data: structuredClone(all) };
  } catch {
    ledgerCache = { mtimeMs: -1, size: -1, data: null };
  }
}

/** Hide the account from Live. The rclone remote stays until Delete forever. */
export function trashDriveAccount(name) {
  const clean = cleanRemoteName(name);
  const all = readDriveAccountLedger();
  const prev = all[clean] || {};
  const now = new Date().toISOString();
  all[clean] = {
    ...prev,
    createdAt: prev.createdAt || now,
    updatedAt: now,
    deletedAt: now,
    activityLog: Array.isArray(prev.activityLog) ? prev.activityLog : [],
  };
  writeDriveAccountLedger(all);
  return { ok: true, name: clean, trashed: true };
}

export function restoreDriveAccount(name) {
  const clean = cleanRemoteName(name);
  const all = readDriveAccountLedger();
  const prev = all[clean];
  if (!prev?.deletedAt) return { ok: false, error: "not_in_trash", name: clean };
  all[clean] = { ...prev, deletedAt: null, updatedAt: new Date().toISOString() };
  writeDriveAccountLedger(all);
  return { ok: true, name: clean };
}

export function updateDriveAccountNetwork(name, { proxyUrl, bwlimit, note } = {}) {
  const clean = cleanRemoteName(name);
  const all = readDriveAccountLedger();
  const now = new Date().toISOString();
  const prev = all[clean] || recordDriveAccount(clean);
  const nextProxy = proxyUrl !== undefined ? normalizeProxyUrl(proxyUrl) : String(prev.proxyUrl || "");
  const nextBw = bwlimit !== undefined ? normalizeBwlimit(bwlimit) : String(prev.bwlimit || "");
  const nextNote = note !== undefined ? String(note || "") : String(prev.note || "");
  const changes = [];
  if (nextProxy !== String(prev.proxyUrl || "")) {
    changes.push({
      field: "proxyUrl",
      before: redactProxyUrl(prev.proxyUrl) || "System default",
      after: redactProxyUrl(nextProxy) || "System default",
    });
  }
  if (nextBw !== String(prev.bwlimit || "")) {
    changes.push({
      field: "bwlimit",
      before: prev.bwlimit || "Inherit",
      after: nextBw || "Inherit",
    });
  }
  if (nextNote !== String(prev.note || "")) {
    changes.push({
      field: "note",
      before: String(prev.note || ""),
      after: nextNote,
    });
  }
  const activityLog = Array.isArray(prev.activityLog) ? prev.activityLog.slice(-39) : [];
  if (changes.length > 0) {
    activityLog.push({
      at: now,
      message: changes
        .map((c) => {
          const label = c.field === "proxyUrl" ? "Proxy" : c.field === "bwlimit" ? "Bandwidth" : "Note";
          return `${label}: ${c.before || "—"} → ${c.after || "—"}`;
        })
        .join(" · "),
      changes,
      actor: { label: "Folder Sync", source: "system" },
    });
  }
  all[clean] = {
    ...prev,
    proxyUrl: nextProxy,
    bwlimit: nextBw,
    note: nextNote,
    updatedAt: changes.length > 0 ? now : prev.updatedAt || now,
    activityLog,
  };
  ensureDriveLedgerCodes(all, [clean]);
  writeDriveAccountLedger(all);
  return {
    ok: true,
    name: clean,
    code: all[clean].code,
    proxyUrl: nextProxy,
    bwlimit: nextBw,
    note: nextNote,
  };
}

export async function deleteDriveRemote(name, jobs = [], opts = {}) {
  const clean = cleanRemoteName(name);
  const used = (Array.isArray(jobs) ? jobs : []).filter(
    (job) => !job?.deletedAt && remoteNameFromSpec(job?.remote) === clean,
  ).length;
  if (used) return { ok: false, error: "drive_in_use", name: clean, jobs: used };
  const dumped = await dumpRcloneConfig();
  if (!dumped.parsed) {
    return { ok: false, error: "config_dump_parse", name: clean };
  }
  const parsed = dumped.parsed;
  const cfg = parsed[clean];
  if (!cfg || String(cfg.type || "") !== "drive") return { ok: false, error: "not_found", name: clean };
  if (!opts.forever && driveTokenPresent(cfg)) return { ok: false, error: "signed_in", name: clean };
  const filePath = await rcloneConfigPath();
  if (!filePath) return { ok: false, error: "config_missing", name: clean };
  const text = fs.readFileSync(filePath, "utf8");
  const next = removeRemoteSection(text, clean);
  if (next === text) return { ok: false, error: "not_found", name: clean };
  fs.writeFileSync(filePath, next, "utf8");
  invalidateRcloneConfigCache();
  invalidateDriveAccountCache(clean);
  const all = readDriveAccountLedger();
  if (all[clean]) {
    delete all[clean];
    writeDriveAccountLedger(all);
  }
  return { ok: true, name: clean };
}

/** Repair a sign-in row to before → after, and record Gmail once when Google returns it. */
export function ensureDriveAccountLog(name, facts) {
  const clean = cleanRemoteName(name);
  const all = readDriveAccountLedger();
  const prev = all[clean];
  if (!prev) return recordDriveAccount(name);
  const log = (Array.isArray(prev.activityLog) ? prev.activityLog : []).map((entry) => ({
    ...entry,
    changes: Array.isArray(entry.changes) ? entry.changes.map((change) => ({ ...change })) : entry.changes,
  }));
  let changed = false;
  for (const entry of log) {
    for (const change of entry.changes || []) {
      if (change.field === "status" && change.after === "Signed in" && !String(change.before || "").trim()) {
        change.before = "Sign in";
        changed = true;
      }
    }
  }
  const email = String(facts?.email || "").trim();
  const displayName = String(facts?.displayName || "").trim();
  if (email && prev.email !== email) {
    prev.email = email;
    changed = true;
  }
  if (displayName && prev.displayName !== displayName) {
    prev.displayName = displayName;
    changed = true;
  }
  const hasEmail = log.some((entry) =>
    (entry.changes || []).some((change) => change.field === "email" && change.after === email),
  );
  if (email && !hasEmail) {
    const now = new Date().toISOString();
    log.push({
      at: now,
      message: `Gmail: — → ${email}`,
      changes: [{ field: "email", before: "", after: email }],
      actor: { label: "Folder Sync", source: "system" },
    });
    prev.updatedAt = now;
    changed = true;
  }
  if (!changed) return prev;
  prev.activityLog = log.slice(-40);
  all[clean] = prev;
  writeDriveAccountLedger(all);
  return prev;
}

/** First http(s) URL rclone prints while the Google consent page is starting. */
export function extractAuthUrl(text) {
  const match = String(text || "").match(/https?:\/\/[^\s"'<>]+/);
  return match ? match[0].replace(/[)>.,]+$/, "") : null;
}

/** Relative Drive path. `null` when the input walks out with `.` or `..`. */
export function safeDriveDir(input) {
  const rel = String(input || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
  if (!rel) return "";
  const parts = rel.split("/").filter(Boolean);
  if (parts.some((part) => part === "." || part === "..")) return null;
  return parts.join("/");
}

function cleanRemoteName(name = "gdrive") {
  return String(name || "gdrive").replace(/:$/, "").trim() || "gdrive";
}

/** True when rclone already stored a Google token for this remote. */
export function driveTokenPresent(cfg) {
  let token = cfg?.token;
  if (!token) return false;
  if (typeof token === "string") {
    try {
      token = JSON.parse(token);
    } catch {
      return false;
    }
  }
  return Boolean(String(token?.refresh_token || token?.access_token || "").trim());
}

function remoteNameFromSpec(remote) {
  const raw = String(remote || "").trim();
  const colon = raw.indexOf(":");
  return (colon >= 0 ? raw.slice(0, colon) : raw).replace(/:$/, "").trim();
}

/** Email + name from Drive `about.user`. Ignores anything that is not an email. */
export function bytesField(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function driveStorageFromAboutBody(body) {
  const quota = body?.storageQuota || {};
  return {
    usedBytes: bytesField(quota.usage),
    limitBytes: bytesField(quota.limit),
    driveBytes: bytesField(quota.usageInDrive),
    trashBytes: bytesField(quota.usageInDriveTrash),
  };
}

export function driveUserFromAboutBody(body) {
  const user = body?.user || {};
  const email = String(user.emailAddress || "").trim();
  const displayName = String(user.displayName || "").trim();
  return {
    email: email.includes("@") ? email : null,
    displayName: displayName || null,
    storage: driveStorageFromAboutBody(body),
  };
}

/** Strip tokens and OAuth codes before a log line reaches the Jobs console. */
export function redactOauthLog(text) {
  return String(text || "")
    .replace(/ya29\.[A-Za-z0-9_\-]+/g, "token=<redacted>")
    .replace(/1\/\/[A-Za-z0-9_\-]+/g, "refresh=<redacted>")
    .replace(/(token|refresh_token|client_secret|access_token)\s*[:=]\s*\S+/gi, "$1=<redacted>")
    .replace(/code=[^&\s]+/gi, "code=<redacted>");
}

/** Console block for one OAuth session. `exitCode` null means the listener is still up. */
export function formatOauthConsoleLines(name, log = {}) {
  const body = redactOauthLog(`${log.stderr || ""}\n${log.stdout || ""}`);
  const rows = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-40);
  const state = log.exitCode == null ? "running" : `exit=${log.exitCode}`;
  return [`OAuth ${name} ${state}`, ...rows];
}

async function readDriveAccessToken(name) {
  const dumped = await dumpRcloneConfig();
  if (!dumped.parsed) return null;
  const cfg = dumped.parsed[name];
  if (!cfg) return null;
  let token = cfg.token;
  if (typeof token === "string") {
    try {
      token = JSON.parse(token);
    } catch {
      return null;
    }
  }
  const access = String(token?.access_token || "");
  return access || null;
}

async function googleDriveUser(access) {
  const res = await fetch(
    "https://www.googleapis.com/drive/v3/about?fields=user(emailAddress,displayName),storageQuota(limit,usage,usageInDrive,usageInDriveTrash)",
    { headers: { Authorization: `Bearer ${access}` } },
  );
  if (res.status === 401) return { email: null, displayName: null, unauthorized: true };
  const body = await res.json().catch(() => ({}));
  return { ...driveUserFromAboutBody(body), unauthorized: false };
}

/** Google account on this Drive remote. Token stays in-process and is never returned. */
export async function fetchDriveAccount(name = "gdrive") {
  const clean = cleanRemoteName(name);
  const cached = driveAccountCache.get(clean);
  if (cached && Date.now() - cached.at < DRIVE_ACCOUNT_TTL_MS) {
    return cached.value;
  }
  if (driveAccountInflight.has(clean)) {
    return driveAccountInflight.get(clean);
  }
  const promise = (async () => {
    try {
      const empty = { email: null, displayName: null, storage: null };
      let access = await readDriveAccessToken(clean);
      if (!access) return empty;
      let user = await googleDriveUser(access);
      if (user.unauthorized) {
        await runRclone(["about", `${clean}:`, "--json"], { timeoutMs: 25_000 });
        invalidateRcloneConfigCache();
        access = await readDriveAccessToken(clean);
        if (!access) return empty;
        user = await googleDriveUser(access);
      }
      const value = { email: user.email, displayName: user.displayName, storage: user.storage || null };
      if (value.email || value.storage) {
        driveAccountCache.set(clean, { at: Date.now(), value });
      }
      return value;
    } finally {
      driveAccountInflight.delete(clean);
    }
  })();
  driveAccountInflight.set(clean, promise);
  return promise;
}

/** True when `rclone about` can talk to the remote (token present and accepted). */
export async function probeDriveRemote(name = "gdrive") {
  const clean = cleanRemoteName(name);
  const about = await runRclone(["about", `${clean}:`, "--json"], { timeoutMs: 25_000 });
  if (about.ok) {
    invalidateRcloneConfigCache();
    invalidateDriveAccountCache(clean);
  }
  const account = about.ok ? await fetchDriveAccount(clean) : { email: null, displayName: null };
  return {
    ok: about.ok,
    name: clean,
    authorized: about.ok,
    email: account.email,
    displayName: account.displayName,
    error: about.ok ? null : redactOauthLog(about.stderr || about.stdout || "not_authorized").slice(0, 500),
  };
}

/** Drive remotes already stored in rclone.conf, with sign-in state. */
export async function listDriveAccounts() {
  const dumped = await dumpRcloneConfig();
  if (!dumped.parsed) {
    if (dumped.parseError) {
      return { ok: false, accounts: [], error: "config_dump_invalid" };
    }
    return { ok: false, accounts: [], error: redactOauthLog(dumped.stderr || "config_dump_failed").slice(0, 180) };
  }
  const parsed = dumped.parsed;
  const names = Object.entries(parsed)
    .filter(([, cfg]) => String(cfg?.type || "") === "drive")
    .map(([name]) => name);
  const accounts = await Promise.all(
    names.map(async (name) => {
      const linked = driveTokenPresent(parsed[name]);
      let meta = recordDriveAccount(name);
      if (meta.deletedAt) {
        return {
          name,
          code: meta.code,
          authorized: linked,
          email: meta.email || null,
          displayName: meta.displayName || null,
          proxyUrl: meta.proxyUrl || "",
          bwlimit: meta.bwlimit || "",
          note: meta.note || "",
          storage: null,
          createdAt: meta.createdAt,
          updatedAt: meta.updatedAt,
          deletedAt: meta.deletedAt,
          activityLog: meta.activityLog,
        };
      }
      if (linked && meta.activityLog.length === 0) {
        meta = recordDriveAccount(name, {
          message: "Signed in",
          changes: [{ field: "status", before: "Sign in", after: "Signed in" }],
        });
      }
      if (!linked || meta.deletedAt) {
        const who = meta.deletedAt ? ledgerDriveIdentity(name) : { email: null, displayName: null };
        return {
          name,
          code: meta.code,
          authorized: linked,
          email: who.email,
          displayName: who.displayName,
          proxyUrl: meta.proxyUrl || "",
          bwlimit: meta.bwlimit || "",
          note: meta.note || "",
          storage: null,
          createdAt: meta.createdAt,
          updatedAt: meta.updatedAt,
          deletedAt: meta.deletedAt || null,
          activityLog: meta.activityLog,
        };
      }
      const account = await fetchDriveAccount(name);
      meta = ensureDriveAccountLog(name, { email: account.email, displayName: account.displayName });
      return {
        name,
        code: meta.code,
        authorized: true,
        email: account.email,
        displayName: account.displayName,
        proxyUrl: meta.proxyUrl || "",
        bwlimit: meta.bwlimit || "",
        note: meta.note || "",
        storage: account.storage,
        createdAt: meta.createdAt,
        updatedAt: meta.updatedAt,
        deletedAt: meta.deletedAt || null,
        activityLog: meta.activityLog,
      };
    }),
  );
  const assigned = assignDriveCodes(accounts);
  if (assigned.changed) {
    const ledger = readDriveAccountLedger();
    for (const acc of assigned.accounts) {
      if (ledger[acc.name]) ledger[acc.name].code = acc.code;
    }
    writeDriveAccountLedger(ledger);
  }
  return { ok: true, accounts: assigned.accounts };
}

/** Drop Drive accounts whose Trash window ended and no Live job still uses them. */
export async function purgeExpiredDriveAccounts(jobs, now = Date.now()) {
  const all = readDriveAccountLedger();
  for (const [name, row] of Object.entries(all)) {
    const at = Date.parse(row?.deletedAt || "");
    if (!Number.isFinite(at) || now - at < JOB_TRASH_WINDOW_MS) continue;
    const removed = await deleteDriveRemote(name, jobs, { forever: true });
    if (!removed.ok && removed.error !== "not_found") continue;
    const fresh = readDriveAccountLedger();
    if (fresh[name]) {
      delete fresh[name];
      writeDriveAccountLedger(fresh);
    }
  }
}

/** Email already stored on the ledger, or the last Gmail log row. No Google call. */
function ledgerDriveIdentity(name, ledgerSnapshot) {
  const all = ledgerSnapshot || readDriveAccountLedger();
  const row = all[cleanRemoteName(name)] || {};
  let email = String(row.email || "").trim();
  let displayName = String(row.displayName || "").trim();
  const logs = Array.isArray(row.activityLog) ? row.activityLog : [];
  for (let i = logs.length - 1; i >= 0 && !email; i -= 1) {
    const change = (logs[i].changes || []).find((item) => item.field === "email" && String(item.after || "").includes("@"));
    if (change) email = String(change.after).trim();
  }
  return { email: email || null, displayName: displayName || null };
}

/**
 * Name + email for path labels. Skips Google and the inventory payload so a job
 * row can paint `email/Folder` before the full account poll returns.
 */
export async function listDriveAccountIdentities() {
  const dumped = await dumpRcloneConfig();
  if (!dumped.parsed) {
    if (dumped.parseError) {
      return { ok: false, accounts: [], error: "config_dump_invalid" };
    }
    return { ok: false, accounts: [], error: redactOauthLog(dumped.stderr || "config_dump_failed").slice(0, 180) };
  }
  const parsed = dumped.parsed;
  const ledger = readDriveAccountLedger();
  const accounts = Object.entries(parsed)
    .filter(([, cfg]) => String(cfg?.type || "") === "drive")
    .map(([name]) => {
      const who = ledgerDriveIdentity(name, ledger);
      return {
        name,
        code: ledger[name]?.code || undefined,
        authorized: driveTokenPresent(parsed[name]),
        email: who.email,
        displayName: who.displayName,
        createdAt: ledger[name]?.createdAt || undefined,
        deletedAt: ledger[name]?.deletedAt || null,
      };
    });
  const assigned = assignDriveCodes(accounts);
  return { ok: true, accounts: assigned.accounts };
}

/**
 * Scan and move legacy `_FolderSyncBackups` folders on connected Google Drive accounts
 * into Google Drive Trash (`--drive-use-trash`).
 * @param {{ remoteName?: string, dry?: boolean }} [opts]
 */
export async function cleanLegacyDriveBackups(opts = {}) {
  const dry = Boolean(opts.dry);
  const dumped = await dumpRcloneConfig();
  if (!dumped.parsed) {
    return { ok: false, error: "config_dump_failed", totalFiles: 0, remotes: [] };
  }
  const parsed = dumped.parsed;
  const targetNames = opts.remoteName
    ? [cleanRemoteName(opts.remoteName)].filter((n) => parsed[n] && String(parsed[n]?.type || "") === "drive")
    : Object.entries(parsed)
        .filter(([, cfg]) => String(cfg?.type || "") === "drive" && driveTokenPresent(cfg))
        .map(([name]) => name);

  let totalFiles = 0;
  const remotes = [];
  for (const name of targetNames) {
    const spec = `${name}:_FolderSyncBackups`;
    const listed = await runRclone(["lsf", spec, "--recursive", "--files-only"], {
      timeoutMs: 60_000,
      remoteName: name,
    });
    if (!listed.ok) {
      remotes.push({ name, files: 0, cleaned: false });
      continue;
    }
    const files = String(listed.stdout || "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    totalFiles += files.length;
    if (!dry) {
      await runRclone(["purge", spec, "--drive-use-trash"], {
        timeoutMs: 180_000,
        remoteName: name,
      }).catch(() => undefined);
    }
    remotes.push({ name, files: files.length, cleaned: !dry && files.length > 0 });
  }
  return {
    ok: true,
    dry,
    totalFiles,
    remotes,
  };
}

/**
 * Permanently empty Google Drive Trash for one connected Drive account via `rclone cleanup <remote>:`.
 * @param {string} name
 */
export async function emptyDriveTrash(name = "gdrive") {
  const clean = cleanRemoteName(name);
  if (!(await driveAccountReady(`${clean}:`))) {
    return { ok: false, name: clean, error: "drive_not_authorized" };
  }
  const res = await runRclone(["cleanup", `${clean}:`], {
    timeoutMs: 300_000,
    remoteName: clean,
  });
  if (!res.ok) {
    return {
      ok: false,
      name: clean,
      error: redactOauthLog(res.stderr || res.stdout || "cleanup_failed").slice(0, 200),
    };
  }
  invalidateDriveAccountCache(clean);
  recordDriveAccount(clean, {
    message: "Emptied Google Drive Trash",
    changes: [{ field: "trash", before: "Trash", after: "0 B" }],
  });
  return { ok: true, name: clean };
}

/** Sync may use this remote only after Google OAuth has stored a token. */
export async function driveAccountReady(remoteSpec) {
  const name = remoteNameFromSpec(remoteSpec);
  if (!name) return false;
  const dumped = await dumpRcloneConfig();
  if (!dumped.parsed) return false;
  const cfg = dumped.parsed[name];
  if (!cfg || String(cfg.type || "") !== "drive") return false;
  return driveTokenPresent(cfg);
}

const driveListInflight = new Map();

/** One level of Drive folders under `dirPath` (empty = remote root). */
export async function listDriveFolders(name = "gdrive", dirPath = "") {
  const clean = cleanRemoteName(name);
  const rel = safeDriveDir(dirPath);
  if (rel === null) {
    return { ok: false, name: clean, path: "", folders: [], error: "invalid_path" };
  }
  const spec = rel ? `${clean}:${rel}` : `${clean}:`;
  const inflightKey = `folders:${spec}`;
  if (driveListInflight.has(inflightKey)) {
    return driveListInflight.get(inflightKey);
  }
  const promise = (async () => {
    try {
      const listed = await runRclone(["lsjson", spec, "--dirs-only", "--max-depth", "1"], { timeoutMs: 40_000 });
      if (!listed.ok) {
        return {
          ok: false,
          name: clean,
          path: rel,
          folders: [],
          error: String(listed.stderr || listed.stdout || "list_failed").slice(0, 500),
        };
      }
      let rows = [];
      try {
        rows = JSON.parse(listed.stdout || "[]");
      } catch {
        rows = [];
      }
      const folders = (Array.isArray(rows) ? rows : [])
        .map((row) => {
          const folderName = String(row?.Name || row?.Path || "").replace(/\/+$/, "");
          if (!folderName || folderName.includes("/") || folderName.includes("\\")) return null;
          return {
            name: folderName,
            path: rel ? `${rel}/${folderName}` : folderName,
          };
        })
        .filter(Boolean);
      return { ok: true, name: clean, path: rel, folders };
    } finally {
      driveListInflight.delete(inflightKey);
    }
  })();
  driveListInflight.set(inflightKey, promise);
  return promise;
}

/** One Drive level: folders and files. `remoteSpec` is `name:path` (the job remote). */
export async function listDriveEntries(remoteSpec, dirPath = "") {
  const spec = String(remoteSpec || "gdrive:");
  const colon = spec.indexOf(":");
  const name = cleanRemoteName(colon >= 0 ? spec.slice(0, colon) : spec);
  const base = colon >= 0 ? spec.slice(colon + 1).replace(/^\/+|\/+$/g, "") : "";
  const rel = safeDriveDir(dirPath);
  if (rel === null) return { ok: false, entries: [], error: "invalid_path" };
  const full = [base, rel].filter(Boolean).join("/");
  const target = full ? `${name}:${full}` : `${name}:`;
  const inflightKey = `entries:${target}`;
  if (driveListInflight.has(inflightKey)) {
    return driveListInflight.get(inflightKey);
  }
  const promise = (async () => {
    try {
      const listed = await runRclone(["lsjson", target, "--max-depth", "1"], { timeoutMs: 45_000 });
      if (!listed.ok) {
        return {
          ok: false,
          entries: [],
          error: redactOauthLog(String(listed.stderr || listed.stdout || "list_failed")).slice(0, 300),
        };
      }
      let rows = [];
      try {
        rows = JSON.parse(listed.stdout || "[]");
      } catch {
        rows = [];
      }
      const entries = (Array.isArray(rows) ? rows : [])
        .map((row) => {
          const entryName = String(row?.Name || "").replace(/\/+$/, "");
          if (!entryName || entryName.includes("/") || entryName.includes("\\")) return null;
          const isDir = Boolean(row?.IsDir);
          const size = Number(row?.Size);
          return {
            name: entryName,
            kind: isDir ? "folder" : "file",
            size: isDir || !Number.isFinite(size) || size < 0 ? null : size,
            modTime: row?.ModTime ? String(row.ModTime) : null,
          };
        })
        .filter(Boolean);
      return { ok: true, entries, parentPath: full };
    } finally {
      driveListInflight.delete(inflightKey);
    }
  })();
  driveListInflight.set(inflightKey, promise);
  return promise;
}

/** Listings were lost. rclone will not continue until one --resync rebuilds them. */
export function bisyncNeedsResync(logText) {
  const text = String(logText || "");
  return /Must run --resync to recover/i.test(text) || /cannot find prior Path1 or Path2 listings/i.test(text);
}

export function buildTransferArgs(job, { dry = false } = {}) {
  const stampId = stamp();
  const conflictDir = path.join(CONFLICT_ROOT, job.id || "job", stampId);
  fs.mkdirSync(conflictDir, { recursive: true });

  const remote = String(job.remote || "gdrive:");
  const colon = remote.indexOf(":");
  const remoteName = colon >= 0 ? remote.slice(0, colon) : "gdrive";
  const driveTrashLabel = `${remoteName}: (Google Drive Trash)`;
  const localTrash = path.join(TRASH_ROOT, job.id || "job", stampId);
  fs.mkdirSync(localTrash, { recursive: true });

  const netArgs = buildRcloneNetworkArgs(
    readNetworkSettings(),
    readDriveAccountLedger()[cleanRemoteName(remoteName)],
    job,
  );
  const common = ["--drive-use-trash", "-v", "--stats", "1s", "--stats-one-line", ...netArgs, ...rcloneExcludeArgs(job.exclude)];
  if (dry) common.push("--dry-run");

  if (job.mode === "mirror-local") {
    // destination is Google Drive → deleted/overwritten files go straight into Google Drive Trash via --drive-use-trash
    return {
      args: ["sync", job.localPath, job.remote, ...common],
      backupDir: driveTrashLabel,
      conflictDir,
    };
  }
  if (job.mode === "mirror-remote") {
    // destination is local PC → move deleted/overwritten local files into TRASH_ROOT
    return {
      args: ["sync", job.remote, job.localPath, ...common, "--backup-dir", localTrash],
      backupDir: localTrash,
      conflictDir,
    };
  }

  // bisync: Path1=local (moves deleted local files to local trash), Path2=remote (moves deleted Drive files to Google Drive Trash via --drive-use-trash)
  let path1Backup = localTrash;
  try {
    const localRootDrive = path.parse(path.resolve(String(job.localPath || ""))).root.toLowerCase();
    const trashRootDrive = path.parse(path.resolve(TRASH_ROOT)).root.toLowerCase();
    if (localRootDrive && trashRootDrive && localRootDrive !== trashRootDrive) {
      const parent = path.dirname(job.localPath);
      if (parent && parent !== job.localPath) {
        path1Backup = path.join(parent, `.folder-sync-backup`, job.id || "job", stampId);
        fs.mkdirSync(path1Backup, { recursive: true });
      }
    }
  } catch {
    /* keep TRASH_ROOT fallback */
  }

  const bisync = [
    "bisync",
    job.localPath,
    job.remote,
    ...common,
    "--backup-dir1",
    path1Backup,
    "--conflict-resolve",
    "newer",
    "--conflict-loser",
    "pathname",
    "--conflict-suffix",
    `.conflict-${stampId}`,
  ];
  if (!job.lastSuccessfulSyncAt) bisync.push("--resync");
  return {
    args: bisync,
    backupDir: `${path1Backup} | ${driveTrashLabel}`,
    conflictDir,
  };
}

export function listTrash(limit = 200) {
  ensureDataRoots();
  const out = [];
  function walk(dir, rel = "") {
    if (out.length >= limit) return;
    let ents = [];
    try {
      ents = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of ents) {
      if (out.length >= limit) break;
      const full = path.join(dir, ent.name);
      const r = rel ? `${rel}/${ent.name}` : ent.name;
      if (ent.isDirectory()) walk(full, r);
      else {
        const st = fs.statSync(full);
        out.push({ path: r, bytes: st.size, mtime: st.mtime.toISOString() });
      }
    }
  }
  walk(TRASH_ROOT);
  walk(BACKUP_ROOT);
  return out;
}

export function purgeTrash() {
  ensureDataRoots();
  for (const dir of [TRASH_ROOT, BACKUP_ROOT]) {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
  }
  return { ok: true };
}
