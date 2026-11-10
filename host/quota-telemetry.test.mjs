import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFolderSyncTelemetrySnapshot,
  evaluateDriveQuotaPrecheck,
} from "./quota-telemetry.mjs";

test("evaluateDriveQuotaPrecheck blocks when Drive free space is below 16 MB safety floor", () => {
  const blocked = evaluateDriveQuotaPrecheck(
    { limitBytes: 15 * 1024 * 1024 * 1024, usedBytes: 15 * 1024 * 1024 * 1024 - 2 * 1024 * 1024 },
    50 * 1024 * 1024,
  );
  assert.equal(blocked.blocked, true);
  assert.equal(blocked.ok, false);
  assert.match(String(blocked.warning), /storage quota is full/i);

  const healthy = evaluateDriveQuotaPrecheck(
    { limitBytes: 15 * 1024 * 1024 * 1024, usedBytes: 2 * 1024 * 1024 * 1024 },
    50 * 1024 * 1024,
  );
  assert.equal(healthy.blocked, false);
  assert.equal(healthy.ok, true);
  assert.equal(healthy.warning, null);
});

test("buildFolderSyncTelemetrySnapshot aggregates live jobs and drive account free space", () => {
  const snap = buildFolderSyncTelemetrySnapshot(
    [
      {
        id: "j1",
        code: "JB0001",
        name: "Docs",
        remote: "gdrive:Docs",
        status: "idle",
        lastSuccessfulSyncAt: "2026-10-22T01:00:00.000Z",
        lastResult: { ok: true },
      },
    ],
    [
      {
        name: "gdrive",
        authorized: true,
        email: "user@example.com",
        storage: { usedBytes: 1000, limitBytes: 5000 },
      },
    ],
  );
  assert.equal(snap.code, "P0009");
  assert.equal(snap.totals.liveJobs, 1);
  assert.equal(snap.totals.syncedJobs, 1);
  assert.equal(snap.accounts[0]?.freeBytes, 4000);
});
