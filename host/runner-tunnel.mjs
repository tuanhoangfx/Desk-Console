import fs from "node:fs";
import { spawn } from "node:child_process";
import { DEV_ROOT } from "./windows.mjs";

const TRY_CF_RE = /https:\/\/[a-z0-9-]+\.trycloudflare\.com\b/i;
const TUNNEL_TTL_MS = 30 * 60_000;

/**
 * @type {Map<string, {
 *   id: string;
 *   code: string;
 *   port: number;
 *   openPath: string;
 *   proc: import("node:child_process").ChildProcess;
 *   state: "starting" | "active";
 *   baseUrl: string | null;
 *   previewUrl: string | null;
 *   startedAt: string;
 *   ttlTimer: ReturnType<typeof setTimeout>;
 * }>}
 */
const activeTunnels = new Map();

export function resolveCloudflaredExe() {
  const candidates = [
    process.env.CLOUDFLARED_BIN,
    "C:\\Program Files (x86)\\cloudflared\\cloudflared.exe",
    "C:\\Program Files\\cloudflared\\cloudflared.exe",
  ].filter(Boolean);
  for (const cand of candidates) {
    if (cand && fs.existsSync(cand)) return cand;
  }
  return "cloudflared";
}

function buildPreviewUrl(baseUrl, openPath = "/") {
  if (!baseUrl) return null;
  const cleanPath = String(openPath || "/").trim();
  if (!cleanPath || cleanPath === "/") return baseUrl;
  return `${baseUrl}${cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`}`;
}

export function getRunnerTunnelSnapshot(runnerId) {
  const key = String(runnerId || "").toUpperCase();
  const entry = activeTunnels.get(key);
  if (!entry) return null;
  return {
    state: entry.state,
    url: entry.previewUrl || entry.baseUrl,
    baseUrl: entry.baseUrl,
    startedAt: entry.startedAt,
  };
}

export function stopRunnerTunnel(runnerIdOrCode) {
  const key = String(runnerIdOrCode || "").toUpperCase();
  let stopped = false;
  for (const [k, entry] of [...activeTunnels.entries()]) {
    if (k === key || entry.code === key) {
      clearTimeout(entry.ttlTimer);
      activeTunnels.delete(k);
      try {
        entry.proc.kill();
      } catch {
        /* already exited */
      }
      stopped = true;
    }
  }
  return stopped;
}

export async function startRunnerTunnel({ id, code, port, openPath = "/" }) {
  const key = String(id || code || "").toUpperCase();
  if (!key || !Number.isFinite(Number(port)) || Number(port) <= 0) {
    throw new Error("Valid runner id and port required");
  }
  const existing = activeTunnels.get(key);
  if (existing && (existing.previewUrl || existing.state === "starting")) {
    return getRunnerTunnelSnapshot(key);
  }

  stopRunnerTunnel(key);
  const exe = resolveCloudflaredExe();
  const targetUrl = `http://127.0.0.1:${Number(port)}`;
  const args = [
    "tunnel",
    "--no-autoupdate",
    "--loglevel",
    "info",
    "--url",
    targetUrl,
    "--http-host-header",
    `127.0.0.1:${Number(port)}`,
  ];

  const proc = spawn(exe, args, {
    cwd: DEV_ROOT,
    windowsHide: true,
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const startedAt = new Date().toISOString();
  const ttlTimer = setTimeout(() => {
    stopRunnerTunnel(key);
  }, TUNNEL_TTL_MS);
  if (typeof ttlTimer.unref === "function") ttlTimer.unref();

  const entry = {
    id: key,
    code: String(code || key).toUpperCase(),
    port: Number(port),
    openPath: String(openPath || "/"),
    proc,
    state: /** @type {"starting" | "active"} */ ("starting"),
    baseUrl: null,
    previewUrl: null,
    startedAt,
    ttlTimer,
  };
  activeTunnels.set(key, entry);

  return new Promise((resolve, reject) => {
    let settled = false;
    const settleOk = () => {
      if (settled) return;
      settled = true;
      clearTimeout(waitTimer);
      resolve(getRunnerTunnelSnapshot(key));
    };
    const settleErr = (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(waitTimer);
      stopRunnerTunnel(key);
      reject(err instanceof Error ? err : new Error(String(err)));
    };

    const waitTimer = setTimeout(() => {
      if (entry.baseUrl) {
        entry.state = "active";
        settleOk();
      } else {
        settleErr(new Error("Timed out waiting for cloudflared Quick Tunnel URL"));
      }
    }, 14_000);

    const onChunk = (buf) => {
      const text = String(buf || "");
      const m = text.match(TRY_CF_RE);
      if (m && !entry.baseUrl) {
        entry.baseUrl = m[0];
        entry.previewUrl = buildPreviewUrl(m[0], entry.openPath);
        entry.state = "active";
        settleOk();
      }
    };

    proc.stdout?.on("data", onChunk);
    proc.stderr?.on("data", onChunk);
    proc.once("error", (err) => settleErr(err));
    proc.once("exit", () => {
      const cur = activeTunnels.get(key);
      if (cur?.proc === proc) {
        clearTimeout(cur.ttlTimer);
        activeTunnels.delete(key);
      }
      if (!settled) {
        settleErr(new Error("cloudflared exited before publishing tunnel URL"));
      }
    });
  });
}

export async function toggleRunnerTunnel(target, action = "toggle") {
  const key = String(target?.id || target?.code || "").toUpperCase();
  const current = getRunnerTunnelSnapshot(key);
  if (action === "stop" || (action === "toggle" && current)) {
    stopRunnerTunnel(key);
    return { active: false, url: null, state: null };
  }
  const snap = await startRunnerTunnel(target);
  return {
    active: Boolean(snap?.url),
    url: snap?.url ?? null,
    state: snap?.state ?? null,
    startedAt: snap?.startedAt ?? null,
  };
}

function cleanupAllTunnels() {
  for (const key of [...activeTunnels.keys()]) {
    stopRunnerTunnel(key);
  }
}

process.once("exit", cleanupAllTunnels);
process.once("SIGINT", cleanupAllTunnels);
process.once("SIGTERM", cleanupAllTunnels);
