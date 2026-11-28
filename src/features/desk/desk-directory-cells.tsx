import {
  DirectoryTableBodyCell,
  HUB_DIRECTORY_ICON_CELL_HIT_EXPAND_CLASS,
  HUB_FILTER_OPTION_EMOJI_CLASS,
  HubDirectoryBrandNameCell,
  HubDirectoryCopyText,
  HubDirectoryEmptyCell,
  HubDirectoryLogCell,
  HubDirectoryRowPinButton,
  HubDirectoryRunToggle,
  HubDirectoryTimestampTooltipCell,
  HubDirectoryValuePopover,
  compactIconSize,
  type HubBrandIconId,
  type HubDirectoryColumnDef,
  type HubEntityLogEntry,
  type HubEntityLogFieldMeta,
  type HubUsersStatusTone,
} from "@tool-workspace/hub-ui";
import { Globe, Loader2 } from "lucide-react";
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
  screen?: string;
  brandId?: HubBrandIconId;
  brandIconSrc?: string;
  version?: string;
  account?: string;
  ramBytes?: number;
  ramLabel?: string;
  hideExtraGroupPrefix?: boolean;
  schedule?: string;
  status: string;
  extra: string;
  extraBadges?: Array<{
    label: string;
    title?: string;
    tone: "sky" | "amber" | "emerald" | "rose" | "slate";
  }>;
  log?: string;
  activityLog?: HubEntityLogEntry[];
  updated: string;
  createdAt?: string;
  project?: string;
  clipFormat?: string;
  clipSource?: string;
  stack?: string;
  appKind?: string;
  outdated?: boolean;
  sizeBytes?: number;
  sizeLabel?: string;
  pinned?: boolean;
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
  tunnelUrl?: string | null;
  tunnelState?: "starting" | "active" | null;
};

export type DeskOpsCellHandlers = {
  onRun: (id: string) => void;
  onStop?: (id: string) => void;
  onDisable?: (id: string) => void;
  onFocus?: (id: string) => void;
  onToggleShare?: (id: string) => void;
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

function renderOpsRunCell(row: DeskRow, col: HubDirectoryColumnDef<DeskCol>, opsHandlers?: DeskOpsCellHandlers) {
  if (!row.opsKind) {
    return (
      <DirectoryTableBodyCell key="run" colClass={col.colClass}>
        <HubDirectoryEmptyCell className="hub-users-directory-body-text hub-users-cell-muted" />
      </DirectoryTableBodyCell>
    );
  }
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
        <HubDirectoryValuePopover value={`${phaseLabel} · ${elapsed}`} title="🚦 Action">
          <div
            className={`hub-directory-icon-cell ${HUB_DIRECTORY_ICON_CELL_HIT_EXPAND_CLASS} flex min-w-0 items-center gap-1`}
            aria-label={`${phaseLabel} ${label} ${elapsed}`}
          >
            <span className={`hub-directory-icon-cell__icon ${toneClass}`}>
              <Loader2 size={compactIconSize(11)} className="animate-spin" aria-hidden />
            </span>
            <span className={`hub-directory-icon-cell__label ${toneClass}`}>{phaseLabel}</span>
            <span className="hub-users-cell-muted tabular-nums">{elapsed}</span>
          </div>
        </HubDirectoryValuePopover>
      </DirectoryTableBodyCell>
    );
  }

  const showStop = runnerUp || taskRunning;
  const stopAction = opsHandlers?.onStop ?? opsHandlers?.onDisable;

  return (
    <DirectoryTableBodyCell key="run" colClass={col.colClass}>
      <div className="flex min-w-0 items-center justify-center gap-0.5">
        {showStop ? (
          stopAction ? (
            <HubDirectoryRunToggle
              kind="stop"
              label="Stop"
              ariaLabel={`Stop ${label}`}
              title={`Stop ${label}`}
              disabled={pending}
              pending={pending}
              onClick={(event) => {
                event.stopPropagation();
                focusAnd(stopAction);
              }}
            />
          ) : (
            <HubDirectoryEmptyCell className="hub-users-directory-body-text hub-users-cell-muted" />
          )
        ) : (
          <HubDirectoryRunToggle
            kind="start"
            label="Start"
            ariaLabel={`Start ${label}`}
            title={`Start ${label}`}
            disabled={pending}
            pending={pending}
            onClick={(event) => {
              event.stopPropagation();
              focusAnd(opsHandlers?.onRun);
            }}
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
        <HubDirectoryValuePopover value={fmt} title="📄 Format">
          <span className="inline-flex min-w-0 items-center gap-1.5 truncate">
            <span className={HUB_FILTER_OPTION_EMOJI_CLASS} aria-hidden>
              {emoji}
            </span>
            <span className="truncate">{fmt}</span>
          </span>
        </HubDirectoryValuePopover>
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
          fallback={<HubDirectoryEmptyCell className="hub-users-directory-body-text hub-users-cell-muted" />}
        />
      </DirectoryTableBodyCell>
    );
  }

  if (key === "updated") {
    return (
      <DirectoryTableBodyCell key={key} colClass={col.colClass}>
        <HubDirectoryTimestampTooltipCell
          at={row.updated}
          title="Update"
          fallback={<HubDirectoryEmptyCell className="hub-users-directory-body-text hub-users-cell-muted" />}
        />
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
          empty={<HubDirectoryEmptyCell className="hub-users-directory-body-text hub-users-cell-muted" />}
        />
      </DirectoryTableBodyCell>
    );
  }

  if (key === "status") {
    return (
      <DirectoryTableBodyCell key={key} colClass={col.colClass}>
        <DeskStatusKpiLabel status={row.status} tone={row.statusTone} screen={row.screen} />
      </DirectoryTableBodyCell>
    );
  }

  if (key === "version") {
    const ver = row.version?.trim() || "";
    if (!ver) {
      return (
        <DirectoryTableBodyCell key={key} colClass={col.colClass}>
          <HubDirectoryEmptyCell className="hub-users-directory-body-text hub-users-cell-muted" />
        </DirectoryTableBodyCell>
      );
    }
    return (
      <DirectoryTableBodyCell key={key} colClass={col.colClass}>
        <span className="hub-users-cell-num tabular-nums text-sky-200">{ver.startsWith("v") ? ver : `v${ver}`}</span>
      </DirectoryTableBodyCell>
    );
  }

  if (key === "account") {
    const account = row.account?.trim() || "";
    if (!account) {
      return (
        <DirectoryTableBodyCell key={key} colClass={col.colClass}>
          <HubDirectoryEmptyCell className="hub-users-directory-body-text hub-users-cell-muted" />
        </DirectoryTableBodyCell>
      );
    }
    return (
      <DirectoryTableBodyCell key={key} colClass={col.colClass}>
        <HubDirectoryCopyText
          value={account}
          copyToastLabel="Account copied"
          className={account === "Unbound" ? "text-[var(--muted)]" : "text-slate-200"}
        />
      </DirectoryTableBodyCell>
    );
  }

  if (key === "ram") {
    const label = row.ramLabel?.trim() || "";
    if (!label) {
      return (
        <DirectoryTableBodyCell key={key} colClass={col.colClass}>
          <HubDirectoryEmptyCell className="hub-users-directory-body-text hub-users-cell-muted" />
        </DirectoryTableBodyCell>
      );
    }
    return (
      <DirectoryTableBodyCell key={key} colClass={col.colClass}>
        <span className="hub-users-cell-num tabular-nums text-emerald-300">{label}</span>
      </DirectoryTableBodyCell>
    );
  }

  if (key === "size") {
    const label = row.sizeLabel?.trim() || "";
    if (!label) {
      return (
        <DirectoryTableBodyCell key={key} colClass={col.colClass}>
          <HubDirectoryEmptyCell className="hub-users-directory-body-text hub-users-cell-muted" />
        </DirectoryTableBodyCell>
      );
    }
    return (
      <DirectoryTableBodyCell key={key} colClass={col.colClass}>
        <span className="hub-users-cell-num tabular-nums text-slate-200">{label}</span>
      </DirectoryTableBodyCell>
    );
  }

  if (key === "schedule") {
    const sched = row.schedule?.trim() || "";
    if (!sched) {
      return (
        <DirectoryTableBodyCell key={key} colClass={col.colClass}>
          <HubDirectoryEmptyCell className="hub-users-directory-body-text hub-users-cell-muted" />
        </DirectoryTableBodyCell>
      );
    }
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

  if (key === "extra" && row.opsKind && !row.hideExtraGroupPrefix) {
    const group = row.opsKind === "task" ? "Task" : "Runner";
    const detail = row.extra.replace(/^task · |^runner · /i, "");
    const showShareBtn = row.opsKind === "runner" && row.opsUp === true && Boolean(opsHandlers?.onToggleShare);
    const shareActive = Boolean(row.tunnelUrl);
    return (
      <DirectoryTableBodyCell key={key} colClass={col.colClass}>
        <div className="flex min-w-0 w-full items-center justify-between gap-1.5">
          <div className="min-w-0 flex-1">
            <HubDirectoryCopyText
              value={row.tunnelUrl || row.extra}
              copyToastLabel={row.tunnelUrl ? "Share URL copied" : "Detail copied"}
              display={
                <span className="truncate">
                  <span className={shareActive ? "text-emerald-300" : "text-indigo-300"}>
                    {shareActive ? "Live" : group}
                  </span>
                  <span className="text-hub-muted"> · </span>
                  {row.opsKind === "task" && row.opsLastResult && row.opsLastResult !== "—" ? (
                    <>
                      <span className="text-hub-muted">exit {row.opsLastResult}</span>
                      <span className="text-hub-muted"> · </span>
                    </>
                  ) : null}
                  {row.tunnelUrl ? row.tunnelUrl.replace(/^https?:\/\//, "") : detail}
                </span>
              }
            />
          </div>
          {showShareBtn ? (
            <button
              type="button"
              data-testid={`runner-share-btn-${row.id}`}
              aria-label={shareActive ? `Stop share link for ${row.name}` : `Share preview link for ${row.name}`}
              onClick={(event) => {
                event.stopPropagation();
                opsHandlers?.onToggleShare?.(row.id);
              }}
              className={`inline-flex h-[20px] shrink-0 items-center gap-1 rounded border px-1.5 text-[10px] font-semibold transition ${
                shareActive
                  ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25"
                  : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.09] hover:text-white"
              }`}
            >
              <Globe size={10} aria-hidden />
              <span>{shareActive ? "Stop URL" : "Share"}</span>
            </button>
          ) : null}
        </div>
      </DirectoryTableBodyCell>
    );
  }

  const value = key === "name" ? row.name : row.extra;
  if (key === "name" && (row.brandId || row.brandIconSrc)) {
    return (
      <DirectoryTableBodyCell key={key} colClass={col.colClass}>
        <HubDirectoryBrandNameCell
          label={row.name}
          brandId={row.brandId}
          imageSrc={row.brandIconSrc}
        />
      </DirectoryTableBodyCell>
    );
  }
  if (key === "name" && onPinToggle) {
    return (
      <DirectoryTableBodyCell key={key} colClass={col.colClass}>
        <div className="flex min-w-0 w-full items-center gap-1.5">
          <div className="min-w-0 flex-1">
            <HubDirectoryCopyText value={value} copyToastLabel="Name copied" className="hub-users-name-title" />
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
    const badgeToneClass: Record<string, string> = {
      sky: "border-sky-400/35 bg-sky-500/[.12] text-sky-200",
      amber: "border-amber-400/35 bg-amber-500/[.12] text-amber-200",
      emerald: "border-emerald-400/35 bg-emerald-500/[.12] text-emerald-200",
      rose: "border-rose-400/35 bg-rose-500/[.12] text-rose-200",
      slate: "border-slate-400/30 bg-slate-500/[.12] text-slate-200",
    };
    const hasExtraBadges = key === "extra" && Array.isArray(row.extraBadges) && row.extraBadges.length > 0;
    if (hasExtraBadges) {
      return (
        <DirectoryTableBodyCell key={key} colClass={col.colClass}>
          <div className="flex min-w-0 w-full items-center gap-1.5">
            <div className="flex shrink-0 items-center gap-1">
              {row.extraBadges!.map((badge) => (
                <HubDirectoryValuePopover
                  key={badge.label}
                  value={badge.title || badge.label}
                  title={badge.label}
                  enabled={Boolean(badge.title)}
                >
                  <span
                    className={`inline-flex items-center rounded border px-1.5 py-[1px] text-[10px] font-medium tabular-nums leading-tight ${badgeToneClass[badge.tone] || badgeToneClass.slate}`}
                  >
                    {badge.label}
                  </span>
                </HubDirectoryValuePopover>
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <HubDirectoryCopyText value={row.extra} copyToastLabel="Detail copied" />
            </div>
          </div>
        </DirectoryTableBodyCell>
      );
    }
    return (
      <DirectoryTableBodyCell key={key} colClass={col.colClass}>
        <HubDirectoryCopyText
          value={value}
          copyToastLabel={key === "name" ? "Name copied" : "Detail copied"}
          className={key === "name" ? "hub-users-name-title" : undefined}
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
