import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  createLocalSubfolder,
  formatDriveFreeLabel,
  listLocalDrives,
  validateNewFolderName,
} from "./local-drives.mjs";

test("formatDriveFreeLabel formats free space humanly", () => {
  assert.equal(formatDriveFreeLabel(null), "");
  assert.equal(formatDriveFreeLabel(500 * 1024 ** 2), "500 MB free");
  assert.equal(formatDriveFreeLabel(4.2 * 1024 ** 3), "4.2 GB free");
  assert.equal(formatDriveFreeLabel(128 * 1024 ** 3), "128 GB free");
  assert.equal(formatDriveFreeLabel(1.5 * 1024 ** 4), "1.5 TB free");
});

test("listLocalDrives discovers mounted Windows drives and computes free space", () => {
  const drives = listLocalDrives({
    platform: "win32",
    existsSync: (p) => p === "C:\\" || p === "E:\\",
    statSync: () => ({ isDirectory: () => true }),
    statfsSync: (p) =>
      p === "C:\\"
        ? { bavail: 100 * 1024 * 256, blocks: 500 * 1024 * 256, bsize: 4096 }
        : { bavail: 800 * 1024 * 256, blocks: 1000 * 1024 * 256, bsize: 4096 },
  });
  assert.equal(drives.length, 2);
  assert.equal(drives[0].root, "C:\\");
  assert.equal(drives[0].label, "C:\\ · 100 GB free");
  assert.equal(drives[1].root, "E:\\");
  assert.equal(drives[1].label, "E:\\ · 800 GB free");
});

test("validateNewFolderName and createLocalSubfolder validate names and create nested folders", () => {
  assert.equal(validateNewFolderName("").ok, false);
  assert.equal(validateNewFolderName("..").ok, false);
  assert.equal(validateNewFolderName("bad/name").ok, false);
  assert.equal(validateNewFolderName("CON").ok, false);
  assert.deepEqual(validateNewFolderName("  Project 2026... "), { ok: true, name: "Project 2026" });

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "p0009-mkdir-"));
  const createdRoot = createLocalSubfolder(tmp, "", "Alpha");
  assert.equal(createdRoot.ok, true);
  assert.equal(createdRoot.path, "Alpha");
  assert.equal(fs.existsSync(path.join(tmp, "Alpha")), true);

  const createdNested = createLocalSubfolder(tmp, "Alpha", "Beta");
  assert.equal(createdNested.ok, true);
  assert.equal(createdNested.path, "Alpha/Beta");
  assert.equal(fs.existsSync(path.join(tmp, "Alpha", "Beta")), true);
});
