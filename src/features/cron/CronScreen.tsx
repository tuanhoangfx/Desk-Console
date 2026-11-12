import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Play, PowerOff } from "lucide-react";
import {
  emitHubAppLog,
  useHubToast,
  type HubDirectoryBulkMoreAction,
  type HubRichToastInput,
  type HubUsersStatusTone,
} from "@tool-workspace/hub-ui";
import { deskApi, type TaskRow } from "../../lib/api";
import { navScreenChrome } from "../../lib/nav-structure";
import { DeskDirectoryScreen } from "../desk/DeskDirectoryScreen";
import { DeskOpsRuntimeRail, appendDeskOpsLog } from "../desk/DeskOpsRuntimeRail";
import type { DeskOpsAction, DeskOpsCellHandlers, DeskRow } from "../desk/DeskDirectoryTable";
import { CronCreateModal } from "./CronCreateModal";
import { CronDetailModal, type CronUpdatePayload } from "./CronDetailModal";

const POLL_ACTIVE_MS = 10_000;
const POLL_IDLE_MS = 45_000;
const ACTION_SETTLE_MS = 2_500;

function taskStatusTone(status: string): HubUsersStatusTone {
  if (/active|ready/i.test(status)) return "online";
  if (/running|starting/i.test(status)) return "active";
  if (/disabled/i.test(status)) return "idle";
  return "offline";
}

function parseTaskRunIso(raw: string): string {
  if (!raw || raw === "N/A" || raw === "—") return "";
  const vnMatch = raw.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})(?:\s*(SA|CH|AM|PM))?$/i,
  );
  if (vnMatch) {
    let day = Number(vnMatch[1]);
    let month = Number(vnMatch[2]);
    const year = Number(vnMatch[3]);
    if (year < 2005) return "";
    let hour = Number(vnMatch[4]);
    const min = Number(vnMatch[5]);
    const sec = Number(vnMatch[6]);
    const mer = String(vnMatch[7] || "").toUpperCase();
    if (!mer && day <= 12 && month > 12) {
      const tmp = day;
      day = month;
      month = tmp;
    }
    if ((mer === "CH" || mer === "PM") && hour < 12) hour += 12;
    if ((mer === "SA" || mer === "AM") && hour === 12) hour = 0;
    const d = new Date(year, month - 1, day, hour, min, sec);
    if (!Number.isNaN(d.getTime()) && d.getFullYear() >= 2005) return d.toISOString();
  }
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime()) && parsed.getFullYear() >= 2005) return parsed.toISOString();
  return "";
}

function taskToDeskRow(
  row: TaskRow,
  inFlight?: { action: DeskOpsAction; startedAt: number },
): DeskRow {
  const isDaemon = row.kind === "daemon" || /^Daemon-/i.test(row.id);
  const rawStatus = String(row.status || "Active").trim();
  const normalizedStatus = /^ready$/i.test(rawStatus) ? "Active" : rawStatus;
  const status =
    inFlight?.action === "starting"
      ? "Starting"
      : inFlight?.action === "stopping"
        ? "Stopping"
        : normalizedStatus;
  const iso = row.lastRunIso || parseTaskRunIso(row.lastRun);
  const engineTag = isDaemon ? "Host Daemon" : "Task Scheduler";
  const scheduleCycle = row.schedule || row.nextRun || "Scheduled";
  const detailText = row.description || row.nextRun || scheduleCycle;
  const telemetryPrefix = [
    row.lastDurationMs != null ? `${row.lastDurationMs}ms` : "",
    row.lastFreedMb != null && row.lastFreedMb > 0 ? `${row.lastFreedMb} MB freed` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    id: row.id,
    name: row.name,
    project: engineTag,
    schedule: scheduleCycle,
    status,
    statusTone: inFlight
      ? inFlight.action === "stopping"
        ? "idle"
        : "active"
      : taskStatusTone(normalizedStatus),
    extra: `task · ${engineTag} · ${telemetryPrefix ? `${telemetryPrefix} · ` : ""}${detailText}`,
    log: row.lastSummary || (telemetryPrefix ? `${telemetryPrefix} · ${detailText}` : detailText),
    activityLog: row.activityLog,
    updated: iso || "—",
    updatedKind: iso ? "activity" : "text",
    createdAt: row.createdAt || "2026-10-15T00:00:00.000Z",
    opsKind: "task",
    opsUp: /running/i.test(normalizedStatus),
    opsLastResult: row.lastResult || "0",
    opsAction: inFlight?.action,
    opsActionStartedAt: inFlight?.startedAt,
  };
}

export function CronScreen({ tabActive = true }: { tabActive?: boolean }) {
  const toast = useHubToast();
  const pushToast = useCallback(
    (input: HubRichToastInput) => {
      toast?.pushRichToast(input);
    },
    [toast],
  );
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const [inFlight, setInFlight] = useState<Record<string, { action: DeskOpsAction; startedAt: number }>>({});
  const [, setClockTick] = useState(0);
  const selectedRef = useRef<string | null>(null);
  selectedRef.current = selectedId;

  const load = useCallback(async () => {
    try {
      const next = await deskApi.listTasks();
      setTasks(next);
      if (!selectedRef.current && next[0]) setSelectedId(next[0].id);
    } catch (error) {
      pushToast({
        type: "error",
        title: "Cron",
        message: error instanceof Error ? error.message : "Load failed",
      });
    }
  }, [pushToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const hasInFlight = Object.keys(inFlight).length > 0;

  useEffect(() => {
    if (!tabActive) return;
    const ms = hasInFlight ? 2_500 : document.visibilityState === "visible" ? POLL_ACTIVE_MS : POLL_IDLE_MS;
    const timer = window.setInterval(() => void load(), ms);
    return () => window.clearInterval(timer);
  }, [hasInFlight, load, tabActive]);

  useEffect(() => {
    if (!tabActive || !hasInFlight) return;
    const id = window.setInterval(() => setClockTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [hasInFlight, tabActive]);

  const rows = useMemo(
    () => tasks.map((row) => taskToDeskRow(row, inFlight[row.id])),
    [inFlight, tasks],
  );

  const selectedRow = useMemo(
    () => tasks.find((row) => row.id === selectedId) ?? null,
    [selectedId, tasks],
  );
  const detailRow = useMemo(
    () => tasks.find((row) => row.id === detailId) ?? null,
    [detailId, tasks],
  );

  const withPending = useCallback(async (id: string, fn: () => Promise<void>) => {
    setPendingIds((prev) => new Set(prev).add(id));
    try {
      await fn();
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, []);

  const runCronById = useCallback(
    (id: string) => {
      setSelectedId(id);
      setInFlight((prev) => ({ ...prev, [id]: { action: "starting", startedAt: Date.now() } }));
      appendDeskOpsLog("info", `Running cron ${id}…`, "task");
      void withPending(id, async () => {
        try {
          await deskApi.runTask(id);
          appendDeskOpsLog("success", `Cron ${id} executed`, "task");
          pushToast({ type: "success", title: id, message: "Cron task triggered" });
          await load();
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Run failed";
          appendDeskOpsLog("error", `${id}: ${msg}`, "task");
          pushToast({ type: "error", title: id, message: msg });
        } finally {
          window.setTimeout(() => {
            setInFlight((prev) => {
              const next = { ...prev };
              delete next[id];
              return next;
            });
          }, ACTION_SETTLE_MS);
        }
      });
    },
    [load, pushToast, withPending],
  );

  const toggleCronEnabled = useCallback(
    (id: string, enable: boolean) => {
      setSelectedId(id);
      appendDeskOpsLog("info", `${enable ? "Enabling" : "Disabling"} cron ${id}…`, "task");
      void withPending(id, async () => {
        try {
          await deskApi.setTaskEnabled(id, enable);
          appendDeskOpsLog("success", `Cron ${id} ${enable ? "enabled" : "disabled"}`, "task");
          pushToast({
            type: "success",
            title: id,
            message: enable ? "Cron enabled" : "Cron disabled",
          });
          await load();
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Toggle failed";
          appendDeskOpsLog("error", `${id}: ${msg}`, "task");
          pushToast({ type: "error", title: id, message: msg });
        }
      });
    },
    [load, pushToast, withPending],
  );

  const updateCronTask = useCallback(
    async (id: string, payload: CronUpdatePayload) => {
      setSelectedId(id);
      appendDeskOpsLog("info", `Updating cron ${id}…`, "task");
      await withPending(id, async () => {
        try {
          const res = await deskApi.updateTask(id, payload);
          const schedSummary = res.task?.schedule || payload.scheduleLabel || "updated";
          appendDeskOpsLog("success", `Cron ${id} saved (${schedSummary})`, "task");
          emitHubAppLog({
            scope: "P0001",
            screen: "cron",
            kind: "update",
            message: `Updated cron ${id} (${schedSummary})`,
          });
          pushToast({
            type: "success",
            title: id,
            message: `Schedule & status saved (${schedSummary})`,
          });
          await load();
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Update failed";
          appendDeskOpsLog("error", `${id}: ${msg}`, "task");
          pushToast({ type: "error", title: id, message: msg });
          throw error;
        }
      });
    },
    [load, pushToast, withPending],
  );

  const opsHandlers = useMemo<DeskOpsCellHandlers>(
    () => ({
      onFocus: (id: string) => setSelectedId(id),
      onRun: runCronById,
      onDisable: (id: string) => toggleCronEnabled(id, false),
      pendingIds,
    }),
    [pendingIds, runCronById, toggleCronEnabled],
  );

  const runBatch = useCallback(
    async (ids: string[], mode: "run" | "enable" | "disable") => {
      if (ids[0]) setSelectedId(ids[0]);
      for (const id of ids) {
        if (mode === "run") {
          runCronById(id);
        } else {
          toggleCronEnabled(id, mode === "enable");
        }
      }
    },
    [runCronById, toggleCronEnabled],
  );

  const deleteTasks = useCallback(
    async (ids: string[]) => {
      if (!ids.length) return;
      for (const id of ids) {
        try {
          const res = await deskApi.deleteTask(id);
          appendDeskOpsLog(
            "info",
            res.disabledBuiltin
              ? `Daemon ${id} disabled (built-in)`
              : `Deleted scheduled task ${id}`,
            "task",
          );
          emitHubAppLog({
            scope: "P0001",
            screen: "cron",
            kind: "delete",
            message: res.disabledBuiltin ? `Disabled built-in daemon ${id}` : `Deleted cron ${id}`,
          });
        } catch (error) {
          pushToast({
            type: "error",
            title: id,
            message: error instanceof Error ? error.message : "Delete failed",
          });
        }
      }
      await load();
    },
    [load, pushToast],
  );

  const moreActions = useCallback(
    ({ ids, hasSelection }: { ids: string[]; hasSelection: boolean }): HubDirectoryBulkMoreAction[] => [
      {
        key: "run-now",
        label: "Start / Run Now",
        icon: Play,
        disabled: !hasSelection,
        onClick: () => void runBatch(ids, "run"),
      },
      {
        key: "enable",
        label: "Enable Selected",
        icon: CheckCircle2,
        disabled: !hasSelection,
        onClick: () => void runBatch(ids, "enable"),
      },
      {
        key: "disable",
        label: "Disable Selected",
        icon: PowerOff,
        disabled: !hasSelection,
        onClick: () => void runBatch(ids, "disable"),
      },
    ],
    [runBatch],
  );

  const { icon, iconClass } = navScreenChrome("cron");

  return (
    <>
      <DeskDirectoryScreen
        screen="cron"
        title="Cron"
        titleIcon={icon}
        titleIconClass={iconClass}
        sectionRuleLabel="Cron"
        rows={rows}
        tabActive={tabActive}
        showPeriod={false}
        onRowFocus={(id) => {
          setSelectedId(id);
          setDetailId(id);
        }}
        opsHandlers={opsHandlers}
        sideRail={
          <DeskOpsRuntimeRail
            kind="task"
            targetId={selectedId}
            targetLabel={selectedRow?.name}
            tabActive={tabActive}
          />
        }
        crudBulk={{
          newTitle: "New Cron task",
          onNew: () => setCreateOpen(true),
          onDetail: (ids) => {
            if (ids[0]) {
              setSelectedId(ids[0]);
              setDetailId(ids[0]);
            }
          },
          deleteTitle: "Delete custom task or disable built-in daemon",
          deleteLabel: "Delete",
          onDelete: (ids) => void deleteTasks(ids),
          moreActions,
        }}
      />
      <CronCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(name) => {
          setSelectedId(name);
          void load();
        }}
      />
      {detailRow ? (
        <CronDetailModal
          row={detailRow}
          busy={pendingIds.has(detailRow.id)}
          onRun={runCronById}
          onToggleEnable={toggleCronEnabled}
          onUpdate={updateCronTask}
          onClose={() => setDetailId(null)}
        />
      ) : null}
    </>
  );
}
