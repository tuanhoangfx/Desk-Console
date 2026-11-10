import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

test("armed 24/7 jobs pulse and show Stop; a pass shows Stop", async () => {
  const { jobRunAction, jobStatusLive } = await import("../src/lib/job-row-chrome.mjs");
  assert.equal(jobStatusLive({ status: "idle", settleSec: 20, lastResult: { ok: true } }), true);
  assert.equal(jobStatusLive({ status: "running", settleSec: 0 }), true);
  assert.equal(jobStatusLive({ status: "paused", settleSec: 20, lastResult: { ok: true } }), false);
  assert.equal(jobStatusLive({ status: "error", settleSec: 20, lastResult: { ok: false } }), false);
  assert.equal(jobRunAction({ status: "idle", settleSec: 20 }, false).label, "Stop");
  assert.equal(jobRunAction({ status: "idle", settleSec: 20 }, false).kind, "pause");
  assert.equal(jobRunAction({ status: "running", settleSec: 20 }, false).label, "Stop");
  assert.equal(jobRunAction({ status: "paused", settleSec: 20 }, false).label, "Start");
  assert.equal(jobRunAction({ status: "idle", settleSec: 0 }, false).label, "Start");
  assert.equal(jobRunAction({ status: "error", settleSec: 20, lastResult: { ok: false } }, false).label, "Retry");
});

test("buildTransferArgs adds trash + local trash backup + conflict suffix without remote backup-dir", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "p0009-"));
  process.env.FOLDER_SYNC_DATA_ROOT = tmp;
  const { bisyncNeedsResync, buildTransferArgs } = await import("./rclone-ops.mjs");
  assert.equal(bisyncNeedsResync("Must run --resync to recover."), true);
  assert.equal(bisyncNeedsResync("cannot find prior Path1 or Path2 listings"), true);
  assert.equal(bisyncNeedsResync("Bisync successful"), false);
  const { args, backupDir, conflictDir } = buildTransferArgs(
    {
      id: "job1",
      localPath: tmp,
      remote: "gdrive:x",
      mode: "bisync",
      lastSuccessfulSyncAt: null,
    },
    { dry: true },
  );
  assert.ok(args.includes("--drive-use-trash"));
  assert.ok(args.includes("--stats"));
  assert.ok(args.includes("--stats-one-line"));
  assert.ok(args.includes("--dry-run"));
  assert.ok(args.includes("--resync"));
  assert.ok(args.includes("--conflict-resolve"));
  assert.ok(args.includes("--backup-dir1"));
  assert.equal(args.includes("--backup-dir2"), false);
  assert.ok(String(backupDir).includes("Google Drive Trash"));
  assert.ok(conflictDir.includes("conflicts"));

  const mirrorLocal = buildTransferArgs({
    id: "job2",
    localPath: tmp,
    remote: "gdrive:mirror",
    mode: "mirror-local",
  });
  assert.ok(mirrorLocal.args.includes("--drive-use-trash"));
  assert.equal(mirrorLocal.args.includes("--backup-dir"), false);

  const mirrorRemote = buildTransferArgs({
    id: "job3",
    localPath: tmp,
    remote: "gdrive:mirror",
    mode: "mirror-remote",
  });
  assert.ok(mirrorRemote.args.includes("--drive-use-trash"));
  assert.ok(mirrorRemote.args.includes("--backup-dir"));
});

test("host server exposes remotes and trash routes", () => {
  const text = fs.readFileSync(new URL("./server.mjs", import.meta.url), "utf8");
  assert.match(text, /\/api\/host-metrics/);
  assert.match(text, /\/api\/events/);
  assert.match(text, /text\/event-stream/);
  assert.match(text, /\/logs\$\//);
  assert.match(text, /sampleHostMetrics/);
  assert.match(text, /\/api\/remotes/);
  assert.match(text, /\/api\/remotes\/drive\/accounts/);
  assert.match(text, /\/api\/remotes\/drive\/delete/);
  assert.match(text, /driveAccountReady/);
  assert.match(text, /\/api\/remotes\/drive\/status/);
  assert.match(text, /\/api\/remotes\/drive\/folders/);
  assert.match(text, /\/api\/trash/);
  assert.match(text, /analyze\|sync\|start\|stop/);
  assert.match(text, /oauth: true/);
  const ops = fs.readFileSync(new URL("./rclone-ops.mjs", import.meta.url), "utf8");
  assert.match(ops, /config_is_local = \$\{local \? "true" : "false"\}/);
  assert.match(ops, /writeDriveToken/);
  const oauth = fs.readFileSync(new URL("./drive-oauth.mjs", import.meta.url), "utf8");
  assert.match(oauth, /127\.0\.0\.1:53682/);
  assert.match(oauth, /Signed in/);
  assert.match(text, /startDriveOAuth/);
  assert.match(text, /\/browse/);
});

test("browse merge marks in-sync, local-only, cloud-only, and size drift", async () => {
  const { mergeBrowseSides, listLocalEntries, safeRel, summarizeCheckCombined } = await import("./browse-status.mjs");
  const rows = mergeBrowseSides(
    [
      { name: "Notes", kind: "folder", size: null },
      { name: "same.txt", kind: "file", size: 4 },
      { name: "drift.txt", kind: "file", size: 2 },
      { name: "only-local.txt", kind: "file", size: 1 },
    ],
    [
      { name: "Notes", kind: "folder", size: null },
      { name: "same.txt", kind: "file", size: 4 },
      { name: "drift.txt", kind: "file", size: 9 },
      { name: "only-cloud.txt", kind: "file", size: 3 },
    ],
  );
  const byName = Object.fromEntries(rows.map((row) => [row.name, row.status]));
  assert.equal(byName.Notes, "both");
  assert.equal(byName["same.txt"], "in-sync");
  assert.equal(byName["drift.txt"], "different");
  assert.equal(byName["only-local.txt"], "local");
  assert.equal(byName["only-cloud.txt"], "cloud");
  assert.equal(rows[0].kind, "folder");
  assert.equal(safeRel("../secret"), null);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "p0009-browse-"));
  fs.writeFileSync(path.join(tmp, "a.txt"), "hi");
  fs.mkdirSync(path.join(tmp, "Sub"));
  const listed = listLocalEntries(tmp, "");
  assert.equal(listed.ok, true);
  assert.equal(listed.entries.find((row) => row.name === "a.txt")?.kind, "file");
  assert.equal(listed.entries.find((row) => row.name === "Sub")?.kind, "folder");
  assert.equal(listLocalEntries(tmp, "../").ok, false);
  const scan = summarizeCheckCombined("= a.txt\n* b.txt\n- only-local.txt\n+ only-cloud.txt\n");
  assert.equal(scan.counts.match, 1);
  assert.equal(scan.counts.different, 1);
  assert.equal(scan.counts.local, 1);
  assert.equal(scan.counts.cloud, 1);
  assert.equal(scan.diffs.length, 3);
});

test("drive oauth url, token, and success page stay on one contract", async () => {
  const { buildDriveAuthUrl, oauthHashCaptureHtml, oauthResultHtml, rcloneTokenFromGoogle } = await import("./drive-oauth.mjs");
  const { patchDriveRemoteConfig } = await import("./rclone-ops.mjs");
  const url = new URL(buildDriveAuthUrl({ clientId: "client.apps.googleusercontent.com", scope: "drive", state: "abc" }));
  assert.equal(url.origin, "https://accounts.google.com");
  assert.equal(url.pathname, "/o/oauth2/auth");
  assert.equal(url.searchParams.get("redirect_uri"), "http://127.0.0.1:53682/");
  assert.equal(url.searchParams.get("state"), "abc");
  assert.equal(url.searchParams.get("client_secret"), null);
  const token = rcloneTokenFromGoogle({ access_token: "ya29.test", expires_in: 10, token_type: "Bearer" }, "1//keep");
  assert.equal(token.refresh_token, "1//keep");
  assert.equal(token.access_token, "ya29.test");
  assert.match(oauthResultHtml({ ok: true }), /Signed in/);
  assert.match(oauthResultHtml({ ok: true }), /close this tab/);
  assert.doesNotMatch(oauthResultHtml({ ok: false, message: "<script>" }), /<script>/);
  assert.match(oauthHashCaptureHtml(), /access_token/);
  assert.match(oauthHashCaptureHtml(), /error_description/);
  const patched = patchDriveRemoteConfig(
    "[gdrive]\r\ntype = drive\r\nconfig_is_local = true\r\ntoken = {\"access_token\":\"old\"}\r\n",
    "gdrive",
    { token: { access_token: "ya29.new", refresh_token: "1//new", token_type: "Bearer", expiry: "2026-10-08T00:00:00.000Z" }, local: true },
  );
  assert.match(patched, /config_is_local = true/);
  assert.match(patched, /ya29\.new/);
  assert.doesNotMatch(patched, /"old"/);
  const held = patchDriveRemoteConfig(patched, "gdrive", { local: false });
  assert.match(held, /config_is_local = false/);
  assert.match(held, /ya29\.new/);
  const copied = patchDriveRemoteConfig("[gdrive2]\ntype = drive\nscope = drive\n", "gdrive2", {
    clientId: "client.apps.googleusercontent.com",
    clientSecret: "secret",
    scope: "drive",
  });
  assert.match(copied, /\[gdrive2\][\s\S]*client_id = client\.apps\.googleusercontent\.com/);
  assert.match(copied, /client_secret = secret/);
  assert.doesNotMatch(copied, /client_secret = secret[\s\S]*client_secret = secret/);
});

test("oauth console lines redact tokens and show exit state", async () => {
  const { redactOauthLog, formatOauthConsoleLines, driveUserFromAboutBody } = await import("./rclone-ops.mjs");
  assert.equal(redactOauthLog("code=4/secret ya29.abc token=xyz"), "code=<redacted> token=<redacted> token=<redacted>");
  assert.deepEqual(
    formatOauthConsoleLines("gdrive", { stderr: "Success!", stdout: "", exitCode: 0 }),
    ["OAuth gdrive exit=0", "Success!"],
  );
  assert.equal(formatOauthConsoleLines("gdrive", { exitCode: null })[0], "OAuth gdrive running");
  assert.deepEqual(driveUserFromAboutBody({ user: { emailAddress: "a@b.co", displayName: "A" } }), {
    email: "a@b.co",
    displayName: "A",
    storage: { usedBytes: null, limitBytes: null, driveBytes: null, trashBytes: null },
  });
  assert.equal(
    driveUserFromAboutBody({
      storageQuota: { limit: "15000000000", usage: "1200000000", usageInDrive: "1000000000", usageInDriveTrash: "200000000" },
    }).storage.usedBytes,
    1200000000,
  );
  assert.equal(driveUserFromAboutBody({ user: { emailAddress: "not-an-email" } }).email, null);
});

test("extractAuthUrl keeps the Google consent link", async () => {
  const { extractAuthUrl } = await import("./rclone-ops.mjs");
  assert.equal(
    extractAuthUrl("go to https://accounts.google.com/o/oauth2/auth?x=1."),
    "https://accounts.google.com/o/oauth2/auth?x=1",
  );
  assert.equal(extractAuthUrl("no link"), null);
});

test("job codes stay stable and fill gaps in Created order", async () => {
  const { assignJobCodes, nextJobCode } = await import("./job-code.mjs");
  const first = assignJobCodes([
    { id: "b", createdAt: "2026-10-02T00:00:00.000Z", name: "Later" },
    { id: "a", createdAt: "2026-10-01T00:00:00.000Z", name: "Earlier" },
  ]);
  assert.equal(first.changed, true);
  assert.equal(first.jobs.find((job) => job.id === "a").code, "JB0001");
  assert.equal(first.jobs.find((job) => job.id === "b").code, "JB0002");
  const again = assignJobCodes(first.jobs);
  assert.equal(again.changed, false);
  assert.equal(nextJobCode(first.jobs), "JB0003");
});

test("an empty job log gains one Created row", async () => {
  const { ensureCreatedJobLogs } = await import("./job-activity.mjs");
  const first = ensureCreatedJobLogs([{ id: "a", createdAt: "2026-10-01T00:00:00.000Z", activityLog: [] }]);
  assert.equal(first.changed, true);
  assert.equal(first.jobs[0].activityLog[0].message, "Created");
  assert.equal(first.jobs[0].activityLog[0].at, "2026-10-01T00:00:00.000Z");
  const again = ensureCreatedJobLogs(first.jobs);
  assert.equal(again.changed, false);
});

test("a new job logs Job ID and Name as added fields", async () => {
  const { withJobActivity } = await import("./job-activity.mjs");
  const created = withJobActivity(
    null,
    { code: "JB0003", name: "Brand", localPath: "D:\\Brand", remote: "gdrive:Brand", mode: "bisync" },
    "2026-10-08T00:00:00.000Z",
  );
  assert.equal(created.activityLog.length, 1);
  assert.equal(created.activityLog[0].changes[0].field, "code");
  assert.equal(created.activityLog[0].changes[0].before, "");
  assert.equal(created.activityLog[0].changes[0].after, "JB0003");
  assert.equal(created.activityLog[0].changes[1].field, "name");
});

test("job activity log records a field change once", async () => {
  const { withJobActivity } = await import("./job-activity.mjs");
  const existing = { name: "A", localPath: "D:\\A", remote: "gdrive:A", mode: "bisync", note: "", activityLog: [] };
  const same = withJobActivity(existing, { ...existing, updatedAt: "t" }, "2026-10-07T00:00:00.000Z");
  assert.equal(same.activityLog.length, 0);
  const next = withJobActivity(
    existing,
    { ...existing, name: "B" },
    "2026-10-07T00:00:00.000Z",
    { label: "a@b.co", source: "hub" },
  );
  assert.equal(next.activityLog.length, 1);
  assert.equal(next.activityLog[0].changes[0].field, "name");
  assert.equal(next.activityLog[0].actor.label, "a@b.co");
  assert.equal(next.activityLog[0].actor.source, "hub");
  assert.match(next.activityLog[0].message, /Name: A → B/);
});

test("safeDriveDir keeps a relative folder and rejects traversal", async () => {
  const { safeDriveDir } = await import("./rclone-ops.mjs");
  assert.equal(safeDriveDir("Brand/Assets"), "Brand/Assets");
  assert.equal(safeDriveDir(""), "");
  assert.equal(safeDriveDir("../secret"), null);
  assert.equal(safeDriveDir("ok/../no"), null);
});

test("drive account ledger keeps Created and appends a sign-in log", async () => {
  const { recordDriveAccount } = await import("./rclone-ops.mjs");
  const { assignDriveCodes, nextDriveCode } = await import("./job-code.mjs");
  const first = recordDriveAccount("ledger-drive");
  assert.match(first.code || "", /^GG\d{4}$/);
  const second = recordDriveAccount("ledger-drive", {
    message: "Signed in",
    changes: [{ field: "status", before: "Sign in", after: "Signed in" }],
  });
  assert.equal(second.code, first.code);
  assert.equal(second.createdAt, first.createdAt);
  assert.equal(second.activityLog.at(-1).message, "Signed in");
  assert.equal(second.activityLog.at(-1).changes[0].field, "status");
  assert.notEqual(second.updatedAt, "");

  const assigned = assignDriveCodes([{ name: "gdrive" }, { name: "gdrive2", code: "GG0005" }]);
  assert.equal(assigned.accounts[0].code, "GG0006");
  assert.equal(assigned.accounts[1].code, "GG0005");
  assert.equal(nextDriveCode(assigned.accounts), "GG0007");
});

test("driveTokenPresent accepts a stored Google token only", async () => {
  const { driveTokenPresent } = await import("./rclone-ops.mjs");
  assert.equal(driveTokenPresent(null), false);
  assert.equal(driveTokenPresent({ type: "drive" }), false);
  assert.equal(driveTokenPresent({ token: { access_token: "ya29.abc" } }), true);
  assert.equal(driveTokenPresent({ token: JSON.stringify({ refresh_token: "1//abc" }) }), true);
  assert.equal(driveTokenPresent({ token: "not-json" }), false);
});

test("removeRemoteSection drops an unsigned remote and keeps the others", async () => {
  const { removeRemoteSection } = await import("./rclone-ops.mjs");
  const text = "[gdrive]\ntype = drive\ntoken = {\"refresh_token\":\"keep\"}\n\n[gdrive2]\ntype = drive\n\n[obella]\ntype = drive\n";
  const next = removeRemoteSection(text, "gdrive2");
  assert.match(next, /\[gdrive\]/);
  assert.match(next, /keep/);
  assert.match(next, /\[obella\]/);
  assert.doesNotMatch(next, /\[gdrive2\]/);
});

test("parseRcloneProgress extracts latest one-line stats from rclone output", async () => {
  const { parseRcloneProgress } = await import("./rclone-ops.mjs");
  assert.equal(parseRcloneProgress(""), null);
  assert.equal(parseRcloneProgress("2026/10/22 18:35:00 INFO  : Bisync successful"), null);
  const progress = parseRcloneProgress(
    [
      "2026/10/22 18:35:00 INFO  :   5.000 MiB / 50.000 MiB, 10%, 2.500 MiB/s, ETA 18s (xfr#1/8)",
      "2026/10/22 18:35:01 INFO  :   12.500 MiB / 50.000 MiB, 25%, 6.250 MiB/s, ETA 6s (xfr#2/8)",
    ].join("\n"),
  );
  assert.deepEqual(progress, {
    percent: 25,
    transferred: "12.500 MiB",
    total: "50.000 MiB",
    speed: "6.250 MiB/s",
    eta: "6s",
    filesDone: 2,
    filesTotal: 8,
  });
  const idleStats = parseRcloneProgress("2026/10/22 18:35:01 INFO  :          0 B / 0 B, -, 0 B/s, ETA -");
  assert.deepEqual(idleStats, {
    percent: null,
    transferred: "0 B",
    total: "0 B",
    speed: "0 B/s",
    eta: null,
    filesDone: null,
    filesTotal: null,
  });
});
