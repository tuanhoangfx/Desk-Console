import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import tls from "node:tls";

function resolveDataRoot() {
  return (
    process.env.FOLDER_SYNC_DATA_ROOT ||
    path.join(process.env.APPDATA || path.join(os.homedir(), ".config"), "folder-sync")
  );
}

function networkSettingsPath() {
  const root = resolveDataRoot();
  fs.mkdirSync(root, { recursive: true });
  return path.join(root, "network-settings.json");
}

export const VALID_BWLIMITS = new Set(["", "2M", "5M", "10M", "25M", "50M"]);
export const VALID_TPSLIMITS = new Set([0, 4, 8, 12]);
export const VALID_TRANSFERS = new Set([2, 4, 8]);
export const VALID_MAX_FILE_SIZES = new Set(["", "500M", "1G", "2G", "5G", "10G"]);

export const DEFAULT_NETWORK_SETTINGS = Object.freeze({
  bwlimit: "",
  tpslimit: 8,
  transfers: 4,
  proxyUrl: "",
  proxyFailoverToDirect: true,
});

export const PROXY_HEALTH_INTERVAL_MS = 5 * 60 * 1000;

let settingsCache = { mtimeMs: -1, size: -1, data: null };

let proxyHealthState = {
  status: "unconfigured",
  ok: true,
  proxyUrl: "",
  latencyMs: null,
  checkedAt: null,
  message: "Direct connection (no global proxy configured)",
  failoverActive: false,
};
let proxyHealthTimer = null;
let proxyHealthInflight = null;

/**
 * Normalize a proxy input string:
 * - Empty -> `""`
 * - `http://...`, `https://...`, `socks5://...`, `socks5h://...` -> kept
 * - `host:port:user:pass` -> `http://user:pass@host:port`
 * - `host:port` -> `http://host:port`
 * @param {string | null | undefined} input
 * @returns {string}
 */
export function normalizeProxyUrl(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  if (raw.toLowerCase() === "direct") return "direct";
  if (/^(https?|socks5h?):\/\//i.test(raw)) {
    try {
      const u = new URL(raw);
      if (!u.hostname || !u.port) return raw;
      return raw;
    } catch {
      return raw;
    }
  }
  // Support P0003 Stealth shorthand: host:port:user:pass
  const colonParts = raw.split(":");
  if (colonParts.length === 4 && /^\d+$/.test(colonParts[1])) {
    const [host, port, user, pass] = colonParts;
    return `http://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}`;
  }
  // Support host:port
  if (colonParts.length === 2 && /^\d+$/.test(colonParts[1])) {
    return `http://${raw}`;
  }
  return raw;
}

/**
 * Redact password from proxy URL for display/logging (`http://user:***@host:port`).
 * @param {string | null | undefined} proxyUrl
 */
export function redactProxyUrl(proxyUrl) {
  const clean = normalizeProxyUrl(proxyUrl);
  if (!clean || clean === "direct") return clean;
  try {
    const u = new URL(clean);
    if (u.password) {
      u.password = "***";
    }
    return u.toString().replace(/\/$/, "");
  } catch {
    return clean.replace(/:([^:@/]+)@/, ":***@");
  }
}

export function normalizeBwlimit(value) {
  const clean = String(value || "").trim().toUpperCase();
  if (!clean || clean === "0" || clean === "UNLIMITED" || clean === "INHERIT") return "";
  if (VALID_BWLIMITS.has(clean)) return clean;
  if (/^\d+[KMG]$/.test(clean)) return clean;
  return "";
}

export function normalizeMaxFileSize(value) {
  const clean = String(value || "").trim().toUpperCase();
  if (!clean || clean === "0" || clean === "UNLIMITED") return "";
  if (VALID_MAX_FILE_SIZES.has(clean)) return clean;
  if (/^\d+[KMG]$/.test(clean)) return clean;
  return "";
}

export function isProxyConnectionFailure(text) {
  const raw = String(text || "");
  if (!raw) return false;
  return /proxyconnect\s+tcp|socks\s+connect|Proxy\s+Authentication\s+Required|407\s+Proxy|connectex:\s*No\s+connection\s+could\s+be\s+made|ECONNREFUSED|ETIMEDOUT|unable\s+to\s+connect\s+to\s+proxy/i.test(
    raw,
  );
}

export function normalizeNetworkSettings(input = {}, existing = DEFAULT_NETWORK_SETTINGS) {
  const bwlimit =
    input.bwlimit !== undefined ? normalizeBwlimit(input.bwlimit) : normalizeBwlimit(existing?.bwlimit);
  const rawTps = input.tpslimit !== undefined ? Number(input.tpslimit) : Number(existing?.tpslimit ?? 8);
  const tpslimit = VALID_TPSLIMITS.has(rawTps) ? rawTps : 8;
  const rawTransfers = input.transfers !== undefined ? Number(input.transfers) : Number(existing?.transfers ?? 4);
  const transfers = VALID_TRANSFERS.has(rawTransfers) ? rawTransfers : 4;
  const proxyUrl =
    input.proxyUrl !== undefined ? normalizeProxyUrl(input.proxyUrl) : normalizeProxyUrl(existing?.proxyUrl);
  const proxyFailoverToDirect =
    input.proxyFailoverToDirect !== undefined
      ? Boolean(input.proxyFailoverToDirect)
      : existing?.proxyFailoverToDirect !== undefined
        ? Boolean(existing.proxyFailoverToDirect)
        : true;
  return {
    bwlimit,
    tpslimit,
    transfers,
    proxyUrl,
    proxyFailoverToDirect,
    updatedAt: new Date().toISOString(),
  };
}

export function readNetworkSettings() {
  const filePath = networkSettingsPath();
  try {
    const stat = fs.statSync(filePath);
    if (settingsCache.data && stat.mtimeMs === settingsCache.mtimeMs && stat.size === settingsCache.size) {
      return { ...settingsCache.data };
    }
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const normalized = normalizeNetworkSettings(parsed, DEFAULT_NETWORK_SETTINGS);
    settingsCache = { mtimeMs: stat.mtimeMs, size: stat.size, data: normalized };
    return { ...normalized };
  } catch {
    return { ...DEFAULT_NETWORK_SETTINGS, updatedAt: null };
  }
}

export function writeNetworkSettings(patch = {}) {
  const filePath = networkSettingsPath();
  const current = readNetworkSettings();
  const next = normalizeNetworkSettings(patch, current);
  fs.writeFileSync(filePath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  try {
    const stat = fs.statSync(filePath);
    settingsCache = { mtimeMs: stat.mtimeMs, size: stat.size, data: next };
  } catch {
    settingsCache = { mtimeMs: -1, size: -1, data: null };
  }
  if (!next.proxyUrl || next.proxyUrl === "direct") {
    proxyHealthState = {
      status: "unconfigured",
      ok: true,
      proxyUrl: "",
      latencyMs: null,
      checkedAt: new Date().toISOString(),
      message: "Direct connection (no global proxy configured)",
      failoverActive: false,
    };
  } else if (next.proxyUrl !== current.proxyUrl || next.proxyFailoverToDirect !== current.proxyFailoverToDirect) {
    proxyHealthState = {
      ...proxyHealthState,
      status: "checking",
      proxyUrl: redactProxyUrl(next.proxyUrl),
    };
    if (proxyHealthTimer) {
      void refreshProxyHealth();
    }
  }
  return { ...next };
}

/**
 * Build rclone CLI flags for bandwidth QoS (`--bwlimit`, `--tpslimit`, `--transfers`).
 * @param {{ bwlimit?: string, tpslimit?: number, transfers?: number }} [globalSettings]
 * @param {{ bwlimit?: string }} [driveOverride]
 * @param {{ bwlimit?: string }} [jobOverride]
 */
export function buildRcloneNetworkArgs(globalSettings = {}, driveOverride = {}, jobOverride = {}) {
  const args = [];
  const bwlimit =
    normalizeBwlimit(jobOverride?.bwlimit) ||
    normalizeBwlimit(driveOverride?.bwlimit) ||
    normalizeBwlimit(globalSettings?.bwlimit);
  if (bwlimit) {
    args.push("--bwlimit", bwlimit);
  }
  const tps = Number(globalSettings?.tpslimit ?? 8);
  if (Number.isFinite(tps) && tps > 0) {
    args.push("--tpslimit", String(tps), "--tpslimit-burst", String(Math.max(tps * 2, 8)));
  }
  const transfers = Number(globalSettings?.transfers ?? 4);
  if (Number.isFinite(transfers) && transfers > 0) {
    args.push("--transfers", String(transfers));
  }
  const maxFileSize = normalizeMaxFileSize(jobOverride?.maxFileSize);
  if (maxFileSize) {
    args.push("--max-size", maxFileSize);
  }
  return args;
}

/**
 * Build child process environment variables for rclone proxy routing.
 * @param {{ proxyUrl?: string }} [globalSettings]
 * @param {{ proxyUrl?: string }} [driveOverride]
 * @param {{ proxyUrl?: string }} [jobOverride]
 */
export function buildRcloneProxyEnv(globalSettings = {}, driveOverride = {}, jobOverride = {}) {
  const jobProxy = normalizeProxyUrl(jobOverride?.proxyUrl);
  if (jobProxy === "direct") return {};
  const driveProxy = normalizeProxyUrl(driveOverride?.proxyUrl);
  if (!jobProxy && driveProxy === "direct") return {};
  const globalProxy = normalizeProxyUrl(globalSettings?.proxyUrl);
  const proxyUrl = jobProxy || driveProxy || (globalProxy === "direct" ? "" : globalProxy);
  if (!proxyUrl) return {};
  return {
    HTTP_PROXY: proxyUrl,
    HTTPS_PROXY: proxyUrl,
    ALL_PROXY: proxyUrl,
    http_proxy: proxyUrl,
    https_proxy: proxyUrl,
    all_proxy: proxyUrl,
  };
}

/**
 * Probe connectivity and round-trip latency to Google Drive (`www.googleapis.com:443`)
 * either directly or via the configured HTTP/SOCKS5 proxy.
 * @param {{ proxyUrl?: string, timeoutMs?: number }} [opts]
 */
export async function probeGoogleDriveNetwork(opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 8_000;
  const proxyUrl = normalizeProxyUrl(opts.proxyUrl);
  const startedAt = Date.now();

  if (!proxyUrl || proxyUrl === "direct") {
    return new Promise((resolve) => {
      const req = https.request(
        "https://www.googleapis.com/generate_204",
        { method: "HEAD", timeout: timeoutMs },
        (res) => {
          res.resume();
          const latencyMs = Math.max(1, Date.now() - startedAt);
          resolve({
            ok: true,
            mode: "direct",
            proxyUrl: "",
            latencyMs,
            status: res.statusCode || 200,
            message: `Direct connection to Google Drive API ready (${latencyMs} ms)`,
          });
        },
      );
      req.on("timeout", () => {
        req.destroy(new Error("timeout"));
      });
      req.on("error", (err) => {
        resolve({
          ok: false,
          mode: "direct",
          proxyUrl: "",
          latencyMs: Date.now() - startedAt,
          error: String(err?.message || err),
          message: `Direct connection failed: ${String(err?.message || err)}`,
        });
      });
      req.end();
    });
  }

  let parsed;
  try {
    parsed = new URL(proxyUrl);
  } catch {
    return {
      ok: false,
      mode: "proxy",
      proxyUrl: redactProxyUrl(proxyUrl),
      latencyMs: 0,
      error: "invalid_proxy_url",
      message: "Invalid proxy URL. Use http://host:port, socks5://host:port, or host:port:user:pass.",
    };
  }

  const proxyHost = parsed.hostname;
  const proxyPort = Number(parsed.port || (parsed.protocol === "https:" ? 443 : 1080));
  if (!proxyHost || !Number.isFinite(proxyPort) || proxyPort <= 0) {
    return {
      ok: false,
      mode: "proxy",
      proxyUrl: redactProxyUrl(proxyUrl),
      latencyMs: 0,
      error: "invalid_proxy_port",
      message: "Proxy URL must include a valid host and port (e.g. http://127.0.0.1:7890).",
    };
  }

  // For HTTP/HTTPS proxy: perform HTTP CONNECT tunnel to www.googleapis.com:443 + TLS handshake
  if (parsed.protocol === "http:" || parsed.protocol === "https:") {
    return new Promise((resolve) => {
      const auth =
        parsed.username || parsed.password
          ? `Proxy-Authorization: Basic ${Buffer.from(
              `${decodeURIComponent(parsed.username)}:${decodeURIComponent(parsed.password)}`,
            ).toString("base64")}\r\n`
          : "";
      const connectReq = (parsed.protocol === "https:" ? https : http).request({
        host: proxyHost,
        port: proxyPort,
        method: "CONNECT",
        path: "www.googleapis.com:443",
        timeout: timeoutMs,
        headers: auth
          ? {
              Host: "www.googleapis.com:443",
              "Proxy-Authorization": `Basic ${Buffer.from(
                `${decodeURIComponent(parsed.username)}:${decodeURIComponent(parsed.password)}`,
              ).toString("base64")}`,
            }
          : { Host: "www.googleapis.com:443" },
      });

      connectReq.on("connect", (res, socket) => {
        if (res.statusCode !== 200) {
          socket.destroy();
          resolve({
            ok: false,
            mode: "proxy",
            proxyUrl: redactProxyUrl(proxyUrl),
            latencyMs: Date.now() - startedAt,
            error: `proxy_status_${res.statusCode}`,
            message: `Proxy rejected CONNECT tunnel (HTTP ${res.statusCode})`,
          });
          return;
        }
        const tlsSocket = tls.connect(
          {
            socket,
            servername: "www.googleapis.com",
            timeout: timeoutMs,
          },
          () => {
            const latencyMs = Math.max(1, Date.now() - startedAt);
            tlsSocket.destroy();
            resolve({
              ok: true,
              mode: "proxy",
              proxyUrl: redactProxyUrl(proxyUrl),
              latencyMs,
              status: 200,
              message: `Proxy tunnel to Google Drive API ready (${latencyMs} ms)`,
            });
          },
        );
        tlsSocket.on("error", (err) => {
          tlsSocket.destroy();
          resolve({
            ok: false,
            mode: "proxy",
            proxyUrl: redactProxyUrl(proxyUrl),
            latencyMs: Date.now() - startedAt,
            error: String(err?.message || err),
            message: `TLS handshake via proxy failed: ${String(err?.message || err)}`,
          });
        });
      });

      connectReq.on("timeout", () => {
        connectReq.destroy(new Error("timeout"));
      });
      connectReq.on("error", (err) => {
        resolve({
          ok: false,
          mode: "proxy",
          proxyUrl: redactProxyUrl(proxyUrl),
          latencyMs: Date.now() - startedAt,
          error: String(err?.message || err),
          message: `Could not reach proxy ${proxyHost}:${proxyPort} (${String(err?.message || err)})`,
        });
      });
      connectReq.end();
    });
  }

  // For SOCKS5 proxy: perform SOCKS5 handshake + TCP connect to www.googleapis.com:443
  return new Promise((resolve) => {
    const socket = net.connect({ host: proxyHost, port: proxyPort, timeout: timeoutMs }, () => {
      // SOCKS5 greeting (support no-auth 0x00 and username/password 0x02)
      const hasAuth = Boolean(parsed.username || parsed.password);
      socket.write(hasAuth ? Buffer.from([0x05, 0x02, 0x00, 0x02]) : Buffer.from([0x05, 0x01, 0x00]));
    });
    let stage = "greeting";
    socket.on("data", (buf) => {
      if (stage === "greeting") {
        if (buf[0] !== 0x05 || buf[1] === 0xff) {
          socket.destroy();
          resolve({
            ok: false,
            mode: "proxy",
            proxyUrl: redactProxyUrl(proxyUrl),
            latencyMs: Date.now() - startedAt,
            error: "socks5_auth_rejected",
            message: "SOCKS5 proxy rejected authentication method.",
          });
          return;
        }
        if (buf[1] === 0x02) {
          stage = "auth";
          const u = Buffer.from(decodeURIComponent(parsed.username || ""), "utf8");
          const p = Buffer.from(decodeURIComponent(parsed.password || ""), "utf8");
          socket.write(Buffer.concat([Buffer.from([0x01, u.length]), u, Buffer.from([p.length]), p]));
          return;
        }
        stage = "connect";
        const hostBuf = Buffer.from("www.googleapis.com", "utf8");
        socket.write(
          Buffer.concat([
            Buffer.from([0x05, 0x01, 0x00, 0x03, hostBuf.length]),
            hostBuf,
            Buffer.from([0x01, 0xbb]), // port 443
          ]),
        );
        return;
      }
      if (stage === "auth") {
        if (buf[1] !== 0x00) {
          socket.destroy();
          resolve({
            ok: false,
            mode: "proxy",
            proxyUrl: redactProxyUrl(proxyUrl),
            latencyMs: Date.now() - startedAt,
            error: "socks5_bad_credentials",
            message: "SOCKS5 proxy username/password failed.",
          });
          return;
        }
        stage = "connect";
        const hostBuf = Buffer.from("www.googleapis.com", "utf8");
        socket.write(
          Buffer.concat([
            Buffer.from([0x05, 0x01, 0x00, 0x03, hostBuf.length]),
            hostBuf,
            Buffer.from([0x01, 0xbb]),
          ]),
        );
        return;
      }
      if (stage === "connect") {
        const ok = buf[0] === 0x05 && buf[1] === 0x00;
        const latencyMs = Math.max(1, Date.now() - startedAt);
        socket.destroy();
        if (ok) {
          resolve({
            ok: true,
            mode: "proxy",
            proxyUrl: redactProxyUrl(proxyUrl),
            latencyMs,
            status: 200,
            message: `SOCKS5 tunnel to Google Drive API ready (${latencyMs} ms)`,
          });
        } else {
          resolve({
            ok: false,
            mode: "proxy",
            proxyUrl: redactProxyUrl(proxyUrl),
            latencyMs,
            error: `socks5_reply_${buf[1]}`,
            message: `SOCKS5 proxy could not connect to Google Drive (code ${buf[1]}).`,
          });
        }
      }
    });
    socket.on("timeout", () => {
      socket.destroy(new Error("timeout"));
    });
    socket.on("error", (err) => {
      resolve({
        ok: false,
        mode: "proxy",
        proxyUrl: redactProxyUrl(proxyUrl),
        latencyMs: Date.now() - startedAt,
        error: String(err?.message || err),
        message: `Could not reach SOCKS5 proxy ${proxyHost}:${proxyPort} (${String(err?.message || err)})`,
      });
    });
  });
}

/**
 * Return current cached health state for the Global Proxy.
 */
export function getProxyHealthState() {
  const settings = readNetworkSettings();
  const proxyUrl = normalizeProxyUrl(settings.proxyUrl);
  if (!proxyUrl || proxyUrl === "direct") {
    return {
      status: "unconfigured",
      ok: true,
      proxyUrl: "",
      latencyMs: null,
      checkedAt: proxyHealthState.checkedAt,
      message: "Direct connection (no global proxy configured)",
      failoverActive: false,
    };
  }
  return {
    ...proxyHealthState,
    proxyUrl: redactProxyUrl(proxyUrl),
  };
}

/**
 * Update `proxyHealthState` from a probe result for the configured global proxy.
 * @param {{ ok: boolean, latencyMs?: number, message?: string }} probed
 * @param {{ proxyUrl?: string, proxyFailoverToDirect?: boolean }} [settings]
 */
export function recordProxyProbeResult(probed, settings = readNetworkSettings()) {
  const proxyUrl = normalizeProxyUrl(settings?.proxyUrl);
  if (!proxyUrl || proxyUrl === "direct") {
    proxyHealthState = {
      status: "unconfigured",
      ok: true,
      proxyUrl: "",
      latencyMs: null,
      checkedAt: new Date().toISOString(),
      message: "Direct connection (no global proxy configured)",
      failoverActive: false,
    };
    return { ...proxyHealthState };
  }
  const failoverActive = !probed?.ok && settings?.proxyFailoverToDirect !== false;
  proxyHealthState = {
    status: probed?.ok ? "online" : "unreachable",
    ok: Boolean(probed?.ok),
    proxyUrl: redactProxyUrl(proxyUrl),
    latencyMs: Number.isFinite(probed?.latencyMs) ? probed.latencyMs : null,
    checkedAt: new Date().toISOString(),
    message: failoverActive
      ? `${probed?.message || "Proxy unreachable"} · Auto-Direct failover active`
      : String(probed?.message || (probed?.ok ? "Proxy online" : "Proxy unreachable")),
    failoverActive,
  };
  return { ...proxyHealthState };
}

/**
 * Probe the currently configured Global Proxy and update `proxyHealthState`.
 * @param {{ timeoutMs?: number, probeFn?: typeof probeGoogleDriveNetwork }} [opts]
 */
export async function refreshProxyHealth(opts = {}) {
  const settings = readNetworkSettings();
  const proxyUrl = normalizeProxyUrl(settings.proxyUrl);
  if (!proxyUrl || proxyUrl === "direct") {
    return recordProxyProbeResult({ ok: true }, settings);
  }
  if (proxyHealthInflight) return proxyHealthInflight;
  proxyHealthState = {
    ...proxyHealthState,
    status: "checking",
    proxyUrl: redactProxyUrl(proxyUrl),
  };
  const probe = opts.probeFn || probeGoogleDriveNetwork;
  proxyHealthInflight = (async () => {
    try {
      const probed = await probe({ proxyUrl, timeoutMs: opts.timeoutMs ?? 6_000 });
      return recordProxyProbeResult(probed, readNetworkSettings());
    } finally {
      proxyHealthInflight = null;
    }
  })();
  return proxyHealthInflight;
}

/**
 * Start background periodic health checks for the Global Proxy.
 * @param {{ intervalMs?: number }} [opts]
 */
export function startProxyHealthMonitor(opts = {}) {
  const intervalMs = opts.intervalMs ?? PROXY_HEALTH_INTERVAL_MS;
  if (proxyHealthTimer) {
    clearInterval(proxyHealthTimer);
    proxyHealthTimer = null;
  }
  void refreshProxyHealth();
  proxyHealthTimer = setInterval(() => {
    void refreshProxyHealth();
  }, intervalMs);
  if (typeof proxyHealthTimer.unref === "function") {
    proxyHealthTimer.unref();
  }
  return () => {
    if (proxyHealthTimer) {
      clearInterval(proxyHealthTimer);
      proxyHealthTimer = null;
    }
  };
}

