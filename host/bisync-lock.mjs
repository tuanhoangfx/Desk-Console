import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** rclone paints the lock path with ANSI color codes. */
export function bisyncLockPathFromLog(text) {
  const raw = String(text || "").replace(/\u001b\[[0-9;]*m/g, "");
  const match = raw.match(/prior lock file found:\s*"?([^\r\n"]+?\.lck)"?/i);
  return match ? match[1].trim() : null;
}

export function pidIsAlive(pid) {
  const n = Number(pid);
  if (!Number.isInteger(n) || n <= 0) return false;
  try {
    process.kill(n, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

/**
 * A bisync lock is stale only when its file names a PID that is not running.
 * A live PID is left alone — another rclone may still own that pair of paths.
 */
export function staleBisyncLockPath(logText, readFile = fs.readFileSync, alive = pidIsAlive) {
  const lockPath = bisyncLockPathFromLog(logText);
  if (!lockPath) return null;
  let parsed;
  try {
    parsed = JSON.parse(String(readFile(lockPath, "utf8")));
  } catch {
    return null;
  }
  if (alive(parsed?.PID)) return null;
  return lockPath;
}

/** rclone writes one lock per path pair. A dead PID means the last run was interrupted. */
export function bisyncLockDir() {
  const local = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
  return path.join(local, "rclone", "bisync");
}

/**
 * Delete lock files whose owner is not running. A live rclone PID is left in place.
 * Returns the paths removed.
 */
export function clearStaleBisyncLocks(dir = bisyncLockDir(), deps = {}) {
  const readDir = deps.readDir || fs.readdirSync;
  const readFile = deps.readFile || fs.readFileSync;
  const unlink = deps.unlink || fs.unlinkSync;
  const alive = deps.alive || pidIsAlive;
  const join = deps.join || path.join;
  let names;
  try {
    names = readDir(dir);
  } catch {
    return [];
  }
  const removed = [];
  for (const name of names) {
    if (!String(name).endsWith(".lck")) continue;
    const full = join(dir, name);
    let parsed;
    try {
      parsed = JSON.parse(String(readFile(full, "utf8")));
    } catch {
      continue;
    }
    if (alive(parsed?.PID)) continue;
    try {
      unlink(full);
      removed.push(full);
    } catch {
      /* the start path reports the lock if it is still there */
    }
  }
  return removed;
}
