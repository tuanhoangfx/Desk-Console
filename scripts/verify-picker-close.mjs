/**
 * Stealth CDP — paste picker X must sit fully inside the viewport (not OS-clipped).
 * Pool 9990–9999. No IDE browser MCP.
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
  /* keep default */
}

const targetUrl = `http://127.0.0.1:5180/?picker=1&_v=${Date.now()}`;
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
await session.send("Emulation.setDeviceMetricsOverride", {
  width: 440,
  height: 560,
  deviceScaleFactor: 1,
  mobile: false,
});
await session.send("Page.navigate", { url: targetUrl });

let info = null;
for (let i = 0; i < 12; i++) {
  await new Promise((r) => setTimeout(r, 700));
  info = await cdpEvaluate(
    session.send,
    `(() => {
      const btn = document.querySelector(".hub-modal-close.desk-picker-close");
      const header = document.querySelector(".desk-picker-drag");
      const style = btn ? getComputedStyle(btn) : null;
      const r = btn ? btn.getBoundingClientRect() : null;
      return {
        href: location.href,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        hasPaste: /\\bPaste\\b/.test(document.body?.innerText || ""),
        inHeader: Boolean(header && btn && header.contains(btn)),
        top: style?.top || null,
        right: style?.right || null,
        rect: r
          ? { top: r.top, right: r.right, bottom: r.bottom, left: r.left, width: r.width, height: r.height }
          : null,
      };
    })()`,
  );
  if (info?.hasPaste && info?.rect) break;
}

try {
  session.close?.();
} catch {
  /* ignore */
}

const failures = [];
if (!info?.hasPaste) failures.push("picker Paste chrome missing");
if (!info?.inHeader) failures.push("X must be a child of desk-picker-drag header (Electron no-drag)");
if (!info?.rect) failures.push("desk-picker-close missing");
if (info?.rect) {
  if (info.rect.top < -0.5) failures.push(`X clipped top=${info.rect.top}`);
  if (info.rect.left < -0.5) failures.push(`X clipped left=${info.rect.left}`);
  if (info.rect.right > info.innerWidth + 0.5) failures.push(`X clipped right=${info.rect.right} > ${info.innerWidth}`);
  if (info.rect.bottom > info.innerHeight + 0.5) failures.push(`X clipped bottom=${info.rect.bottom}`);
}
const topPx = Number.parseFloat(String(info?.top || ""));
if (Number.isFinite(topPx) && topPx < 0) failures.push(`computed top ${info.top} still hangs outside window`);

const report = { ok: failures.length === 0, profile, targetUrl, info, failures };
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
