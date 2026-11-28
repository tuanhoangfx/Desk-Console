#!/usr/bin/env node
/**
 * Smoke — Desk host runners/tasks API + headless Stealth UI tabs (dynamic agent pool 9xxx).
 *
 *   node scripts/smoke-runners-tasks.mjs
 *   node scripts/smoke-runners-tasks.mjs --host-only
 *   DESK_API_ORIGIN=http://127.0.0.1:6011 node scripts/smoke-runners-tasks.mjs
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { connectStealthHeadless } from "../../scripts/lib/stealth-headless-cdp.mjs";

process.env.STEALTH_AGENT_SMOKE = "1";
process.env.STEALTH_HEADLESS_SMOKE = "1";
process.env.STEALTH_ISOLATED_CLOAK = process.env.STEALTH_ISOLATED_CLOAK || "1";

const hostOnly = process.argv.includes("--host-only");
const UI_BASE = (process.env.DESK_UI_ORIGIN || "http://127.0.0.1:5180").replace(/\/$/, "");

function resolveSmokeHubToken() {
  const fromEnv = String(process.env.DESK_HUB_TOKEN || process.env.HUB_ACCESS_TOKEN || "").trim();
  if (fromEnv) return { token: fromEnv, session: null };
  const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
  for (const dirName of ["desk-console", "desk-console-dev"]) {
    const sessFile = path.join(appData, dirName, "hub-session.json");
    if (!fs.existsSync(sessFile)) continue;
    try {
      const parsed = JSON.parse(fs.readFileSync(sessFile, "utf8"));
      const tok = String(parsed?.accessToken || parsed?.access_token || "").trim();
      if (tok) return { token: tok, session: parsed };
    } catch {
      /* ignore corrupt session */
    }
  }
  return { token: "", session: null };
}

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

async function probeHost(base, authHeaders) {
  const health = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(5000) });
  if (!health.ok) throw new Error(`GET /api/health → ${health.status}`);
  const healthBody = await health.json();
  if (healthBody.ok !== true) throw new Error("health body missing ok:true");

  const runners = await fetch(`${base}/api/runners`, { headers: authHeaders, signal: AbortSignal.timeout(15000) });
  if (!runners.ok) throw new Error(`GET /api/runners → ${runners.status}`);
  const runnersBody = await runners.json();
  if (!Array.isArray(runnersBody.rows)) throw new Error("/api/runners rows must be array");

  const tasks = await fetch(`${base}/api/tasks`, { headers: authHeaders, signal: AbortSignal.timeout(15000) });
  if (!tasks.ok) throw new Error(`GET /api/tasks → ${tasks.status}`);
  const tasksBody = await tasks.json();
  if (!Array.isArray(tasksBody.rows)) throw new Error("/api/tasks rows must be array");

  return {
    runners: runnersBody.rows.length,
    tasks: tasksBody.rows.length,
    cursorRunning: Boolean(healthBody.cursorRunning),
  };
}

async function probeUiTab(page, tab, titlePattern, origin = UI_BASE) {
  await page.goto(`${origin}/${tab}?_s=${Date.now()}`, {
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
    const hasNoSplitRail = !document.querySelector(".desk-ops-workflow-rail, .stealth-workflow-rail");
    const hasKpis = document.querySelectorAll(".hub-kpi-tile, [data-hub-kpi-key]").length >= 4 || Boolean(document.querySelector(".hub-kpi-strip"));
    const hasCharts = document.querySelectorAll(".hub-chart-card").length === 4;
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
      ok: hasTitle && hasTable && hasNoSplitRail && hasKpis && hasCharts && hasSearch && !overlay && widthMismatches.length === 0,
      hasTitle,
      hasTable,
      hasNoSplitRail,
      hasKpis,
      hasCharts,
      hasSearch,
      overlay,
      widthMismatches,
      href: location.href,
    };
  }, titlePattern.source);
}

async function probeModalRuntime(page, sectionId, { requireRuntimeSection = true } = {}) {
  const rowCell = page
    .locator(
      "table.hub-directory-frame-table tbody tr:not(.hub-users-row--pad) td.hub-users-col--status, table.hub-users-table tbody tr:not(.hub-users-row--pad) td.hub-users-col--status",
    )
    .first();
  const rowCount = await rowCell.count();
  if (rowCount === 0) {
    return { opened: false, skippedEmpty: true, runtimeHeight: 0 };
  }
  await rowCell.click();
  await page
    .waitForFunction(
      ({ id, req }) => {
        const modal = document.querySelector("[role='dialog'], .hub-modal-backdrop, .hub-modal-shell");
        if (!modal) return false;
        if (!req) return true;
        return Boolean(document.getElementById(id));
      },
      { id: sectionId, req: requireRuntimeSection },
      { timeout: 6_000 },
    )
    .catch(() => null);
  await page.waitForTimeout(300);

  const metrics = await page.evaluate((id) => {
    const modal = document.querySelector("[role='dialog'], .hub-modal-shell, .hub-modal-frame");
    const section = document.getElementById(id);
    const rect = section ? section.getBoundingClientRect() : null;
    const modalRect = modal ? modal.getBoundingClientRect() : null;
    return {
      opened: Boolean(modal && modalRect && modalRect.height > 100),
      hasRuntimeSection: Boolean(section),
      runtimeHeight: Math.round(rect?.height || 0),
    };
  }, sectionId);

  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(200);
  return metrics;
}

async function probeUi(auth, hostBase) {
  const profile = assignAgentProfile();
  const pageErrors = [];
  const session = await connectStealthHeadless(profile, {
    viewport: { width: 1440, height: 900 },
  });
  const { context, page, close } = session;
  const nowSec = Math.floor(Date.now() / 1000);
  const fallbackPayload = btoa(
    JSON.stringify({
      sub: "00000000-0000-4000-8000-000000000001",
      email: "admin@infi.io.vn",
      role: "authenticated",
      aud: "authenticated",
      exp: nowSec + 86400,
    }),
  );
  const fallbackToken = `${btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${fallbackPayload}.sig`;
  const effectiveToken = auth.token || fallbackToken;
  await context.addInitScript((snapAuth) => {
    try {
      if (window.localStorage.getItem("x1z10:hub-identity-v2")) return;
      const exp = Number(snapAuth.expiresAt) || Math.floor(Date.now() / 1000) + 86400;
      const uid = snapAuth.userId || "00000000-0000-4000-8000-000000000001";
      window.localStorage.setItem(
        "x1z10:hub-identity-v2",
        JSON.stringify({
          access_token: snapAuth.token,
          refresh_token: "desk-smoke-refresh",
          expires_at: exp,
          user_email: snapAuth.email || "admin@infi.io.vn",
          user_id: uid,
          supabase_url: "",
          supabase_anon_key: "desk-smoke-anon",
          cached_at: Date.now(),
        }),
      );
      window.localStorage.removeItem("x1z10:hub-identity-signed-out");
      window.sessionStorage.setItem(
        "p0001:hub-tool-access-cache:v1",
        JSON.stringify([{ userId: uid, toolCode: "P0001", ok: true, at: Date.now() }]),
      );
    } catch {
      /* ignore */
    }
  }, {
    token: effectiveToken,
    userId: auth.session?.userId || null,
    email: auth.session?.email || null,
    expiresAt: auth.session?.expiresAt || null,
  });
  if (!auth.token) {
    await page.route("**/auth/v1/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "00000000-0000-4000-8000-000000000001",
          email: "admin@infi.io.vn",
          aud: "authenticated",
          role: "authenticated",
          app_metadata: {},
          user_metadata: { approved: true, status: "active" },
        }),
      });
    });
    await page.route("**/rest/v1/profiles*", async (route) => {
      const accept = route.request().headers()["accept"] || "";
      const row = {
        id: "00000000-0000-4000-8000-000000000001",
        email: "admin@infi.io.vn",
        role: "admin",
        approved_at: "2026-01-01T00:00:00.000Z",
      };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(accept.includes("vnd.pgrst.object") ? row : [row]),
      });
    });
  }
  page.on("pageerror", (err) => pageErrors.push(String(err?.message || err)));
  try {
    const runners = await probeUiTab(page, "runners", /runners/i);
    if (!runners?.ok) throw new Error(`runners UI probe failed: ${JSON.stringify(runners)}`);
    const cron = await probeUiTab(page, "cron", /cron/i);
    if (!cron?.ok) throw new Error(`cron UI probe failed: ${JSON.stringify(cron)}`);
    const apps = await probeUiTab(page, "apps", /apps/i);
    if (!apps?.ok) throw new Error(`apps UI probe failed: ${JSON.stringify(apps)}`);
    const clips = await probeUiTab(page, "clips", /clips/i);
    if (!clips?.ok) throw new Error(`clips UI probe failed: ${JSON.stringify(clips)}`);
    const jobs = await probeUiTab(page, "jobs", /jobs/i);
    if (!jobs?.ok) throw new Error(`jobs UI probe failed: ${JSON.stringify(jobs)}`);
    const jobRuntimeModal = await probeModalRuntime(page, "p0009-job-runtime", { requireRuntimeSection: true });
    if (!jobRuntimeModal.skippedEmpty && (!jobRuntimeModal.opened || jobRuntimeModal.runtimeHeight <= 100)) {
      throw new Error(`jobs detail modal runtime probe failed: ${JSON.stringify(jobRuntimeModal)}`);
    }
    const drives = await probeUiTab(page, "drives", /drives/i);
    if (!drives?.ok) throw new Error(`drives UI probe failed: ${JSON.stringify(drives)}`);
    const driveRuntimeModal = await probeModalRuntime(page, "p0009-drive-runtime", { requireRuntimeSection: false });
    if (!driveRuntimeModal.skippedEmpty && !driveRuntimeModal.opened) {
      throw new Error(`drives detail modal runtime probe failed: ${JSON.stringify(driveRuntimeModal)}`);
    }
    const packagedClips = await probeUiTab(page, "clips", /clips/i, hostBase);
    if (!packagedClips?.ok) throw new Error(`packaged host clips UI probe failed: ${JSON.stringify(packagedClips)}`);
    const packagedJobs = await probeUiTab(page, "jobs", /jobs/i, hostBase);
    if (!packagedJobs?.ok) throw new Error(`packaged host jobs UI probe failed: ${JSON.stringify(packagedJobs)}`);
    if (pageErrors.length > 0) {
      throw new Error(`UI pageerrors: ${pageErrors.join("; ")}`);
    }
    return {
      profile,
      runners,
      cron,
      apps,
      clips,
      jobs,
      drives,
      jobRuntimeModal,
      driveRuntimeModal,
      packagedClips,
      packagedJobs,
      pageErrors: pageErrors.length,
    };
  } finally {
    await close();
  }
}

async function main() {
  const base = await resolveHostBase();
  const auth = resolveSmokeHubToken();
  const authHeaders = auth.token ? { Authorization: `Bearer ${auth.token}` } : {};
  const host = await probeHost(base, authHeaders);
  const ui = hostOnly ? null : await probeUi(auth, base);
  console.log(JSON.stringify({ ok: true, base, uiBase: UI_BASE, authenticated: Boolean(auth.token), host, ui }, null, 2));
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
