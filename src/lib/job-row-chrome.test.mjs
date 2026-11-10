import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  formatArmedCountdown,
  formatJobLiveProgressBadge,
  formatJobLiveProgressTooltip,
  jobNextText,
  jobRunAction,
  jobStatusView,
  jobMatchesStatusLabel,
  mergedRunLabel,
} from "./job-row-chrome.mjs";

const NOW = Date.parse("2026-10-19T12:00:00.000Z");

test("merged button hides the outcome that made Start look like it bounced back", () => {
  assert.equal(mergedRunLabel({ status: "idle" }, true), "Syncing");
  assert.equal(mergedRunLabel({ status: "running" }, true), "Stop");
  assert.equal(mergedRunLabel({ status: "idle", lastSuccessfulSyncAt: "t" }, false), "Start");
  assert.equal(mergedRunLabel({ status: "error", lastResult: { ok: false } }, false), "Start");
  assert.equal(mergedRunLabel({ status: "idle", nextSyncAt: new Date(NOW + 15_000).toISOString() }, false), "Start");
});

test("split status keeps the outcome after Start returns", () => {
  assert.deepEqual(jobStatusView({ status: "idle", busy: true }), { label: "Syncing", tone: "active" });
  assert.deepEqual(jobStatusView({ status: "running" }), { label: "Syncing", tone: "active" });
  assert.deepEqual(jobStatusView({ status: "analyzing" }), { label: "Analyzing", tone: "active" });
  assert.deepEqual(jobStatusView({ status: "idle", lastSuccessfulSyncAt: "t" }), { label: "Synced", tone: "online" });
  assert.deepEqual(jobStatusView({ status: "error", lastResult: { ok: false } }), { label: "Failed", tone: "offline" });
  assert.deepEqual(jobStatusView({ status: "stopped" }), { label: "Stopped", tone: "idle" });
  assert.deepEqual(jobStatusView({ status: "paused" }), { label: "Stopped", tone: "idle" });
  assert.deepEqual(jobStatusView({ status: "idle" }), { label: "Idle", tone: "idle" });
  assert.equal(jobRunAction({ status: "idle", lastSuccessfulSyncAt: "t" }, false).label, "Stop");
  assert.equal(jobRunAction({ status: "idle", lastSuccessfulSyncAt: "t" }, false).kind, "pause");
  assert.equal(jobRunAction({ status: "error" }, false).label, "Retry");
  assert.equal(jobRunAction({ status: "running" }, true).label, "Stop");
  assert.equal(jobRunAction({ status: "running" }, true).pending, false);
  assert.equal(jobRunAction({ status: "idle" }, true).pending, true);
});

test("a failed job that is already armed still shows Failed, and Next shows the countdown", () => {
  const at = new Date(NOW + 15_000).toISOString();
  const job = { status: "error", lastResult: { ok: false }, nextSyncAt: at, settleSec: 20 };
  assert.equal(jobStatusView(job).label, "Failed");
  assert.equal(jobRunAction(job, false).kind, "retry");
  assert.deepEqual(jobNextText(job, NOW), { label: "15s", live: true });
});

test("Debounce is a countdown only while a sync is armed", () => {
  assert.equal(formatArmedCountdown(new Date(NOW + 72_000).toISOString(), NOW), "1m 12s");
  assert.equal(formatArmedCountdown(new Date(NOW - 1000).toISOString(), NOW), "Now");
  assert.deepEqual(jobNextText({ settleSec: 20 }, NOW), { label: "20s", live: false });
  assert.deepEqual(jobNextText({ settleSec: 60 }, NOW), { label: "1m", live: false });
  assert.deepEqual(jobNextText({ settleSec: 300 }, NOW), { label: "5m", live: false });
  assert.deepEqual(jobNextText({ settleSec: 0 }, NOW), { label: "Manual", live: false });
  assert.equal(jobStatusView({ status: "idle", nextSyncAt: new Date(NOW + 10_000).toISOString() }).label, "Waiting");
});

test("status filter uses the pill label, including paused as Stopped", () => {
  const paused = { status: "paused", settleSec: 20 };
  const synced = { status: "idle", lastSuccessfulSyncAt: "t", settleSec: 20 };
  assert.equal(jobMatchesStatusLabel(paused, ["Stopped"]), true);
  assert.equal(jobMatchesStatusLabel(paused, ["Idle"]), false);
  assert.equal(jobMatchesStatusLabel(synced, ["Synced"]), true);
  assert.equal(jobMatchesStatusLabel({ status: "analyzing" }, ["Syncing"]), false);
  assert.equal(jobMatchesStatusLabel({ status: "running" }, undefined), true);
});

test("the jobs table keeps Status and Run as two columns and Drives/New Job share SSOT chrome", () => {
  const meta = fs.readFileSync(new URL("./jobs-directory-meta.ts", import.meta.url), "utf8");
  const prefs = fs.readFileSync(new URL("./jobs-table-prefs.ts", import.meta.url), "utf8");
  assert.match(meta, /JOB_MODE_EMOJI/);
  assert.match(fs.readFileSync(new URL("./job-mode.ts", import.meta.url), "utf8"), /JOB_MODE_EMOJI = "🔁"/);
  assert.match(meta, /"status", "run", "next"/);
  const css = fs.readFileSync(new URL("../styles/p0009-jobs-directory-fixed-cols.generated.css", import.meta.url), "utf8");
  assert.match(fs.readFileSync(new URL("./jobs-table-prefs.ts", import.meta.url), "utf8"), /withDirectoryColumnLabelHints/);
  assert.match(fs.readFileSync(new URL("./folder-sync-directory-column-hints.ts", import.meta.url), "utf8"), /JOBS_RUN_HINT_LINES/);
  assert.match(css, /hub-users-col--status[\s\S]*min-width:\s*8\.75rem/);
  assert.match(css, /hub-users-col--run[\s\S]*min-width:\s*7\.25rem/);
  assert.match(prefs, /p0009_jobs_directory_columns_v6/);
  const settingRail = fs.readFileSync(new URL("../features/jobs/JobsSettingRail.tsx", import.meta.url), "utf8");
  assert.match(settingRail, /<FolderDropdownField/);
  assert.match(settingRail, /<ExcludeDropdownField/);
  const createModal = fs.readFileSync(new URL("../features/jobs/JobsCreateModal.tsx", import.meta.url), "utf8");
  assert.match(createModal, /<FolderDropdownField/);
  assert.match(createModal, /<ExcludeDropdownField/);
  assert.match(createModal, /FolderPickDropdown/);
  const folderPick = fs.readFileSync(new URL("../features/tree/FolderPickDropdown.tsx", import.meta.url), "utf8");
  assert.match(folderPick, /HubSingleFilterDropdown/);
  const drivesTable = fs.readFileSync(new URL("../features/drives/DrivesDirectoryTable.tsx", import.meta.url), "utf8");
  assert.match(drivesTable, /useHubScopedFreeze/);
  assert.match(drivesTable, /HubDirectoryCopyText/);
  const appTsx = fs.readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
  assert.match(appTsx, /HubToolLoadingProvider/);
  const jobsScreen = fs.readFileSync(new URL("../features/jobs/JobsScreen.tsx", import.meta.url), "utf8");
  assert.match(jobsScreen, /subscribeSyncEvents/);
  const drivesScreen = fs.readFileSync(new URL("../features/drives/DrivesScreen.tsx", import.meta.url), "utf8");
  assert.match(drivesScreen, /subscribeSyncEvents/);
});

test("formatJobLiveProgressBadge and formatJobLiveProgressTooltip format rclone stats cleanly", () => {
  assert.equal(formatJobLiveProgressBadge(null), "");
  assert.equal(
    formatJobLiveProgressBadge({ percent: 42, speed: "6.5 MiB/s" }),
    "42% · 6.5 MiB/s",
  );
  assert.equal(
    formatJobLiveProgressBadge({ percent: 42, speed: "0 B/s" }),
    "42%",
  );
  assert.equal(
    formatJobLiveProgressTooltip({
      percent: 42,
      transferred: "21.0 MiB",
      total: "50.0 MiB",
      speed: "6.5 MiB/s",
      eta: "4s",
      filesDone: 3,
      filesTotal: 7,
    }),
    "Transferred: 21.0 MiB / 50.0 MiB (42%) · Speed: 6.5 MiB/s · ETA: 4s · Files: 3/7",
  );
});

test("public guide lives on the P0008 Landing Platform; the app keeps only the first-run tour", () => {
  const appTsx = fs.readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
  assert.match(appTsx, /FolderSyncGuidedTourModal/);
  assert.doesNotMatch(appTsx, /FolderSyncLandingPage|readAppZone/);
  const guideUrl = fs.readFileSync(new URL("./guide-url.ts", import.meta.url), "utf8");
  assert.match(guideUrl, /https:\/\/sync\.infi\.io\.vn\/intro\//);
  const systemScreen = fs.readFileSync(new URL("../features/system/SystemScreen.tsx", import.meta.url), "utf8");
  assert.match(systemScreen, /openP0009Guide/);
  assert.match(systemScreen, /Guided Setup Tour/);
  assert.equal(fs.existsSync(new URL("../features/landing", import.meta.url)), false, "in-app landing must stay removed");
  assert.equal(fs.existsSync(new URL("../../public/landing", import.meta.url)), false, "landing assets moved to P0008 sites/sync");
});
