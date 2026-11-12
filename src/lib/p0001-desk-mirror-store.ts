import {
  clearDirectorySyncWatermark,
  createDirectoryIdbStore,
  createDirectoryMirrorStore,
  createSessionTtlStamp,
  maxDirectoryUpdatedAt,
  mergeDirectoryRowsById,
  readDirectorySyncWatermark,
  writeDirectorySyncWatermark,
  type DirectoryIdbStore,
  type DirectoryMirrorStore,
  type SessionTtlStampStore,
} from "@tool-workspace/hub-sync-core";
import type { RunnerRow } from "./api";
import type { DriveAccount, SyncJob } from "./sync-api";

export const P0001_IDB_NAME = "p0001-desk-console-v1";
export const P0001_IDB_VERSION = 1;
export const P0001_MIRROR_USER_SCOPE = "default";
export const P0001_WATERMARK_NS = "p0001:directory";
export const P0001_MIRROR_TTL_MS = 30_000;

export const P0001_JOBS_LS_KEY = "p0001:desk-mirror:jobs:v1";
export const P0001_DRIVES_LS_KEY = "p0001:desk-mirror:drives:v1";
export const P0001_LEGACY_DRIVE_IDENTITY_LS_KEY = "p0009.drive-account-identity";
export const P0001_RUNNERS_LS_KEY = "p0001:desk-mirror:runners:v1";
export const P0001_TTL_STORAGE_KEY = "p0001:desk-mirror:ttl:v1";

export const P0001_JOBS_MIRROR_CHANGE_EVENT = "p0001-jobs-mirror-change";
export const P0001_DRIVES_MIRROR_CHANGE_EVENT = "p0001-drives-mirror-change";
export const P0001_RUNNERS_MIRROR_CHANGE_EVENT = "p0001-runners-mirror-change";

export const P0001_LS_SLIM_JOB_LOG_LIMIT = 25;
export const P0001_LS_SLIM_JOB_OUTPUT_CHARS = 1024;
export const P0001_LS_SLIM_DRIVE_LOG_LIMIT = 20;

const P0001_IDB_STORES = ["jobs", "drives", "runners"] as const;

export type P0001DriveMirrorRow = DriveAccount & {
  id: string;
};

type WatermarkCarrier<T> = {
  id: string;
  updated_at: string | null;
  row: T;
};

function openP0001DirectoryDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(P0001_IDB_NAME, P0001_IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const storeName of P0001_IDB_STORES) {
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath: "id" });
          store.createIndex("userId", "userId", { unique: false });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const p0001JobsIdbStore: DirectoryIdbStore<SyncJob> = createDirectoryIdbStore<SyncJob>(
  P0001_IDB_NAME,
  "jobs",
  {
    version: P0001_IDB_VERSION,
    openDb: openP0001DirectoryDb,
  },
);

export const p0001DrivesIdbStore: DirectoryIdbStore<P0001DriveMirrorRow> =
  createDirectoryIdbStore<P0001DriveMirrorRow>(P0001_IDB_NAME, "drives", {
    version: P0001_IDB_VERSION,
    openDb: openP0001DirectoryDb,
  });

export const p0001RunnersIdbStore: DirectoryIdbStore<RunnerRow> = createDirectoryIdbStore<RunnerRow>(
  P0001_IDB_NAME,
  "runners",
  {
    version: P0001_IDB_VERSION,
    openDb: openP0001DirectoryDb,
  },
);

export const p0001DeskTtlStamps: Record<"jobs" | "drives" | "runners", SessionTtlStampStore> = {
  jobs: createSessionTtlStamp({ storageKey: `${P0001_TTL_STORAGE_KEY}:jobs` }),
  drives: createSessionTtlStamp({ storageKey: `${P0001_TTL_STORAGE_KEY}:drives` }),
  runners: createSessionTtlStamp({ storageKey: `${P0001_TTL_STORAGE_KEY}:runners` }),
};

const fullJobsById = new Map<string, SyncJob>();
let fullJobsRamCache: SyncJob[] | null = null;
let lastKnownJobsRaw: string | null = null;
let jobsHydrateInFlight: Promise<SyncJob[]> | null = null;

const fullDrivesByName = new Map<string, DriveAccount>();
let fullDrivesRamCache: DriveAccount[] | null = null;
let lastKnownDrivesRaw: string | null = null;
let drivesHydrateInFlight: Promise<DriveAccount[]> | null = null;

const fullRunnersById = new Map<string, RunnerRow>();
let fullRunnersRamCache: RunnerRow[] | null = null;
let lastKnownRunnersRaw: string | null = null;
let runnersHydrateInFlight: Promise<RunnerRow[]> | null = null;

function safeReadLocalRaw(key: string): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function truncateText(value: string | undefined, maxChars: number): string | undefined {
  if (typeof value !== "string" || value.length <= maxChars) return value;
  return value.slice(-maxChars);
}

/** Slim `SyncJob` logs/stdout in synchronous `localStorage` to avoid 5MB quota errors. */
export function slimP0001SyncJob(job: SyncJob): SyncJob {
  const log = job.activityLog;
  const slimLog =
    Array.isArray(log) && log.length > P0001_LS_SLIM_JOB_LOG_LIMIT
      ? log.slice(0, P0001_LS_SLIM_JOB_LOG_LIMIT)
      : log;
  const res = job.lastResult;
  const nextStdout = truncateText(res?.stdout, P0001_LS_SLIM_JOB_OUTPUT_CHARS);
  const nextStderr = truncateText(res?.stderr, P0001_LS_SLIM_JOB_OUTPUT_CHARS);
  const resChanged = Boolean(res && (nextStdout !== res.stdout || nextStderr !== res.stderr));
  if (slimLog === log && !resChanged) {
    return job;
  }
  return {
    ...job,
    ...(slimLog !== log ? { activityLog: slimLog } : {}),
    ...(resChanged && res
      ? {
          lastResult: {
            ...res,
            ...(nextStdout !== undefined ? { stdout: nextStdout } : {}),
            ...(nextStderr !== undefined ? { stderr: nextStderr } : {}),
          },
        }
      : {}),
  };
}

function toDriveMirrorRow(account: DriveAccount): P0001DriveMirrorRow {
  if ((account as Partial<P0001DriveMirrorRow>).id === account.name) {
    return account as P0001DriveMirrorRow;
  }
  return {
    ...account,
    id: account.name,
  };
}

function fromDriveMirrorRow(row: P0001DriveMirrorRow): DriveAccount {
  const existing = fullDrivesByName.get(row.name);
  if (existing) return existing;
  const { id: _id, ...rest } = row;
  return rest;
}

/** Slim `DriveAccount` per-file/activity logs in `localStorage` while preserving inventory summary. */
export function slimP0001DriveMirrorRow(row: P0001DriveMirrorRow): P0001DriveMirrorRow {
  const fileLog = row.fileLog;
  const activityLog = row.activityLog;
  const slimFileLog =
    Array.isArray(fileLog) && fileLog.length > P0001_LS_SLIM_DRIVE_LOG_LIMIT
      ? fileLog.slice(0, P0001_LS_SLIM_DRIVE_LOG_LIMIT)
      : fileLog;
  const slimActivityLog =
    Array.isArray(activityLog) && activityLog.length > P0001_LS_SLIM_DRIVE_LOG_LIMIT
      ? activityLog.slice(0, P0001_LS_SLIM_DRIVE_LOG_LIMIT)
      : activityLog;
  if (slimFileLog === fileLog && slimActivityLog === activityLog) {
    return row;
  }
  return {
    ...row,
    ...(slimFileLog !== fileLog ? { fileLog: slimFileLog } : {}),
    ...(slimActivityLog !== activityLog ? { activityLog: slimActivityLog } : {}),
  };
}

export const p0001JobsMirrorStore: DirectoryMirrorStore<SyncJob> = createDirectoryMirrorStore<SyncJob>({
  resolveKey: () => P0001_JOBS_LS_KEY,
  slimRow: slimP0001SyncJob,
  changeEvent: P0001_JOBS_MIRROR_CHANGE_EVENT,
  persistMode: "immediate",
  persistIdb: (slimRows) => {
    const fullRows = slimRows.map((slim) => fullJobsById.get(slim.id) ?? slim);
    void p0001JobsIdbStore.writeBulk(P0001_MIRROR_USER_SCOPE, fullRows);
  },
});

export const p0001DrivesMirrorStore: DirectoryMirrorStore<P0001DriveMirrorRow> =
  createDirectoryMirrorStore<P0001DriveMirrorRow>({
    resolveKey: () => P0001_DRIVES_LS_KEY,
    slimRow: slimP0001DriveMirrorRow,
    changeEvent: P0001_DRIVES_MIRROR_CHANGE_EVENT,
    persistMode: "immediate",
    persistIdb: (slimRows) => {
      const fullRows = slimRows.map((slim) => {
        const full = fullDrivesByName.get(slim.name);
        return full ? toDriveMirrorRow(full) : slim;
      });
      void p0001DrivesIdbStore.writeBulk(P0001_MIRROR_USER_SCOPE, fullRows);
    },
  });

export const p0001RunnersMirrorStore: DirectoryMirrorStore<RunnerRow> =
  createDirectoryMirrorStore<RunnerRow>({
    resolveKey: () => P0001_RUNNERS_LS_KEY,
    slimRow: (row) => row,
    changeEvent: P0001_RUNNERS_MIRROR_CHANGE_EVENT,
    persistMode: "immediate",
    persistIdb: (rows) => {
      const fullRows = rows.map((row) => fullRunnersById.get(row.id) ?? row);
      void p0001RunnersIdbStore.writeBulk(P0001_MIRROR_USER_SCOPE, fullRows);
    },
  });

function resolveJobWatermark(job: SyncJob): string | null {
  return (
    job.updatedAt ??
    job.deletedAt ??
    job.lastRunAt ??
    job.lastSuccessfulSyncAt ??
    job.createdAt ??
    null
  );
}

function resolveDriveWatermark(account: DriveAccount): string | null {
  return (
    account.updatedAt ??
    account.contentUpdatedAt ??
    account.inventory?.scannedAt ??
    account.deletedAt ??
    account.createdAt ??
    null
  );
}

function resolveRunnerWatermark(runner: RunnerRow): string | null {
  if (runner.probedAt) return runner.probedAt;
  if (typeof runner.startExitedAt === "number") return new Date(runner.startExitedAt).toISOString();
  if (typeof runner.startStartedAt === "number") return new Date(runner.startStartedAt).toISOString();
  return null;
}

function parseWatermarkMs(ts: string | null | undefined): number {
  if (!ts) return 0;
  const n = Date.parse(ts);
  return Number.isFinite(n) ? n : 0;
}

function isSameLiveProgress(
  a: SyncJob["liveProgress"],
  b: SyncJob["liveProgress"],
): boolean {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  return (
    a.percent === b.percent &&
    a.transferred === b.transferred &&
    a.total === b.total &&
    a.speed === b.speed &&
    a.eta === b.eta &&
    (a.filesDone ?? null) === (b.filesDone ?? null) &&
    (a.filesTotal ?? null) === (b.filesTotal ?? null)
  );
}

function isSameTreeCounts(
  a: SyncJob["treeCounts"],
  b: SyncJob["treeCounts"],
): boolean {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  return (
    a.synced === b.synced &&
    a.local === b.local &&
    a.drive === b.drive &&
    a.diff === b.diff &&
    (a.at ?? null) === (b.at ?? null)
  );
}

function isSameLastResult(
  a: SyncJob["lastResult"],
  b: SyncJob["lastResult"],
): boolean {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  return (
    (a.action ?? "") === (b.action ?? "") &&
    (a.ok ?? null) === (b.ok ?? null) &&
    (a.code ?? null) === (b.code ?? null) &&
    (a.stdout ?? "") === (b.stdout ?? "") &&
    (a.stderr ?? "") === (b.stderr ?? "") &&
    (a.backupDir ?? "") === (b.backupDir ?? "") &&
    (a.conflictDir ?? "") === (b.conflictDir ?? "") &&
    (a.trashPolicy ?? "") === (b.trashPolicy ?? "")
  );
}

function isSameSyncJob(a: SyncJob, b: SyncJob): boolean {
  if (a === b) return true;
  const aLogLen = a.activityLog?.length ?? 0;
  const bLogLen = b.activityLog?.length ?? 0;
  const aTopAt = a.activityLog?.[0]?.at ?? "";
  const bTopAt = b.activityLog?.[0]?.at ?? "";
  return (
    a.id === b.id &&
    (a.code ?? "") === (b.code ?? "") &&
    a.name === b.name &&
    a.localPath === b.localPath &&
    a.remote === b.remote &&
    a.mode === b.mode &&
    (a.settleSec ?? null) === (b.settleSec ?? null) &&
    (a.proxyUrl ?? "") === (b.proxyUrl ?? "") &&
    (a.maxFileSize ?? "") === (b.maxFileSize ?? "") &&
    (a.exclude ?? "") === (b.exclude ?? "") &&
    (a.nextSyncAt ?? null) === (b.nextSyncAt ?? null) &&
    a.status === b.status &&
    (a.lastRunAt ?? null) === (b.lastRunAt ?? null) &&
    (a.lastSuccessfulSyncAt ?? null) === (b.lastSuccessfulSyncAt ?? null) &&
    (a.lastBackupDir ?? null) === (b.lastBackupDir ?? null) &&
    (a.lastConflictDir ?? null) === (b.lastConflictDir ?? null) &&
    (a.createdAt ?? "") === (b.createdAt ?? "") &&
    (a.updatedAt ?? "") === (b.updatedAt ?? "") &&
    (a.deletedAt ?? null) === (b.deletedAt ?? null) &&
    (a.note ?? "") === (b.note ?? "") &&
    aLogLen === bLogLen &&
    aTopAt === bTopAt &&
    isSameLiveProgress(a.liveProgress, b.liveProgress) &&
    isSameTreeCounts(a.treeCounts, b.treeCounts) &&
    isSameLastResult(a.lastResult, b.lastResult)
  );
}

function isSameDriveStorage(
  a: DriveAccount["storage"],
  b: DriveAccount["storage"],
): boolean {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  return (
    a.usedBytes === b.usedBytes &&
    a.limitBytes === b.limitBytes &&
    a.driveBytes === b.driveBytes &&
    a.trashBytes === b.trashBytes
  );
}

function isSameDriveInventory(
  a: DriveAccount["inventory"],
  b: DriveAccount["inventory"],
): boolean {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  return (
    a.folderCount === b.folderCount &&
    a.fileCount === b.fileCount &&
    (a.listedBytes ?? null) === (b.listedBytes ?? null) &&
    a.scannedAt === b.scannedAt &&
    a.latestModTime === b.latestModTime &&
    a.latestPath === b.latestPath &&
    Boolean(a.scanning) === Boolean(b.scanning) &&
    (a.error ?? null) === (b.error ?? null) &&
    (a.formats?.length ?? 0) === (b.formats?.length ?? 0)
  );
}

function isSameDriveAccount(a: DriveAccount, b: DriveAccount): boolean {
  if (a === b) return true;
  return (
    a.name === b.name &&
    (a.code ?? "") === (b.code ?? "") &&
    a.authorized === b.authorized &&
    (a.email ?? null) === (b.email ?? null) &&
    (a.displayName ?? null) === (b.displayName ?? null) &&
    (a.proxyUrl ?? "") === (b.proxyUrl ?? "") &&
    (a.bwlimit ?? "") === (b.bwlimit ?? "") &&
    (a.note ?? "") === (b.note ?? "") &&
    (a.createdAt ?? null) === (b.createdAt ?? null) &&
    (a.updatedAt ?? null) === (b.updatedAt ?? null) &&
    (a.deletedAt ?? null) === (b.deletedAt ?? null) &&
    (a.contentUpdatedAt ?? null) === (b.contentUpdatedAt ?? null) &&
    (a.jobCount ?? null) === (b.jobCount ?? null) &&
    (a.fileLog?.length ?? 0) === (b.fileLog?.length ?? 0) &&
    (a.fileLog?.[0]?.at ?? "") === (b.fileLog?.[0]?.at ?? "") &&
    (a.activityLog?.length ?? 0) === (b.activityLog?.length ?? 0) &&
    (a.activityLog?.[0]?.at ?? "") === (b.activityLog?.[0]?.at ?? "") &&
    isSameDriveStorage(a.storage, b.storage) &&
    isSameDriveInventory(a.inventory, b.inventory)
  );
}

function isSameRunnerOperationalState(a: RunnerRow, b: RunnerRow): boolean {
  if (a === b) return true;
  return (
    a.id === b.id &&
    a.code === b.code &&
    a.name === b.name &&
    a.kind === b.kind &&
    a.port === b.port &&
    a.url === b.url &&
    a.up === b.up &&
    (a.toolRoot ?? "") === (b.toolRoot ?? "") &&
    (a.stack ?? "") === (b.stack ?? "") &&
    (a.probePath ?? "") === (b.probePath ?? "") &&
    (a.openPath ?? "") === (b.openPath ?? "") &&
    (a.startPid ?? null) === (b.startPid ?? null) &&
    (a.startStartedAt ?? null) === (b.startStartedAt ?? null) &&
    (a.startExitedAt ?? null) === (b.startExitedAt ?? null) &&
    (a.startExitCode ?? null) === (b.startExitCode ?? null)
  );
}

function readLegacyDriveIdentities(): DriveAccount[] {
  const raw = safeReadLocalRaw(P0001_LEGACY_DRIVE_IDENTITY_LS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((row): row is DriveAccount => Boolean(row && typeof row.name === "string"));
  } catch {
    return [];
  }
}

function writeLegacyDriveIdentities(accounts: readonly DriveAccount[]): void {
  if (typeof localStorage === "undefined") return;
  const slim = accounts.map((account) => ({
    name: account.name,
    code: account.code,
    authorized: account.authorized,
    email: account.email,
    displayName: account.displayName,
    deletedAt: account.deletedAt || null,
  }));
  try {
    localStorage.setItem(P0001_LEGACY_DRIVE_IDENTITY_LS_KEY, JSON.stringify(slim));
  } catch {
    /* quota best-effort */
  }
}

export function isP0001ScopeFresh(
  scope: "jobs" | "drives" | "runners",
  ttlMs = P0001_MIRROR_TTL_MS,
  now = Date.now(),
): boolean {
  return p0001DeskTtlStamps[scope].isFresh(scope, ttlMs, now);
}

export function markP0001ScopeFresh(
  scope: "jobs" | "drives" | "runners",
  syncedAt = Date.now(),
): void {
  p0001DeskTtlStamps[scope].write(scope, syncedAt);
}

export function readP0001ScopeWatermark(
  scope: "jobs" | "drives" | "runners",
  userId = P0001_MIRROR_USER_SCOPE,
): string | null {
  return readDirectorySyncWatermark(`${P0001_WATERMARK_NS}:${scope}`, userId);
}

function advanceP0001ScopeWatermark(
  scope: "jobs" | "drives" | "runners",
  carriers: readonly { id: string; updated_at?: string | null }[],
  userId = P0001_MIRROR_USER_SCOPE,
): string | null {
  const ns = `${P0001_WATERMARK_NS}:${scope}`;
  const prev = readDirectorySyncWatermark(ns, userId);
  const candidate = maxDirectoryUpdatedAt(carriers);
  const next =
    candidate && (!prev || parseWatermarkMs(candidate) >= parseWatermarkMs(prev))
      ? candidate
      : (prev ?? candidate);
  if (next) {
    writeDirectorySyncWatermark(ns, userId, next);
  }
  return next;
}

/** Synchronous `0ms` warm Jobs snapshot (RAM authority -> slim `localStorage`). */
export function readCachedP0001Jobs(): SyncJob[] {
  const raw = safeReadLocalRaw(P0001_JOBS_LS_KEY);
  if (fullJobsRamCache !== null && raw === lastKnownJobsRaw) {
    return fullJobsRamCache;
  }
  if (!raw && lastKnownJobsRaw !== null) {
    fullJobsRamCache = null;
    fullJobsById.clear();
    lastKnownJobsRaw = null;
  }
  const slimRows = p0001JobsMirrorStore.read();
  if (slimRows.length === 0) {
    fullJobsRamCache = [];
    lastKnownJobsRaw = raw;
    return fullJobsRamCache;
  }
  const hydrated = slimRows.map((row) => fullJobsById.get(row.id) ?? row);
  for (const row of hydrated) {
    if (!fullJobsById.has(row.id)) fullJobsById.set(row.id, row);
  }
  fullJobsRamCache = hydrated;
  lastKnownJobsRaw = raw;
  return hydrated;
}

function commitJobsToMirror(jobs: SyncJob[]): void {
  fullJobsById.clear();
  for (const job of jobs) fullJobsById.set(job.id, job);
  fullJobsRamCache = jobs;
  p0001JobsMirrorStore.write(jobs);
  lastKnownJobsRaw = safeReadLocalRaw(P0001_JOBS_LS_KEY);
}

/**
 * Reconcile incoming `SyncJob[]` by `updatedAt` watermark + deep field equality.
 * Preserves exact `===` row & array references when unchanged, and writes through to RAM + slim LS + IDB.
 */
export function reconcileP0001JobsDelta(
  prevJobs: readonly SyncJob[],
  incomingJobs: readonly SyncJob[],
  options?: {
    mode?: "snapshot" | "delta";
    persist?: boolean;
    userId?: string;
  },
): { rows: SyncJob[]; changed: boolean; watermark: string | null } {
  const mode = options?.mode ?? "snapshot";
  const persist = options?.persist ?? true;
  const userId = options?.userId ?? P0001_MIRROR_USER_SCOPE;

  const prevById = new Map<string, SyncJob>();
  for (const job of prevJobs) prevById.set(job.id, job);

  const incomingIds = new Set<string>();
  const incomingCarriers: WatermarkCarrier<SyncJob>[] = [];
  for (const nextJob of incomingJobs) {
    if (!nextJob?.id) continue;
    incomingIds.add(nextJob.id);
    const prev = prevById.get(nextJob.id);
    if (prev) {
      const prevTs = parseWatermarkMs(resolveJobWatermark(prev));
      const nextTs = parseWatermarkMs(resolveJobWatermark(nextJob));
      if (prevTs > 0 && nextTs > 0 && nextTs < prevTs) {
        incomingCarriers.push({ id: prev.id, updated_at: resolveJobWatermark(prev), row: prev });
        continue;
      }
      // Enrich slim incoming logs if watermarks match and prev holds full IDB activityLog
      const candidate: SyncJob =
        (nextJob.activityLog?.length ?? 0) < (prev.activityLog?.length ?? 0) &&
        nextTs === prevTs &&
        nextJob.status === prev.status
          ? { ...nextJob, activityLog: prev.activityLog }
          : nextJob;
      if (isSameSyncJob(prev, candidate)) {
        incomingCarriers.push({ id: prev.id, updated_at: resolveJobWatermark(prev), row: prev });
        continue;
      }
      incomingCarriers.push({
        id: candidate.id,
        updated_at: resolveJobWatermark(candidate),
        row: candidate,
      });
      continue;
    }
    incomingCarriers.push({
      id: nextJob.id,
      updated_at: resolveJobWatermark(nextJob),
      row: nextJob,
    });
  }

  const baseCarriers: WatermarkCarrier<SyncJob>[] = (
    mode === "delta" ? prevJobs : prevJobs.filter((j) => incomingIds.has(j.id))
  ).map((job) => ({
    id: job.id,
    updated_at: resolveJobWatermark(job),
    row: job,
  }));

  const mergedCarriers = mergeDirectoryRowsById(baseCarriers, incomingCarriers);
  const mergedById = new Map(mergedCarriers.map((c) => [c.id, c.row]));

  const orderedRows: SyncJob[] =
    mode === "snapshot"
      ? incomingCarriers.map((c) => mergedById.get(c.id) ?? c.row)
      : mergedCarriers.map((c) => c.row);

  const watermark = advanceP0001ScopeWatermark("jobs", mergedCarriers, userId);

  const sameArray =
    orderedRows.length === prevJobs.length &&
    orderedRows.every((row, idx) => row === prevJobs[idx]);

  const finalRows = sameArray ? (prevJobs as SyncJob[]) : orderedRows;

  if (persist && (!sameArray || fullJobsRamCache === null)) {
    commitJobsToMirror(finalRows);
    markP0001ScopeFresh("jobs");
  } else if (persist) {
    markP0001ScopeFresh("jobs");
  }

  return {
    rows: finalRows,
    changed: !sameArray,
    watermark,
  };
}

/** Hydrate full `SyncJob[]` (including un-slimmed `activityLog` & `lastResult`) from IndexedDB. */
export async function hydrateP0001JobsMirror(): Promise<SyncJob[]> {
  if (jobsHydrateInFlight) return jobsHydrateInFlight;
  jobsHydrateInFlight = (async () => {
    try {
      const current = readCachedP0001Jobs();
      const idbRows = await p0001JobsIdbStore.readAll(P0001_MIRROR_USER_SCOPE);
      if (!idbRows.length) return current;
      if (!current.length) {
        commitJobsToMirror(idbRows);
        advanceP0001ScopeWatermark(
          "jobs",
          idbRows.map((j) => ({ id: j.id, updated_at: resolveJobWatermark(j) })),
        );
        return idbRows;
      }
      // Reconcile IDB full rows into current RAM rows without clobbering newer SSE/poll updates
      const idbById = new Map(idbRows.map((row) => [row.id, row]));
      let enriched = false;
      const merged = current.map((cur) => {
        const idbRow = idbById.get(cur.id);
        if (!idbRow) return cur;
        const curTs = parseWatermarkMs(resolveJobWatermark(cur));
        const idbTs = parseWatermarkMs(resolveJobWatermark(idbRow));
        if (idbTs > curTs) {
          enriched = true;
          return idbRow;
        }
        if (
          idbTs === curTs &&
          ((idbRow.activityLog?.length ?? 0) > (cur.activityLog?.length ?? 0) ||
            (idbRow.lastResult?.stdout?.length ?? 0) > (cur.lastResult?.stdout?.length ?? 0) ||
            (idbRow.lastResult?.stderr?.length ?? 0) > (cur.lastResult?.stderr?.length ?? 0))
        ) {
          enriched = true;
          return {
            ...cur,
            activityLog: idbRow.activityLog ?? cur.activityLog,
            lastResult: idbRow.lastResult ?? cur.lastResult,
          };
        }
        return cur;
      });
      if (enriched) {
        for (const job of merged) fullJobsById.set(job.id, job);
        fullJobsRamCache = merged;
        return merged;
      }
      return current;
    } finally {
      jobsHydrateInFlight = null;
    }
  })();
  return jobsHydrateInFlight;
}

/** Synchronous `0ms` warm Drives snapshot (RAM authority -> slim `localStorage` -> legacy identity cache). */
export function readCachedP0001Drives(): DriveAccount[] {
  const raw = safeReadLocalRaw(P0001_DRIVES_LS_KEY);
  if (fullDrivesRamCache !== null && raw === lastKnownDrivesRaw) {
    return fullDrivesRamCache;
  }
  if (!raw && lastKnownDrivesRaw !== null) {
    fullDrivesRamCache = null;
    fullDrivesByName.clear();
    lastKnownDrivesRaw = null;
  }
  const slimRows = p0001DrivesMirrorStore.read();
  if (slimRows.length > 0) {
    const accounts = slimRows.map(fromDriveMirrorRow);
    for (const acc of accounts) {
      if (!fullDrivesByName.has(acc.name)) fullDrivesByName.set(acc.name, acc);
    }
    fullDrivesRamCache = accounts;
    lastKnownDrivesRaw = raw;
    return accounts;
  }
  const legacy = readLegacyDriveIdentities();
  if (legacy.length > 0) {
    for (const acc of legacy) fullDrivesByName.set(acc.name, acc);
    fullDrivesRamCache = legacy;
    lastKnownDrivesRaw = raw;
    return legacy;
  }
  fullDrivesRamCache = [];
  lastKnownDrivesRaw = raw;
  return fullDrivesRamCache;
}

function commitDrivesToMirror(accounts: DriveAccount[]): void {
  fullDrivesByName.clear();
  for (const acc of accounts) fullDrivesByName.set(acc.name, acc);
  fullDrivesRamCache = accounts;
  p0001DrivesMirrorStore.write(accounts.map(toDriveMirrorRow));
  writeLegacyDriveIdentities(accounts);
  lastKnownDrivesRaw = safeReadLocalRaw(P0001_DRIVES_LS_KEY);
}

/**
 * Reconcile incoming `DriveAccount[]` (`"full"` or `"identity"` view) by watermark + field equality.
 * Preserves unchanged `===` row & array references and persists full inventory/logs to IndexedDB.
 */
export function reconcileP0001DrivesDelta(
  prevAccounts: readonly DriveAccount[],
  incomingAccounts: readonly DriveAccount[],
  options?: {
    view?: "full" | "identity";
    mode?: "snapshot" | "delta";
    persist?: boolean;
    userId?: string;
  },
): { rows: DriveAccount[]; changed: boolean; watermark: string | null } {
  const view = options?.view ?? "full";
  const mode = options?.mode ?? "snapshot";
  const persist = options?.persist ?? true;
  const userId = options?.userId ?? P0001_MIRROR_USER_SCOPE;

  const prevByName = new Map<string, DriveAccount>();
  for (const acc of prevAccounts) prevByName.set(acc.name, acc);

  const incomingNames = new Set<string>();
  const incomingCarriers: WatermarkCarrier<DriveAccount>[] = [];

  for (const nextAcc of incomingAccounts) {
    if (!nextAcc?.name) continue;
    incomingNames.add(nextAcc.name);
    const prev = prevByName.get(nextAcc.name);
    if (prev) {
      const candidate: DriveAccount =
        view === "identity"
          ? {
              ...prev,
              code: nextAcc.code || prev.code,
              authorized: nextAcc.authorized,
              email: nextAcc.email || prev.email,
              displayName: nextAcc.displayName || prev.displayName,
              deletedAt: nextAcc.deletedAt ?? null,
            }
          : {
              ...nextAcc,
              // Keep existing inventory/fileLog when host returns an account before scan completes
              inventory: nextAcc.inventory ?? prev.inventory ?? null,
              fileLog:
                nextAcc.fileLog !== undefined
                  ? nextAcc.fileLog
                  : prev.fileLog,
              contentUpdatedAt:
                nextAcc.contentUpdatedAt !== undefined
                  ? nextAcc.contentUpdatedAt
                  : prev.contentUpdatedAt,
            };

      const prevTs = parseWatermarkMs(resolveDriveWatermark(prev));
      const nextTs = parseWatermarkMs(resolveDriveWatermark(candidate));
      if (mode === "delta" && prevTs > 0 && nextTs > 0 && nextTs < prevTs) {
        incomingCarriers.push({ id: prev.name, updated_at: resolveDriveWatermark(prev), row: prev });
        continue;
      }
      if (isSameDriveAccount(prev, candidate)) {
        incomingCarriers.push({ id: prev.name, updated_at: resolveDriveWatermark(prev), row: prev });
        continue;
      }
      incomingCarriers.push({
        id: candidate.name,
        updated_at: resolveDriveWatermark(candidate),
        row: candidate,
      });
      continue;
    }
    incomingCarriers.push({
      id: nextAcc.name,
      updated_at: resolveDriveWatermark(nextAcc),
      row: nextAcc,
    });
  }

  const baseCarriers: WatermarkCarrier<DriveAccount>[] = (
    mode === "delta" ? prevAccounts : prevAccounts.filter((a) => incomingNames.has(a.name))
  ).map((acc) => ({
    id: acc.name,
    updated_at: resolveDriveWatermark(acc),
    row: acc,
  }));

  const mergedCarriers = mergeDirectoryRowsById(baseCarriers, incomingCarriers);
  const mergedById = new Map(mergedCarriers.map((c) => [c.id, c.row]));

  const orderedRows: DriveAccount[] =
    mode === "snapshot"
      ? incomingCarriers.map((c) => mergedById.get(c.id) ?? c.row)
      : mergedCarriers.map((c) => c.row);

  const watermark = advanceP0001ScopeWatermark("drives", mergedCarriers, userId);

  const sameArray =
    orderedRows.length === prevAccounts.length &&
    orderedRows.every((row, idx) => row === prevAccounts[idx]);

  const finalRows = sameArray ? (prevAccounts as DriveAccount[]) : orderedRows;

  if (persist && (!sameArray || fullDrivesRamCache === null)) {
    commitDrivesToMirror(finalRows);
    markP0001ScopeFresh("drives");
  } else if (persist) {
    markP0001ScopeFresh("drives");
  }

  return {
    rows: finalRows,
    changed: !sameArray,
    watermark,
  };
}

/** Hydrate full `DriveAccount[]` (with `inventory` & un-slimmed `fileLog`) from IndexedDB. */
export async function hydrateP0001DrivesMirror(): Promise<DriveAccount[]> {
  if (drivesHydrateInFlight) return drivesHydrateInFlight;
  drivesHydrateInFlight = (async () => {
    try {
      const current = readCachedP0001Drives();
      const idbRows = await p0001DrivesIdbStore.readAll(P0001_MIRROR_USER_SCOPE);
      if (!idbRows.length) return current;
      const idbAccounts: DriveAccount[] = idbRows.map(({ id: _id, ...rest }) => rest);
      if (!current.length) {
        commitDrivesToMirror(idbAccounts);
        advanceP0001ScopeWatermark(
          "drives",
          idbAccounts.map((a) => ({ id: a.name, updated_at: resolveDriveWatermark(a) })),
        );
        return idbAccounts;
      }
      const idbByName = new Map(idbAccounts.map((row) => [row.name, row]));
      let enriched = false;
      const merged = current.map((cur) => {
        const idbAcc = idbByName.get(cur.name);
        if (!idbAcc) return cur;
        const curTs = parseWatermarkMs(resolveDriveWatermark(cur));
        const idbTs = parseWatermarkMs(resolveDriveWatermark(idbAcc));
        if (idbTs > curTs) {
          enriched = true;
          return idbAcc;
        }
        if (
          (!cur.inventory && idbAcc.inventory) ||
          (idbAcc.fileLog?.length ?? 0) > (cur.fileLog?.length ?? 0) ||
          (idbAcc.activityLog?.length ?? 0) > (cur.activityLog?.length ?? 0)
        ) {
          enriched = true;
          return {
            ...cur,
            inventory: cur.inventory ?? idbAcc.inventory ?? null,
            fileLog:
              (idbAcc.fileLog?.length ?? 0) > (cur.fileLog?.length ?? 0)
                ? idbAcc.fileLog
                : cur.fileLog,
            activityLog:
              (idbAcc.activityLog?.length ?? 0) > (cur.activityLog?.length ?? 0)
                ? idbAcc.activityLog
                : cur.activityLog,
            contentUpdatedAt: cur.contentUpdatedAt ?? idbAcc.contentUpdatedAt ?? null,
            storage: cur.storage ?? idbAcc.storage ?? null,
          };
        }
        return cur;
      });
      if (enriched) {
        for (const acc of merged) fullDrivesByName.set(acc.name, acc);
        fullDrivesRamCache = merged;
        return merged;
      }
      return current;
    } finally {
      drivesHydrateInFlight = null;
    }
  })();
  return drivesHydrateInFlight;
}

/** Synchronous `0ms` warm Runners snapshot (RAM authority -> `localStorage`). */
export function readCachedP0001Runners(): RunnerRow[] {
  const raw = safeReadLocalRaw(P0001_RUNNERS_LS_KEY);
  if (fullRunnersRamCache !== null && raw === lastKnownRunnersRaw) {
    return fullRunnersRamCache;
  }
  if (!raw && lastKnownRunnersRaw !== null) {
    fullRunnersRamCache = null;
    fullRunnersById.clear();
    lastKnownRunnersRaw = null;
  }
  const rows = p0001RunnersMirrorStore.read();
  if (rows.length === 0) {
    fullRunnersRamCache = [];
    lastKnownRunnersRaw = raw;
    return fullRunnersRamCache;
  }
  const hydrated = rows.map((row) => fullRunnersById.get(row.id) ?? row);
  for (const row of hydrated) {
    if (!fullRunnersById.has(row.id)) fullRunnersById.set(row.id, row);
  }
  fullRunnersRamCache = hydrated;
  lastKnownRunnersRaw = raw;
  return hydrated;
}

function commitRunnersToMirror(rows: RunnerRow[]): void {
  fullRunnersById.clear();
  for (const row of rows) fullRunnersById.set(row.id, row);
  fullRunnersRamCache = rows;
  p0001RunnersMirrorStore.write(rows);
  lastKnownRunnersRaw = safeReadLocalRaw(P0001_RUNNERS_LS_KEY);
}

/**
 * Reconcile incoming `RunnerRow[]` by operational state + `probedAt` watermark.
 * Ignores pure `probedAt` clock ticks when operational fields (`up`, `port`, `startExitCode`, etc.)
 * are unchanged, so background probes never trigger redundant directory table re-renders.
 */
export function reconcileP0001RunnersDelta(
  prevRunners: readonly RunnerRow[],
  incomingRunners: readonly RunnerRow[],
  options?: {
    mode?: "snapshot" | "delta";
    persist?: boolean;
    userId?: string;
  },
): { rows: RunnerRow[]; changed: boolean; watermark: string | null } {
  const mode = options?.mode ?? "snapshot";
  const persist = options?.persist ?? true;
  const userId = options?.userId ?? P0001_MIRROR_USER_SCOPE;

  const prevById = new Map<string, RunnerRow>();
  for (const row of prevRunners) prevById.set(row.id, row);

  const incomingIds = new Set<string>();
  const incomingCarriers: WatermarkCarrier<RunnerRow>[] = [];
  const rawWatermarkCarriers: { id: string; updated_at: string | null }[] = [];

  for (const nextRow of incomingRunners) {
    if (!nextRow?.id) continue;
    incomingIds.add(nextRow.id);
    const nextWm = resolveRunnerWatermark(nextRow);
    rawWatermarkCarriers.push({ id: nextRow.id, updated_at: nextWm });
    const prev = prevById.get(nextRow.id);
    if (prev) {
      const prevTs = parseWatermarkMs(resolveRunnerWatermark(prev));
      const nextTs = parseWatermarkMs(nextWm);
      if (mode === "delta" && prevTs > 0 && nextTs > 0 && nextTs < prevTs) {
        incomingCarriers.push({ id: prev.id, updated_at: resolveRunnerWatermark(prev), row: prev });
        continue;
      }
      if (isSameRunnerOperationalState(prev, nextRow)) {
        incomingCarriers.push({ id: prev.id, updated_at: resolveRunnerWatermark(prev), row: prev });
        continue;
      }
    }
    incomingCarriers.push({
      id: nextRow.id,
      updated_at: nextWm,
      row: nextRow,
    });
  }

  const baseCarriers: WatermarkCarrier<RunnerRow>[] = (
    mode === "delta" ? prevRunners : prevRunners.filter((r) => incomingIds.has(r.id))
  ).map((row) => ({
    id: row.id,
    updated_at: resolveRunnerWatermark(row),
    row,
  }));

  const mergedCarriers = mergeDirectoryRowsById(baseCarriers, incomingCarriers);
  const mergedById = new Map(mergedCarriers.map((c) => [c.id, c.row]));

  const orderedRows: RunnerRow[] =
    mode === "snapshot"
      ? incomingCarriers.map((c) => mergedById.get(c.id) ?? c.row)
      : mergedCarriers.map((c) => c.row);

  const watermark = advanceP0001ScopeWatermark(
    "runners",
    rawWatermarkCarriers.length ? rawWatermarkCarriers : mergedCarriers,
    userId,
  );

  const sameArray =
    orderedRows.length === prevRunners.length &&
    orderedRows.every((row, idx) => row === prevRunners[idx]);

  const finalRows = sameArray ? (prevRunners as RunnerRow[]) : orderedRows;

  if (persist && (!sameArray || fullRunnersRamCache === null)) {
    commitRunnersToMirror(finalRows);
    markP0001ScopeFresh("runners");
  } else if (persist) {
    markP0001ScopeFresh("runners");
  }

  return {
    rows: finalRows,
    changed: !sameArray,
    watermark,
  };
}

/** Hydrate `RunnerRow[]` from IndexedDB when `localStorage` is cold/cleared. */
export async function hydrateP0001RunnersMirror(): Promise<RunnerRow[]> {
  if (runnersHydrateInFlight) return runnersHydrateInFlight;
  runnersHydrateInFlight = (async () => {
    try {
      const current = readCachedP0001Runners();
      const idbRows = await p0001RunnersIdbStore.readAll(P0001_MIRROR_USER_SCOPE);
      if (!idbRows.length) return current;
      if (!current.length) {
        commitRunnersToMirror(idbRows);
        advanceP0001ScopeWatermark(
          "runners",
          idbRows.map((r) => ({ id: r.id, updated_at: resolveRunnerWatermark(r) })),
        );
        return idbRows;
      }
      const reconciled = reconcileP0001RunnersDelta(current, idbRows, {
        mode: "delta",
        persist: false,
      });
      if (reconciled.changed) {
        for (const row of reconciled.rows) fullRunnersById.set(row.id, row);
        fullRunnersRamCache = reconciled.rows;
      }
      return reconciled.rows;
    } finally {
      runnersHydrateInFlight = null;
    }
  })();
  return runnersHydrateInFlight;
}

/** Clear all P0001 warm mirrors, IndexedDB stores, TTL stamps, and watermarks. */
export async function clearP0001DeskMirrors(): Promise<void> {
  fullJobsById.clear();
  fullJobsRamCache = null;
  lastKnownJobsRaw = null;

  fullDrivesByName.clear();
  fullDrivesRamCache = null;
  lastKnownDrivesRaw = null;

  fullRunnersById.clear();
  fullRunnersRamCache = null;
  lastKnownRunnersRaw = null;

  p0001JobsMirrorStore.clear();
  p0001DrivesMirrorStore.clear();
  p0001RunnersMirrorStore.clear();

  p0001DeskTtlStamps.jobs.clear();
  p0001DeskTtlStamps.drives.clear();
  p0001DeskTtlStamps.runners.clear();
  clearDirectorySyncWatermark(`${P0001_WATERMARK_NS}:jobs`, P0001_MIRROR_USER_SCOPE);
  clearDirectorySyncWatermark(`${P0001_WATERMARK_NS}:drives`, P0001_MIRROR_USER_SCOPE);
  clearDirectorySyncWatermark(`${P0001_WATERMARK_NS}:runners`, P0001_MIRROR_USER_SCOPE);

  if (typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(P0001_LEGACY_DRIVE_IDENTITY_LS_KEY);
    } catch {
      /* ignore */
    }
  }

  await Promise.all([
    p0001JobsIdbStore.writeBulk(P0001_MIRROR_USER_SCOPE, []),
    p0001DrivesIdbStore.writeBulk(P0001_MIRROR_USER_SCOPE, []),
    p0001RunnersIdbStore.writeBulk(P0001_MIRROR_USER_SCOPE, []),
  ]);
}
