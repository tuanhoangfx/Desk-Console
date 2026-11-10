import type { ReactNode } from "react";
import {
  DirectoryEmptyDash,
  DirectoryTableBodyCell,
  HUB_DIRECTORY_ICON_CELL_HIT_EXPAND_CLASS,
  HUB_FILTER_OPTION_EMOJI_CLASS,
  HubDirectoryCopyText,
  HubDirectoryLogCell,
  HubDirectoryRowPinButton,
  HubDirectoryTimestampTooltipCell,
  compactIconSize,
  type HubDirectoryColumnDef,
  type HubEntityLogEntry,
  type HubEntityLogFieldMeta,
  type HubUsersStatusTone,
} from "@tool-workspace/hub-ui";
import { Loader2, Play, Square } from "lucide-react";
import { clipFormatEmoji } from "../clips/clip-picker-filters";
import type { DeskCol } from "./desk-table-prefs";
import { DeskStatusKpiLabel } from "./DeskStatusKpiLabel";

const DESK_LOG_FIELD_META: Record<string, HubEntityLogFieldMeta> = {
  name: { label: "Name", emoji: "🏷️" },
  schedule: { label: "Schedule", emoji: "🕒" },
  status: { label: "Status", emoji: "🚦" },
  duration: { label: "Duration", emoji: "🕒" },
  freed: { label: "Freed", emoji: "🧹" },
};

function resolveDeskLogFieldMeta(field: string): HubEntityLogFieldMeta {
  return DESK_LOG_FIELD_META[field] ?? { label: field };
}

export type DeskOpsAction = "starting" | "stopping";

export type DeskRow = {
  id: string;
  name: string;
  schedule?: string;
  status: string;
  extra: string;
  log?: string;
  activityLog?: HubEntityLogEntry[];
  updated: string;
  createdAt?: string;
  project?: string;
  clipFormat?: string;
  pinned?: boolean;
  updatedKind?: "activity" | "text";
  statusTone?: HubUsersStatusTone;
  opsKind?: "task" | "runner";
  opsUp?: boolean;
  opsLastResult?: string;
  /** In-flight Start/Stop until probe flips (not just API spawn ack). */
  opsAction?: DeskOpsAction;
  opsActionStartedAt?: number;
  /** Host ensure-dev exit — clear Starting when non-zero. */
  opsStartStartedAt?: number;
  opsStartExitedAt?: number;
  opsStartExitCode?: number | null;
};

export type DeskOpsCellHandlers = {
  onRun: (id: string) => void;
  onStop?: (id: string) => void;
  onDisable?: (id: string) => void;
  onFocus?: (id: string) => void;
  pendingIds?: ReadonlySet<string>;
};

function formatOpsElapsed(startedAt?: number): string {
  if (!startedAt || !Number.isFinite(startedAt)) return "0:00";
  const sec = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

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
  const pending = Boolean(opsHandlers?.pendingIds?.has(row.id)) || Boolean(row.opsAction);
  const runnerUp = row.opsKind === "runner" && row.opsUp === true;
  const taskRunning = row.opsKind === "task" && /running/i.test(row.status);
  const inFlight = row.opsAction === "starting" || row.opsAction === "stopping";

  const focusAnd = (fn?: (id: string) => void) => {
    opsHandlers?.onFocus?.(row.id);
    fn?.(row.id);
  };

  if (inFlight) {
    const phaseLabel = row.opsAction === "stopping" ? "Stopping" : "Starting";
    const toneClass = row.opsAction === "stopping" ? "text-rose-400" : "text-amber-300";
    const elapsed = formatOpsElapsed(row.opsActionStartedAt);
    return (
      <DirectoryTableBodyCell key="run" colClass={col.colClass}>
        <div
          className={`hub-directory-icon-cell ${HUB_DIRECTORY_ICON_CELL_HIT_EXPAND_CLASS} flex min-w-0 items-center gap-1`}
          aria-label={`${phaseLabel} ${label} ${elapsed}`}
          title={`${phaseLabel} · ${elapsed}`}
        >
          <span className={`hub-directory-icon-cell__icon ${toneClass}`}>
            <Loader2 size={compactIconSize(11)} className="animate-spin" aria-hidden />
          </span>
          <span className={`hub-directory-icon-cell__label ${toneClass}`}>{phaseLabel}</span>
          <span className="hub-users-cell-muted tabular-nums">{elapsed}</span>
        </div>
      </DirectoryTableBodyCell>
    );
  }

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
  onPinToggle?: (id: string, nextPinned: boolean) => void,
) {
  if (key === "run" && opsHandlers) {
    return renderOpsRunCell(row, col, opsHandlers);
  }

  if (key === "format") {
    const fmt = row.clipFormat || "Text";
    const emoji = clipFormatEmoji(fmt);
    return (
      <DirectoryTableBodyCell key={key} colClass={col.colClass}>
        <span className="inline-flex min-w-0 items-center gap-1.5 truncate" title={fmt}>
          <span className={HUB_FILTER_OPTION_EMOJI_CLASS} aria-hidden>
            {emoji}
          </span>
          <span className="truncate">{fmt}</span>
        </span>
      </DirectoryTableBodyCell>
    );
  }

  if (key === "created") {
    return (
      <DirectoryTableBodyCell key={key} colClass={col.colClass}>
        <HubDirectoryTimestampTooltipCell
          at={row.createdAt || row.updated}
          title="Created"
          variant="date"
          fallback={<DirectoryEmptyDash className="hub-users-directory-body-text hub-users-cell-muted" />}
        />
      </DirectoryTableBodyCell>
    );
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

  if (key === "log") {
    const entries: HubEntityLogEntry[] =
      row.activityLog && row.activityLog.length > 0
        ? row.activityLog
        : [
            {
              at: row.updated || row.createdAt || new Date().toISOString(),
              message: row.log || row.extra || row.status || "Active",
              actor: { label: row.project || "System", source: "system" },
            },
          ];
    return (
      <DirectoryTableBodyCell key={key} colClass={col.colClass}>
        <HubDirectoryLogCell
          entries={entries}
          fieldMeta={resolveDeskLogFieldMeta}
          empty={<DirectoryEmptyDash className="hub-users-directory-body-text hub-users-cell-muted" />}
        />
      </DirectoryTableBodyCell>
    );
  }

  if (key === "status") {
    return (
      <DirectoryTableBodyCell key={key} colClass={col.colClass}>
        <DeskStatusKpiLabel status={row.status} />
      </DirectoryTableBodyCell>
    );
  }

  if (key === "schedule") {
    const sched = row.schedule || "—";
    const schedEmoji = /every\s+\d+\s*(sec|min|hour|h|m)/i.test(sched)
      ? "🔄"
      : /auto/i.test(sched)
        ? "⚡"
        : "📅";
    return (
      <DirectoryTableBodyCell key={key} colClass={col.colClass}>
        <span className="inline-flex min-w-0 items-center gap-1.5 truncate">
          <span className="shrink-0 leading-none" aria-hidden>
            {schedEmoji}
          </span>
          <span className="hub-users-directory-body-text truncate text-slate-200">{sched}</span>
        </span>
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
  if (key === "name" && onPinToggle) {
    return (
      <DirectoryTableBodyCell key={key} colClass={col.colClass}>
        <div className="flex min-w-0 w-full items-center gap-1.5">
          <div className="min-w-0 flex-1">
            <HubDirectoryCopyText value={value} copyToastLabel="Name copied" />
          </div>
          <HubDirectoryRowPinButton
            pinned={Boolean(row.pinned)}
            itemNoun="clip"
            onToggle={() => onPinToggle(row.id, !row.pinned)}
          />
        </div>
      </DirectoryTableBodyCell>
    );
  }
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
