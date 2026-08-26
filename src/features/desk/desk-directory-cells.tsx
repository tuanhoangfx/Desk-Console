import {
  DirectoryTableBodyCell,
  HubDirectoryTimestampTooltipCell,
  HubUsersStatusLabel,
  type HubDirectoryColumnDef,
  type HubUsersStatusTone,
} from "@tool-workspace/hub-ui";
import type { DeskCol } from "./desk-table-prefs";

export type DeskRow = {
  id: string;
  name: string;
  status: string;
  extra: string;
  updated: string;
  createdAt?: string;
  updatedKind?: "activity" | "text";
  statusTone?: HubUsersStatusTone;
};

export function renderDeskDirectoryBodyCell(
  row: DeskRow,
  key: DeskCol,
  col: HubDirectoryColumnDef<DeskCol>,
) {
  if (key === "updated") {
    return (
      <DirectoryTableBodyCell key={key} colClass={col.colClass}>
        {row.updatedKind === "text" ? (
          <span className="truncate">{row.updated || "—"}</span>
        ) : (
          <HubDirectoryTimestampTooltipCell at={row.updated} title="Updated" />
        )}
      </DirectoryTableBodyCell>
    );
  }
  if (key === "status") {
    return (
      <DirectoryTableBodyCell key={key} colClass={col.colClass}>
        <HubUsersStatusLabel label={row.status} tone={row.statusTone ?? "active"} />
      </DirectoryTableBodyCell>
    );
  }
  const value = key === "name" ? row.name : row.extra;
  return (
    <DirectoryTableBodyCell key={key} colClass={col.colClass}>
      <span className={key === "name" ? "hub-users-name-title truncate" : "truncate"}>{value}</span>
    </DirectoryTableBodyCell>
  );
}
