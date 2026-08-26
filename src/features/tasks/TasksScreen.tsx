import { useCallback } from "react";
import { CalendarClock, Eraser } from "lucide-react";
import { HubBulkActionButton, emitHubAppLog } from "@tool-workspace/hub-ui";
import { deskApi, type TaskRow } from "../../lib/api";
import { pushDeskNotifyAlert } from "../../lib/desk-notify";
import { useDeskLive } from "../../lib/use-desk-live";
import { DeskDirectoryScreen } from "../desk/DeskDirectoryScreen";
import type { DeskRow } from "../desk/DeskDirectoryTable";

function toRow(row: TaskRow): DeskRow {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    extra: `last ${row.lastResult || "—"}`,
    updated: row.lastRun || row.nextRun || "",
    statusTone: /ready|running/i.test(row.status) ? "online" : "idle",
  };
}

export function TasksScreen({ tabActive = true }: { tabActive?: boolean }) {
  const load = useCallback(async () => {
    const data = await deskApi.tasks();
    return data.rows.map(toRow);
  }, []);
  const { rows, refresh } = useDeskLive(load, { scope: "tasks", intervalMs: 8000, tabActive });

  return (
    <DeskDirectoryScreen
      screen="tasks"
      tabActive={tabActive}
      showPeriod={false}
      title="Tasks"
      titleIcon={CalendarClock}
      titleIconClass="text-indigo-300"
      sectionRuleLabel="Tasks"
      rows={rows}
      toolbarActions={
        <HubBulkActionButton
          icon={<Eraser size={14} />}
          label="Cursor GC"
          title="Purge hidden Cursor chat blobs"
          tone="amber"
          onClick={() => {
            void deskApi
              .cursorGc(true)
              .then(() => {
                emitHubAppLog({ scope: "P0001", screen: "tasks", kind: "update", message: "Started Cursor GC" });
                pushDeskNotifyAlert({
                  id: "cursor-gc",
                  severity: "ok",
                  label: "Cursor GC started",
                  detail: "Detached purge runner. Cursor should be closed first.",
                });
              })
              .catch((error) => {
                pushDeskNotifyAlert({
                  id: "cursor-gc",
                  severity: "warn",
                  label: "Cursor GC blocked",
                  detail: error instanceof Error ? error.message : String(error),
                });
              });
          }}
        />
      }
      bulkActions={[
        { label: "Run", tone: "emerald", onClick: (ids) => void Promise.all(ids.map((id) => deskApi.taskAction(id, "run"))).then(() => refresh()) },
        { label: "Disable", tone: "neutral", onClick: (ids) => void Promise.all(ids.map((id) => deskApi.taskAction(id, "disable"))).then(() => refresh()) },
      ]}
    />
  );
}
