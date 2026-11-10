import { useMemo } from "react";
import { HubAdmNoteLogRails, HubDirectoryReadonlyCopyText, searchTextIncludes, useHubAppLog } from "@tool-workspace/hub-ui";
import { DESK_DETAIL_LOG_SECTION } from "./desk-detail-modal-shell";
import { readDeskOpsLogs } from "./desk-ops-session-log";

type Props = {
  targetId: string;
  note?: string;
};

export function DeskDetailNoteLogRails({ targetId, note = "" }: Props) {
  const { allLogs } = useHubAppLog();
  const needle = targetId.trim();
  const sessionRows = useMemo(() => {
    const fromDesk = readDeskOpsLogs().filter((row) => searchTextIncludes(row.message, needle));
    const fromHub = allLogs.filter((row) => searchTextIncludes(row.message, needle));
    return [...fromDesk, ...fromHub].slice(0, 80);
  }, [allLogs, needle]);

  const logEntries = useMemo(
    () =>
      sessionRows.map((row, index) => ({
        id: row.id ?? `${targetId}-${index}`,
        at: String(row.at),
        message: row.message,
        actor: {
          label: ("channel" in row ? row.channel : row.scope) ?? "desk",
          source: "system" as const,
        },
      })),
    [sessionRows, targetId],
  );

  return (
    <HubAdmNoteLogRails
      noteRail={{ mode: "readonly", note, emptyMessage: "No note for this target." }}
      logEntries={logEntries}
      logId={DESK_DETAIL_LOG_SECTION}
      logEmptyMessage="No actions logged for this target yet."
    />
  );
}
