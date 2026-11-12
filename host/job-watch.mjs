/**
 * Local folder watch. There is no clock poll for uploads.
 * A change starts one sync after the folder has been quiet for the job's settle time.
 * Excluded folder names (node_modules, dist, .git by default) are not uploaded.
 */
import fs from "node:fs";
import path from "node:path";

export const WATCH_SETTLE_MS = 20_000;

/** Soft-deleted jobs stay in Trash for 30 days, then `readJobs` drops them. */
export const JOB_TRASH_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export function jobDeletedAtMs(job) {
  const at = Date.parse(job?.deletedAt || "");
  return Number.isFinite(at) ? at : null;
}

/** Drop rows whose Trash window has ended. `expired` means the caller should persist. */
export function partitionJobsTrash(jobs, now = Date.now()) {
  const live = [];
  const trash = [];
  let expired = false;
  for (const job of Array.isArray(jobs) ? jobs : []) {
    const at = jobDeletedAtMs(job);
    if (at == null) {
      live.push(job);
      continue;
    }
    if (now - at >= JOB_TRASH_WINDOW_MS) {
      expired = true;
      continue;
    }
    trash.push(job);
  }
  return { live, trash, expired, jobs: expired ? [...live, ...trash] : jobs };
}

/** 0 = manual. Anything else falls back to 20 seconds. */
export function settleMsFromJob(job) {
  const n = Number(job?.settleSec);
  if (n === 0) return 0;
  if (n === 20 || n === 60 || n === 300) return n * 1000;
  return WATCH_SETTLE_MS;
}

/** Stable fingerprint of a Drive listing. First sight is a baseline, not a sync. */
export function drivePollDecision(previous, next) {
  if (!previous || previous.remote !== next.remote) return "baseline";
  if (previous.signature !== next.signature) return "sync";
  return "same";
}

export function driveSignature(entries) {
  return (Array.isArray(entries) ? entries : [])
    .map((entry) => `${entry.path}\t${entry.size ?? ""}\t${entry.modTime ?? ""}`)
    .sort()
    .join("\n");
}

export const DEFAULT_JOB_EXCLUDES =
  "node_modules,dist,.git,.next,build,coverage,.env,.env.local,*.log,Adobe Premiere Pro Auto-Save,Adobe Premiere Pro Preview Files,Media Cache,Media Cache Files,Peak Files,*.pek,*.cfa,*.tmp,*.temp,*.bak,~$*,~*.tmp,*.crdownload,*.part,.DS_Store,Thumbs.db,desktop.ini,$RECYCLE.BIN,System Volume Information,.folder-sync-backup,_FolderSyncBackups";

const LEGACY_EXCLUDES = new Set([
  "node_modules,dist,.git",
  "node_modules,dist,.git,.env",
  "node_modules,dist,.git,.env,.env.local,*.log",
  "node_modules,dist,.git,.env,.env.local,*.log,*.tmp",
  "node_modules,dist,.git,.env,.env.local,*.log,*.tmp,~$*",
  "node_modules,dist,.git,.env,.env.local,*.log,*.tmp,~$*,.folder-sync-backup,_FolderSyncBackups",
  "node_modules,dist,.git,.next,build,coverage,.env,.env.local,*.log,Adobe Premiere Pro Auto-Save,Adobe Premiere Pro Preview Files,Media Cache,Media Cache Files,Peak Files,*.pek,*.cfa,*.tmp,*.temp,*.bak,~$*,~*.tmp,*.crdownload,*.part,.DS_Store,Thumbs.db,desktop.ini,$RECYCLE.BIN,System Volume Information",
]);

function isLegacyExclude(value) {
  if (value == null) return true;
  const trimmed = String(value).trim();
  if (trimmed === DEFAULT_JOB_EXCLUDES) return false;
  if (LEGACY_EXCLUDES.has(trimmed)) return true;
  const stripped = trimmed
    .split(/[,;\n]/)
    .map((t) => t.trim())
    .filter((t) => t && t !== ".folder-sync-backup" && t !== "_FolderSyncBackups")
    .join(",");
  return LEGACY_EXCLUDES.has(stripped);
}

export function normalizeExcludeText(value) {
  if (isLegacyExclude(value)) return DEFAULT_JOB_EXCLUDES;
  return String(value);
}

/** Missing value keeps the default list. An empty string syncs every folder. */
export function parseExcludeList(value) {
  const source = isLegacyExclude(value) ? DEFAULT_JOB_EXCLUDES : String(value);
  return source
    .split(/[,;\n]/)
    .map((part) => part.trim().replace(/^\/+|\/+$/g, ""))
    .filter(Boolean);
}

function globToRegExp(token) {
  const body = String(token)
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp(`^${body}$`, "i");
}

export function pathMatchesExclude(filePath, tokens) {
  const parts = String(filePath || "")
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean);
  const base = parts[parts.length - 1] || "";
  return tokens.some((token) => {
    if (token.includes("*") || token.includes("?")) return globToRegExp(token).test(base);
    return parts.includes(token);
  });
}

export function filterExcludedEntries(entries, excludeText) {
  const tokens = parseExcludeList(excludeText);
  if (!tokens.length) return Array.isArray(entries) ? entries : [];
  return (Array.isArray(entries) ? entries : []).filter((entry) => !pathMatchesExclude(entry?.path, tokens));
}

export function rcloneExcludeArgs(excludeText) {
  const args = [];
  for (const token of parseExcludeList(excludeText)) {
    if (token.includes("*") || token.includes("?")) {
      args.push("--exclude", token, "--exclude", token.startsWith("**/") ? token : `**/${token}`);
      continue;
    }
    args.push("--exclude", `${token}/**`, "--exclude", token, "--exclude", `**/${token}`);
  }
  return args;
}

/**
 * Build rclone `--include` flags that match ONLY the excluded tokens
 * (used by Clean Excluded on Drive to safely trash only excluded junk files).
 */
export function rcloneIncludeExcludedArgs(excludeText) {
  const args = [];
  for (const token of parseExcludeList(excludeText)) {
    if (token.includes("*") || token.includes("?")) {
      args.push("--include", token, "--include", token.startsWith("**/") ? token : `**/${token}`);
      continue;
    }
    args.push(
      "--include",
      `${token}/**`,
      "--include",
      `**/${token}/**`,
      "--include",
      token,
      "--include",
      `**/${token}`,
    );
  }
  return args;
}

/**
 * Filter a list of relative file paths to those that match the job's exclude rules.
 * @param {string[]} relPaths
 * @param {string | undefined} excludeText
 */
export function findExcludedPaths(relPaths, excludeText) {
  const tokens = parseExcludeList(excludeText);
  if (!tokens.length) return [];
  return (Array.isArray(relPaths) ? relPaths : [])
    .map((p) => String(p || "").trim())
    .filter((p) => p && pathMatchesExclude(p, tokens));
}

export function shouldAutoWatch(localPath, exists = fs.existsSync) {
  const root = String(localPath || "").trim();
  return Boolean(root && exists(root));
}

function ignoredName(filename, excludeText) {
  const name = String(filename || "").replace(/\\/g, "/");
  if (!name || name.endsWith(".tmp")) return true;
  return pathMatchesExclude(name, [".folder-sync-backup", ...parseExcludeList(excludeText)]);
}

/**
 * @param {{ readJobs: () => Array<{ id: string, localPath?: string, status?: string }>, runSync: (jobId: string) => Promise<void> }} opts
 */
export function startJobWatchers({ readJobs, runSync, onArmed }) {
  /** @type {Map<string, { watcher: import('node:fs').FSWatcher, localPath: string }>} */
  const watchers = new Map();
  /** @type {Map<string, ReturnType<typeof setTimeout>>} */
  const timers = new Map();

  function clearTimer(jobId) {
    const timer = timers.get(jobId);
    if (timer) clearTimeout(timer);
    timers.delete(jobId);
  }

  function closeWatcher(jobId) {
    clearTimer(jobId);
    const armed = watchers.get(jobId);
    if (armed) {
      armed.watcher.close();
      watchers.delete(jobId);
    }
  }

  function schedule(jobId) {
    clearTimer(jobId);
    const job = readJobs().find((row) => row.id === jobId);
    const wait = settleMsFromJob(job);
    if (!wait || jobDeletedAtMs(job) != null || job?.status === "paused" || job?.status === "stopped") {
      onArmed?.(jobId, null);
      return;
    }
    onArmed?.(jobId, new Date(Date.now() + wait).toISOString());
    timers.set(
      jobId,
      setTimeout(() => {
        timers.delete(jobId);
        onArmed?.(jobId, null);
        const fresh = readJobs().find((row) => row.id === jobId);
        if (!fresh || jobDeletedAtMs(fresh) != null || fresh.status === "paused" || fresh.status === "stopped") return;
        void runSync(jobId);
      }, wait),
    );
  }

  function refresh() {
    const jobs = readJobs();
    const live = new Set();
    for (const job of jobs) {
      if (!job?.id || jobDeletedAtMs(job) != null || !shouldAutoWatch(job.localPath) || !settleMsFromJob(job)) continue;
      if (job.status === "paused" || job.status === "stopped") continue;
      live.add(job.id);
      const armed = watchers.get(job.id);
      if (armed && armed.localPath === job.localPath) continue;
      if (armed) closeWatcher(job.id);
      try {
        const watcher = fs.watch(job.localPath, { recursive: true }, (_event, filename) => {
          if (ignoredName(filename, job.exclude)) return;
          schedule(job.id);
        });
        watcher.on("error", () => closeWatcher(job.id));
        watchers.set(job.id, { watcher, localPath: job.localPath });
      } catch {
        /* path vanished between the exists check and watch */
      }
    }
    for (const jobId of watchers.keys()) {
      if (!live.has(jobId)) closeWatcher(jobId);
    }
  }

  refresh();
  const poll = setInterval(refresh, 30_000);
  return () => {
    clearInterval(poll);
    for (const jobId of [...watchers.keys()]) closeWatcher(jobId);
  };
}

export const DRIVE_POLL_INTERVAL_MS = 120_000;

/**
 * Drive has no filesystem watch. Compare the remote listing on a calm 120s cadence (local edits still use fs.watch).
 * The first successful listing is remembered and does not sync.
 * @param {{ readJobs: () => Array<{ id: string, localPath?: string, remote?: string, status?: string }>, listRemote: (remote: string) => Promise<Array<{ path: string, size?: number, modTime?: string }> | null>, runSync: (jobId: string) => Promise<void>, intervalMs?: number }} opts
 */
export function startDrivePoll({ readJobs, listRemote, runSync, onArmed, intervalMs = DRIVE_POLL_INTERVAL_MS }) {
  /** @type {Map<string, { remote: string, signature: string }>} */
  const seen = new Map();
  const delays = new Map();
  let ticking = false;

  async function tick() {
    if (ticking) return;
    ticking = true;
    try {
      for (const job of readJobs()) {
        if (!job?.id || jobDeletedAtMs(job) != null || !job.remote || !shouldAutoWatch(job.localPath)) continue;
        if (!settleMsFromJob(job)) continue;
        if (job.status === "running" || job.status === "analyzing") continue;
        if (job.status === "paused" || job.status === "stopped") {
          const pending = delays.get(job.id);
          if (pending) clearTimeout(pending);
          delays.delete(job.id);
          onArmed?.(job.id, null);
          continue;
        }
        const entries = await listRemote(job.remote, job.exclude);
        if (!entries) continue;
        const visible = filterExcludedEntries(entries, job.exclude);
        const next = { remote: job.remote, signature: driveSignature(visible) };
        const decision = drivePollDecision(seen.get(job.id), next);
        seen.set(job.id, next);
        if (decision === "sync") {
          const wait = settleMsFromJob(job);
          const pending = delays.get(job.id);
          if (pending) clearTimeout(pending);
          onArmed?.(job.id, new Date(Date.now() + wait).toISOString());
          delays.set(
            job.id,
            setTimeout(() => {
              delays.delete(job.id);
              onArmed?.(job.id, null);
              const fresh = readJobs().find((row) => row.id === job.id);
              if (!fresh || jobDeletedAtMs(fresh) != null || fresh.status === "paused" || fresh.status === "stopped") return;
              void runSync(job.id);
            }, wait),
          );
        }
      }
    } finally {
      ticking = false;
    }
  }

  const timer = setInterval(() => {
    void tick();
  }, intervalMs);
  void tick();
  return () => {
    clearInterval(timer);
    for (const pending of delays.values()) clearTimeout(pending);
  };
}
