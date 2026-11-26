#!/usr/bin/env node
/**
 * Smoke — Desk host runners/tasks API + headless Stealth UI tabs (dynamic agent pool 9xxx).
 *
 *   node scripts/smoke-runners-tasks.mjs
 *   node scripts/smoke-runners-tasks.mjs --host-only
 *   DESK_API_ORIGIN=http://127.0.0.1:6011 node scripts/smoke-runners-tasks.mjs
 */
import { spawnSync } from "node:child_process";
import { connectStealthHeadless } from "../../scripts/lib/stealth-headless-cdp.mjs";

process.env.STEALTH_AGENT_SMOKE = "1";
process.env.STEALTH_HEADLESS_SMOKE = "1";

const hostOnly = process.argv.includes("--host-only");
const UI_BASE = (process.env.DESK_UI_ORIGIN || "http://127.0.0.1:5180").replace(/\/$/, "");

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

async function resolveHostBase() {
  const candidates = [
    process.env.DESK_API_ORIGIN,
    "http://127.0.0.1:6010",
    "http://127.0.0.1:6011",
  ]
    .filter(Boolean)
    .map((s) => String(s).replace(/\/$/, ""));
  for (const base of candidates) {
    try {
      const res = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(4000) });
      if (res.ok) return base;
    } catch {
      /* try next */
    }
  }
  throw new Error("Desk host not reachable on :6010/:6011 — run pnpm dev or host/server.mjs");
}

async function probeHost(base) {
  const health = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(5000) });
  if (!health.ok) throw new Error(`GET /api/health → ${health.status}`);
  const healthBody = await health.json();
  if (healthBody.ok !== true) throw new Error("health body missing ok:true");

  const runners = await fetch(`${base}/api/runners`, { signal: AbortSignal.timeout(15000) });
  if (!runners.ok) throw new Error(`GET /api/runners → ${runners.status}`);
  const runnersBody = await runners.json();
  if (!Array.isArray(runnersBody.rows)) throw new Error("/api/runners rows must be array");

  const tasks = await fetch(`${base}/api/tasks`, { signal: AbortSignal.timeout(15000) });
  if (!tasks.ok) throw new Error(`GET /api/tasks → ${tasks.status}`);
  const tasksBody = await tasks.json();
  if (!Array.isArray(tasksBody.rows)) throw new Error("/api/tasks rows must be array");

  return {
    runners: runnersBody.rows.length,
    tasks: tasksBody.rows.length,
    cursorRunning: Boolean(healthBody.cursorRunning),
  };
}

async function probeUiTab(page, tab, titlePattern) {
  await page.goto(`${UI_BASE}/${tab}?_s=${Date.now()}`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  await page
    .waitForFunction(
      (src) => {
        const re = new RegExp(src, "i");
        return (
          re.test(document.body?.innerText || "") &&
          Boolean(document.querySelector("table.hub-directory-frame-table, .hub-users-table"))
        );
      },
      titlePattern.source,
      { timeout: 15_000 },
    )
    .catch(() => null);
  await page.waitForTimeout(600);

  return page.evaluate((src) => {
    const titleRe = new RegExp(src, "i");
    const text = document.body?.innerText || "";
    const hasTitle = titleRe.test(text);
    const table = document.querySelector("table.hub-directory-frame-table, .hub-users-table--desk-directory");
    const hasTable = Boolean(table);
    const hasSplit = Boolean(document.querySelector(".desk-ops-workflow-rail, .hub-runtime-rail-surface"));
    const hasSearch = Boolean(document.querySelector("input[placeholder*='Search' i], .hub-filter-bar"));
    const overlay = Boolean(document.querySelector("vite-error-overlay"));
    const ths = [...(table?.querySelectorAll("thead th") || [])];
    const dataRow = table?.querySelector("tbody tr:not(.hub-users-row--pad)");
    const tds = [...(dataRow?.querySelectorAll("td") || [])];
    const widthMismatches = [];
    if (ths.length && tds.length === ths.length) {
      for (let i = 0; i < ths.length; i += 1) {
        const thW = Math.round(ths[i].getBoundingClientRect().width);
        const tdW = Math.round(tds[i].getBoundingClientRect().width);
        if (Math.abs(thW - tdW) > 1) {
          widthMismatches.push({
            index: i,
            header: (ths[i].textContent || "").trim(),
            thW,
            tdW,
          });
        }
      }
    }
    return {
      ok: hasTitle && hasTable && hasSplit && hasSearch && !overlay && widthMismatches.length === 0,
      hasTitle,
      hasTable,
      hasSplit,
      hasSearch,
      overlay,
      widthMismatches,
      href: location.href,
    };
  }, titlePattern.source);
}

async function probeUi() {
  const profile = assignAgentProfile();
  const pageErrors = [];
  const session = await connectStealthHeadless(profile, {
    viewport: { width: 1440, height: 900 },
  });
  const { page, close } = session;
  page.on("pageerror", (err) => pageErrors.push(String(err?.message || err)));
  try {
    const runners = await probeUiTab(page, "runners", /runners/i);
    if (!runners?.ok) throw new Error(`runners UI probe failed: ${JSON.stringify(runners)}`);
    const cron = await probeUiTab(page, "cron", /cron/i);
    if (!cron?.ok) throw new Error(`cron UI probe failed: ${JSON.stringify(cron)}`);
    if (pageErrors.length > 0) {
      throw new Error(`UI pageerrors: ${pageErrors.join("; ")}`);
    }
    return { profile, runners, cron, pageErrors: pageErrors.length };
  } finally {
    await close();
  }
}

async function main() {
  const base = await resolveHostBase();
  const host = await probeHost(base);
  const ui = hostOnly ? null : await probeUi();
  console.log(JSON.stringify({ ok: true, base, uiBase: UI_BASE, host, ui }, null, 2));
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
