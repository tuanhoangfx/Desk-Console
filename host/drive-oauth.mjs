import http from "node:http";
import { randomBytes } from "node:crypto";
import {
  fetchDriveAccount,
  redactOauthLog,
  resolveDriveOAuthClientForRemote,
  writeDriveToken,
} from "./rclone-ops.mjs";
import { findListeningPidsByPortNative } from "./runners.mjs";

/** rclone's Drive redirect. The Google client is registered to this exact URI. */
export const DRIVE_OAUTH_REDIRECT_URI = "http://127.0.0.1:53682/";
export const DRIVE_OAUTH_CALLBACK_PORT = 53682;
const CALLBACK_PORT = DRIVE_OAUTH_CALLBACK_PORT;

let callbackServer = null;
let lastReclaimedCallbackPid = null;
/** @type {null | { state: string, name: string, clientId: string, clientSecret: string, refreshToken: string, record: any, log: string }} */
let pending = null;

export function driveScopeUrl(scope) {
  const raw = String(scope || "drive").trim();
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw === "drive") return "https://www.googleapis.com/auth/drive";
  return raw;
}

export function buildDriveAuthUrl({ clientId, scope, state }) {
  const q = new URLSearchParams({
    client_id: clientId,
    redirect_uri: DRIVE_OAUTH_REDIRECT_URI,
    response_type: "code",
    scope: driveScopeUrl(scope),
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/auth?${q}`;
}

export function rcloneTokenFromGoogle(google, existingRefresh = "") {
  const expiresIn = Number(google?.expires_in || 3600);
  return {
    access_token: String(google?.access_token || ""),
    token_type: String(google?.token_type || "Bearer"),
    refresh_token: String(google?.refresh_token || existingRefresh || ""),
    expiry: new Date(Date.now() + expiresIn * 1000).toISOString(),
  };
}

function escHtml(value) {
  return String(value || "").replace(/[&<>"]/g, (ch) => {
    if (ch === "&") return "&amp;";
    if (ch === "<") return "&lt;";
    if (ch === ">") return "&gt;";
    return "&quot;";
  });
}

/**
 * Cockpit OAuth (cockpit.conf [OAuth]): the app adds redirect_uri, then the
 * callback page reads TokenParam `access_token` and ErrorParam `error_description`
 * from the query string or the URL fragment. The fragment never reaches the server,
 * so this page copies it into the query and reloads. rclone is not the auth server.
 */
export function oauthHashCaptureHtml() {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Folder Sync</title></head><body style="font-family:sans-serif;text-align:center;padding:48px;background:#0b1020;color:#e8eefc;"><p>Finishing Google sign-in…</p><script>
var hash = new URLSearchParams(String(location.hash || "").replace(/^#/, ""));
var query = new URLSearchParams(location.search);
["access_token","refresh_token","error","error_description","code","state","expires_in","token_type"].forEach(function(key){
  if (!query.get(key) && hash.get(key)) query.set(key, hash.get(key));
});
if (hash.get("access_token") || hash.get("error") || hash.get("error_description") || hash.get("code")) {
  location.replace("/?" + query.toString());
}
</script></body></html>`;
}

/** Folder Sync owns the browser tab. rclone must not render this page. */
export function oauthResultHtml({ ok, message = "" }) {
  const title = ok ? "Signed in" : "Sign-in failed";
  const color = ok ? "#4ade80" : "#f87171";
  const body = ok
    ? "Google Drive is connected to Folder Sync. You can close this tab."
    : escHtml(message || "Google did not return a usable sign-in.");
  const closer = ok ? "<script>setTimeout(function(){ window.close(); }, 2000);</script>" : "";
  return `<!doctype html><html><head><meta charset="utf-8"><title>Folder Sync</title></head><body style="font-family:sans-serif;text-align:center;padding:48px;background:#0b1020;color:#e8eefc;"><h1 style="color:${color};">${title}</h1><p>${body}</p>${closer}</body></html>`;
}

function pushLog(record, line) {
  record.log = `${record.log || ""}${line}\n`;
}

function closeCallbackServer() {
  const current = callbackServer;
  callbackServer = null;
  pending = null;
  if (!current) return Promise.resolve();
  return new Promise((resolve) => current.close(() => resolve()));
}

export async function cancelDriveOAuth() {
  await closeCallbackServer();
  return { ok: true };
}

async function exchangeCode(code, client) {
  const body = new URLSearchParams({
    code,
    client_id: client.clientId,
    client_secret: client.clientSecret,
    redirect_uri: DRIVE_OAUTH_REDIRECT_URI,
    grant_type: "authorization_code",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) {
    const reason = String(json?.error_description || json?.error || `HTTP ${res.status}`);
    throw new Error(reason.slice(0, 180));
  }
  return json;
}

async function saveRcloneToken(name, token, client) {
  if (!token?.access_token) throw new Error("Google did not return an access token.");
  if (!token?.refresh_token) {
    throw new Error("Google did not return a refresh token. Start sign-in again from Folder Sync.");
  }
  await writeDriveToken(name, token, client);
}

function listenCallback() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      void handleCallback(req, res);
    });
    server.once("error", reject);
    server.listen(CALLBACK_PORT, "127.0.0.1", () => {
      server.off("error", reject);
      callbackServer = server;
      resolve();
    });
  });
}

/**
 * Reclaim port 53682 if an orphaned `rclone authorize` or stale foreign listener is holding it.
 * Uses native `iphlpapi!GetExtendedTcpTable` (<0.5ms, 0 PowerShell spawns).
 */
export async function reclaimStaleCallbackPort(port = CALLBACK_PORT) {
  const pids = findListeningPidsByPortNative(port).filter((pid) => pid > 4 && pid !== process.pid);
  if (!pids.length) return { reclaimed: false, killedPids: [] };
  const killedPids = [];
  for (const pid of pids) {
    try {
      process.kill(pid);
      killedPids.push(pid);
      lastReclaimedCallbackPid = pid;
    } catch {
      /* already exited or access denied */
    }
  }
  if (killedPids.length > 0) {
    for (let i = 0; i < 10; i += 1) {
      await new Promise((r) => setTimeout(r, 40));
      const remaining = findListeningPidsByPortNative(port).filter((pid) => pid > 4 && pid !== process.pid);
      if (remaining.length === 0) break;
    }
  }
  return { reclaimed: killedPids.length > 0, killedPids };
}

export function getDriveOAuthCallbackStatus() {
  const foreignPids = findListeningPidsByPortNative(CALLBACK_PORT).filter(
    (pid) => pid > 4 && pid !== process.pid,
  );
  const listening = Boolean(callbackServer?.listening);
  return {
    ok: true,
    callbackPort: CALLBACK_PORT,
    redirectUri: DRIVE_OAUTH_REDIRECT_URI,
    listening,
    portBusy: !listening && foreignPids.length > 0,
    foreignPids,
    reclaimedCallbackPid: lastReclaimedCallbackPid,
    activeRemote: pending?.name || null,
    clientIdPrefix: pending?.clientId ? `${String(pending.clientId).slice(0, 28)}…` : null,
  };
}

export async function openDriveOAuthInStealthProfile(profileInput, targetUrl) {
  const rawCode = String(profileInput || "").trim();
  const cleanCode = /^\d{1,4}$/.test(rawCode) ? rawCode.padStart(4, "0") : rawCode;
  if (!cleanCode) {
    return { ok: false, error: "Enter a Stealth profile code (e.g. 0001)." };
  }
  if (/^8\d{3}$/.test(cleanCode)) {
    return { ok: false, error: "Customer 8xxx Stealth profiles are restricted and cannot be opened here." };
  }
  const url = String(targetUrl || pending?.record?.authUrl || "").trim();
  if (!url.startsWith("https://accounts.google.com/")) {
    return { ok: false, error: "Valid Google OAuth sign-in URL is required." };
  }
  try {
    const res = await fetch("http://127.0.0.1:6003/api/automation/open-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile_name: cleanCode,
        target_url: url,
        screenshot: false,
        close_when_done: false,
        agent_task: false,
        headless: false,
      }),
      signal: AbortSignal.timeout(25_000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.ok === false) {
      return {
        ok: false,
        error: String(data?.error || `Stealth Browser (:6003) returned HTTP ${res.status}`),
      };
    }
    return {
      ok: true,
      profileCode: cleanCode,
      url,
    };
  } catch (err) {
    return {
      ok: false,
      error: `Cannot reach Stealth Browser (:6003): ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

async function handleCallback(req, res) {
  const url = new URL(req.url || "/", DRIVE_OAUTH_REDIRECT_URI);
  if (url.pathname === "/favicon.ico") {
    res.writeHead(204);
    res.end();
    return;
  }
  const flow = pending;
  const send = (status, html) => {
    res.writeHead(status, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    res.end(html);
  };
  if (!flow) {
    send(404, oauthResultHtml({ ok: false, message: "No Folder Sync sign-in is waiting. Start again from the app." }));
    return;
  }
  if (flow.record.exitCode === 0) {
    send(200, oauthResultHtml({ ok: true }));
    return;
  }
  const googleError = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description") || "";
  if (googleError || errorDescription) {
    flow.record.exitCode = 1;
    const detail = errorDescription || googleError;
    pushLog(flow.record, `Google returned ${detail}.`);
    send(400, oauthResultHtml({ ok: false, message: "Google cancelled the sign-in. Return to Folder Sync and try again." }));
    return;
  }
  const code = url.searchParams.get("code") || "";
  const accessToken = url.searchParams.get("access_token") || "";
  const state = url.searchParams.get("state") || "";
  if (!code && !accessToken) {
    send(200, oauthHashCaptureHtml());
    return;
  }
  if (state !== flow.state) {
    flow.record.exitCode = 1;
    pushLog(flow.record, "OAuth state did not match. Sign-in was ignored.");
    send(400, oauthResultHtml({ ok: false, message: "This sign-in link does not match the Folder Sync window. Start again from the app." }));
    return;
  }
  try {
    const google = code
      ? await exchangeCode(code, {
          clientId: flow.clientId,
          clientSecret: flow.clientSecret,
        })
      : {
          access_token: accessToken,
          refresh_token: url.searchParams.get("refresh_token") || "",
          token_type: url.searchParams.get("token_type") || "Bearer",
          expires_in: Number(url.searchParams.get("expires_in") || 3600),
        };
    const token = rcloneTokenFromGoogle(google, flow.refreshToken);
    await saveRcloneToken(flow.name, token, {
      clientId: flow.clientId,
      clientSecret: flow.clientSecret,
      scope: flow.scope,
    });
    void fetchDriveAccount(flow.name, { force: true }).catch(() => undefined);
    flow.record.exitCode = 0;
    pushLog(flow.record, "Success. Google Drive is connected. You can close the browser tab.");
    send(200, oauthResultHtml({ ok: true }));
  } catch (e) {
    flow.record.exitCode = 1;
    const message = redactOauthLog(e instanceof Error ? e.message : String(e)).slice(0, 180);
    pushLog(flow.record, `Sign-in failed. ${message}`);
    send(400, oauthResultHtml({ ok: false, message }));
  }
}

/**
 * One Drive sign-in: Folder Sync listens on 127.0.0.1:53682 and returns a link.
 * The app does not open the browser. The user copies the link into a profile.
 */
export async function startDriveOAuth(name = "gdrive") {
  const client = await resolveDriveOAuthClientForRemote(name);
  if (!client?.clientId || !client.clientSecret) {
    return {
      ok: false,
      error: "No Google client is stored yet. Sign in a Drive that already has one, then add this account.",
      name: client?.name || name,
    };
  }
  await closeCallbackServer();
  const state = randomBytes(16).toString("hex");
  const record = {
    ok: true,
    sessionId: `auth-${client.name}-${Date.now()}`,
    name: client.name,
    authUrl: buildDriveAuthUrl({ clientId: client.clientId, scope: client.scope, state }),
    oauth: true,
    hint: "Sign-in link is ready and copied. Paste it into the browser profile you want.",
    exitCode: null,
    log: "",
    getLog() {
      return { stdout: "", stderr: redactOauthLog(record.log), exitCode: record.exitCode };
    },
  };
  pending = {
    state,
    name: client.name,
    clientId: client.clientId,
    clientSecret: client.clientSecret,
    scope: client.scope,
    refreshToken: client.refreshToken,
    record,
  };
  let reclaimedCallbackPid = null;
  try {
    await listenCallback();
  } catch (e) {
    if (e && e.code === "EADDRINUSE") {
      const reclaimed = await reclaimStaleCallbackPort(CALLBACK_PORT);
      if (reclaimed.reclaimed) {
        reclaimedCallbackPid = reclaimed.killedPids[0] || null;
        try {
          await listenCallback();
        } catch (retryErr) {
          pending = null;
          return {
            ok: false,
            error:
              retryErr && retryErr.code === "EADDRINUSE"
                ? "Port 53682 is already in use. Close the other sign-in window and try again."
                : "Folder Sync could not open the Google sign-in port.",
            name: client.name,
          };
        }
      } else {
        pending = null;
        return {
          ok: false,
          error: "Port 53682 is already in use. Close the other sign-in window and try again.",
          name: client.name,
        };
      }
    } else {
      pending = null;
      return {
        ok: false,
        error: "Folder Sync could not open the Google sign-in port.",
        name: client.name,
      };
    }
  }
  record.callbackPort = CALLBACK_PORT;
  record.callbackListening = true;
  record.redirectUri = DRIVE_OAUTH_REDIRECT_URI;
  record.clientIdPrefix = `${String(client.clientId).slice(0, 28)}…`;
  record.reclaimedCallbackPid = reclaimedCallbackPid;
  pushLog(
    record,
    reclaimedCallbackPid
      ? `Reclaimed stale callback PID ${reclaimedCallbackPid}. Waiting on 127.0.0.1:53682.`
      : "Sign-in link is ready. Waiting on 127.0.0.1:53682.",
  );
  return record;
}
