/**
 * Boot check — /clips must mount hub-app (not TDZ "App failed to load").
 */
import { spawnSync } from "node:child_process";
import { stealthBrowser } from "../../scripts/lib/stealth-browser-client.mjs";
import { openStealthCdpSession, cdpEvaluate } from "../../scripts/lib/stealth-cdp-session.mjs";

process.env.STEALTH_AGENT_SMOKE = "1";
const ROOT = "E:/Dev";
const assign = spawnSync(process.execPath, ["Tool/scripts/assign-agent-stealth-profile.mjs", "--json"], {
  cwd: ROOT,
  encoding: "utf8",
  windowsHide: true,
  timeout: 15_000,
});
let profile = "9990";
try {
  profile = JSON.parse(assign.stdout || "{}").profile || "9990";
} catch {
  /* keep */
}

const targetUrl = `http://127.0.0.1:5180/clips?_boot=${Date.now()}`;
const raw = await stealthBrowser.listProfiles();
const list = Array.isArray(raw) ? raw : raw?.profiles || [];
const hit = list.find((p) => String(p.name || "").trim() === profile);
if (!hit) {
  console.log(JSON.stringify({ ok: false, error: `profile missing ${profile}` }, null, 2));
  process.exit(1);
}

await stealthBrowser.launch(String(hit.id)).catch(() => null);
await stealthBrowser.openUrl({
  profileId: String(hit.id),
  profileName: profile,
  targetUrl,
  screenshot: false,
  closeWhenDone: false,
});

const session = await openStealthCdpSession(profile, { matchUrl: "http://127.0.0.1:5180", timeoutMs: 25_000 });
await session.send("Runtime.enable").catch(() => null);
await session.send("Page.navigate", { url: targetUrl });

let info = null;
for (let i = 0; i < 15; i++) {
  await new Promise((r) => setTimeout(r, 700));
  info = await cdpEvaluate(
    session.send,
    `(() => {
      const text = document.body?.innerText || "";
      return {
        href: location.href,
        hasHub: Boolean(document.querySelector(".hub-app")),
        failed: /App failed to load/i.test(text) || /before initialization/i.test(text),
        stopped: /stopped rendering/i.test(text),
        hasClips: /\\bClips\\b/.test(text),
      };
    })()`,
  );
  if (info?.failed || info?.stopped) break;
  if (info?.hasHub && info?.hasClips) break;
}

try {
  session.close?.();
} catch {
  /* ignore */
}

const ok = Boolean(info?.hasHub) && !info?.failed && !info?.stopped;
console.log(JSON.stringify({ ok, profile, targetUrl, info }, null, 2));
process.exit(ok ? 0 : 1);
