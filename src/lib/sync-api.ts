import { resolveJobActivityActor } from "./job-activity-actor";
import {
  hydrateP0001JobsMirror,
  readCachedP0001Jobs,
  reconcileP0001JobsDelta,
} from "./p0001-desk-mirror-store";

export type SyncJobLiveProgress = {
  percent: number | null;
  transferred: string;
  total: string;
  speed: string;
  eta: string | null;
  filesDone?: number | null;
  filesTotal?: number | null;
};

export type SyncJob = {
  id: string;
  /** Stable public id, `JB0001`. Internal `id` stays the API key. */
  code?: string;
  name: string;
  localPath: string;
  remote: string;
  mode: "bisync" | "mirror-local" | "mirror-remote";
  /** 0 manual, else seconds to wait after the last change. */
  settleSec?: number;
  /** Optional per-job proxy override (`""` = inherit Drive/Global, `"direct"` = bypass proxy, or HTTP/SOCKS5/host:port:user:pass). */
  proxyUrl?: string;
  /** Optional max file size filter (`""` = unlimited, `"500M"`, `"1G"`, `"2G"`, `"5G"`, `"10G"`). */
  maxFileSize?: string;
  /** Comma-separated folder names rclone skips. Missing means the default list. */
  exclude?: string;
  /** ISO time the host will start the next auto sync. Empty while the job is quiet. */
  nextSyncAt?: string | null;
  /** Live rclone transfer stats pushed over `/api/events` while `status` is `running` or `analyzing`. */
  liveProgress?: SyncJobLiveProgress | null;
  /** Last whole-tree scan. Opening the job shows this until the next successful sync writes it. */
  treeCounts?: { synced: number; local: number; drive: number; diff: number; at?: string } | null;
  status: string;
  lastRunAt?: string | null;
  lastSuccessfulSyncAt?: string | null;
  lastBackupDir?: string | null;
  lastConflictDir?: string | null;
  lastResult?: {
    action?: string;
    ok?: boolean;
    code?: number;
    stdout?: string;
    stderr?: string;
    backupDir?: string;
    conflictDir?: string;
    trashPolicy?: string;
  } | null;
  createdAt?: string;
  updatedAt?: string;
  /** Set when Delete moves the job to Trash. Empty on Live. */
  deletedAt?: string | null;
  note?: string;
  activityLog?: {
    at: string;
    message: string;
    changes?: { field: string; before?: string; after?: string }[];
    actor?: { label: string; source?: string };
  }[];
};

import { fetchDeskHost, resolveDeskApiOrigin } from "./host-fetch-recovery";

export type RemoteInfo = { name: string; type: string; teamDrive?: boolean };

function apiOrigin(): string {
  return resolveDeskApiOrigin();
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetchDeskHost(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
  }
  return data as T;
}

let sharedEventSource: EventSource | null = null;
let sharedSseConnected = false;
let latestJobsSnapshot: SyncJob[] | null = null;
let jobsMirrorHydrated = false;
const jobStreamListeners = new Set<(jobs: SyncJob[]) => void>();
const sseStatusListeners = new Set<(connected: boolean) => void>();

function getSeededJobsSnapshot(): SyncJob[] | null {
  if (latestJobsSnapshot !== null) return latestJobsSnapshot;
  const cached = readCachedP0001Jobs();
  if (cached.length > 0) {
    latestJobsSnapshot = cached;
    return latestJobsSnapshot;
  }
  return null;
}

function notifyJobStreamListeners(jobs: SyncJob[]) {
  const prev = getSeededJobsSnapshot() ?? [];
  const reconciled = reconcileP0001JobsDelta(prev, jobs);
  if (latestJobsSnapshot !== null && !reconciled.changed && latestJobsSnapshot === reconciled.rows) {
    return;
  }
  latestJobsSnapshot = reconciled.rows;
  for (const listener of jobStreamListeners) {
    listener(reconciled.rows);
  }
}

function notifySseStatusListeners(connected: boolean) {
  if (sharedSseConnected === connected) return;
  sharedSseConnected = connected;
  for (const listener of sseStatusListeners) {
    listener(connected);
  }
}

function ensureSharedEventSource() {
  if (sharedEventSource || typeof window === "undefined" || typeof EventSource === "undefined") {
    return;
  }
  try {
    const es = new EventSource(`${apiOrigin()}/api/events`);
    sharedEventSource = es;
    es.onopen = () => {
      notifySseStatusListeners(true);
    };
    es.onerror = () => {
      notifySseStatusListeners(false);
    };
    es.addEventListener("jobs", (event: MessageEvent) => {
      notifySseStatusListeners(true);
      try {
        const parsed = JSON.parse(String(event.data || "{}"));
        if (Array.isArray(parsed?.jobs)) {
          notifyJobStreamListeners(parsed.jobs as SyncJob[]);
        }
      } catch {
        /* ignore malformed event */
      }
    });
  } catch {
    notifySseStatusListeners(false);
  }
}

/**
 * Subscribe to the shared `/api/events` SSE stream.
 * Replaces polling for `/api/jobs` and `/api/jobs/:id/logs` while connected.
 */
export function subscribeSyncEvents(
  onJobs: (jobs: SyncJob[]) => void,
  onConnectionChange?: (connected: boolean) => void,
): () => void {
  jobStreamListeners.add(onJobs);
  if (onConnectionChange) {
    sseStatusListeners.add(onConnectionChange);
    onConnectionChange(sharedSseConnected);
  }
  const seeded = getSeededJobsSnapshot();
  if (seeded) {
    onJobs(seeded);
  }
  if (!jobsMirrorHydrated) {
    jobsMirrorHydrated = true;
    void hydrateP0001JobsMirror().then((hydrated) => {
      if (!hydrated.length) return;
      const current = latestJobsSnapshot ?? [];
      if (!current.length) {
        latestJobsSnapshot = hydrated;
        for (const listener of jobStreamListeners) {
          listener(hydrated);
        }
      }
    });
  }
  ensureSharedEventSource();
  return () => {
    jobStreamListeners.delete(onJobs);
    if (onConnectionChange) {
      sseStatusListeners.delete(onConnectionChange);
    }
    if (jobStreamListeners.size === 0 && sseStatusListeners.size === 0 && sharedEventSource) {
      sharedEventSource.close();
      sharedEventSource = null;
      sharedSseConnected = false;
    }
  };
}

export async function fetchJobs() {
  const data = await api<{ jobs: SyncJob[] }>("/api/jobs");
  if (Array.isArray(data?.jobs)) {
    notifyJobStreamListeners(data.jobs);
    return { ...data, jobs: latestJobsSnapshot ?? data.jobs };
  }
  return data;
}

export function fetchJobLogs(id: string) {
  return api<{
    ok: boolean;
    jobId: string;
    status: string;
    liveProgress: SyncJobLiveProgress | null;
    stdout: string;
    stderr: string;
    activityLog: NonNullable<SyncJob["activityLog"]>;
  }>(`/api/jobs/${encodeURIComponent(id)}/logs`);
}

export function createJob(body: Partial<SyncJob>) {
  return api<{ job: SyncJob }>("/api/jobs", { method: "POST", body: JSON.stringify(body) });
}

export function updateJob(id: string, body: Partial<SyncJob>, opts?: { remote?: string }) {
  const activityActor = resolveJobActivityActor(body.remote || opts?.remote);
  return api<{ job: SyncJob }>(`/api/jobs/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ ...body, activityActor }),
  });
}

export function deleteJob(id: string) {
  return api<{ removed: SyncJob; trashed?: boolean }>(`/api/jobs/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function restoreJob(id: string) {
  return api<{ job: SyncJob }>(`/api/jobs/${encodeURIComponent(id)}/restore`, { method: "POST" });
}

export function deleteJobForever(id: string) {
  return api<{ removed: SyncJob }>(`/api/jobs/${encodeURIComponent(id)}?forever=1`, { method: "DELETE" });
}

export function startJob(id: string) {
  return api<{ job: SyncJob }>(`/api/jobs/${encodeURIComponent(id)}/start`, { method: "POST" });
}

export function stopJob(id: string) {
  return api<{ ok: boolean; job: SyncJob }>(`/api/jobs/${encodeURIComponent(id)}/stop`, {
    method: "POST",
  });
}

export function fetchHealth() {
  return api<{
    ok: boolean;
    rclone: { path: string | null; version: string | null };
    dataRoot: string;
    trashRoot?: string;
    backupRoot?: string;
    conflictRoot?: string;
    proxyHealth?: ProxyHealthState;
  }>("/api/health");
}

export function fetchRemotes() {
  return api<{ ok: boolean; remotes: RemoteInfo[]; error?: string }>("/api/remotes");
}

export type DriveAccountLog = {
  at: string;
  message: string;
  changes?: { field: string; before?: string; after?: string }[];
  actor?: { label: string; source?: string };
};

export type DriveStorage = {
  usedBytes: number | null;
  limitBytes: number | null;
  driveBytes: number | null;
  trashBytes: number | null;
};

export type DriveAccount = {
  name: string;
  /** Stable public id, `GG0001`. Internal `name` stays the rclone remote key. */
  code?: string;
  authorized: boolean;
  email: string | null;
  displayName: string | null;
  proxyUrl?: string;
  bwlimit?: string;
  note?: string;
  storage?: DriveStorage | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  /** Set when Delete moves the account to Trash. The rclone remote stays until Delete forever. */
  deletedAt?: string | null;
  activityLog?: DriveAccountLog[];
  /** Per-file changes. The directory Log column reads this, not the account sign-in log. */
  fileLog?: DriveAccountLog[];
  /** Newest file modification time. The directory Update column reads this. */
  contentUpdatedAt?: string | null;
  inventory?: DriveInventory | null;
  /** Jobs whose remote uses this Drive. Filled by the Drives screen. */
  jobCount?: number;
};

export type NetworkSettings = {
  bwlimit: string;
  tpslimit: number;
  transfers: number;
  proxyUrl: string;
  proxyFailoverToDirect?: boolean;
  updatedAt?: string | null;
};

export type ProxyHealthState = {
  status: "unconfigured" | "online" | "unreachable" | "checking";
  ok: boolean;
  proxyUrl: string;
  latencyMs: number | null;
  checkedAt: string | null;
  message: string;
  failoverActive: boolean;
};

export type NetworkProbeResult = {
  ok: boolean;
  mode: "direct" | "proxy";
  proxyUrl: string;
  latencyMs: number;
  status?: number;
  message: string;
  error?: string;
  proxyHealth?: ProxyHealthState;
};

export function fetchNetworkSettings() {
  return api<{ ok: boolean; settings: NetworkSettings; proxyHealth?: ProxyHealthState }>("/api/network-settings");
}

export function updateNetworkSettings(patch: Partial<NetworkSettings>) {
  return api<{ ok: boolean; settings: NetworkSettings; proxyHealth?: ProxyHealthState }>("/api/network-settings", {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

export function probeNetworkConnection(proxyUrl?: string) {
  return api<NetworkProbeResult>("/api/network-settings/probe", {
    method: "POST",
    body: JSON.stringify({ proxyUrl: proxyUrl ?? "" }),
  });
}

export function updateDriveAccountNetwork(
  name: string,
  patch: { proxyUrl?: string; bwlimit?: string; note?: string },
) {
  return api<{ ok: boolean; name: string; code?: string; proxyUrl: string; bwlimit: string; note?: string }>(
    "/api/remotes/drive/network",
    {
      method: "PUT",
      body: JSON.stringify({ name, ...patch }),
    },
  );
}

export function cleanLegacyDriveBackups(opts?: { remoteName?: string; dry?: boolean }) {
  return api<{
    ok: boolean;
    dry: boolean;
    totalFiles: number;
    remotes: { name: string; files: number; cleaned: boolean }[];
    error?: string;
  }>("/api/remotes/drive/clean-backups", {
    method: "POST",
    body: JSON.stringify(opts || {}),
  });
}

export function emptyDriveTrash(name: string) {
  return api<{ ok: boolean; name: string; error?: string }>("/api/remotes/drive/empty-trash", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export type DriveFormatStat = { ext: string; files: number; bytes: number };

export type DriveInventory = {
  folderCount: number | null;
  fileCount: number | null;
  listedBytes?: number | null;
  formats: DriveFormatStat[];
  scannedAt: string | null;
  latestModTime: string | null;
  latestPath: string | null;
  scanning?: boolean;
  error?: string | null;
};

export function fetchDriveAccounts() {
  return api<{ ok: boolean; accounts: DriveAccount[]; error?: string }>("/api/remotes/drive/accounts");
}

/** Name + email only. The full accounts route also attaches inventory. */
export function fetchDriveAccountIdentities() {
  return api<{ ok: boolean; accounts: DriveAccount[]; error?: string }>("/api/remotes/drive/accounts?view=identity");
}

export function ensureDriveRemote(name = "gdrive") {
  return api<{ ok: boolean; name: string; existed?: boolean }>("/api/remotes/drive", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function deleteDriveAccount(name: string) {
  return api<{ ok: boolean; name: string; error?: string }>("/api/remotes/drive/delete", {
    method: "POST",
    body: JSON.stringify({ name, forever: true }),
  });
}

export function trashDriveAccount(name: string) {
  return api<{ ok: boolean; name: string }>("/api/remotes/drive/trash", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function restoreDriveAccount(name: string) {
  return api<{ ok: boolean; name: string }>("/api/remotes/drive/restore", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export type DriveOauthCallbackStatus = {
  ok: boolean;
  callbackPort: number;
  redirectUri: string;
  listening: boolean;
  portBusy?: boolean;
  foreignPids?: number[];
  reclaimedCallbackPid?: number | null;
  activeRemote?: string | null;
  clientIdPrefix?: string | null;
};

export function authorizeRemote(name = "gdrive") {
  return api<{
    ok: boolean;
    sessionId: string;
    name: string;
    hint: string;
    oauth?: boolean;
    authUrl?: string | null;
    callbackPort?: number;
    callbackListening?: boolean;
    redirectUri?: string;
    clientIdPrefix?: string | null;
    reclaimedCallbackPid?: number | null;
  }>("/api/remotes/authorize", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function fetchDriveOauthCallbackStatus() {
  return api<DriveOauthCallbackStatus>("/api/remotes/authorize/callback-status");
}

export function openDriveOauthInStealth(profileCode: string, url: string) {
  return api<{ ok: boolean; profileCode?: string; url?: string; error?: string }>(
    "/api/remotes/authorize/open-stealth",
    {
      method: "POST",
      body: JSON.stringify({ profileCode, url }),
    },
  );
}

export function cancelAuthorizeRemote() {
  return api<{ ok: boolean }>("/api/remotes/authorize/cancel", {
    method: "POST",
  });
}

export type DriveFolder = { name: string; path: string };

export function fetchDriveStatus(name = "gdrive") {
  const q = new URLSearchParams({ name });
  return api<{
    ok: boolean;
    name: string;
    authorized: boolean;
    email?: string | null;
    displayName?: string | null;
    error?: string | null;
  }>(`/api/remotes/drive/status?${q}`);
}

export function fetchAuthorizeSession(sessionId: string) {
  return api<{ sessionId: string; name: string; exitCode: number | null; lines: string[] }>(
    `/api/remotes/authorize/${encodeURIComponent(sessionId)}`,
  );
}

export type BrowseSide = { kind: "folder" | "file"; size: number | null; modTime?: string | null } | null;

export type BrowseRow = {
  name: string;
  kind: "folder" | "file" | "mixed";
  local: BrowseSide;
  remote: BrowseSide;
  status: "in-sync" | "local" | "cloud" | "different" | "both";
};

export function fetchJobBrowse(jobId: string, dirPath = "") {
  const q = new URLSearchParams({ path: dirPath });
  return api<{
    ok: boolean;
    path: string;
    localRoot: string;
    remoteRoot: string;
    localMissing: boolean;
    localError: string | null;
    remoteError: string | null;
    excludedCount?: number;
    excludedNames?: string[];
    rows: BrowseRow[];
  }>(`/api/jobs/${encodeURIComponent(jobId)}/browse?${q}`);
}

export function fetchDriveInventory(name = "gdrive") {
  const q = new URLSearchParams({ name });
  return api<{
    ok: boolean;
    name: string;
    inventory: DriveInventory | null;
    fileLog: DriveAccountLog[];
    contentUpdatedAt: string | null;
  }>(`/api/remotes/drive/inventory?${q}`);
}

export type LocalDriveInfo = {
  root: string;
  label: string;
  freeBytes: number | null;
  totalBytes: number | null;
};

export function fetchLocalDrives() {
  return api<{ ok: boolean; drives: LocalDriveInfo[] }>("/api/local/drives");
}

export function createLocalFolder(root: string, parentPath: string, name: string) {
  return api<{ ok: boolean; path: string; fullPath: string; name: string; error?: string }>("/api/local/mkdir", {
    method: "POST",
    body: JSON.stringify({ root, parentPath, name }),
  });
}

export function createDriveFolder(name: string, parentPath: string, folderName: string) {
  return api<{ ok: boolean; name: string; path: string; folderName: string; error?: string }>(
    "/api/remotes/drive/mkdir",
    {
      method: "POST",
      body: JSON.stringify({ name, parentPath, folderName }),
    },
  );
}

export function fetchLocalTree(root: string, dirPath = "") {
  const q = new URLSearchParams({ root, path: dirPath });
  return api<{ ok: boolean; path: string; entries: BrowseRow[]; error?: string }>(`/api/local/tree?${q}`);
}

export function fetchDriveTree(name = "gdrive", dirPath = "") {
  const q = new URLSearchParams({ name, path: dirPath });
  return api<{
    ok: boolean;
    path: string;
    entries: BrowseRow[];
    error?: string;
  }>(`/api/remotes/drive/tree?${q}`);
}

export function fetchDriveFolders(name = "gdrive", dirPath = "") {
  const q = new URLSearchParams({ name, path: dirPath });
  return api<{ ok: boolean; name: string; path: string; folders: DriveFolder[]; error?: string }>(
    `/api/remotes/drive/folders?${q}`,
  );
}

export function fetchTrash() {
  return api<{ items: { path: string; bytes: number; mtime: string }[]; root: string }>("/api/trash");
}

export function purgeTrash() {
  return api<{ ok: boolean }>("/api/trash/purge", { method: "POST" });
}

/** Host watch: one sync this many ms after the local folder stops changing. */
export function fetchSyncWatch() {
  return api<{ settleMs: number; mode: "after-change" }>("/api/sync-watch");
}

export type JobConflictFile = {
  conflictRelPath: string;
  originalRelPath: string;
  suffix: string;
  conflictBytes: number;
  conflictMtime: string;
  originalExists: boolean;
  originalBytes: number | null;
  originalMtime: string | null;
};

export function fetchJobConflicts(jobId: string) {
  return api<{ ok: boolean; jobId: string; conflicts: JobConflictFile[] }>(
    `/api/jobs/${encodeURIComponent(jobId)}/conflicts`,
  );
}

export function cleanJobExcludedOnDrive(jobId: string, dry = true) {
  return api<{ ok: boolean; dry: boolean; count: number; files: string[]; error?: string }>(
    `/api/jobs/${encodeURIComponent(jobId)}/clean-excluded`,
    {
      method: "POST",
      body: JSON.stringify({ dry }),
    },
  );
}

export function resolveJobConflict(
  jobId: string,
  conflictRelPath: string,
  resolution: "keep-local" | "keep-conflict" | "delete-conflict" = "keep-local",
) {
  return api<{
    ok: boolean;
    resolvedRelPath: string;
    originalRelPath: string;
    resolution: string;
    remainingCount: number;
    conflicts: JobConflictFile[];
  }>(`/api/jobs/${encodeURIComponent(jobId)}/conflicts/resolve`, {
    method: "POST",
    body: JSON.stringify({ conflictRelPath, resolution }),
  });
}
