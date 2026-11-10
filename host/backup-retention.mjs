import fs from "node:fs";
import path from "node:path";

export const BACKUP_RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const STAMP_RE = /^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})/;

/**
 * Parse a `YYYYMMDD-HHMMSS` stamp folder name to epoch ms, or `null` if not a stamp folder.
 */
export function parseStampFolderTimeMs(folderName) {
  const m = STAMP_RE.exec(String(folderName || "").trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  const hour = Number(m[4]);
  const min = Number(m[5]);
  const sec = Number(m[6]);
  const dt = new Date(year, month, day, hour, min, sec);
  const ms = dt.getTime();
  return Number.isFinite(ms) ? ms : null;
}

function isDirEmptyRecursive(dirPath) {
  let entries = [];
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return true;
  }
  for (const ent of entries) {
    const full = path.join(dirPath, ent.name);
    if (ent.isDirectory()) {
      if (!isDirEmptyRecursive(full)) return false;
    } else {
      return false;
    }
  }
  return true;
}

/**
 * Purge stamp backup directories under `rootDir` (`<rootDir>/<jobId>/<stampId>`) that are:
 * - completely empty (created before sync when no files were overwritten/deleted), OR
 * - older than `maxAgeMs` (default 30 days).
 */
export function purgeExpiredBackupDirs(
  rootDir,
  { maxAgeMs = BACKUP_RETENTION_MS, nowMs = Date.now(), purgeEmpty = true } = {},
) {
  const root = String(rootDir || "").trim();
  if (!root || !fs.existsSync(root)) {
    return { purgedCount: 0, purgedPaths: [] };
  }
  const purgedPaths = [];
  let jobDirs = [];
  try {
    jobDirs = fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory());
  } catch {
    return { purgedCount: 0, purgedPaths: [] };
  }

  for (const jobEnt of jobDirs) {
    const jobDir = path.join(root, jobEnt.name);
    let stampDirs = [];
    try {
      stampDirs = fs.readdirSync(jobDir, { withFileTypes: true }).filter((d) => d.isDirectory());
    } catch {
      continue;
    }
    for (const stampEnt of stampDirs) {
      const stampPath = path.join(jobDir, stampEnt.name);
      const stampMs = parseStampFolderTimeMs(stampEnt.name);
      let ageMs = stampMs != null ? nowMs - stampMs : 0;
      if (stampMs == null) {
        try {
          const st = fs.statSync(stampPath);
          ageMs = nowMs - st.mtimeMs;
        } catch {
          continue;
        }
      }
      const expired = ageMs > maxAgeMs;
      const empty = purgeEmpty && isDirEmptyRecursive(stampPath);
      if (expired || empty) {
        try {
          fs.rmSync(stampPath, { recursive: true, force: true });
          purgedPaths.push(stampPath);
        } catch {
          /* ignore */
        }
      }
    }
  }

  return {
    purgedCount: purgedPaths.length,
    purgedPaths,
  };
}
