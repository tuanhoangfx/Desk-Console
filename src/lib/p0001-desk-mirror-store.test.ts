import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { RunnerRow } from "./api";
import type { DriveAccount, SyncJob } from "./sync-api";
import {
  clearP0001DeskMirrors,
  hydrateP0001DrivesMirror,
  hydrateP0001JobsMirror,
  hydrateP0001RunnersMirror,
  isP0001ScopeFresh,
  P0001_DRIVES_LS_KEY,
  P0001_JOBS_LS_KEY,
  P0001_LEGACY_DRIVE_IDENTITY_LS_KEY,
  P0001_LS_SLIM_DRIVE_LOG_LIMIT,
  P0001_LS_SLIM_JOB_LOG_LIMIT,
  P0001_LS_SLIM_JOB_OUTPUT_CHARS,
  p0001DrivesMirrorStore,
  p0001JobsMirrorStore,
  p0001RunnersMirrorStore,
  readCachedP0001Drives,
  readCachedP0001Jobs,
  readCachedP0001Runners,
  readP0001ScopeWatermark,
  reconcileP0001DrivesDelta,
  reconcileP0001JobsDelta,
  reconcileP0001RunnersDelta,
} from "./p0001-desk-mirror-store";

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length(): number {
    return this.map.size;
  }
  clear(): void {
    this.map.clear();
  }
  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) ?? null) : null;
  }
  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }
}

function createMemoryIndexedDb(): IDBFactory {
  const databases = new Map<
    string,
    { version: number; stores: Map<string, Map<string, Record<string, unknown>>> }
  >();

  return {
    open(name: string, version = 1) {
      const req: Record<string, unknown> = {
        result: null,
        error: null,
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
      };

      queueMicrotask(() => {
        let entry = databases.get(name);
        const needsUpgrade = !entry || version > entry.version;
        if (!entry) {
          entry = { version, stores: new Map() };
          databases.set(name, entry);
        } else if (needsUpgrade) {
          entry.version = version;
        }
        const dbEntry = entry;

        const db = {
          objectStoreNames: {
            contains: (storeName: string) => dbEntry.stores.has(storeName),
          },
          createObjectStore(storeName: string) {
            const rows = new Map<string, Record<string, unknown>>();
            dbEntry.stores.set(storeName, rows);
            return {
              createIndex: () => ({}),
            };
          },
          transaction(storeName: string) {
            const storeMap = dbEntry.stores.get(storeName) ?? new Map();
            const tx: Record<string, unknown> = {
              oncomplete: null,
              onerror: null,
              objectStore() {
                return {
                  put(val: Record<string, unknown>) {
                    storeMap.set(String(val.id), structuredClone(val));
                  },
                  index(indexField: string) {
                    return {
                      openCursor(matchValue: string) {
                        const cursorReq: Record<string, unknown> = {
                          result: null,
                          onsuccess: null,
                          onerror: null,
                        };
                        const entries = [...storeMap.entries()].filter(
                          ([, v]) => v[indexField] === matchValue,
                        );
                        let idx = 0;
                        const step = () => {
                          queueMicrotask(() => {
                            if (idx < entries.length) {
                              const [id, value] = entries[idx++]!;
                              cursorReq.result = {
                                value: structuredClone(value),
                                delete() {
                                  storeMap.delete(id);
                                },
                                continue() {
                                  step();
                                },
                              };
                            } else {
                              cursorReq.result = null;
                            }
                            if (typeof cursorReq.onsuccess === "function") {
                              (cursorReq.onsuccess as () => void)();
                            }
                            if (cursorReq.result === null && typeof tx.oncomplete === "function") {
                              queueMicrotask(() => (tx.oncomplete as () => void)());
                            }
                          });
                        };
                        step();
                        return cursorReq;
                      },
                    };
                  },
                };
              },
            };
            return tx;
          },
          close() {},
        };

        req.result = db;
        if (needsUpgrade && typeof req.onupgradeneeded === "function") {
          (req.onupgradeneeded as () => void)();
        }
        if (typeof req.onsuccess === "function") {
          (req.onsuccess as () => void)();
        }
      });

      return req as unknown as IDBOpenDBRequest;
    },
  } as unknown as IDBFactory;
}

async function flushAsyncIdb(): Promise<void> {
  for (let i = 0; i < 12; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 0));
  }
}

function makeJob(overrides: Partial<SyncJob> = {}): SyncJob {
  return {
    id: "job-1",
    code: "JB0001",
    name: "Docs Bisync",
    localPath: "E:/Docs",
    remote: "gdrive:Docs",
    mode: "bisync",
    status: "idle",
    updatedAt: "2026-11-11T10:00:00.000Z",
    createdAt: "2026-11-10T10:00:00.000Z",
    ...overrides,
  };
}

function makeDrive(overrides: Partial<DriveAccount> = {}): DriveAccount {
  return {
    name: "gdrive",
    code: "GG0001",
    authorized: true,
    email: "ops@infi28.com",
    displayName: "Ops Drive",
    updatedAt: "2026-11-11T10:00:00.000Z",
    contentUpdatedAt: "2026-11-11T09:55:00.000Z",
    inventory: {
      folderCount: 12,
      fileCount: 340,
      listedBytes: 1_048_576,
      formats: [{ ext: "mp4", files: 10, bytes: 1_000_000 }],
      scannedAt: "2026-11-11T09:56:00.000Z",
      latestModTime: "2026-11-11T09:55:00.000Z",
      latestPath: "Clips/intro.mp4",
    },
    ...overrides,
  };
}

function makeRunner(overrides: Partial<RunnerRow> = {}): RunnerRow {
  return {
    id: "P0001:ui",
    code: "P0001",
    name: "Desk Console",
    kind: "ui",
    port: 5180,
    url: "http://127.0.0.1:5180",
    up: true,
    probedAt: "2026-11-11T10:00:00.000Z",
    ...overrides,
  };
}

describe("p0001-desk-mirror-store", () => {
  beforeEach(async () => {
    Object.defineProperty(globalThis, "localStorage", {
      value: new MemoryStorage(),
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "sessionStorage", {
      value: new MemoryStorage(),
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "indexedDB", {
      value: createMemoryIndexedDb(),
      configurable: true,
      writable: true,
    });
    await clearP0001DeskMirrors();
  });

  afterEach(async () => {
    await clearP0001DeskMirrors();
  });

  it("slims large SyncJob logs/stdout in localStorage while hydrating full history from IndexedDB", async () => {
    const fullLogs = Array.from({ length: 60 }, (_, idx) => ({
      at: `2026-11-11T10:${String(idx % 60).padStart(2, "0")}:00.000Z`,
      message: `Synced batch #${idx}`,
    }));
    const longStdout = "R".repeat(3000);
    const job = makeJob({
      activityLog: fullLogs,
      lastResult: {
        action: "bisync",
        ok: true,
        code: 0,
        stdout: longStdout,
        stderr: "",
      },
    });

    const reconciled = reconcileP0001JobsDelta([], [job]);
    expect(reconciled.changed).toBe(true);
    expect(isP0001ScopeFresh("jobs")).toBe(true);

    // 0ms warm RAM read returns un-slimmed job immediately
    const warmJobs = readCachedP0001Jobs();
    expect(warmJobs).toHaveLength(1);
    expect(warmJobs[0]!.activityLog).toHaveLength(60);
    expect(warmJobs[0]!.lastResult?.stdout).toHaveLength(3000);

    // localStorage copy is slimmed to prevent 5MB QuotaExceededError
    const lsParsed = JSON.parse(localStorage.getItem(P0001_JOBS_LS_KEY) || "[]") as SyncJob[];
    expect(lsParsed).toHaveLength(1);
    expect(lsParsed[0]!.activityLog).toHaveLength(P0001_LS_SLIM_JOB_LOG_LIMIT);
    expect(lsParsed[0]!.lastResult?.stdout).toHaveLength(P0001_LS_SLIM_JOB_OUTPUT_CHARS);

    await flushAsyncIdb();

    // Simulate cold reload by clearing localStorage + RAM mirror while keeping IndexedDB
    p0001JobsMirrorStore.clear();
    expect(readCachedP0001Jobs()).toHaveLength(0);

    const hydrated = await hydrateP0001JobsMirror();
    expect(hydrated).toHaveLength(1);
    expect(hydrated[0]!.activityLog).toHaveLength(60);
    expect(hydrated[0]!.lastResult?.stdout).toBe(longStdout);
  });

  it("preserves exact SyncJob object and array references on unchanged polls and merges updatedAt deltas", () => {
    const jobA = makeJob({ id: "job-a", updatedAt: "2026-11-11T10:00:00.000Z" });
    const jobB = makeJob({ id: "job-b", code: "JB0002", updatedAt: "2026-11-11T10:05:00.000Z" });

    const first = reconcileP0001JobsDelta([], [jobA, jobB]);
    expect(first.watermark).toBe("2026-11-11T10:05:00.000Z");

    // Poll returns cloned objects with identical state & watermarks -> zero replacements
    const second = reconcileP0001JobsDelta(first.rows, [
      { ...jobA },
      { ...jobB },
    ]);
    expect(second.changed).toBe(false);
    expect(second.rows).toBe(first.rows);
    expect(second.rows[0]).toBe(jobA);
    expect(second.rows[1]).toBe(jobB);

    // Update only jobB -> jobA keeps exact reference, jobB updates cleanly
    const jobBUpdated = makeJob({
      id: "job-b",
      code: "JB0002",
      status: "running",
      updatedAt: "2026-11-11T10:12:00.000Z",
    });
    const third = reconcileP0001JobsDelta(second.rows, [{ ...jobA }, jobBUpdated]);
    expect(third.changed).toBe(true);
    expect(third.rows[0]).toBe(jobA);
    expect(third.rows[1]).toBe(jobBUpdated);
    expect(readP0001ScopeWatermark("jobs")).toBe("2026-11-11T10:12:00.000Z");
  });

  it("persists full DriveAccount inventory/fileLog in IndexedDB, slims localStorage, and merges identity refreshes without losing inventory", async () => {
    const fileLogs = Array.from({ length: 45 }, (_, idx) => ({
      at: `2026-11-11T09:${String(idx % 60).padStart(2, "0")}:00.000Z`,
      message: `Uploaded clip-${idx}.mp4`,
    }));
    const drive = makeDrive({ fileLog: fileLogs });

    const first = reconcileP0001DrivesDelta([], [drive], { view: "full" });
    expect(first.changed).toBe(true);

    // localStorage is slimmed while warm RAM keeps all 45 fileLog entries
    const lsDrives = JSON.parse(localStorage.getItem(P0001_DRIVES_LS_KEY) || "[]") as DriveAccount[];
    expect(lsDrives[0]!.fileLog).toHaveLength(P0001_LS_SLIM_DRIVE_LOG_LIMIT);
    expect(readCachedP0001Drives()[0]!.fileLog).toHaveLength(45);

    // Identity-only fast refresh keeps existing inventory & fileLog intact and preserves === if unchanged
    const identityRefresh = reconcileP0001DrivesDelta(
      first.rows,
      [
        {
          name: "gdrive",
          code: "GG0001",
          authorized: true,
          email: "ops@infi28.com",
          displayName: "Ops Drive",
          deletedAt: null,
        },
      ],
      { view: "identity" },
    );
    expect(identityRefresh.changed).toBe(false);
    expect(identityRefresh.rows).toBe(first.rows);
    expect(identityRefresh.rows[0]!.inventory?.fileCount).toBe(340);

    await flushAsyncIdb();

    // Clear slim localStorage & legacy cache, then verify IndexedDB restores full inventory + 45 fileLog entries
    p0001DrivesMirrorStore.clear();
    localStorage.removeItem(P0001_LEGACY_DRIVE_IDENTITY_LS_KEY);
    expect(readCachedP0001Drives()).toHaveLength(0);

    const hydrated = await hydrateP0001DrivesMirror();
    expect(hydrated).toHaveLength(1);
    expect(hydrated[0]!.inventory?.fileCount).toBe(340);
    expect(hydrated[0]!.fileLog).toHaveLength(45);
  });

  it("ignores pure probedAt ticks on Runners while advancing watermark and updating on real state flips", async () => {
    const r1 = makeRunner({ id: "P0001:ui", up: true, probedAt: "2026-11-11T10:00:00.000Z" });
    const r2 = makeRunner({
      id: "P0001:worker",
      kind: "worker",
      port: 6010,
      url: "http://127.0.0.1:6010",
      up: false,
      probedAt: "2026-11-11T10:00:00.000Z",
    });

    const first = reconcileP0001RunnersDelta([], [r1, r2]);
    expect(first.changed).toBe(true);

    // 8s probe advances probedAt without changing up/port/exitCode -> 0 row replacements
    const second = reconcileP0001RunnersDelta(first.rows, [
      { ...r1, probedAt: "2026-11-11T10:00:08.000Z" },
      { ...r2, probedAt: "2026-11-11T10:00:08.000Z" },
    ]);
    expect(second.changed).toBe(false);
    expect(second.rows).toBe(first.rows);
    expect(second.rows[0]).toBe(r1);
    expect(second.rows[1]).toBe(r2);
    expect(readP0001ScopeWatermark("runners")).toBe("2026-11-11T10:00:08.000Z");

    // Worker flips up: false -> true -> r1 stays ===, r2 updates
    const r2Up = { ...r2, up: true, probedAt: "2026-11-11T10:00:16.000Z" };
    const third = reconcileP0001RunnersDelta(second.rows, [
      { ...r1, probedAt: "2026-11-11T10:00:16.000Z" },
      r2Up,
    ]);
    expect(third.changed).toBe(true);
    expect(third.rows[0]).toBe(r1);
    expect(third.rows[1]).toBe(r2Up);

    await flushAsyncIdb();
    p0001RunnersMirrorStore.clear();
    const hydrated = await hydrateP0001RunnersMirror();
    expect(hydrated).toHaveLength(2);
    expect(hydrated[1]!.up).toBe(true);
  });

  it("tracks independent session TTL freshness across jobs, drives, and runners simultaneously", () => {
    reconcileP0001JobsDelta([], [makeJob()]);
    reconcileP0001DrivesDelta([], [makeDrive()], { view: "full" });
    reconcileP0001RunnersDelta([], [makeRunner()]);

    expect(isP0001ScopeFresh("jobs")).toBe(true);
    expect(isP0001ScopeFresh("drives")).toBe(true);
    expect(isP0001ScopeFresh("runners")).toBe(true);
  });
});
