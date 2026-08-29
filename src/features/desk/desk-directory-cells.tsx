import {

  DirectoryTableBodyCell,

  HUB_DIRECTORY_ICON_CELL_HIT_EXPAND_CLASS,

  HubDirectoryTimestampTooltipCell,

  HubUsersStatusLabel,

  compactIconSize,

  type HubDirectoryColumnDef,

  type HubUsersStatusTone,

} from "@tool-workspace/hub-ui";

import { Play } from "lucide-react";

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

  opsKind?: "task" | "runner";

  opsUp?: boolean;

  opsLastResult?: string;

};



export type DeskOpsCellHandlers = {

  onRun: (id: string) => void;

  onFocus?: (id: string) => void;

};



function OpsRunButton({ label, onClick }: { label: string; onClick: () => void }) {

  return (

    <button

      type="button"

      className={`hub-directory-icon-cell ${HUB_DIRECTORY_ICON_CELL_HIT_EXPAND_CLASS} shrink-0 rounded-md border-0 bg-transparent transition-opacity hover:opacity-90`}

      aria-label={label}

      onClick={(event) => {

        event.stopPropagation();

        onClick();

      }}

    >

      <span className="hub-directory-icon-cell__icon text-emerald-400">

        <Play size={compactIconSize(11)} fill="currentColor" aria-hidden />

      </span>

      <span className="hub-directory-icon-cell__label text-emerald-300">Run</span>

    </button>

  );

}



export function renderDeskDirectoryBodyCell(

  row: DeskRow,

  key: DeskCol,

  col: HubDirectoryColumnDef<DeskCol>,

  opsHandlers?: DeskOpsCellHandlers,

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

  if (key === "extra" && row.opsKind) {

    const group = row.opsKind === "task" ? "Task" : "Runner";

    const detail = row.extra.replace(/^task · |^runner · /i, "");

    return (

      <DirectoryTableBodyCell key={key} colClass={col.colClass}>

        <span className="truncate">

          <span className="text-indigo-300">{group}</span>

          <span className="text-hub-muted"> · </span>

          {row.opsKind === "task" && row.opsLastResult && row.opsLastResult !== "—" ? (

            <>

              <span className="text-hub-muted">exit {row.opsLastResult}</span>

              <span className="text-hub-muted"> · </span>

            </>

          ) : null}

          {detail}

        </span>

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

