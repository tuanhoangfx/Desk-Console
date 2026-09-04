import { useCallback, useMemo, useRef, useState } from "react";
import { PlayCircle } from "lucide-react";
import { emitHubAppLog } from "@tool-workspace/hub-ui";
import { deskApi, type RunnerRow } from "../../lib/api";
import { useDeskLive } from "../../lib/use-desk-live";
import { useDeskTabActive } from "../../lib/desk-active-screen";
import { appendDeskOpsLog, DeskOpsRuntimeRail } from "../desk/DeskOpsRuntimeRail";
import { DeskDirectoryScreen } from "../desk/DeskDirectoryScreen";
import { useDeskOpsFocus } from "../desk/use-desk-ops-focus";
import type { DeskRow } from "../desk/DeskDirectoryTable";
import { RunnerDetailModal } from "./RunnerDetailModal";

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

export function RunnersScreen() {
  const tabActive = useDeskTabActive("runners");
  const rawRef = useRef<RunnerRow[]>([]);
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
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

  const handleRowFocus = useCallback(
    (id: string) => {
      setFocusedId(id);
      setDetailId(id);
    },
    [setFocusedId],
  );

  const withPending = useCallback(
    async (id: string, label: string, fn: () => Promise<void>) => {
      setPendingIds((prev) => new Set(prev).add(id));
      setFocusedId(id);
      appendDeskOpsLog(label, "info", "runner");
      try {
        await fn();
        await refresh();
        refreshBurst();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        appendDeskOpsLog(`Failed: ${message}`, "error", "runner");
        emitHubAppLog({ scope: "P0001", screen: "runners", kind: "sync", message });
        throw err;
      } finally {
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [refresh, refreshBurst, setFocusedId],
  );

  const codesOf = (ids: string[]) =>
    ids.map((id) => rawRef.current.find((r) => r.id === id)?.code).filter((c): c is string => Boolean(c));

  const run = (ids: string[], mode: "start" | "restart" | "recover" | "stop") => {
    void Promise.all(
      codesOf(ids).map((c) => deskApi.runnerAction(c, mode === "stop" ? "stop" : mode)),
    ).then(() => {
      appendDeskOpsLog(`${mode} ${ids.length} runner(s)`, "info", "runner");
      emitHubAppLog({ scope: "P0001", screen: "runners", kind: "update", message: `${mode} ${ids.length} runner(s)` });
      refreshBurst();
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
      void withPending(id, `start ${raw.code}`, async () => {
        await deskApi.runnerAction(raw.code, "start");
        emitHubAppLog({ scope: "P0001", screen: "runners", kind: "update", message: `start ${raw.code}` });
      });
    },
    [withPending],
  );

  const stopOne = useCallback(
    (id: string) => {
      const raw = rawRef.current.find((row) => row.id === id);
      if (!raw || !raw.up) return;
      void withPending(id, `stop ${raw.code}`, async () => {
        await deskApi.runnerAction(raw.code, "stop");
        emitHubAppLog({ scope: "P0001", screen: "runners", kind: "update", message: `stop ${raw.code}` });
      });
    },
    [withPending],
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
        rows={rows}
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
