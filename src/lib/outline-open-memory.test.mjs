import assert from "node:assert/strict";
import test from "node:test";
import {
  branchHasLoadedMatch,
  collectLoadedFolderPaths,
  collectOutlineFormats,
  compareOutlineNames,
  computeOutlineVirtualWindow,
  extractFileExtension,
  matchesOutlineRow,
  outlineOpenKey,
  readOutlineOpen,
  resolveOutlineSelectedTarget,
  writeOutlineOpen,
} from "./outline-open-memory.mjs";

function memory() {
  const bag = new Map();
  return {
    getItem: (key) => (bag.has(key) ? bag.get(key) : null),
    setItem: (key, value) => bag.set(key, value),
    removeItem: (key) => bag.delete(key),
  };
}

test("a reopened job restores the folders that were open", () => {
  const store = memory();
  const key = outlineOpenKey("job", "JB0003|C:\\Data|gdrive:Folder");
  writeOutlineOpen(store, key, ["src", "src/lib"]);
  assert.deepEqual(readOutlineOpen(store, key), ["src", "src/lib"]);
  writeOutlineOpen(store, key, []);
  assert.deepEqual(readOutlineOpen(store, key), []);
  assert.equal(store.getItem(key), null);
});

test("a broken memory value does not open folders", () => {
  const store = memory();
  const key = outlineOpenKey("drive", "gdrive");
  store.setItem(key, "{");
  assert.deepEqual(readOutlineOpen(store, key), []);
  store.setItem(key, JSON.stringify(["ok", "", 4, "x".repeat(500)]));
  assert.deepEqual(readOutlineOpen(store, key), ["ok"]);
});

test("collectLoadedFolderPaths gathers loaded folders in tree order and skips files", () => {
  const cache = {
    "": [
      { name: "Infi28-Branding", kind: "folder" },
      { name: "Sheet Backup.xlsx", kind: "file" },
      { name: "zalo-ai-bot-backups", kind: "folder" },
    ],
    "Infi28-Branding": [
      { name: "Logos", kind: "folder" },
      { name: "readme.txt", kind: "file" },
    ],
  };
  assert.deepEqual(collectLoadedFolderPaths(cache), [
    "Infi28-Branding",
    "Infi28-Branding/Logos",
    "zalo-ai-bot-backups",
  ]);
});

test("computeOutlineVirtualWindow slices large row lists and keeps small lists unwindowed", () => {
  const small = computeOutlineVirtualWindow(40, 0, 400);
  assert.equal(small.windowed, false);
  assert.equal(small.startIndex, 0);
  assert.equal(small.endIndex, 40);

  const large = computeOutlineVirtualWindow(5000, 2640, 400, { rowHeight: 26.4, overscan: 10 });
  assert.equal(large.windowed, true);
  assert.equal(large.startIndex, 90);
  assert.ok(large.endIndex > large.startIndex && large.endIndex < 5000);
  assert.ok(large.topPadPx > 0);
  assert.ok(large.bottomPadPx > 0);
});

test("resolveOutlineSelectedTarget builds breadcrumb segments and local/remote paths", () => {
  const res = resolveOutlineSelectedTarget({
    selectedPath: "Infi28-Branding/Logos/banner.png",
    localRootPath: "E:\\Sync\\Infi28",
    remoteSpec: "gdrive:Infi28",
  });
  assert.equal(res.relativePath, "Infi28-Branding/Logos/banner.png");
  assert.equal(res.localTarget, "E:\\Sync\\Infi28\\Infi28-Branding\\Logos\\banner.png");
  assert.equal(res.remoteTarget, "gdrive:Infi28/Infi28-Branding/Logos/banner.png");
  assert.deepEqual(res.segments, [
    { name: "Infi28-Branding", path: "Infi28-Branding" },
    { name: "Logos", path: "Infi28-Branding/Logos" },
    { name: "banner.png", path: "Infi28-Branding/Logos/banner.png" },
  ]);
});

test("extractFileExtension, collectOutlineFormats, matchesOutlineRow, branchHasLoadedMatch, and compareOutlineNames support O(N) memoized filtering and natural sort", () => {
  assert.equal(extractFileExtension("Sheet Backup.xlsx"), "xlsx");
  assert.equal(extractFileExtension(".gitignore"), "");
  const cache = {
    "": [{ name: "Infi28-Branding", kind: "folder" }],
    "Infi28-Branding": [{ name: "Sub", kind: "folder" }],
    "Infi28-Branding/Sub": [{ name: "hero-banner.png", kind: "file", status: "in-sync" }],
  };
  assert.deepEqual(
    collectOutlineFormats(cache, [".XLSX", { ext: "pdf" }, { ext: "(none)" }]),
    ["pdf", "png", "xlsx"],
  );
  const memo = new Map();
  let calls = 0;
  const matchPng = (row) => {
    calls += 1;
    return matchesOutlineRow(row, { formats: ["png"] });
  };
  assert.equal(branchHasLoadedMatch(cache, "Infi28-Branding", matchPng, memo), true);
  const firstCalls = calls;
  assert.equal(branchHasLoadedMatch(cache, "Infi28-Branding", matchPng, memo), true);
  assert.equal(calls, firstCalls, "memoized branch result must not re-evaluate children");
  assert.deepEqual(["file10.txt", "file2.txt", "File1.txt"].sort(compareOutlineNames), [
    "File1.txt",
    "file2.txt",
    "file10.txt",
  ]);
});
