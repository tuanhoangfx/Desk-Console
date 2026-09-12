import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PlayCircle } from "lucide-react";
import { emitHubAppLog } from "@tool-workspace/hub-ui";
import { deskApi, type RunnerRow } from "../../lib/api";
import { useDeskLive } from "../../lib/use-desk-live";
import { useDeskTabActive } from "../../lib/desk-active-screen";
import { appendDeskOpsLog, DeskOpsRuntimeRail } from "../desk/DeskOpsRuntimeRail";
import { DeskDirectoryScreen } from "../desk/DeskDirectoryScreen";
import { useDeskOpsFocus } from "../desk/use-desk-ops-focus";
import type { DeskOpsAction, DeskRow } from "../desk/desk-directory-cells";
import { RunnerDetailModal } from "./RunnerDetailModal";

const ACTION_TIMEOUT_MS = 120_000;

type ActionPhase = { kind: DeskOpsAction; at: number };

function runnerLabel(row: RunnerRow): string {
  if (row.kind === "worker") return `${row.code} · host API :${row.port}`;
  return `${row.code} · UI :${row.port}`;
}

function toRow(row: RunnerRow): DeskRow {
  return {
    id: row.id,
    name: runnerLabel(row),
    status: row.up ? "Up" : "Down",
    extra: row.kind === "worker" ? "host API" : `vite :${row.port}`,
    updated: row.url,
    updatedKind: "text",
    statusTone: row.up ? "online" : "off",
    opsKind: "runner",
    opsUp: row.up,
  };
}

function withActionOverlay(row: DeskRow, phase: ActionPhase | undefined): DeskRow {
  if (!phase) return row;
  if (phase.kind === "starting") {
    return {
      ...row,
      status: "Starting",
      statusTone: "active",
      opsAction: "starting",
      opsActionStartedAt: phase.at,
    };
  }
  return {
    ...row,
    status: "Stopping",
    statusTone: "idle",
    opsAction: "stopping",
    opsActionStartedAt: phase.at,
  };
}

export function RunnersScreen() {
  const tabActive = useDeskTabActive("runners");
  const rawRef = useRef<RunnerRow[]>([]);
  const [phases, setPhases] = useState<Map<string, ActionPhase>>(() => new Map());
  const [elapsedTick, setElapsedTick] = useState(0);
  const [detailId, setDetailId] = useState<string | null>(null);
  const load = useCallback(async () => {
    const data = await deskApi.runners();
    rawRef.current = data.rows;
    return rawRef.current.map(toRow);
  }, []);
  const { rows, refresh, refreshBurst } = useDeskLive(load, {
    scope: "runners",
    intervalMs: 8000,
    screenId: "runners",
    rowStableKey: (row) => `${row.id}:${row.opsUp}:${row.status}`,
  });
  const { focusedId, setFocusedId } = useDeskOpsFocus(rows, tabActive);
  const focusedLabel = useMemo(() => rows.find((row) => row.id === focusedId)?.name, [focusedId, rows]);
  const detailRunner = useMemo(
    () => rawRef.current.find((row) => row.id === detailId) ?? null,
    [detailId, rows],
  );

  useEffect(() => {
    if (phases.size === 0) return;
    const timer = window.setInterval(() => setElapsedTick((n) => n + 1), 1000);
    return () => window.clearInterval(timer);
  }, [phases.size]);

  useEffect(() => {
    if (phases.size === 0) return;
    setPhases((prev) => {
      let changed = false;
      const next = new Map(prev);
      const now = Date.now();
      for (const [id, phase] of prev) {
        const row = rows.find((r) => r.id === id);
        if (!row) continue;
        if (phase.kind === "starting" && row.opsUp === true) {
          next.delete(id);
          changed = true;
          continue;
        }
        if (phase.kind === "stopping" && row.opsUp !== true) {
          next.delete(id);
          changed = true;
          continue;
        }
        if (now - phase.at >= ACTION_TIMEOUT_MS) {
          next.delete(id);
          changed = true;
          appendDeskOpsLog(
            `${phase.kind === "starting" ? "Start" : "Stop"} timed out after 2m (${id})`,
            "error",
            "runner",
          );
        }
      }
      return changed ? next : prev;
    });
  }, [rows, phases.size]);

  const displayRows = useMemo(
    () => rows.map((row) => withActionOverlay(row, phases.get(row.id))),
    // elapsedTick forces Running mm:ss re-render each second while phases active
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tick is intentional clock
    [rows, phases, elapsedTick],
  );

  const pendingIds = useMemo(() => new Set(phases.keys()), [phases]);

  const handleRowFocus = useCallback(
    (id: string) => {
      setFocusedId(id);
      setDetailId(id);
    },
    [setFocusedId],
  );

  const beginPhase = useCallback((id: string, kind: DeskOpsAction) => {
    setPhases((prev) => {
      const next = new Map(prev);
      next.set(id, { kind, at: Date.now() });
      return next;
    });
  }, []);

  const withAction = useCallback(
    async (id: string, kind: DeskOpsAction, label: string, fn: () => Promise<void>) => {
      beginPhase(id, kind);
      setFocusedId(id);
      appendDeskOpsLog(label, "info", "runner");
      try {
        await fn();
        await refresh();
        // Fast poll until probe flips Up/Down (API returns on spawn, not readiness).
        refreshBurst(90_000, 1500);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        appendDeskOpsLog(`Failed: ${message}`, "error", "runner");
        emitHubAppLog({ scope: "P0001", screen: "runners", kind: "sync", message });
        setPhases((prev) => {
          const map = new Map(prev);
          map.delete(id);
          return map;
        });
        throw err;
      }
    },
    [beginPhase, refresh, refreshBurst, setFocusedId],
  );

  const codesOf = (ids: string[]) =>
    ids.map((id) => rawRef.current.find((r) => r.id === id)?.code).filter((c): c is string => Boolean(c));

  const run = (ids: string[], mode: "start" | "restart" | "recover" | "stop") => {
    const kind: DeskOpsAction = mode === "stop" ? "stopping" : "starting";
    for (const id of ids) beginPhase(id, kind);
    void Promise.all(codesOf(ids).map((c) => deskApi.runnerAction(c, mode === "stop" ? "stop" : mode))).then(() => {
      appendDeskOpsLog(`${mode} ${ids.length} runner(s)`, "info", "runner");
      emitHubAppLog({ scope: "P0001", screen: "runners", kind: "update", message: `${mode} ${ids.length} runner(s)` });
      refreshBurst(90_000, 1500);
      return refresh();
    });
  };

  const openDetail = useCallback(
    (ids: string[]) => {
      const id = ids[0];
      if (!id) return;
      setFocusedId(id);
      setDetailId(id);
    },
    [setFocusedId],
  );

  const runOne = useCallback(
    (id: string) => {
      const raw = rawRef.current.find((row) => row.id === id);
      if (!raw || raw.up) return;
      void withAction(id, "starting", `start ${raw.code}`, async () => {
        await deskApi.runnerAction(raw.code, "start");
        emitHubAppLog({ scope: "P0001", screen: "runners", kind: "update", message: `start ${raw.code}` });
      });
    },
    [withAction],
  );

  const stopOne = useCallback(
    (id: string) => {
      const raw = rawRef.current.find((row) => row.id === id);
      if (!raw || !raw.up) return;
      void withAction(id, "stopping", `stop ${raw.code}`, async () => {
        await deskApi.runnerAction(raw.code, "stop");
        emitHubAppLog({ scope: "P0001", screen: "runners", kind: "update", message: `stop ${raw.code}` });
      });
    },
    [withAction],
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

  return (
    <>
      <DeskDirectoryScreen
        screen="runners"
        tabActive={tabActive}
        showPeriod={false}
        title="Runners"
        titleIcon={PlayCircle}
        titleIconClass="text-amber-300"
        sectionRuleLabel="Runners"
        rows={displayRows}
        onRowFocus={handleRowFocus}
        opsHandlers={opsHandlers}
        sideRail={
          <DeskOpsRuntimeRail kind="runner" targetId={focusedId} targetLabel={focusedLabel} tabActive={tabActive} />
        }
        bulkActions={[
          { label: "Start", tone: "emerald", onClick: (ids) => run(ids, "start") },
          { label: "Stop", tone: "rose", onClick: (ids) => run(ids, "stop") },
          { label: "Restart", tone: "amber", onClick: (ids) => run(ids, "restart") },
          { label: "Detail", onClick: (ids) => openDetail(ids) },
        ]}
      />
      {detailRunner ? <RunnerDetailModal row={detailRunner} onClose={() => setDetailId(null)} /> : null}
    </>
  );
}
