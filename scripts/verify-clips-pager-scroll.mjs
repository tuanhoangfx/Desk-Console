/**
 * Stealth CDP — Clips catalog must show HubTablePager + hub-main vertical scroll.
 * Pool 9990–9999 only. No IDE browser MCP.
 *
 * Usage: node scripts/verify-clips-pager-scroll.mjs
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
const profile = JSON.parse(assign.stdout || "{}").profile || "9990";
const targetUrl = `http://127.0.0.1:5180/clips?_v=${Date.now()}`;

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

const session = await openStealthCdpSession(profile, { matchUrl: "http://127.0.0.1:5180", timeoutMs: 25_000 });
await session.send("Runtime.enable").catch(() => null);
await session.send("Page.navigate", { url: targetUrl });

async function probe() {
  return cdpEvaluate(
    session.send,
    `(() => {
      const main = document.querySelector("main.hub-main, .hub-main");
      const pager = document.querySelector(".hub-table-pager");
      const rows = document.querySelectorAll(
        ".desk-tab-panel--active table.hub-users-table tbody tr:not(.hub-users-row--pad)",
      );
      const panel = document.querySelector(".desk-tab-panel--active");
      const wrap = document.querySelector(
        ".desk-tab-panel--active .hub-paginated-table-shell > .hub-users-table-wrap",
      );
      const mainStyle = main ? getComputedStyle(main) : null;
      const panelStyle = panel ? getComputedStyle(panel) : null;
      const wrapClass = wrap?.className || "";
      const firstCell = document.querySelector(
        ".desk-tab-panel--active table.hub-users-table tbody tr:not(.hub-users-row--pad) td.hub-desk-col--name",
      );
      const cellStyle = firstCell ? getComputedStyle(firstCell) : null;
      return {
        href: location.href,
        pathname: location.pathname,
        hasHub: Boolean(document.querySelector(".hub-app")),
        rowCount: rows.length,
        pagerExists: Boolean(pager),
        pagerVisible: pager
          ? (() => {
              const r = pager.getBoundingClientRect();
              return r.height > 0 && r.bottom > 0 && r.top < (window.innerHeight + 2000);
            })()
          : false,
        pagerText: pager ? (pager.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 140) : null,
        mainOverflowY: mainStyle?.overflowY || null,
        mainScrollable: main ? main.scrollHeight > main.clientHeight + 4 : false,
        mainScrollHeight: main?.scrollHeight ?? null,
        mainClientHeight: main?.clientHeight ?? null,
        panelOverflowY: panelStyle?.overflowY || null,
        wrapHasFlex1: /\\bflex-1\\b/.test(wrapClass),
        cellWhiteSpace: cellStyle?.whiteSpace || null,
      };
    })()`,
  );
}

let info = null;
for (let i = 0; i < 15; i++) {
  await new Promise((r) => setTimeout(r, 800));
  info = await probe();
  if (info?.hasHub && /\/clips\/?$/.test(String(info.pathname || "")) && info.rowCount > 0) break;
}

const failures = [];
if (!info?.hasHub) failures.push("hub shell missing");
if (!/\/clips\/?$/.test(String(info?.pathname || ""))) failures.push(`pathname not /clips: ${info?.pathname}`);
if (!info?.pagerExists) failures.push("HubTablePager (.hub-table-pager) missing");
if (!(Number(info?.rowCount) > 0)) failures.push("no table rows");
if (Number(info?.rowCount) > 25) failures.push(`rowCount ${info.rowCount} > pageSize (pagination not slicing)`);
if (info?.wrapHasFlex1) failures.push("catalog wrap still has flex-1 (should be inline wrap)");
if (info?.panelOverflowY === "hidden") failures.push("active directory panel overflow:hidden (blocks hub-main scroll)");
if (!["auto", "scroll", "overlay"].includes(String(info?.mainOverflowY || ""))) {
  failures.push(`hub-main overflow-y=${info?.mainOverflowY} (want auto/scroll)`);
}
// With > pageSize rows, main must be scrollable so pager is reachable; with ≤20 still OK if pager exists.
if (Number(info?.rowCount) >= 15 && info?.mainScrollable !== true && info?.pagerVisible !== true) {
  // Scroll to bottom and re-check pager in viewport
  await cdpEvaluate(
    session.send,
    `(() => { const m = document.querySelector("main.hub-main, .hub-main"); if (m) m.scrollTop = m.scrollHeight; return m?.scrollTop ?? null; })()`,
  );
  await new Promise((r) => setTimeout(r, 400));
  const afterScroll = await probe();
  info = { ...info, afterScroll };
  if (!afterScroll?.pagerExists) failures.push("pager missing after scroll");
  if (afterScroll?.mainScrollable !== true && Number(afterScroll?.mainScrollHeight) <= Number(afterScroll?.mainClientHeight) + 4) {
    failures.push("hub-main not scrollable with catalog content");
  }
}

session.close?.();

const report = {
  ok: failures.length === 0,
  profile,
  targetUrl,
  info,
  failures,
};

console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
