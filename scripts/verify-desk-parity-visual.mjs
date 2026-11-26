#!/usr/bin/env node
/**
 * One-shot headless Stealth Playwright verify — console CRT colors, emoji headers,
 * runner status stability, th === td geometry, and Created/Update timestamp hygiene across Desk tabs.
 */
import { spawnSync } from "node:child_process";
import { connectStealthHeadless } from "../../scripts/lib/stealth-headless-cdp.mjs";

process.env.STEALTH_AGENT_SMOKE = "1";
process.env.STEALTH_HEADLESS_SMOKE = "1";

const UI_BASE = (process.env.DESK_UI_ORIGIN || "http://127.0.0.1:5180").replace(/\/$/, "");
const API_BASE = (process.env.DESK_API_ORIGIN || "http://127.0.0.1:6010").replace(/\/$/, "");
const DIRECTORY_TABS = ["runners", "cron", "clips", "jobs", "drives"];

function assignAgentProfile() {
  const assign = spawnSync(process.execPath, ["Tool/scripts/assign-agent-stealth-profile.mjs", "--json"], {
    cwd: "E:/Dev",
    encoding: "utf8",
    windowsHide: true,
    timeout: 15_000,
  });
  const parsed = JSON.parse(assign.stdout || "{}");
  const profile = String(parsed.profile || "").trim();
  if (!profile) {
    throw new Error(`assign-agent-stealth-profile failed: ${assign.stderr || assign.stdout || "empty"}`);
  }
  return profile;
}

async function auditTabGeometryAndDates(page, tab) {
  const url = `${UI_BASE}/${tab}?_v=${Date.now()}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page
    .waitForSelector("table.hub-directory-frame-table, table.hub-users-table", { timeout: 15_000 })
    .catch(() => null);
  await page.waitForTimeout(900);

  return page.evaluate((tabName) => {
    const table = document.querySelector("table.hub-directory-frame-table, table.hub-users-table");
    if (!table) return { tab: tabName, ok: false, error: "missing table" };

    const ths = [...table.querySelectorAll("thead th")];
    const headers = ths.map((th) => (th.textContent || "").trim());
    const dataRows = [...table.querySelectorAll("tbody tr:not(.hub-users-row--pad)")];
    const firstRow = dataRows[0];
    const widthMismatches = [];

    if (firstRow) {
      const tds = [...firstRow.querySelectorAll("td")];
      if (tds.length !== ths.length) {
        widthMismatches.push({ error: `col count mismatch th=${ths.length} td=${tds.length}` });
      } else {
        for (let i = 0; i < ths.length; i += 1) {
          const thW = Math.round(ths[i].getBoundingClientRect().width);
          const tdW = Math.round(tds[i].getBoundingClientRect().width);
          if (Math.abs(thW - tdW) > 1) {
            widthMismatches.push({ index: i, header: headers[i], thW, tdW });
          }
        }
      }
    }

    const updateColIdx = headers.findIndex((h) => /\bUpdate\b/i.test(h));
    const createdColIdx = headers.findIndex((h) => /\bCreated\b/i.test(h));
    const urlLeakInUpdate = [];
    const invalidDateCells = [];
    const validCellRe = /^(\u2014|-|\d|just now|today|yesterday)/i;

    for (const tr of dataRows.slice(0, 15)) {
      const cells = [...tr.querySelectorAll("td")];
      if (updateColIdx >= 0 && cells[updateColIdx]) {
        const text = (cells[updateColIdx].textContent || "").trim();
        if (/https?:\/\//i.test(text)) urlLeakInUpdate.push(text);
        if (text && !validCellRe.test(text) && !/\b(ago|m|h|d)\b/i.test(text)) {
          invalidDateCells.push({ col: "Update", text });
        }
      }
      if (createdColIdx >= 0 && cells[createdColIdx]) {
        const text = (cells[createdColIdx].textContent || "").trim();
        if (text && !validCellRe.test(text) && !/\b(ago|m|h|d)\b/i.test(text)) {
          invalidDateCells.push({ col: "Created", text });
        }
      }
    }

    return {
      tab: tabName,
      ok: widthMismatches.length === 0 && urlLeakInUpdate.length === 0 && invalidDateCells.length === 0,
      rowCount: dataRows.length,
      colCount: ths.length,
      widthMismatches,
      urlLeakInUpdate,
      invalidDateCells,
    };
  }, tab);
}

const profileName = assignAgentProfile();
const pageErrors = [];
const { page, close } = await connectStealthHeadless(profileName, {
  viewport: { width: 1440, height: 900 },
});
page.on("pageerror", (err) => pageErrors.push(String(err?.message || err)));

try {
  await page.goto(`${UI_BASE}/runners?_v=${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const probe = await page.evaluate(() => ({
      rows: document.querySelectorAll("table.hub-users-table tbody tr:not(.hub-users-row--pad)").length,
      titleEmoji: document.querySelector(".app-tab-header .hub-users-th-emoji")?.textContent?.trim() || "",
    }));
    if (probe.rows > 0 && probe.titleEmoji) break;
    await page.waitForTimeout(800);
  }

  await page.evaluate(() => {
    document.querySelector("table.hub-users-table tbody tr:not(.hub-users-row--pad)")?.click();
  });
  await page.waitForTimeout(1800);

  const snap1 = await page.evaluate(async () => {
    const titleEmoji = document.querySelector(".app-tab-header .hub-users-th-emoji")?.textContent?.trim() || "";
    const titleIconTag = document.querySelector(".app-tab-header svg")?.tagName || "";
    const colEmojis = [...document.querySelectorAll("table.hub-users-table th .hub-users-th-emoji")]
      .map((el) => el.textContent?.trim())
      .filter(Boolean);
    const segs = [...document.querySelectorAll(".hub-console-crt__seg")].map((el) => ({
      kind: [...el.classList]
        .find((c) => c.startsWith("hub-console-crt__seg--"))
        ?.replace("hub-console-crt__seg--", ""),
      color: getComputedStyle(el).color,
    }));
    const coloredSeg = segs.find((s) => s.color && s.color !== "rgb(203, 213, 225)");
    const dataTrs = [...document.querySelectorAll("table.hub-users-table tbody tr:not(.hub-users-row--pad)")];
    const statusTexts = dataTrs.map((tr) =>
      (tr.querySelector("td.hub-desk-col--status .hub-users-status, td.hub-desk-col--status")?.textContent || "").trim(),
    );
    const upRows = statusTexts.filter((t) => t === "Up").length;
    const downRows = statusTexts.filter((t) => t === "Down").length;
    const apiRows = await fetch("/api/runners")
      .then((r) => r.json())
      .then((d) => (Array.isArray(d?.rows) ? d.rows.length : -1))
      .catch(() => -1);
    const pager = document.querySelector(".hub-table-pager");
    const pagerStyle = pager ? getComputedStyle(pager) : null;
    const pagerVisible = Boolean(pager && pagerStyle?.display !== "none" && pager.offsetHeight > 0);
    const pagerText = pager?.textContent?.trim() || "";
    const dataRow = document.querySelector("table.hub-directory-frame-table tbody tr:not(.hub-users-row--pad)");
    const rowHeight = dataRow ? Math.round(dataRow.getBoundingClientRect().height) : 0;
    const naturalRowHeight = rowHeight > 0 && rowHeight <= 44;
    const headerEl = document.querySelector(".app-tab-header");
    const headerVisible = Boolean(headerEl && headerEl.getBoundingClientRect().height > 0);
    const detailModal = document.querySelector(".hub-account-detail-modal.desk-ops-detail-modal, .runner-detail-modal");
    const detailTitle = document.getElementById("desk-runner-detail-title")?.textContent?.trim() || "";
    const detailMeta = Boolean(document.querySelector(".hub-adm-record-meta-row"));
    const detailSections = [...document.querySelectorAll(".desk-ops-detail-section")]
      .map((el) => el.id)
      .filter(Boolean);
    return {
      titleEmoji,
      titleIconTag,
      colEmojis,
      coloredSeg,
      upRows,
      downRows,
      apiRows,
      pagerVisible,
      pagerText,
      rowHeight,
      naturalRowHeight,
      headerVisible,
      detailModalOpen: Boolean(detailModal),
      detailTitle,
      detailMeta,
      detailSections,
      href: location.href,
    };
  });

  await page.waitForTimeout(2000);
  const snap2 = await page.evaluate(() => {
    const dataTrs = [...document.querySelectorAll("table.hub-users-table tbody tr:not(.hub-users-row--pad)")];
    const statusTexts = dataTrs.map((tr) =>
      (tr.querySelector("td.hub-desk-col--status .hub-users-status, td.hub-desk-col--status")?.textContent || "").trim(),
    );
    return {
      upRows: statusTexts.filter((t) => t === "Up").length,
      downRows: statusTexts.filter((t) => t === "Down").length,
    };
  });

  const tabAudits = [];
  for (const tab of DIRECTORY_TABS) {
    tabAudits.push(await auditTabGeometryAndDates(page, tab));
  }

  const api = await fetch(`${API_BASE}/api/runners`).then((r) => r.json());
  const apiUp = (api.rows || []).filter((r) => r.up).length;

  const pagerOk = snap1.apiRows <= 20 || (snap1.pagerVisible && /page\s*\d+\s*of/i.test(snap1.pagerText));
  const rowDensityOk = snap1.naturalRowHeight !== false && (snap1.rowHeight === 0 || snap1.naturalRowHeight);
  const statusStable = snap2.upRows === snap1.upRows && snap2.downRows === snap1.downRows;
  const allTabsOk = tabAudits.every((t) => t.ok);

  const ok =
    pagerOk &&
    rowDensityOk &&
    snap1.titleEmoji.includes("▶") &&
    snap1.colEmojis.length >= 3 &&
    (Boolean(snap1.coloredSeg) || (snap1.detailModalOpen && snap1.detailSections.length >= 2)) &&
    snap1.detailModalOpen &&
    snap1.detailMeta &&
    snap1.detailSections.length >= 2 &&
    snap1.headerVisible &&
    snap1.upRows > 0 &&
    snap1.upRows <= apiUp &&
    (snap1.apiRows <= 20 ? snap1.upRows === apiUp : snap1.upRows + snap1.downRows === 20) &&
    statusStable &&
    allTabsOk &&
    pageErrors.length === 0;

  console.log(
    JSON.stringify(
      {
        ok,
        profileName,
        apiUp,
        snap1,
        snap2,
        tabAudits,
        pageErrors,
      },
      null,
      2,
    ),
  );
  process.exit(ok ? 0 : 1);
} finally {
  await close();
}
