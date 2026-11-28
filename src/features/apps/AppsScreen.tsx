import { useCallback, useMemo, useRef, useState } from "react";
import { emitHubAppLog, useHubToast, type HubBrandIconId, type HubDirectoryBulkMoreAction } from "@tool-workspace/hub-ui";
import {
  deskApi,
  type DriveVaultSyncStatus,
  type ManagedAppReleaseItem,
  type ManagedAppRow,
  type ManagedAppsResponse,
} from "../../lib/api";
import { useDeskTabActive } from "../../lib/desk-active-screen";
import { useDeskLive } from "../../lib/use-desk-live";
import { navScreenChrome } from "../../lib/nav-structure";
import { DeskDirectoryScreen } from "../desk/DeskDirectoryScreen";
import { appendDeskOpsLog } from "../desk/desk-ops-session-log";
import { useDeskOpsFocus } from "../desk/use-desk-ops-focus";
import type { DeskRow } from "../desk/desk-directory-cells";
import { deskStatusDotTone } from "../desk/desk-directory-stickers";
import { AppVersionDetailModal } from "./AppVersionDetailModal";

const APPS_CACHE_KEY = "p0001_apps_snapshot_v2";

function readCachedAppsSnapshot(): Partial<ManagedAppsResponse> | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(APPS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ManagedAppsResponse>;
    return Array.isArray(parsed?.rows) ? parsed : null;
  } catch {
    return null;
  }
}

function writeCachedAppsSnapshot(res: ManagedAppsResponse) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      APPS_CACHE_KEY,
      JSON.stringify({
        rows: Array.isArray(res.rows) ? res.rows : [],
        driveVaultSync: res.driveVaultSync ?? null,
        themeMod: res.themeMod ?? null,
        checkedAt: res.checkedAt,
      }),
    );
  } catch {
    /* ignore quota */
  }
}

function productLabel(row: ManagedAppRow): string {
  if (row.kind === "sxs") return "Antigravity SxS";
  if (row.product === "antigravity") return "Antigravity";
  if (row.product === "cursor") return "Cursor";
  if (row.product === "zalo") return "Zalo Desktop";
  return "Claude Code";
}

function defaultBrandMeta(row: ManagedAppRow): { brandId?: HubBrandIconId; brandIconSrc?: string } {
  if (row.brandId) return { brandId: row.brandId as HubBrandIconId };
  if (row.brandIconSrc) return { brandIconSrc: row.brandIconSrc };
  if (row.product === "zalo") return { brandId: "zalo" as HubBrandIconId };
  if (row.product === "cursor") return { brandId: "cursor" as HubBrandIconId };
  if (row.product === "claudeCode") return { brandId: "claude" as HubBrandIconId };
  return { brandIconSrc: "/assets/brand-icons/antigravity.svg" };
}

function toDeskRow(row: ManagedAppRow): DeskRow {
  const brand = defaultBrandMeta(row);
  let extra = row.detail;
  let extraBadges: DeskRow["extraBadges"];
  if (row.product === "zalo") {
    const badges: NonNullable<DeskRow["extraBadges"]> = [];
    if (row.zaloDataAccessible) {
      if ((row.zaloDataOnDBytes ?? 0) > 0 && row.zaloDataOnDLabel) {
        badges.push({
          label: `C: ${row.zaloDataOnCLabel || "0 B"}`,
          title: `ZaloData physical usage on Drive C: (${row.zaloDataOnCLabel || "0 B"})`,
          tone: "slate",
        });
        badges.push({
          label: `D: ${row.zaloDataOnDLabel}`,
          title: `Offloaded via NTFS Junction to Drive D: (${row.zaloDataOnDLabel})`,
          tone: "sky",
        });
      } else if (row.zaloDataLabel) {
        badges.push({
          label: `Data ${row.zaloDataLabel}`,
          title: `ZaloData usage on Drive C: (${row.zaloDataLabel})`,
          tone: (row.zaloDataBytes ?? 0) >= 2 * 1024 * 1024 * 1024 ? "amber" : "slate",
        });
      }
      if ((row.zaloDataCacheBytes ?? 0) > 0 && row.zaloDataCacheLabel) {
        badges.push({
          label: `Cache ${row.zaloDataCacheLabel}`,
          title: `Cleanable Chromium cache inside ZaloData (${row.zaloDataCacheLabel})`,
          tone: (row.zaloDataCacheBytes ?? 0) >= 300 * 1024 * 1024 ? "rose" : "amber",
        });
      }
    } else if (row.winUser && !row.savedCredReady) {
      badges.push({
        label: `ACL ${row.winUser}`,
        title: `Run one-time /savecred for ${row.winUser} to manage data & launch`,
        tone: "amber",
      });
    }
    if (badges.length > 0) {
      extraBadges = badges;
      extra = row.detail
        .replace(/\s*·\s*On C:[^·]+·\s*Junction D:[^·]+/i, "")
        .replace(/\s*·\s*Data [^·]+/i, "")
        .replace(/\s*·\s*Needs \/savecred/i, "")
        .trim() || row.detail;
    }
  } else if (row.product === "antigravity") {
    const badges: NonNullable<DeskRow["extraBadges"]> = [];
    if (row.themeHookRestartNeeded) {
      badges.push({
        label: "Restart needed",
        title: "electron-hook.cjs was updated after this instance started — restart IDE to apply new main-process RPC changes",
        tone: "amber",
      });
    }
    if (row.quotaCreditsLabel) {
      badges.push({
        label: row.quotaCreditsLabel,
        title: "Synced AI Credits remaining",
        tone: "sky",
      });
    }
    if (badges.length > 0) {
      extraBadges = badges;
    }
  }
  return {
    id: row.id,
    name: row.name,
    screen: "apps",
    ...brand,
    version: row.version || undefined,
    account: row.accountLabel || row.boundEmail || (row.winUser ? row.winUser : undefined),
    ramBytes: Number(row.memoryBytes) || 0,
    ramLabel: row.ramLabel || "",
    hideExtraGroupPrefix: true,
    status: row.status,
    statusTone: deskStatusDotTone(row.status, "apps"),
    extra,
    extraBadges,
    log: row.log,
    project: productLabel(row),
    appKind: row.kind,
    outdated: Boolean(row.outdated),
    sizeBytes: row.sizeBytes || 0,
    sizeLabel: row.sizeLabel || "",
    pinned: row.updatePinned,
    createdAt: row.createdAt || row.updated,
    updated: row.updated,
    opsKind: row.kind === "sxs" || row.product === "zalo" ? "runner" : undefined,
    opsUp: Boolean(row.isRunning),
  };
}

export function AppsScreen() {
  const tabActive = useDeskTabActive("apps");
  const toast = useHubToast();
  const initialCache = useMemo(() => readCachedAppsSnapshot(), []);
  const rawRowsRef = useRef<ManagedAppRow[]>(Array.isArray(initialCache?.rows) ? initialCache.rows : []);
  const [releases, setReleases] = useState<ManagedAppReleaseItem[]>([]);
  const [cursorReleases, setCursorReleases] = useState<ManagedAppReleaseItem[]>([]);
  const [driveVaultSync, setDriveVaultSync] = useState<DriveVaultSyncStatus | null>(
    initialCache?.driveVaultSync ?? null,
  );
  const [themeMod, setThemeMod] = useState<ManagedAppsResponse["themeMod"]>(initialCache?.themeMod ?? null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());

  const applyResponse = useCallback((res: ManagedAppsResponse | undefined): DeskRow[] => {
    if (!res) return rawRowsRef.current.map(toDeskRow);
    rawRowsRef.current = Array.isArray(res.rows) ? res.rows : [];
    writeCachedAppsSnapshot(res);
    if (Array.isArray(res.releases) && res.releases.length > 0) {
      setReleases(res.releases);
    }
    if (Array.isArray(res.cursorReleases) && res.cursorReleases.length > 0) {
      setCursorReleases(res.cursorReleases);
    }
    if ("driveVaultSync" in res) {
      setDriveVaultSync(res.driveVaultSync ?? null);
    }
    if ("themeMod" in res) {
      setThemeMod(res.themeMod ?? null);
    }
    return rawRowsRef.current.map(toDeskRow);
  }, []);

  const load = useCallback(async () => {
    const res = await deskApi.appsVersions({ releases: false });
    return applyResponse(res);
  }, [applyResponse]);

  const { rows, refresh } = useDeskLive(load, {
    scope: "apps",
    intervalMs: 15_000,
    screenId: "apps",
    initialRows: () => rawRowsRef.current.map(toDeskRow),
    rowStableKey: (row) =>
      `${row.id}:${row.status}:${row.version || ""}:${row.account || ""}:${row.ramLabel || ""}:${row.sizeLabel || ""}:${row.extra}:${row.extraBadges?.map((b) => b.label).join("|") || ""}:${row.pinned ? 1 : 0}`,
  });

  const { setFocusedId } = useDeskOpsFocus(rows, tabActive);
  const detailRow = useMemo(
    () => rawRowsRef.current.find((r) => r.id === detailId) ?? null,
    [detailId, rows],
  );

  const runAction = useCallback(
    async (action: string, payload: Record<string, unknown> = {}) => {
      const actionKey = payload.version ? `${action}:${String(payload.version)}` : action;
      setBusyAction(actionKey);
      try {
        const res = await deskApi.appsAction(action, payload);
        if (res.appsState) applyResponse(res.appsState);
        else await refresh();
        const msg = res.message || res.error || `Executed ${action}`;
        appendDeskOpsLog(msg, res.ok ? "info" : "error", "runner");
        emitHubAppLog({ scope: "P0001", screen: "apps", kind: "update", message: msg });
        toast?.pushRichToast({
          type: res.ok ? "success" : "error",
          title: "Apps & Versions",
          message: msg,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        appendDeskOpsLog(msg, "error", "runner");
        toast?.pushRichToast({ type: "error", title: "Apps & Versions", message: msg });
      } finally {
        setBusyAction(null);
      }
    },
    [applyResponse, refresh, toast],
  );

  const refreshFeed = useCallback(
    async (force: boolean) => {
      setBusyAction("refresh-feed");
      try {
        const res = await deskApi.appsVersions({ releases: true, force });
        applyResponse(res);
        toast?.pushRichToast({
          type: "info",
          title: "Apps & Versions",
          message: `Checked ${res.rows?.length ?? 0} runtime(s) & ${res.releases?.length ?? 0} Antigravity release(s)`,
        });
      } catch (err) {
        toast?.pushRichToast({
          type: "error",
          title: "Apps & Versions",
          message: err instanceof Error ? err.message : String(err),
        });
      } finally {
        setBusyAction(null);
      }
    },
    [applyResponse, toast],
  );

  const runOne = useCallback(
    (id: string) => {
      const raw = rawRowsRef.current.find((r) => r.id === id);
      if (!raw) return;
      if (raw.product === "zalo") {
        setPendingIds((prev) => new Set(prev).add(id));
        const nextAction = raw.isRunning ? "stop-zalo" : "launch-zalo";
        void runAction(nextAction, { id: raw.id, relaunch: false }).finally(() => {
          setPendingIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        });
        return;
      }
      if (raw.kind !== "sxs" || !raw.version) {
        setFocusedId(id);
        setDetailId(id);
        return;
      }
      setPendingIds((prev) => new Set(prev).add(id));
      const nextAction = raw.isRunning ? "stop-sxs" : "launch-sxs";
      const nextPayload = raw.isRunning
        ? { version: raw.version }
        : { version: raw.version, relaunch: false };
      void runAction(nextAction, nextPayload).finally(() => {
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      });
    },
    [runAction, setFocusedId],
  );

  const stopOne = useCallback(
    (id: string) => {
      const raw = rawRowsRef.current.find((r) => r.id === id);
      if (!raw) return;
      if (raw.product === "zalo" && raw.isRunning) {
        setPendingIds((prev) => new Set(prev).add(id));
        void runAction("stop-zalo", { id: raw.id }).finally(() => {
          setPendingIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        });
        return;
      }
      if (raw.kind === "sxs" && raw.version && raw.isRunning) {
        setPendingIds((prev) => new Set(prev).add(id));
        void runAction("stop-sxs", { version: raw.version }).finally(() => {
          setPendingIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        });
      }
    },
    [runAction],
  );

  const opsHandlers = useMemo(
    () => ({
      onRun: runOne,
      onStop: stopOne,
      onFocus: setFocusedId,
      pendingIds,
    }),
    [pendingIds, runOne, setFocusedId, stopOne],
  );

  const zaloOutdatedCount = useMemo(
    () =>
      rawRowsRef.current.filter(
        (r) => r.product === "zalo" && (r.outdated || r.status === "Update" || r.status === "Pending" || r.status === "Conflict"),
      ).length,
    [rows],
  );

  const zaloCleanableSummary = useMemo(() => {
    let totalBytes = 0;
    for (const r of rawRowsRef.current) {
      if (r.product === "zalo" && r.zaloDataAccessible && (r.zaloDataCacheBytes ?? 0) > 0) {
        totalBytes += Number(r.zaloDataCacheBytes) || 0;
      }
    }
    if (totalBytes <= 0) return "";
    if (totalBytes >= 1024 * 1024 * 1024) return `${(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    if (totalBytes >= 1024 * 1024) return `${Math.round(totalBytes / (1024 * 1024))} MB`;
    return `${Math.round(totalBytes / 1024)} KB`;
  }, [rows]);

  const moreActions = useCallback(
    ({ ids }: { ids: string[] }): HubDirectoryBulkMoreAction[] => [
      {
        key: "lock-updates",
        label: "Lock & Purge Updates",
        emoji: "🔒",
        tone: "emerald",
        disabled: busyAction !== null,
        title: "Pin Antigravity & Cursor auto-updates OFF and lock pending folder ACL",
        onClick: () =>
          void runAction("pin-updates", {
            pin: true,
            purgePending: true,
            lockCursor: true,
            hardLockAcl: true,
          }),
      },
      {
        key: "sync-zalo",
        label: zaloOutdatedCount > 0 ? `Sync Zalo Fleet (${zaloOutdatedCount})` : "Sync Zalo Fleet",
        emoji: "💬",
        tone: zaloOutdatedCount > 0 ? "amber" : "emerald",
        disabled: busyAction !== null,
        title: "Verify and sync portable Zalo Desktop instances to the latest local build",
        onClick: () => {
          const zaloIds = ids.filter((id) => rawRowsRef.current.some((r) => r.id === id && r.product === "zalo"));
          void runAction("sync-zalo-instances", {
            ...(zaloIds.length > 0 ? { instanceIds: zaloIds, includePrimary: zaloIds.includes("zalo:primary") } : {}),
            stopRunning: true,
            pruneOld: true,
          });
        },
      },
      {
        key: "theme-sxs",
        label: themeMod ? `Apply Theme (${themeMod.patchedCount}/${themeMod.totalCount})` : "Apply Theme SxS",
        emoji: "🎨",
        tone: "indigo",
        disabled: busyAction !== null,
        title: "Apply Cyber Horizon / configured Theme Mod + Sidebar Quota to closed Antigravity SxS builds",
        onClick: () => {
          const sxsRows = ids
            .map((id) => rawRowsRef.current.find((r) => r.id === id))
            .filter((r) => r?.kind === "sxs" && r.version);
          if (sxsRows.length === 0) {
            void runAction("theme-apply");
            return;
          }
          for (const row of sxsRows) {
            void runAction("theme-apply", { version: row?.version });
          }
        },
      },
      {
        key: "refresh-feed",
        label: "Refresh Releases",
        emoji: "🔄",
        disabled: busyAction !== null,
        title: "Re-scan installed app versions, SxS builds, and GCS Antigravity releases",
        onClick: () => void refreshFeed(true),
      },
    ],
    [busyAction, refreshFeed, runAction, themeMod, zaloOutdatedCount],
  );

  const openDetailModal = useCallback(
    (id: string) => {
      setFocusedId(id);
      if (releases.length === 0 || cursorReleases.length === 0) {
        void deskApi.appsVersions({ releases: true }).then((r) => applyResponse(r)).catch(() => null);
      }
      setDetailId(id);
    },
    [applyResponse, cursorReleases.length, releases.length, setFocusedId],
  );

  const { icon, iconClass } = navScreenChrome("apps");

  return (
    <>
      <DeskDirectoryScreen
        screen="apps"
        tabActive={tabActive}
        showPeriod
        title="Apps"
        titleIcon={icon}
        titleIconClass={iconClass}
        sectionRuleLabel="Apps"
        searchPlaceholder="Search IDE version, Antigravity SxS build, Cursor, Claude Code, Zalo fleet…"
        rows={rows}
        onRowFocus={openDetailModal}
        opsHandlers={opsHandlers}
        crudBulk={{
          onDetail: (ids) => {
            if (ids[0]) openDetailModal(ids[0]);
          },
          moreActions,
          bulkDetailSections: ({ ids }) => [
            {
              id: "apps-lifecycle",
              label: "Runtime Launch & Fleet Sync",
              emoji: "🚀",
              description: "Launch or stop selected SxS / Zalo instances and synchronize shortcuts or Drive vault.",
              actions: [
                {
                  key: "launch",
                  label: "Launch Selected",
                  tone: "emerald",
                  disabled: busyAction !== null,
                  onClick: () => {
                    for (const id of ids) {
                      const raw = rawRowsRef.current.find((r) => r.id === id);
                      if (raw?.product === "zalo" && !raw.isRunning) {
                        void runAction("launch-zalo", { id: raw.id, relaunch: false });
                      } else if (raw?.kind === "sxs" && raw.version && !raw.isRunning) {
                        void runAction("launch-sxs", { version: raw.version, relaunch: false });
                      }
                    }
                  },
                },
                {
                  key: "stop",
                  label: "Stop Selected",
                  tone: "rose",
                  disabled: busyAction !== null,
                  onClick: () => {
                    for (const id of ids) {
                      const raw = rawRowsRef.current.find((r) => r.id === id);
                      if (raw?.product === "zalo" && raw.isRunning) {
                        void runAction("stop-zalo", { id: raw.id });
                      } else if (raw?.kind === "sxs" && raw.version && raw.isRunning) {
                        void runAction("stop-sxs", { version: raw.version });
                      }
                    }
                  },
                },
                {
                  key: "repair-shortcuts",
                  label: "Repair Zalo Shortcuts",
                  tone: "sky",
                  disabled: busyAction !== null,
                  onClick: () => void runAction("repair-zalo-shortcuts", { createStartMenu: true }),
                },
                {
                  key: "clean-zalo-cache",
                  label: zaloCleanableSummary ? `Clean Zalo Cache (${zaloCleanableSummary})` : "Clean Zalo Cache",
                  tone: "sky",
                  disabled: busyAction !== null,
                  onClick: () => {
                    const zaloIds = ids.filter((id) => rawRowsRef.current.some((r) => r.id === id && r.product === "zalo"));
                    void runAction("clean-zalo-cache", zaloIds.length > 0 ? { instanceIds: zaloIds } : {});
                  },
                },
                {
                  key: "sync-drive",
                  label: driveVaultSync ? `Sync Drive (${driveVaultSync.syncedCount})` : "Sync Drive (JB0006)",
                  tone: "indigo",
                  disabled: busyAction !== null || driveVaultSync?.status === "running",
                  onClick: () => void runAction("sync-drive-vault"),
                },
                {
                  key: "restore-theme",
                  label: "Restore Stock Theme",
                  tone: "amber",
                  disabled: busyAction !== null,
                  onClick: () => {
                    const sxsRows = ids
                      .map((id) => rawRowsRef.current.find((r) => r.id === id))
                      .filter((r) => r?.kind === "sxs" && r.version);
                    if (sxsRows.length === 0) {
                      void runAction("theme-restore");
                      return;
                    }
                    for (const row of sxsRows) {
                      void runAction("theme-restore", { version: row?.version });
                    }
                  },
                },
              ],
            },
          ],
        }}
      />
      {detailRow ? (
        <AppVersionDetailModal
          row={detailRow}
          releases={releases}
          cursorReleases={cursorReleases}
          driveVaultSync={driveVaultSync}
          themeMod={themeMod}
          busyAction={busyAction}
          onAction={runAction}
          onRefreshReleases={refreshFeed}
          onClose={() => setDetailId(null)}
        />
      ) : null}
    </>
  );
}
