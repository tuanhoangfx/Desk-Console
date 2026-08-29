import { useCallback } from "react";
import { CalendarClock } from "lucide-react";
import { emitHubAppLog } from "@tool-workspace/hub-ui";
import { deskApi, type TaskRow } from "../../lib/api";
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
      bulkActions={[
        {
          label: "Run",
          tone: "emerald",
          onClick: (ids) =>
            void Promise.all(ids.map((id) => deskApi.taskAction(id, "run"))).then(() => {
              emitHubAppLog({ scope: "P0001", screen: "tasks", kind: "update", message: `Run ${ids.length} task(s)` });
              return refresh();
            }),
        },
        { label: "Disable", tone: "neutral", onClick: (ids) => void Promise.all(ids.map((id) => deskApi.taskAction(id, "disable"))).then(() => refresh()) },
      ]}
    />
  );
}
