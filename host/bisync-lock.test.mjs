import assert from "node:assert/strict";
import test from "node:test";
import { bisyncLockPathFromLog, clearStaleBisyncLocks, staleBisyncLockPath } from "./bisync-lock.mjs";

const LOG =
  "NOTICE: Failed to bisync: \u001b[31mprior lock file found: \u001b[93mC:\\Users\\CzP\\AppData\\Local\\rclone\\bisync\\job.lck\u001b[0m";

test("the colored rclone notice still yields the lock path", () => {
  assert.equal(
    bisyncLockPathFromLog(LOG),
    "C:\\Users\\CzP\\AppData\\Local\\rclone\\bisync\\job.lck",
  );
});

test("a dead PID is removable and a live PID is not", () => {
  const readFile = () => JSON.stringify({ PID: "210320" });
  assert.equal(staleBisyncLockPath(LOG, readFile, () => false), "C:\\Users\\CzP\\AppData\\Local\\rclone\\bisync\\job.lck");
  assert.equal(staleBisyncLockPath(LOG, readFile, () => true), null);
  assert.equal(staleBisyncLockPath("nothing failed", readFile, () => false), null);
});

test("only locks with a dead PID are removed", () => {
  const removed = [];
  const gone = clearStaleBisyncLocks("C:\\rclone\\bisync", {
    readDir: () => ["live.lck", "dead.lck", "note.txt"],
    readFile: (file) => JSON.stringify({ PID: String(file).includes("live") ? "11" : "22" }),
    unlink: (file) => removed.push(file),
    alive: (pid) => String(pid) === "11",
    join: (dir, name) => `${dir}\\${name}`,
  });
  assert.deepEqual(gone, ["C:\\rclone\\bisync\\dead.lck"]);
  assert.deepEqual(removed, ["C:\\rclone\\bisync\\dead.lck"]);
});
