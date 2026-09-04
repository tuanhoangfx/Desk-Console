import { spawnSync } from "node:child_process";
import { stealthBrowser } from "../../scripts/lib/stealth-browser-client.mjs";
import { openStealthCdpSession, cdpEvaluate } from "../../scripts/lib/stealth-cdp-session.mjs";

process.env.STEALTH_AGENT_SMOKE = "1";
const assign = spawnSync(process.execPath, ["Tool/scripts/assign-agent-stealth-profile.mjs", "--json"], {
  cwd: "E:/Dev",
  encoding: "utf8",
  windowsHide: true,
  timeout: 15_000,
});
const profile = JSON.parse(assign.stdout || "{}").profile || "9990";
const raw = await stealthBrowser.listProfiles();
const list = Array.isArray(raw) ? raw : raw?.profiles || [];
const hit = list.find((p) => String(p.name || "").trim() === profile);
await stealthBrowser.launch(String(hit.id)).catch(() => null);
const url = `http://127.0.0.1:5180/clips?err=${Date.now()}`;
await stealthBrowser.openUrl({
  profileId: String(hit.id),
  profileName: profile,
  targetUrl: url,
  screenshot: false,
  closeWhenDone: false,
});
const session = await openStealthCdpSession(profile, { matchUrl: "http://127.0.0.1:5180", timeoutMs: 25_000 });
await session.send("Page.navigate", { url });
await new Promise((r) => setTimeout(r, 4000));
const info = await cdpEvaluate(
  session.send,
  `(() => ({
    href: location.href,
    overlay: document.querySelector("vite-error-overlay")?.shadowRoot?.textContent?.slice(0, 1200) || "",
    body: (document.body?.innerText || "").slice(0, 400),
    hasHub: Boolean(document.querySelector(".hub-app")),
  }))()`,
);
console.log(JSON.stringify(info, null, 2));
await session.close?.().catch(() => null);
