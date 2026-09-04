/**
 * CDP — open Clip detail; assert footer Close has secondary--close SSOT.
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
const targetUrl = `http://127.0.0.1:5180/clips?_v=${Date.now()}`;

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

let ready = false;
for (let i = 0; i < 12; i++) {
  await new Promise((r) => setTimeout(r, 700));
  const boot = await cdpEvaluate(
    session.send,
    `(() => ({
      crashed: (document.body?.innerText || "").includes("stopped rendering"),
      rows: document.querySelectorAll(".desk-tab-panel--active table.hub-users-table tbody tr:not(.hub-users-row--pad)").length,
      hasCapturesNav: [...document.querySelectorAll("button,a")].some((el) => /^\\s*Captures\\s*$/i.test(el.textContent || "")),
    }))()`,
  );
  if (boot?.crashed) {
    console.log(JSON.stringify({ ok: false, profile, step: "boot", boot }, null, 2));
    process.exit(1);
  }
  if (boot?.rows > 0) {
    ready = true;
    if (boot.hasCapturesNav) {
      console.log(JSON.stringify({ ok: false, profile, error: "Captures nav still present", boot }, null, 2));
      process.exit(1);
    }
    break;
  }
}
if (!ready) {
  console.log(JSON.stringify({ ok: false, profile, error: "clips rows not ready" }, null, 2));
  process.exit(1);
}

await cdpEvaluate(
  session.send,
  `(() => {
    const row = document.querySelector(".desk-tab-panel--active table.hub-users-table tbody tr:not(.hub-users-row--pad)");
    row?.click();
    return Boolean(row);
  })()`,
);
await new Promise((r) => setTimeout(r, 1500));

const info = await cdpEvaluate(
  session.send,
  `(() => {
    const crashed = (document.body?.innerText || "").includes("stopped rendering");
    const footerClose = document.querySelector(".hub-tool-detail-modal__secondary--close");
    const closeBtn = [...document.querySelectorAll("button")].find((b) => {
      const t = (b.textContent || "").replace(/\\s+/g, " ").trim();
      return t === "Close" || /^Close$/i.test(t);
    });
    const edge = document.querySelector(".hub-modal-close");
    return {
      crashed,
      hasFooterCloseClass: Boolean(footerClose),
      dataHubFooterClose: footerClose?.getAttribute("data-hub-footer-close") || null,
      closeBtnClass: closeBtn?.className || null,
      hasEdgeClose: Boolean(edge),
      dialog: Boolean(document.querySelector("[role='dialog'], .hub-modal-frame")),
    };
  })()`,
);

try {
  session.close?.();
} catch {
  /* ignore */
}

const ok =
  info &&
  info.crashed !== true &&
  info.hasFooterCloseClass === true &&
  info.dataHubFooterClose === "1" &&
  info.hasEdgeClose === true;

console.log(JSON.stringify({ ok, profile, targetUrl, info }, null, 2));
process.exit(ok ? 0 : 1);
