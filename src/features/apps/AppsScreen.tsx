import { useCallback, useMemo, useRef, useState } from "react";
import { HubBulkActionButton, emitHubAppLog, useHubToast } from "@tool-workspace/hub-ui";
import {
  deskApi,
  type ManagedAppReleaseItem,
  type ManagedAppRow,
  type ManagedAppsResponse,
} from "../../lib/api";
import { useDeskTabActive } from "../../lib/desk-active-screen";
import { useDeskLive } from "../../lib/use-desk-live";
import { navScreenChrome } from "../../lib/nav-structure";
import { DeskDirectoryScreen } from "../desk/DeskDirectoryScreen";
import { appendDeskOpsLog, DeskOpsRuntimeRail } from "../desk/DeskOpsRuntimeRail";
import { useDeskOpsFocus } from "../desk/use-desk-ops-focus";
import type { DeskRow } from "../desk/desk-directory-cells";
import { AppVersionDetailModal } from "./AppVersionDetailModal";

function productLabel(row: ManagedAppRow): string {
  if (row.kind === "sxs") return "Antigravity SxS";
  if (row.product === "antigravity") return "Antigravity";
  if (row.product === "cursor") return "Cursor";
  return "Claude Code";
}

function toDeskRow(row: ManagedAppRow): DeskRow {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    extra: row.detail,
    log: row.log,
    project: productLabel(row),
    pinned: row.updatePinned,
    createdAt: row.createdAt || row.updated,
    updated: row.updated,
    opsKind: row.kind === "sxs" ? "runner" : undefined,
    opsUp: Boolean(row.isRunning),
  };
}

export function AppsScreen() {
  const tabActive = useDeskTabActive("apps");
  const toast = useHubToast();
  const rawRowsRef = useRef<ManagedAppRow[]>([]);
  const [releases, setReleases] = useState<ManagedAppReleaseItem[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());

  const applyResponse = useCallback((res: ManagedAppsResponse | undefined): DeskRow[] => {
    if (!res) return rawRowsRef.current.map(toDeskRow);
    rawRowsRef.current = Array.isArray(res.rows) ? res.rows : [];
    if (Array.isArray(res.releases) && res.releases.length > 0) {
      setReleases(res.releases);
    }
    return rawRowsRef.current.map(toDeskRow);
  }, []);

  const load = useCallback(async () => {
    const res = await deskApi.appsVersions({ releases: releases.length === 0 });
    return applyResponse(res);
  }, [applyResponse, releases.length]);

  const { rows, refresh } = useDeskLive(load, {
    scope: "apps",
    intervalMs: 15_000,
    screenId: "apps",
    initialRows: () => rawRowsRef.current.map(toDeskRow),
    rowStableKey: (row) => `${row.id}:${row.status}:${row.extra}:${row.pinned ? 1 : 0}`,
  });

  const { focusedId, setFocusedId } = useDeskOpsFocus(rows, tabActive);
  const focusedLabel = useMemo(() => rows.find((r) => r.id === focusedId)?.name, [focusedId, rows]);
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
      if (!raw || raw.kind !== "sxs" || !raw.version) {
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

  const opsHandlers = useMemo(
    () => ({
      onRun: runOne,
      onFocus: setFocusedId,
      pendingIds,
    }),
    [pendingIds, runOne, setFocusedId],
  );

  const { icon, iconClass } = navScreenChrome("apps");

  return (
    <>
      <DeskDirectoryScreen
        screen="apps"
        tabActive={tabActive}
        showPeriod={false}
        title="Apps"
        titleIcon={icon}
        titleIconClass={iconClass}
        sectionRuleLabel="Apps & Versions"
        rows={rows}
        onRowFocus={(id) => {
          setFocusedId(id);
          setDetailId(id);
        }}
        opsHandlers={opsHandlers}
        toolbarActions={
          <div className="flex flex-wrap items-center gap-1.5">
            <HubBulkActionButton
              icon={<span className="inline-flex text-[13px] leading-none" aria-hidden>🛡️</span>}
              label="Lock & Purge Updates"
              title="Pin Antigravity & Cursor auto-updates OFF and lock pending folder ACL"
              tone="emerald"
              variant="filled"
              disabled={busyAction !== null}
              onClick={() =>
                void runAction("pin-updates", {
                  pin: true,
                  purgePending: true,
                  lockCursor: true,
                  hardLockAcl: true,
                })
              }
            />
            <HubBulkActionButton
              icon={<span className="inline-flex text-[13px] leading-none" aria-hidden>🔄</span>}
              label="Refresh Feed"
              title="Re-scan installed app versions, SxS builds, and GCS Antigravity releases"
              tone="sky"
              variant="filled"
              disabled={busyAction !== null}
              onClick={() => void refreshFeed(true)}
            />
          </div>
        }
        sideRail={
          <DeskOpsRuntimeRail
            kind="runner"
            targetId={focusedId}
            targetLabel={focusedLabel}
            tabActive={tabActive}
          />
        }
        bulkActions={[
          {
            label: "Launch SxS",
            tone: "emerald",
            onClick: (ids) => {
              for (const id of ids) {
                const raw = rawRowsRef.current.find((r) => r.id === id);
                if (raw?.kind === "sxs" && raw.version && !raw.isRunning) {
                  void runAction("launch-sxs", { version: raw.version, relaunch: false });
                }
              }
            },
          },
          {
            label: "Stop SxS",
            tone: "amber",
            onClick: (ids) => {
              for (const id of ids) {
                const raw = rawRowsRef.current.find((r) => r.id === id);
                if (raw?.kind === "sxs" && raw.version && raw.isRunning) {
                  void runAction("stop-sxs", { version: raw.version });
                }
              }
            },
          },
          {
            label: "Lock Updates",
            tone: "emerald",
            onClick: () =>
              void runAction("pin-updates", {
                pin: true,
                purgePending: true,
                lockCursor: true,
                hardLockAcl: true,
              }),
          },
          {
            label: "Detail",
            onClick: (ids) => {
              if (ids[0]) {
                setFocusedId(ids[0]);
                setDetailId(ids[0]);
              }
            },
          },
        ]}
      />
      {detailRow ? (
        <AppVersionDetailModal
          row={detailRow}
          releases={releases}
          busyAction={busyAction}
          onAction={runAction}
          onRefreshReleases={refreshFeed}
          onClose={() => setDetailId(null)}
        />
      ) : null}
    </>
  );
}
