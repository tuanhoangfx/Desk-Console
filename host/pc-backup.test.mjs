import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { normalizePcBackupState, readPcBackupStatus } from "./pc-backup.mjs";

test("normalizePcBackupState handles unconfigured / empty state cleanly", () => {
  const out = normalizePcBackupState({}, { backupRoot: "D:\\Backups-PC", scriptExists: true });
  assert.equal(out.status, "never");
  assert.equal(out.health, "unconfigured");
  assert.equal(out.percent, 0);
  assert.equal(out.scriptAvailable, true);
  assert.match(out.phaseLabel, /Not backed up yet/i);
});

test("normalizePcBackupState classifies recent local+offsite run as protected and stale as overdue", () => {
  const now = Date.parse("2026-11-21T10:00:00.000Z");
  const recent = normalizePcBackupState(
    {
      status: "ok",
      ok: true,
      lastSuccessAt: "2026-11-21T08:00:00.000Z",
      offsiteGdriveOk: true,
      offsiteLenovoOk: true,
      archiveName: "pc-critical-20261121-0800.tar.gz",
      archiveBytes: 50_000_000,
    },
    { nowMs: now, archives: [{ name: "pc-critical-20261121-0800.tar.gz", bytes: 50_000_000, mtime: "2026-11-21T08:00:00.000Z" }] },
  );
  assert.equal(recent.health, "protected");
  assert.equal(recent.percent, 100);
  assert.equal(recent.ageHours, 2);

  const stale = normalizePcBackupState(
    {
      status: "ok",
      ok: true,
      lastSuccessAt: "2026-11-18T00:00:00.000Z",
      offsiteGdriveOk: true,
      offsiteLenovoOk: true,
    },
    { nowMs: now },
  );
  assert.equal(stale.health, "overdue");
  assert.match(stale.phaseLabel, /overdue/i);
});

test("normalizePcBackupState recovers stale running status when backup PID died", () => {
  const crashed = normalizePcBackupState(
    {
      status: "running",
      pid: 999999,
      percent: 42,
      lastSuccessAt: "2026-11-20T03:30:00.000Z",
    },
    { isPidAliveFn: () => false },
  );
  assert.equal(crashed.status, "error");
  assert.equal(crashed.health, "warning");
  assert.match(crashed.error || "", /stopped before finishing/i);
});

test("readPcBackupStatus merges disk state, archives, log tail and Dev-PC-Data-Backup schtask", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "p0001-backup-"));
  try {
    fs.mkdirSync(path.join(dir, "archives"), { recursive: true });
    fs.writeFileSync(path.join(dir, "archives", "pc-critical-20261121-0230.tar.gz"), "abc", "utf8");
    fs.writeFileSync(
      path.join(dir, "pc-backup.log"),
      "line 1\nline 2\nOK workstation backup\n",
      "utf8",
    );
    fs.writeFileSync(
      path.join(dir, "backup-state.json"),
      JSON.stringify({
        status: "ok",
        ok: true,
        lastSuccessAt: new Date().toISOString(),
        offsiteGdriveOk: true,
        offsiteLenovoOk: true,
        localMirrorBytes: 123456,
      }),
      "utf8",
    );
    fs.writeFileSync(
      path.join(dir, "backup-health-last.json"),
      JSON.stringify({
        ok: true,
        checkedAt: "2026-11-21T02:43:00.000Z",
        drillOk: true,
        drillEntries: 7663,
        cloudArchiveCount: 2,
        cloudLatestArchivePresent: true,
        cloudStatePresent: true,
        cloudMirrorDirs: ["AppsData", "Project"],
        alerts: [],
      }),
      "utf8",
    );
    const fakeScript = path.join(dir, "fake.mjs");
    fs.writeFileSync(fakeScript, "// ok\n", "utf8");

    const status = await readPcBackupStatus({
      backupRoot: dir,
      scriptPath: fakeScript,
      systemImage: { ok: true, state: "awaiting-disk", ready: false, summary: "Attach USB/2nd SSD", tasks: [], secondaryDisks: [] },
      listTasksFn: async () => [
        { name: "Dev-PC-Data-Backup", status: "Ready", schedule: "Daily 03:30", lastResult: "0" },
      ],
    });
    assert.equal(status.health, "protected");
    assert.equal(status.localArchiveCount, 1);
    assert.equal(status.logTail.length, 3);
    assert.equal(status.schtask?.name, "Dev-PC-Data-Backup");
    assert.equal(status.schtask?.schedule, "Daily 03:30");
    assert.equal(status.healthDrill?.drillOk, true);
    assert.equal(status.healthDrill?.drillEntries, 7663);
    assert.equal(status.healthDrill?.cloudLatestArchivePresent, true);
    assert.equal(status.systemImage?.state, "awaiting-disk");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
