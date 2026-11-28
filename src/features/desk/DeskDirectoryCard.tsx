import {
  HubDirectoryCardCheckbox,
  HubDirectoryCardHeader,
  HubDirectoryCardMetaRow,
  HubDirectoryInteractiveCard,
  HubDirectoryTimestampTooltipCell,
  compactIconSize,
} from "@tool-workspace/hub-ui";
import { Play, Square } from "lucide-react";
import type { DeskOpsCellHandlers } from "./desk-directory-cells";
import type { DeskRow } from "./DeskDirectoryTable";
import { deskStatusKpiEmoji } from "./desk-directory-stickers";

type Props = {
  row: DeskRow;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onOpenDetail?: (id: string) => void;
  opsHandlers?: DeskOpsCellHandlers;
};

export function DeskDirectoryCard({
  row,
  selected,
  onToggleSelect,
  onOpenDetail,
  opsHandlers,
}: Props) {
  const running = row.opsKind === "runner" && row.opsUp === true;

  return (
    <HubDirectoryInteractiveCard
      variant="grid"
      selected={selected}
      ariaLabel={`Open ${row.name}`}
      onActivate={() => onOpenDetail?.(row.id)}
    >
      <HubDirectoryCardCheckbox
        checked={selected}
        label={`Select ${row.name}`}
        onChange={() => onToggleSelect(row.id)}
      />
      <div className="flex flex-1 flex-col p-4 pr-10">
        <HubDirectoryCardHeader title={row.name} className="mb-2 pr-6" />
        <div className="space-y-1.5 text-sm text-[var(--muted)]">
          {opsHandlers ? (
            <HubDirectoryCardMetaRow emoji="▶️">
              {running && opsHandlers.onStop ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-rose-300"
                  onClick={(e) => {
                    e.stopPropagation();
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
                  onClick={(e) => {
                    e.stopPropagation();
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
          <HubDirectoryCardMetaRow emoji={deskStatusKpiEmoji(row.status)}>
            {row.status}
          </HubDirectoryCardMetaRow>
          {row.extra ? <HubDirectoryCardMetaRow emoji="📝">{row.extra}</HubDirectoryCardMetaRow> : null}
          <HubDirectoryCardMetaRow emoji="🕒">
            <HubDirectoryTimestampTooltipCell at={row.updated} title="Update" />
          </HubDirectoryCardMetaRow>
        </div>
      </div>
    </HubDirectoryInteractiveCard>
  );
}
