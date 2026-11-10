import assert from "node:assert/strict";
import test from "node:test";
import { mergeBrowseSides } from "./browse-status.mjs";
import {
  addBackupFolderBytes,
  addFileToFolderBytes,
  applyFolderSizes,
  buildInventorySummary,
  createFolderByteState,
  createInventoryScanQueue,
  diffFileIndex,
  ensureFolderByteKey,
  fileExtension,
  fileLogEntries,
  fileLogFromRecent,
  fileLogIsBackupOnly,
  inventoryNeedsScan,
  isSyncBackupPath,
  lookupFolderBytes,
  parseLsfDirLine,
  parseLsfFileLine,
} from "./drive-inventory.mjs";

test("file extension uses the last suffix and skips names without one", () => {
  assert.equal(fileExtension("Document scans/Scan 001.jpg"), "jpg");
  assert.equal(fileExtension("Invoices.ZIP"), "zip");
  assert.equal(fileExtension("Work notes.txt"), "txt");
  assert.equal(fileExtension("README"), "(none)");
  assert.equal(fileExtension(".gitignore"), "(none)");
});

test("lsf file lines keep the path when the size and time use semicolons", () => {
  const row = parseLsfFileLine("Document scans/Scan 001.jpg;82648;2023-05-31T01:28:35.000Z");
  assert.equal(row.path, "Document scans/Scan 001.jpg");
  assert.equal(row.size, 82648);
  assert.equal(row.modTime, "2023-05-31T01:28:35.000Z");
  assert.equal(parseLsfFileLine("folder-only/"), null);
  assert.equal(parseLsfFileLine("Apps Data/;-1;2025-03-13 16:49:59"), null);
  assert.equal(parseLsfDirLine("Apps Data/;-1;2025-03-13 16:49:59"), "Apps Data");
  assert.equal(parseLsfDirLine("Document scans/Scan 001.jpg;82648;2023-05-31T01:28:35.000Z"), null);
  assert.equal(parseLsfFileLine(""), null);
});

test("inventory summary counts folders, files, and bytes by extension", () => {
  const summary = buildInventorySummary(
    [
      { path: "Document scans/Scan 001.jpg", size: 80, modTime: "2023-05-31T01:28:35.000Z" },
      { path: "Document scans/Scan 002.jpg", size: 20, modTime: "2023-05-30T01:00:00.000Z" },
      { path: "Customers.csv", size: 50, modTime: "2023-05-10T01:00:00.000Z" },
      { path: "README", size: 5, modTime: "2023-05-01T01:00:00.000Z" },
    ],
    2,
  );
  assert.equal(summary.folderCount, 2);
  assert.equal(summary.fileCount, 4);
  assert.equal(summary.listedBytes, 155);
  assert.equal(summary.formats[0].ext, "jpg");
  assert.equal(summary.formats[0].files, 2);
  assert.equal(summary.formats[0].bytes, 100);
  assert.equal(summary.formats.find((row) => row.ext === "(none)").files, 1);
  assert.equal(summary.latestPath, "Document scans/Scan 001.jpg");
});

test("folder byte totals roll up to each parent", () => {
  const state = createFolderByteState(3);
  addFileToFolderBytes(state, "Backup/Document scans/Scan 001.jpg", 10);
  addFileToFolderBytes(state, "Backup/Customers.csv", 5);
  assert.equal(state.bytes[""], 15);
  assert.equal(state.bytes.Backup, 15);
  assert.equal(state.bytes["Backup/Document scans"], 10);
});

test("folder keys use rclone NFC names and empty folders stay at 0 B", () => {
  const state = createFolderByteState();
  const nfd = "Gemini Gems/Cafe\u0301 notes/a.txt";
  addFileToFolderBytes(state, nfd, 8);
  ensureFolderByteKey(state, "Gemini Gems/Empty");
  assert.equal(state.bytes["Gemini Gems/Caf\u00e9 notes"], 8);
  assert.equal(state.bytes["Gemini Gems/Empty"], 0);
  assert.equal(lookupFolderBytes(state.bytes, "Gemini Gems", "Cafe\u0301 notes"), 8);
  assert.equal(lookupFolderBytes({ "Gemini Gems/Cafe\u0301 notes": 8 }, "Gemini Gems", "Caf\u00e9 notes"), 8);
  assert.equal(lookupFolderBytes(state.bytes, "Gemini Gems", "Empty"), 0);
  assert.equal(lookupFolderBytes(state.bytes, "", "Missing"), undefined);
});

test("backup copies stay out of the parent folder total", () => {
  const state = createFolderByteState();
  addFileToFolderBytes(state, "Brand/logo.png", 10);
  addBackupFolderBytes(state, "Brand/_FolderSyncBackups/logo.png", 4);
  addBackupFolderBytes(state, ".folder-sync-backup/old.txt", 2);
  assert.equal(state.bytes[""], 10);
  assert.equal(state.bytes.Brand, 10);
  assert.equal(state.bytes["Brand/_FolderSyncBackups"], 4);
  assert.equal(state.bytes[".folder-sync-backup"], 2);
});

test("a file diff is one row per path and the log keeps the newest files", () => {
  const changes = diffFileIndex(
    {
      "a.txt": { size: 1, modTime: "2023-01-01T00:00:00.000Z" },
      "gone.txt": { size: 2, modTime: "2023-01-01T00:00:00.000Z" },
    },
    {
      "a.txt": { size: 3, modTime: "2023-06-01T00:00:00.000Z" },
      "new.txt": { size: 4, modTime: "2023-07-01T00:00:00.000Z" },
    },
  );
  assert.equal(changes.length, 3);
  const log = fileLogEntries(changes, "2026-10-18T00:00:00.000Z");
  assert.equal(log.length, 3);
  assert.equal(log[0].message, "gone.txt removed");
  assert.equal(log[0].at, "2026-10-18T00:00:00.000Z");
  assert.equal(log[0].changes[0].after, "");
  assert.equal(log.find((row) => row.message === "new.txt added").changes[0].before, "");
  assert.equal(log.find((row) => row.message === "a.txt updated").at, "2023-06-01T00:00:00.000Z");
});

test("backup removals do not push a work file out of the log", () => {
  assert.equal(isSyncBackupPath("_FolderSyncBackups/job/a.txt"), true);
  assert.equal(isSyncBackupPath("Brand/notes.txt"), false);
  const log = fileLogEntries(
    [
      { action: "removed", path: "_FolderSyncBackups/job/a.txt" },
      { action: "removed", path: ".folder-sync-backup/job/b.txt" },
      { action: "changed", path: "Brand/notes.txt", at: "2023-05-01T00:00:00.000Z", beforeSize: 4 },
    ],
    "2026-10-18T00:00:00.000Z",
    2,
  );
  assert.equal(log.length, 2);
  assert.ok(log.some((row) => row.message === "notes.txt updated"));
  assert.equal(
    fileLogIsBackupOnly({
      fileLog: [{ changes: [{ field: "file", before: "_FolderSyncBackups/job/a.txt", after: "" }] }],
    }),
    true,
  );
});

test("the first listing logs each recent file at its own modification time", () => {
  const log = fileLogFromRecent([
    { path: "old.txt", size: 1, modTime: "2023-01-01T00:00:00.000Z" },
    { path: "Document scans/Scan 009.jpg", size: 2, modTime: "2023-05-31T01:57:12.000Z" },
  ]);
  assert.equal(log.length, 2);
  assert.equal(log[0].message, "Scan 009.jpg updated");
  assert.equal(log[0].at, "2023-05-31T01:57:12.000Z");
  assert.equal(log[0].changes[0].field, "file");
  assert.equal(log[1].message, "old.txt updated");
});

test("a finished inventory stays fresh and an error is retried sooner", () => {
  const now = Date.parse("2026-10-18T09:00:00.000Z");
  assert.equal(inventoryNeedsScan(null, now), true);
  assert.equal(inventoryNeedsScan({ scannedAt: "2026-10-18T08:55:00.000Z" }, now), false);
  assert.equal(inventoryNeedsScan({ scannedAt: "2026-10-18T08:00:00.000Z" }, now), true);
  assert.equal(inventoryNeedsScan({ scannedAt: "2026-10-18T08:59:00.000Z", error: "timeout" }, now), false);
  assert.equal(inventoryNeedsScan({ scannedAt: "2026-10-18T08:50:00.000Z", error: "timeout" }, now), true);
});

test("cached folder sizes fill folder rows and leave files alone", () => {
  const rows = applyFolderSizes(
    "missing-drive",
    "Backup",
    [
      { name: "Document scans", kind: "folder", size: null },
      { name: "Customers.csv", kind: "file", size: 12 },
    ],
  );
  assert.equal(rows[0].size, null);
  assert.equal(rows[1].size, 12);
});

test("browse rows keep each side's modification time", () => {
  const rows = mergeBrowseSides(
    [{ name: "Scan 001.jpg", kind: "file", size: 10, modTime: "2023-05-31T01:28:35.000Z" }],
    [{ name: "Scan 001.jpg", kind: "file", size: 10, modTime: "2023-05-31T01:28:35.000Z" }],
  );
  assert.equal(rows[0].local.modTime, "2023-05-31T01:28:35.000Z");
  assert.equal(rows[0].remote.modTime, "2023-05-31T01:28:35.000Z");
  assert.equal(rows[0].status, "in-sync");
});

test("inventory scan queue serializes concurrent recursive rclone scans", async () => {
  const enqueue = createInventoryScanQueue(1);
  let active = 0;
  let maxActive = 0;
  const order = [];
  await Promise.all(
    ["gdrive", "gdrive3", "obella", "gdrive_sub"].map((name, idx) =>
      enqueue(async () => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        order.push(`start:${name}`);
        await new Promise((r) => setTimeout(r, 10 - idx * 2));
        order.push(`end:${name}`);
        active -= 1;
      }),
    ),
  );
  assert.equal(maxActive, 1);
  assert.deepEqual(order, [
    "start:gdrive",
    "end:gdrive",
    "start:gdrive3",
    "end:gdrive3",
    "start:obella",
    "end:obella",
    "start:gdrive_sub",
    "end:gdrive_sub",
  ]);
});
