import { useCallback, useMemo, useRef, useState } from "react";
import { CalendarClock } from "lucide-react";
import { emitHubAppLog } from "@tool-workspace/hub-ui";
import { deskApi, type TaskRow } from "../../lib/api";
import { useDeskLive } from "../../lib/use-desk-live";
import { useDeskTabActive } from "../../lib/desk-active-screen";
import { appendDeskOpsLog, DeskOpsRuntimeRail } from "../desk/DeskOpsRuntimeRail";
import { DeskDirectoryScreen } from "../desk/DeskDirectoryScreen";
import { useDeskOpsFocus } from "../desk/use-desk-ops-focus";
import type { DeskRow } from "../desk/DeskDirectoryTable";
import { TaskDetailModal } from "./TaskDetailModal";

function toRow(row: TaskRow): DeskRow {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    extra: `last ${row.lastResult || "—"}`,
    updated: row.lastRun || row.nextRun || "",
    statusTone: /ready|running/i.test(row.status) ? "online" : "idle",
    opsKind: "task",
    opsLastResult: row.lastResult,
  };
}

export function TasksScreen() {
  const tabActive = useDeskTabActive("tasks");
  const rawRef = useRef<TaskRow[]>([]);
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const load = useCallback(async () => {
    const data = await deskApi.tasks();
    rawRef.current = data.rows;
    return data.rows.map(toRow);
  }, []);
  const { rows, refresh, refreshBurst } = useDeskLive(load, { scope: "tasks", intervalMs: 8000, screenId: "tasks" });
  const { focusedId, setFocusedId } = useDeskOpsFocus(rows, tabActive);
  const focusedLabel = useMemo(() => rows.find((row) => row.id === focusedId)?.name, [focusedId, rows]);
  const detailTask = useMemo(
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
      appendDeskOpsLog(label, "info", "task");
      try {
        await fn();
        await refresh();
        refreshBurst();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        appendDeskOpsLog(`Failed: ${message}`, "error", "task");
        emitHubAppLog({ scope: "P0001", screen: "tasks", kind: "sync", message });
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

  const runOne = useCallback(
    (id: string) => {
      void withPending(id, `run ${id}`, async () => {
        await deskApi.taskAction(id, "run");
        emitHubAppLog({ scope: "P0001", screen: "tasks", kind: "update", message: `run ${id}` });
      });
    },
    [withPending],
  );

  const disableOne = useCallback(
    (id: string) => {
      void withPending(id, `stop ${id}`, async () => {
        await deskApi.taskAction(id, "disable");
        emitHubAppLog({ scope: "P0001", screen: "tasks", kind: "update", message: `disable ${id}` });
      });
    },
    [withPending],
  );

  const openDetail = useCallback(
    (ids: string[]) => {
      const id = ids[0];
      if (!id) return;
      setFocusedId(id);
      setDetailId(id);
    },
    [setFocusedId],
  );

  const opsHandlers = useMemo(
    () => ({
      onRun: runOne,
      onDisable: disableOne,
      onFocus: setFocusedId,
      pendingIds,
    }),
    [disableOne, pendingIds, runOne, setFocusedId],
  );

  return (
    <>
      <DeskDirectoryScreen
        screen="tasks"
        tabActive={tabActive}
        showPeriod={false}
        title="Tasks"
        titleIcon={CalendarClock}
        titleIconClass="text-indigo-300"
        sectionRuleLabel="Tasks"
        rows={rows}
        onRowFocus={handleRowFocus}
        opsHandlers={opsHandlers}
        sideRail={
          <DeskOpsRuntimeRail kind="task" targetId={focusedId} targetLabel={focusedLabel} tabActive={tabActive} />
        }
        bulkActions={[
          {
            label: "Start",
            tone: "emerald",
            onClick: (ids) =>
              void Promise.all(ids.map((id) => deskApi.taskAction(id, "run"))).then(() => {
                appendDeskOpsLog(`start ${ids.length} task(s)`, "info", "task");
                emitHubAppLog({ scope: "P0001", screen: "tasks", kind: "update", message: `Start ${ids.length} task(s)` });
                refreshBurst();
                return refresh();
              }),
          },
          {
            label: "Stop",
            tone: "rose",
            onClick: (ids) =>
              void Promise.all(ids.map((id) => deskApi.taskAction(id, "disable"))).then(() => {
                appendDeskOpsLog(`stop ${ids.length} task(s)`, "info", "task");
                emitHubAppLog({ scope: "P0001", screen: "tasks", kind: "update", message: `Stop ${ids.length} task(s)` });
                return refresh();
              }),
          },
          { label: "Detail", onClick: (ids) => openDetail(ids) },
        ]}
      />
      {detailTask ? <TaskDetailModal row={detailTask} onClose={() => setDetailId(null)} /> : null}
    </>
  );
}
