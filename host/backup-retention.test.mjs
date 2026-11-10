import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  BACKUP_RETENTION_MS,
  parseStampFolderTimeMs,
  purgeExpiredBackupDirs,
} from "./backup-retention.mjs";

test("parseStampFolderTimeMs parses YYYYMMDD-HHMMSS prefixes", () => {
  const ms = parseStampFolderTimeMs("20261022-030458-path1");
  assert.equal(typeof ms, "number");
  assert.ok(ms > 0);
  assert.equal(parseStampFolderTimeMs("not-a-stamp"), null);
});

test("purgeExpiredBackupDirs removes expired and empty backup stamp folders while keeping recent non-empty ones", () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "p0009-retention-"));
  try {
    const jobDir = path.join(tmpRoot, "job-1");
    const oldStamp = path.join(jobDir, "20250101-010000");
    const emptyRecentStamp = path.join(jobDir, "20261022-020000");
    const activeRecentStamp = path.join(jobDir, "20261022-025000");

    fs.mkdirSync(oldStamp, { recursive: true });
    fs.writeFileSync(path.join(oldStamp, "old.txt"), "old", "utf8");

    fs.mkdirSync(emptyRecentStamp, { recursive: true });

    fs.mkdirSync(activeRecentStamp, { recursive: true });
    fs.writeFileSync(path.join(activeRecentStamp, "keep.txt"), "keep", "utf8");

    const nowMs = new Date(2026, 9, 22, 3, 0, 0).getTime();
    const res = purgeExpiredBackupDirs(tmpRoot, { maxAgeMs: BACKUP_RETENTION_MS, nowMs });

    assert.equal(res.purgedCount, 2);
    assert.equal(fs.existsSync(oldStamp), false);
    assert.equal(fs.existsSync(emptyRecentStamp), false);
    assert.equal(fs.existsSync(activeRecentStamp), true);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});
