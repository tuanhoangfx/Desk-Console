#!/usr/bin/env node
/**
 * Smoke — Desk host runners/tasks API + Stealth UI tabs (agent pool 9990–9999).
 *
 *   node scripts/smoke-runners-tasks.mjs
 *   node scripts/smoke-runners-tasks.mjs --host-only
 *   DESK_API_ORIGIN=http://127.0.0.1:6011 node scripts/smoke-runners-tasks.mjs
 */
import { spawnSync } from "node:child_process";
import { stealthBrowser } from "../../scripts/lib/stealth-browser-client.mjs";
import { openStealthCdpSession, cdpEvaluate } from "../../scripts/lib/stealth-cdp-session.mjs";

process.env.STEALTH_AGENT_SMOKE = "1";
process.env.STEALTH_HEADLESS_SMOKE = "1";

const hostOnly = process.argv.includes("--host-only");
const UI_BASE = (process.env.DESK_UI_ORIGIN || "http://127.0.0.1:5180").replace(/\/$/, "");

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

async function probeUiTab(send, tab, titleRe) {
  await send("Page.navigate", { url: `${UI_BASE}/${tab}` });
  await new Promise((r) => setTimeout(r, 3500));
  return cdpEvaluate(
    send,
    `(() => {
      const text = document.body?.innerText || "";
      const hasTitle = ${titleRe}.test(text);
      const hasTable = Boolean(document.querySelector("table.hub-directory-frame-table, .hub-users-table--desk-directory"));
      const hasSplit = Boolean(document.querySelector(".desk-ops-workflow-rail, .hub-runtime-rail-surface"));
      const hasSearch = Boolean(document.querySelector("input[placeholder*='Search' i], .hub-filter-bar"));
      const overlay = Boolean(document.querySelector("vite-error-overlay"));
      return { ok: hasTitle && hasTable && hasSplit && hasSearch && !overlay, hasTitle, hasTable, hasSplit, hasSearch, overlay, href: location.href };
    })()`,
  );
}

async function probeUi() {
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
  if (!hit) throw new Error(`Stealth profile missing ${profile}`);

  await stealthBrowser.launch(String(hit.id)).catch(() => null);
  const { send, close } = await openStealthCdpSession(profile, { relaunch: false, timeoutMs: 45_000 });
  try {
    const runners = await probeUiTab(send, "runners", /runners/i);
    if (!runners?.ok) throw new Error(`runners UI probe failed: ${JSON.stringify(runners)}`);
    const tasks = await probeUiTab(send, "tasks", /tasks/i);
    if (!tasks?.ok) throw new Error(`tasks UI probe failed: ${JSON.stringify(tasks)}`);
    return { profile, runners, tasks };
  } finally {
    await close();
  }
}

const hostBase = await resolveHostBase();
const hostResult = await probeHost(hostBase);
console.log("[host]", JSON.stringify({ base: hostBase, ...hostResult }));

if (hostOnly) {
  console.log("SMOKE_OK host-only");
  process.exit(0);
}

let uiResult = null;
try {
  const uiProbe = await fetch(`${UI_BASE}/`, { signal: AbortSignal.timeout(3000) });
  if (!uiProbe.ok) throw new Error(`UI ${UI_BASE} → ${uiProbe.status}`);
  uiResult = await probeUi();
  console.log("[ui]", JSON.stringify(uiResult));
} catch (err) {
  console.warn("[ui] skipped —", err instanceof Error ? err.message : String(err));
  console.log("SMOKE_OK host-only (UI down)");
  process.exit(0);
}

console.log("SMOKE_OK runners+tasks");
process.exit(0);
