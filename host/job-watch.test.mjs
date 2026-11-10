import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {
  drivePollDecision,
  driveSignature,
  filterExcludedEntries,
  findExcludedPaths,
  JOB_TRASH_WINDOW_MS,
  parseExcludeList,
  partitionJobsTrash,
  rcloneExcludeArgs,
  rcloneIncludeExcludedArgs,
  settleMsFromJob,
  shouldAutoWatch,
  WATCH_SETTLE_MS,
} from "./job-watch.mjs";

test("watch settles 20s after the last change", () => {
  assert.equal(WATCH_SETTLE_MS, 20_000);
});

test("watches a folder that exists, including trees that contain node_modules", () => {
  const photos = path.join("D:", "Photos");
  const repo = path.join("E:", "Repo");
  const exists = (target) => target === photos || target === repo || target === path.join(repo, "node_modules");
  assert.equal(shouldAutoWatch("", exists), false);
  assert.equal(shouldAutoWatch(path.join("D:", "Missing"), exists), false);
  assert.equal(shouldAutoWatch(photos, exists), true);
  assert.equal(shouldAutoWatch(repo, exists), true);
});

test("default excludes skip junk folders, env files, media cache, office temp, and system hidden files", () => {
  const defaults = parseExcludeList(undefined);
  assert.equal(defaults.includes("node_modules"), true);
  assert.equal(defaults.includes("Media Cache Files"), true);
  assert.equal(defaults.includes("*.pek"), true);
  assert.equal(defaults.includes("~$*"), true);
  assert.equal(defaults.includes("Thumbs.db"), true);
  assert.deepEqual(
    parseExcludeList("node_modules,dist,.git,.env,.env.local,*.log,*.tmp,~$*"),
    defaults,
  );
  assert.deepEqual(parseExcludeList(""), []);
  const kept = filterExcludedEntries(
    [
      { path: "src/app.ts" },
      { path: "node_modules/left-pad/index.js" },
      { path: "dist/index.js" },
      { path: ".git/config" },
      { path: ".env" },
      { path: ".env.local" },
      { path: "logs/host.log" },
      { path: "notes/draft.tmp" },
      { path: "docs/~$Report.docx" },
      { path: "Media Cache Files/clip.pek" },
      { path: "Thumbs.db" },
      { path: ".DS_Store" },
    ],
    undefined,
  );
  assert.deepEqual(kept.map((row) => row.path), ["src/app.ts"]);
  assert.deepEqual(rcloneExcludeArgs("*.log"), ["--exclude", "*.log", "--exclude", "**/*.log"]);
  assert.deepEqual(rcloneIncludeExcludedArgs("*.log"), ["--include", "*.log", "--include", "**/*.log"]);
  assert.deepEqual(
    findExcludedPaths(["src/app.ts", "node_modules/pkg/index.js", "Thumbs.db"], undefined),
    ["node_modules/pkg/index.js", "Thumbs.db"],
  );
});

test("drive poll syncs only after the listing changes", () => {
  const first = driveSignature([{ path: "hello.txt", size: 12, modTime: "a" }]);
  const grown = driveSignature([
    { path: "hello.txt", size: 12, modTime: "a" },
    { path: "clip.mp4", size: 40, modTime: "b" },
  ]);
  const baseline = { remote: "gdrive:Folder", signature: first };
  assert.equal(drivePollDecision(undefined, baseline), "baseline");
  assert.equal(drivePollDecision(baseline, baseline), "same");
  assert.equal(drivePollDecision(baseline, { remote: "gdrive:Folder", signature: grown }), "sync");
  assert.equal(drivePollDecision(baseline, { remote: "gdrive:Other", signature: first }), "baseline");
  const nested = driveSignature([{ path: "photos/clip.mp4", size: 40, modTime: "b" }]);
  assert.notEqual(nested, driveSignature([{ path: "clip.mp4", size: 40, modTime: "b" }]));
});

test("sync after is manual, 20s, 1m, or 5m", () => {
  assert.equal(settleMsFromJob({ settleSec: 0 }), 0);
  assert.equal(settleMsFromJob({ settleSec: 20 }), 20_000);
  assert.equal(settleMsFromJob({ settleSec: 60 }), 60_000);
  assert.equal(settleMsFromJob({ settleSec: 300 }), 300_000);
  assert.equal(settleMsFromJob({}), 20_000);
});

test("Trash keeps a job for 30 days, then drops it", () => {
  const now = Date.parse("2026-10-20T00:00:00.000Z");
  const recent = new Date(now - 1000).toISOString();
  const old = new Date(now - JOB_TRASH_WINDOW_MS - 1).toISOString();
  const parted = partitionJobsTrash(
    [
      { id: "live" },
      { id: "trash", deletedAt: recent },
      { id: "gone", deletedAt: old },
    ],
    now,
  );
  assert.deepEqual(parted.live.map((job) => job.id), ["live"]);
  assert.deepEqual(parted.trash.map((job) => job.id), ["trash"]);
  assert.equal(parted.expired, true);
  assert.deepEqual(parted.jobs.map((job) => job.id), ["live", "trash"]);
});
