import type { ReactNode } from "react";
import {
  DirectoryTableBodyCell,
  HUB_DIRECTORY_ICON_CELL_HIT_EXPAND_CLASS,
  HubDirectoryCopyText,
  HubDirectoryTimestampTooltipCell,
  HubUsersStatusLabel,
  compactIconSize,
  type HubDirectoryColumnDef,
  type HubUsersStatusTone,
} from "@tool-workspace/hub-ui";
import { Loader2, Play, Square } from "lucide-react";
import type { DeskCol } from "./desk-table-prefs";

export type DeskRow = {
  id: string;
  name: string;
  status: string;
  extra: string;
  updated: string;
  createdAt?: string;
  project?: string;
  updatedKind?: "activity" | "text";
  statusTone?: HubUsersStatusTone;
  opsKind?: "task" | "runner";
  opsUp?: boolean;
  opsLastResult?: string;
};

export type DeskOpsCellHandlers = {
  onRun: (id: string) => void;
  onStop?: (id: string) => void;
  onDisable?: (id: string) => void;
  onFocus?: (id: string) => void;
  pendingIds?: ReadonlySet<string>;
};

function OpsIconButton({
  label,
  tone,
  icon,
  onClick,
  disabled = false,
}: {
  label: string;
  tone: "emerald" | "rose" | "amber" | "neutral";
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-400"
      : tone === "rose"
        ? "text-rose-400"
        : tone === "amber"
          ? "text-amber-300"
          : "text-hub-muted";
  const shortLabel = label.startsWith("Restart ")
    ? "Restart"
    : label.startsWith("Disable ") || label.startsWith("Stop ")
      ? "Stop"
      : label.startsWith("Start ") || label.startsWith("Run ")
        ? "Start"
        : label.split(" ")[0];

  return (
    <button
      type="button"
      disabled={disabled}
      className={`hub-directory-icon-cell ${HUB_DIRECTORY_ICON_CELL_HIT_EXPAND_CLASS} shrink-0 rounded-md border-0 bg-transparent transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45`}
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <span className={`hub-directory-icon-cell__icon ${toneClass}`}>{icon}</span>
      <span className="hub-directory-icon-cell__label">{shortLabel}</span>
    </button>
  );
}

function renderOpsRunCell(row: DeskRow, col: HubDirectoryColumnDef<DeskCol>, opsHandlers?: DeskOpsCellHandlers) {
  const label = row.name;
  const pending = Boolean(opsHandlers?.pendingIds?.has(row.id));
  const runnerUp = row.opsKind === "runner" && row.opsUp === true;
  const taskRunning = row.opsKind === "task" && /running/i.test(row.status);

  const focusAnd = (fn?: (id: string) => void) => {
    opsHandlers?.onFocus?.(row.id);
    fn?.(row.id);
  };

  return (
    <DirectoryTableBodyCell key="run" colClass={col.colClass}>
      <div className="flex min-w-0 items-center gap-0.5">
        {runnerUp || taskRunning ? (
          opsHandlers?.onStop ? (
            <OpsIconButton
              label={`Stop ${label}`}
              tone="rose"
              disabled={pending}
              icon={<Square size={compactIconSize(11)} fill="currentColor" aria-hidden />}
              onClick={() => focusAnd(opsHandlers.onStop)}
            />
          ) : opsHandlers?.onDisable ? (
            <OpsIconButton
              label={`Stop ${label}`}
              tone="rose"
              disabled={pending}
              icon={<Square size={compactIconSize(11)} fill="currentColor" aria-hidden />}
              onClick={() => focusAnd(opsHandlers.onDisable)}
            />
          ) : null
        ) : (
          <OpsIconButton
            label={`Start ${label}`}
            tone="emerald"
            disabled={pending}
            icon={
              pending ? (
                <Loader2 size={compactIconSize(11)} className="animate-spin" aria-hidden />
              ) : (
                <Play size={compactIconSize(11)} fill="currentColor" aria-hidden />
              )
            }
            onClick={() => focusAnd(opsHandlers?.onRun)}
          />
        )}
      </div>
    </DirectoryTableBodyCell>
  );
}

export function renderDeskDirectoryBodyCell(
  row: DeskRow,
  key: DeskCol,
  col: HubDirectoryColumnDef<DeskCol>,
  opsHandlers?: DeskOpsCellHandlers,
) {
  if (key === "run" && opsHandlers) {
    return renderOpsRunCell(row, col, opsHandlers);
  }

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
  if (key === "name" || key === "extra") {
    return (
      <DirectoryTableBodyCell key={key} colClass={col.colClass}>
        <HubDirectoryCopyText
          value={value}
          copyToastLabel={key === "name" ? "Name copied" : "Detail copied"}
        />
      </DirectoryTableBodyCell>
    );
  }

  return (
    <DirectoryTableBodyCell key={key} colClass={col.colClass}>
      <span className="truncate">{value}</span>
    </DirectoryTableBodyCell>
  );
}
