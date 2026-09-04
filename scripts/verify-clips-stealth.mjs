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
const targetUrl = "http://127.0.0.1:5180/clips?clipsrange=all";
const raw = await stealthBrowser.listProfiles();
const list = Array.isArray(raw) ? raw : raw?.profiles || [];
const hit = list.find((p) => String(p.name || "").trim() === profile);
if (!hit) throw new Error(`profile missing ${profile}`);
await stealthBrowser.launch(String(hit.id)).catch(() => null);
await stealthBrowser.openUrl({
  profileId: String(hit.id),
  profileName: profile,
  targetUrl,
  screenshot: false,
  closeWhenDone: false,
});
const session = await openStealthCdpSession(profile, { matchUrl: "http://127.0.0.1:5180", timeoutMs: 20_000 });
await session.send("Runtime.enable").catch(() => null);
await session.send("Page.addScriptToEvaluateOnNewDocument", {
  source: `window.__deskErrs=[];
window.addEventListener("error",(e)=>window.__deskErrs.push(String(e.message||e.error||e)));
window.addEventListener("unhandledrejection",(e)=>window.__deskErrs.push(String(e.reason&&e.reason.message||e.reason||e)));`,
});
await session.send("Page.reload", { ignoreCache: true });
let info = null;
for (let i = 0; i < 10; i++) {
  await new Promise((r) => setTimeout(r, 1500));
  info = await cdpEvaluate(
  session.send,
  `(() => {
    const overlay = document.querySelector("vite-error-overlay");
    const root = document.getElementById("root");
    return {
      href: location.href,
      title: document.title,
      ready: document.readyState,
      hasOverlay: Boolean(overlay),
      overlayText: overlay ? String(overlay.shadowRoot?.textContent || overlay.textContent || "").slice(0, 400) : "",
      rootLen: root ? root.innerHTML.length : -1,
      rootHead: root ? root.innerHTML.slice(0, 400) : "",
      bodyText: (document.body?.innerText || "").slice(0, 400),
      hasHubApp: Boolean(document.querySelector(".hub-app")),
      errs: window.__deskErrs || [],
      header: (() => {
        const header = document.querySelector(".app-tab-header");
        const title = header?.querySelector("h1");
        const session = header?.querySelector(".app-tab-header__session");
        const search = document.querySelector(".hub-search-field input, input[placeholder='Search…']");
        if (!header || !title || !session) return null;
        const hr = header.getBoundingClientRect();
        const tr = title.getBoundingClientRect();
        const sr = session.getBoundingClientRect();
        const qr = search?.getBoundingClientRect();
        return {
          display: getComputedStyle(header).display,
          embedded: header.classList.contains("app-tab-header--embedded"),
          titleSessionDy: Math.abs((tr.top + tr.height / 2) - (sr.top + sr.height / 2)),
          titleSearchDx: qr ? Math.abs(tr.left - qr.left) : null,
          headerMid: (hr.top + hr.height / 2).toFixed(1),
          titleMid: (tr.top + tr.height / 2).toFixed(1),
        };
      })(),
      clipCount: /Follow up|Received|Workspace|Clips UI|Desk Console onboard clip|HISTORY\\s*[1-9]|SAMPLES\\s*[1-9]|TOTAL\\s*[1-9]/i.test(document.body?.innerText || ""),
      searchbar: (() => {
        const bar = document.querySelector(".hub-filter-bar, .hub-search-field")?.closest("section, .hub-filter-bar, [class*='filter']") || document.body;
        const text = bar?.innerText || document.body?.innerText || "";
        return {
          hasViewToggle: Boolean(document.querySelector(".hub-view-toggle")),
          hasSelectionXy: Boolean(document.querySelector(".hub-directory-toolbar-selection")),
          hasDisplay: /Display/i.test(text) || Boolean(document.querySelector("[title='Display options']")),
          hasPeriod: Boolean(document.querySelector(".hub-period-select, [title='Filter by creation date']")) || /\\bAll\\b/.test(text),
          hasStatusFilter: /Status|Store|History|Sample/i.test(text),
          hasNewSample: /New sample/i.test(document.body?.innerText || ""),
        };
      })(),
      chrome: (() => {
        const header = document.querySelector(".app-tab-header, [aria-label='Clips']")?.closest(".hub-tab-chrome, .hub-app") || document.querySelector(".app-tab-header");
        const headerText = header?.innerText || "";
        const ops = document.querySelector(".hub-header-ops");
        const opsText = ops?.innerText || "";
        const footer = document.querySelector(".hub-sidebar-shell footer, footer");
        const footerText = footer?.innerText || "";
        const rawIso = /2026-08-\\d{2}T/.test(document.body?.innerText || "");
        return {
          hasNotify: /Notify/i.test(opsText) || Boolean(ops?.querySelector("[title*='Notify'], [aria-label*='Notify']")),
          hasSettings: /Settings/i.test(opsText + footerText),
          hasHeaderRefresh: /\\bRefresh\\b/.test(opsText) || /\\bRefresh\\b/.test(headerText.split("\\n").slice(0, 4).join(" ")),
          hasHeaderSave: /Save clipboard/i.test(opsText),
          hasFilterSave: /Save clipboard/i.test(document.body?.innerText || ""),
          footerUser: /Local|User/i.test(footerText),
          footerLog: /Log/i.test(footerText),
          footerSettings: /Settings/i.test(footerText),
          rawIso,
        };
      })(),
      desk: {
        tableRows: document.querySelectorAll("tbody tr").length,
        kpi: (document.body?.innerText || "").match(/TOTAL\\s*\\d+/i)?.[0] || "",
      },
    };
  })()`,
  );
  if (info?.clipCount && info?.hasHubApp && !info?.hasOverlay) break;
}
const apiFromPage = await cdpEvaluate(
  session.send,
  `Promise.all([
    fetch("/api/clips").then(async (r) => ({ via: "proxy", status: r.status, n: (await r.json()).rows?.length })).catch((e) => ({ via: "proxy", err: String(e) })),
    fetch("http://127.0.0.1:6010/api/clips").then(async (r) => ({ via: "host", status: r.status, n: (await r.json()).rows?.length })).catch((e) => ({ via: "host", err: String(e) })),
  ])`,
);
await session.send("Page.navigate", { url: `http://127.0.0.1:5180/?picker=1&_=${Date.now()}` });
let picker = null;
for (let i = 0; i < 8; i++) {
  await new Promise((r) => setTimeout(r, 1000));
  picker = await cdpEvaluate(
    session.send,
    `(() => ({
      href: location.href,
      hasOverlay: Boolean(document.querySelector("vite-error-overlay")),
      text: (document.body?.innerText || "").slice(0, 240),
      hasPaste: /\\bPaste\\b/.test(document.body?.innerText || ""),
      hasSamples: /Samples/i.test(document.body?.innerText || ""),
      hasHistory: /History/i.test(document.body?.innerText || ""),
      hasSeed: /Follow up|Received|Workspace|Clips UI/i.test(document.body?.innerText || ""),
      errText: (document.body?.innerText || "").includes("signal timed out"),
    }))()`,
  );
  if (picker?.hasPaste && (picker.hasSamples || picker.hasHistory || picker.hasSeed)) break;
}
const screens = ["clips", "runners", "tasks", "system"];
const byScreen = {};
for (const screen of screens) {
  await session.send("Page.navigate", { url: `http://127.0.0.1:5180/${screen}` });
  await new Promise((r) => setTimeout(r, 1200));
  byScreen[screen] = await cdpEvaluate(
    session.send,
    `(() => ({
      href: location.href,
      hasOverlay: Boolean(document.querySelector("vite-error-overlay")),
      hasHubApp: Boolean(document.querySelector(".hub-app")),
      text: (document.body?.innerText || "").slice(0, 180),
    }))()`,
  );
}
await session.close?.().catch(() => {});
console.log(JSON.stringify({ profile, apiFromPage, info, byScreen, picker }, null, 2));
const headerOk =
  info?.header?.display === "grid" &&
  Number(info?.header?.titleSessionDy) <= 4 &&
  (info?.header?.titleSearchDx == null || Number(info.header.titleSearchDx) <= 12);
const searchbar = info?.searchbar || {};
const searchbarOk =
  searchbar.hasViewToggle &&
  searchbar.hasSelectionXy &&
  searchbar.hasDisplay &&
  searchbar.hasPeriod &&
  searchbar.hasStatusFilter &&
  searchbar.hasNewSample;
const pickerOk = picker?.hasPaste && !picker?.hasOverlay && (picker.hasSamples || picker.hasHistory || picker.hasSeed);
const chrome = info?.chrome || {};
const chromeOk =
  chrome.hasNotify &&
  chrome.hasSettings &&
  chrome.hasFilterSave &&
  !chrome.hasHeaderSave &&
  !chrome.hasHeaderRefresh &&
  chrome.footerUser &&
  chrome.footerLog &&
  chrome.footerSettings &&
  !chrome.rawIso;
const ok = info?.hasHubApp && !info?.hasOverlay && info.rootLen > 0 && !info?.errs?.length && headerOk && chromeOk && searchbarOk && info?.clipCount && pickerOk;
process.exit(ok ? 0 : 1);
