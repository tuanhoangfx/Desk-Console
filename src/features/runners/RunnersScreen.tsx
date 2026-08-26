import { useCallback, useRef } from "react";
import { PlayCircle } from "lucide-react";
import { emitHubAppLog } from "@tool-workspace/hub-ui";
import { deskApi, type RunnerRow } from "../../lib/api";
import { useDeskLive } from "../../lib/use-desk-live";
import { DeskDirectoryScreen } from "../desk/DeskDirectoryScreen";
import type { DeskRow } from "../desk/DeskDirectoryTable";

function toRow(row: RunnerRow): DeskRow {
  return {
    id: row.id,
    name: `${row.code} · ${row.name}`,
    status: row.up ? "Up" : "Down",
    extra: `${row.kind} :${row.port}`,
    updated: row.url,
    updatedKind: "text",
    statusTone: row.up ? "online" : "off",
  };
}

export function RunnersScreen({ tabActive = true }: { tabActive?: boolean }) {
  const rawRef = useRef<RunnerRow[]>([]);
  const load = useCallback(async () => {
    const data = await deskApi.runners();
    rawRef.current = data.rows;
    return rawRef.current.map(toRow);
  }, []);
  const { rows, refresh } = useDeskLive(load, { scope: "runners", intervalMs: 8000, tabActive });

  const codesOf = (ids: string[]) =>
    ids.map((id) => rawRef.current.find((r) => r.id === id)?.code).filter((c): c is string => Boolean(c));

  const run = (ids: string[], mode: "start" | "restart" | "recover") => {
    void Promise.all(codesOf(ids).map((c) => deskApi.runnerAction(c, mode))).then(() => {
      emitHubAppLog({ scope: "P0001", screen: "runners", kind: "update", message: `${mode} ${ids.length} runner(s)` });
      return refresh();
    });
  };

  return (
    <DeskDirectoryScreen
      screen="runners"
      tabActive={tabActive}
      showPeriod={false}
      title="Runners"
      titleIcon={PlayCircle}
      titleIconClass="text-amber-300"
      sectionRuleLabel="Runners"
      rows={rows}
      bulkActions={[
        { label: "Start", tone: "emerald", onClick: (ids) => run(ids, "start") },
        { label: "Restart", tone: "amber", onClick: (ids) => run(ids, "restart") },
        { label: "Recover", tone: "neutral", onClick: (ids) => run(ids, "recover") },
      ]}
    />
  );
}
