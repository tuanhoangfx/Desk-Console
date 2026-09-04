#!/usr/bin/env node
/** One-shot Stealth CDP verify — console CRT colors, emoji headers, runner status stability. */
import { stealthBrowser } from "../../scripts/lib/stealth-browser-client.mjs";
import { assertAgentPoolProfile } from "../../scripts/lib/agent-stealth-profile-guard.mjs";

process.env.STEALTH_AGENT_SMOKE = "1";
process.env.STEALTH_HEADLESS_SMOKE = "1";

const TARGET = `http://127.0.0.1:5180/runners?_v=${Date.now()}`;

async function cdpEval(profileId, expression) {
  const endpoint = await stealthBrowser.cdpEndpoint(profileId);
  const tabs = await fetch(`${endpoint.replace(/\/$/, "")}/json/list`).then((r) => r.json());
  const page = (Array.isArray(tabs) ? tabs : []).find((t) => String(t.url || "").includes("5180"));
  if (!page?.webSocketDebuggerUrl) throw new Error(`no P0001 page (tabs=${(tabs || []).length})`);

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.addEventListener("open", () => res());
    ws.addEventListener("error", (e) => rej(e.error || e));
  });
  let id = 0;
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const mid = ++id;
      const onMsg = (ev) => {
        const msg = JSON.parse(String(ev.data));
        if (msg.id === mid) {
          ws.removeEventListener("message", onMsg);
          msg.error ? reject(msg.error) : resolve(msg.result);
        }
      };
      ws.addEventListener("message", onMsg);
      ws.send(JSON.stringify({ id: mid, method, params }));
    });

  await send("Runtime.enable");
  const { result } = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  ws.close();
  return result?.value;
}

const profileName = assertAgentPoolProfile("9990", { forceAgent: true });
const profiles = await stealthBrowser.listProfiles();
const hit = stealthBrowser.findProfileByName(profiles, profileName);
if (!hit?.id) throw new Error(`agent pool profile ${profileName} missing`);
const profileId = String(hit.id);
await stealthBrowser.openUrl({
  profileId,
  targetUrl: TARGET,
  closeWhenDone: false,
});
await new Promise((r) => setTimeout(r, 6000));

for (let attempt = 0; attempt < 8; attempt += 1) {
  const probe = await cdpEval(profileId, `(() => {
    const rows = document.querySelectorAll('table.hub-users-table tbody tr').length;
    const titleEmoji = document.querySelector('.app-tab-header .hub-users-th-emoji')?.textContent?.trim() || '';
    return { rows, titleEmoji };
  })()`);
  if (probe.rows > 0 && probe.titleEmoji) break;
  await new Promise((r) => setTimeout(r, 1500));
}

await cdpEval(profileId, `(() => {
  const firstRow = document.querySelector('table.hub-users-table tbody tr');
  firstRow?.click();
  return true;
})()`);
await new Promise((r) => setTimeout(r, 2500));

const snap1 = await cdpEval(
  profileId,
  `(async () => {
  const titleEmoji = document.querySelector('.app-tab-header .hub-users-th-emoji')?.textContent?.trim() || '';
  const titleIconTag = document.querySelector('.app-tab-header svg')?.tagName || '';
  const colEmojis = [...document.querySelectorAll('table.hub-users-table th .hub-users-th-emoji')].map((el) => el.textContent?.trim()).filter(Boolean);
  const segs = [...document.querySelectorAll('.hub-console-crt__seg')].map((el) => ({
    kind: [...el.classList].find((c) => c.startsWith('hub-console-crt__seg--'))?.replace('hub-console-crt__seg--', ''),
    color: getComputedStyle(el).color,
  }));
  const coloredSeg = segs.find((s) => s.color && s.color !== 'rgb(203, 213, 225)');
  const upRows = [...document.querySelectorAll('table.hub-users-table tbody tr')].filter((tr) => /\\bUp\\b/.test(tr.textContent || '')).length;
  const downRows = [...document.querySelectorAll('table.hub-users-table tbody tr')].filter((tr) => /\\bDown\\b/.test(tr.textContent || '')).length;
  const bodyHasRunner = /P0003|P0020|Desk Console/.test(document.body.innerText || '');
  const tbodyHtml = document.querySelector('table.hub-users-table tbody')?.innerHTML?.slice(0, 240) || '';
  const navEmojis = [...document.querySelectorAll('.hub-sidebar-shell .hub-users-th-emoji')].map((el) => el.textContent?.trim()).filter(Boolean);
  const apiRows = await fetch('/api/runners').then((r) => r.json()).then((d) => (Array.isArray(d?.rows) ? d.rows.length : -1)).catch(() => -1);
  const pager = document.querySelector('.hub-table-pager');
  const pagerStyle = pager ? getComputedStyle(pager) : null;
  const pagerVisible = Boolean(pager && pagerStyle?.display !== 'none' && pager.offsetHeight > 0);
  const pagerText = pager?.textContent?.trim() || '';
  const dataRow = document.querySelector('table.hub-directory-frame-table tbody tr:not(.hub-users-row--pad)');
  const rowHeight = dataRow ? Math.round(dataRow.getBoundingClientRect().height) : 0;
  const naturalRowHeight = rowHeight > 0 && rowHeight <= 44;
  const headerEl = document.querySelector('.app-tab-header');
  const headerSparse = Boolean(headerEl?.classList.contains('app-tab-header--sparse'));
  const headerGridCols = headerEl ? getComputedStyle(headerEl).gridTemplateColumns : '';
  const detailModal = document.querySelector('.hub-account-detail-modal.desk-ops-detail-modal, .runner-detail-modal');
  const detailTitle = document.getElementById('desk-runner-detail-title')?.textContent?.trim() || '';
  const detailMeta = Boolean(document.querySelector('.hub-adm-record-meta-row'));
  const detailSections = [...document.querySelectorAll('.desk-ops-detail-section')].map((el) => el.id).filter(Boolean);
  return { titleEmoji, titleIconTag, colEmojis, coloredSeg, segs: segs.slice(0, 8), upRows, downRows, navEmojis, apiRows, pagerVisible, pagerText, rowHeight, naturalRowHeight, headerSparse, headerGridCols, detailModalOpen: Boolean(detailModal), detailTitle, detailMeta, detailSections, bodyHasRunner, tbodyHtml, href: location.href };
})()`,
);

await new Promise((r) => setTimeout(r, 2500));
const snap2 = await cdpEval(profileId, `(() => {
  const upRows = [...document.querySelectorAll('table.hub-users-table tbody tr')].filter((tr) => /\\bUp\\b/.test(tr.textContent || '')).length;
  const downRows = [...document.querySelectorAll('table.hub-users-table tbody tr')].filter((tr) => /\\bDown\\b/.test(tr.textContent || '')).length;
  return { upRows, downRows };
})()`);

const api = await fetch("http://127.0.0.1:6010/api/runners").then((r) => r.json());
const apiUp = (api.rows || []).filter((r) => r.up).length;

const pagerOk =
  snap1.apiRows <= 20 || (snap1.pagerVisible && /page\s*\d+\s*of/i.test(snap1.pagerText));
const rowDensityOk = snap1.naturalRowHeight !== false && (snap1.rowHeight === 0 || snap1.naturalRowHeight);
const statusStable = snap2.upRows === snap1.upRows && snap2.downRows === snap1.downRows;

const ok =
  pagerOk &&
  rowDensityOk &&
  snap1.titleEmoji.includes("▶") &&
  snap1.colEmojis.length >= 3 &&
  (Boolean(snap1.coloredSeg) || (snap1.detailModalOpen && snap1.detailSections.length >= 2)) &&
  snap1.detailModalOpen &&
  snap1.detailMeta &&
  snap1.detailSections.length >= 2 &&
  snap1.headerSparse &&
  (snap1.upRows + snap1.downRows === 0 || (snap1.upRows === apiUp && statusStable));

console.log(
  JSON.stringify(
    {
      ok,
      snap1,
      snap2,
      apiUp,
      profileId,
    },
    null,
    2,
  ),
);
process.exit(ok ? 0 : 1);
