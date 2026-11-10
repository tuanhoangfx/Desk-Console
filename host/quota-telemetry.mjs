import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { listConflictFiles } from "./conflict-files.mjs";

const MIN_SAFE_FREE_BYTES = 16 * 1024 * 1024; // 16 MB safety floor

/**
 * Compute total bytes of files inside `localRoot` (skipping `.git`, `node_modules`, `.folder-sync*`).
 */
export function measureLocalTreeBytes(localRoot, { maxFiles = 10_000 } = {}) {
  const root = String(localRoot || "").trim();
  if (!root || !fs.existsSync(root)) return { bytes: 0, files: 0 };
  let bytes = 0;
  let files = 0;

  function walk(dir) {
    if (files >= maxFiles) return;
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      if (files >= maxFiles) break;
      if (ent.name === ".git" || ent.name === "node_modules" || ent.name.startsWith(".folder-sync")) {
        continue;
      }
      const abs = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        walk(abs);
      } else {
        try {
          const st = fs.statSync(abs);
          bytes += st.size;
          files += 1;
        } catch {
          /* ignore */
        }
      }
    }
  }

  walk(root);
  return { bytes, files };
}

/**
 * Evaluate Google Drive storage quota before running `bisync` / `mirror-local`.
 * @param {{ usedBytes?: number | null, limitBytes?: number | null } | null | undefined} storage
 * @param {number} localBytes
 */
export function evaluateDriveQuotaPrecheck(storage, localBytes = 0) {
  const limit = Number(storage?.limitBytes);
  const used = Number(storage?.usedBytes);
  if (!Number.isFinite(limit) || limit <= 0 || !Number.isFinite(used) || used < 0) {
    return {
      ok: true,
      blocked: false,
      freeBytes: null,
      localBytes,
      warning: null,
    };
  }
  const freeBytes = Math.max(0, limit - used);
  if (freeBytes < MIN_SAFE_FREE_BYTES) {
    return {
      ok: false,
      blocked: true,
      freeBytes,
      localBytes,
      warning: `Google Drive storage quota is full (${Math.round(freeBytes / (1024 * 1024))} MB free). Free up Drive space or empty Drive Trash before syncing.`,
    };
  }
  if (localBytes > 0 && freeBytes < localBytes * 0.25) {
    return {
      ok: true,
      blocked: false,
      freeBytes,
      localBytes,
      warning: `Low Google Drive free space (${Math.round(freeBytes / (1024 * 1024))} MB free vs ${Math.round(localBytes / (1024 * 1024))} MB local folder).`,
    };
  }
  return {
    ok: true,
    blocked: false,
    freeBytes,
    localBytes,
    warning: null,
  };
}

/**
 * Build a multi-device telemetry summary for `P0009 Folder Sync` jobs & Drive accounts.
 */
export function buildFolderSyncTelemetrySnapshot(jobs = [], accounts = []) {
  const liveJobs = jobs.filter((j) => !j.deletedAt);
  let totalConflicts = 0;
  const jobSummaries = liveJobs.map((job) => {
    const conflicts = job.localPath ? listConflictFiles(job.localPath, { limit: 25 }).length : 0;
    totalConflicts += conflicts;
    return {
      id: job.id,
      code: job.code || null,
      name: job.name,
      remote: job.remote,
      mode: job.mode || "bisync",
      status: job.status || "idle",
      lastRunAt: job.lastRunAt || null,
      lastSuccessfulSyncAt: job.lastSuccessfulSyncAt || null,
      treeCounts: job.treeCounts || null,
      conflictCount: conflicts,
    };
  });

  const accountSummaries = accounts
    .filter((a) => !a.deletedAt)
    .map((acc) => {
      const limit = Number(acc.storage?.limitBytes);
      const used = Number(acc.storage?.usedBytes);
      const freeBytes =
        Number.isFinite(limit) && limit > 0 && Number.isFinite(used) && used >= 0
          ? Math.max(0, limit - used)
          : null;
      return {
        name: acc.name,
        authorized: Boolean(acc.authorized),
        email: acc.email || null,
        displayName: acc.displayName || null,
        usedBytes: Number.isFinite(used) ? used : null,
        limitBytes: Number.isFinite(limit) ? limit : null,
        freeBytes,
      };
    });

  return {
    schemaVersion: 1,
    code: "P0009",
    hostName: os.hostname(),
    updatedAt: new Date().toISOString(),
    totals: {
      jobs: jobs.length,
      liveJobs: liveJobs.length,
      syncedJobs: liveJobs.filter((j) => j.status === "idle" && j.lastResult?.ok !== false && j.lastSuccessfulSyncAt).length,
      errorJobs: liveJobs.filter((j) => j.status === "error" || j.lastResult?.ok === false).length,
      conflicts: totalConflicts,
      accounts: accountSummaries.length,
    },
    jobs: jobSummaries,
    accounts: accountSummaries,
  };
}
