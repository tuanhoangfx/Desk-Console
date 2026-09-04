import {
  HubDirectoryCardCheckbox,
  HubDirectoryCardHeader,
  HubDirectoryCardMetaRow,
  HubDirectoryCardShell,
  HubDirectoryTimestampTooltipCell,
  HubUsersStatusLabel,
  compactIconSize,
} from "@tool-workspace/hub-ui";
import { Play, Square } from "lucide-react";
import type { DeskOpsCellHandlers } from "./desk-directory-cells";
import type { DeskRow } from "./DeskDirectoryTable";

type Props = {
  row: DeskRow;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  opsHandlers?: DeskOpsCellHandlers;
};

export function DeskDirectoryCard({ row, selected, onToggleSelect, opsHandlers }: Props) {
  const running = row.opsKind === "runner" && row.opsUp === true;

  return (
    <HubDirectoryCardShell selected={selected} className="p-4 pr-10">
      <HubDirectoryCardCheckbox
        checked={selected}
        label={`Select ${row.name}`}
        onChange={() => onToggleSelect(row.id)}
      />
      <HubDirectoryCardHeader title={row.name} className="mb-2 pr-6" />
      <div className="space-y-1.5 text-sm text-[var(--muted)]">
        {opsHandlers ? (
          <HubDirectoryCardMetaRow emoji="▶️">
            {running && opsHandlers.onStop ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 text-rose-300"
                onClick={() => {
                  opsHandlers.onFocus?.(row.id);
                  opsHandlers.onStop?.(row.id);
                }}
              >
                <Square size={compactIconSize(11)} fill="currentColor" aria-hidden />
                Stop
              </button>
            ) : (
              <button
                type="button"
                className="inline-flex items-center gap-1 text-emerald-300"
                onClick={() => {
                  opsHandlers.onFocus?.(row.id);
                  opsHandlers.onRun(row.id);
                }}
              >
                <Play size={compactIconSize(11)} fill="currentColor" aria-hidden />
                Run
              </button>
            )}
          </HubDirectoryCardMetaRow>
        ) : null}
        <HubDirectoryCardMetaRow emoji="🚦">
          <HubUsersStatusLabel label={row.status} tone={row.statusTone ?? "active"} />
        </HubDirectoryCardMetaRow>
        {row.extra ? <HubDirectoryCardMetaRow emoji="📝">{row.extra}</HubDirectoryCardMetaRow> : null}
        <HubDirectoryCardMetaRow emoji="🕒">
          {row.updatedKind === "text" ? (
            <span className="truncate">{row.updated || "—"}</span>
          ) : (
            <HubDirectoryTimestampTooltipCell at={row.updated} title="Updated" />
          )}
        </HubDirectoryCardMetaRow>
      </div>
    </HubDirectoryCardShell>
  );
}
