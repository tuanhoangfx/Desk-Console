import {
  HubDirectoryCardCheckbox,
  HubDirectoryCardHeader,
  HubDirectoryCardMetaRow,
  HubDirectoryCardShell,
  HubDirectoryTimestampTooltipCell,
  HubUsersStatusLabel,
} from "@tool-workspace/hub-ui";
import type { DeskRow } from "./DeskDirectoryTable";

type Props = {
  row: DeskRow;
  selected: boolean;
  onToggleSelect: (id: string) => void;
};

export function DeskDirectoryCard({ row, selected, onToggleSelect }: Props) {
  return (
    <HubDirectoryCardShell selected={selected} className="p-4 pr-10">
      <HubDirectoryCardCheckbox
        checked={selected}
        label={`Select ${row.name}`}
        onChange={() => onToggleSelect(row.id)}
      />
      <HubDirectoryCardHeader title={row.name} className="mb-2 pr-6" />
      <div className="space-y-1.5 text-sm text-[var(--muted)]">
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
