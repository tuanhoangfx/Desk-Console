import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, History, ScrollText, Terminal, Timer, XCircle } from "lucide-react";
import {
  HubActivityTimestampLabel,
  HubConsoleCrtLine,
  HubPanel,
  HubRuntimeChannelBadge,
  HubRuntimeConsoleLine,
  HubRuntimeConsoleTerm,
  HubRuntimeHistoryList,
  compactIconSize,
  formatHubTimestampFull,
} from "@tool-workspace/hub-ui";
import { deskApi, type OpsConsoleEntry, type OpsHistoryEntry } from "../../lib/api";
import {
  appendDeskOpsLog,
  clearDeskOpsLogs,
  readDeskOpsLogs,
  subscribeDeskOpsLogs,
} from "./desk-ops-session-log";

const HISTORY_POLL_MS = 4000;
const RENDER_LIMIT = 300;
const ICON_SM = compactIconSize(10);

/** CRT palette preview — shown before a row is selected (ok-1). */
export const DESK_CONSOLE_PREVIEW_LINES = [
  "04:12:18 [vite] [client] page reload src/App.tsx",
  "start apply=true session=false no-deploy preserved=build/dist/.keep",
  "→ ensure-dev P0001 listening on :5180",
] as const;

type OpsKind = "runner" | "task";

type DeskConsoleChannel = "runner" | "task" | "console" | "ops";

const CHANNEL_LABEL: Record<DeskConsoleChannel, string> = {
  runner: "Runner",
  task: "Task",
  console: "Console",
  ops: "Ops",
};

function DeskConsoleChannelBadge({ channel, compact = false }: { channel: DeskConsoleChannel; compact?: boolean }) {
  const Icon = channel === "task" ? Timer : Terminal;
  return (
    <HubRuntimeChannelBadge
      variant={channel === "console" ? "terminal" : channel}
      label={CHANNEL_LABEL[channel]}
      icon={<Icon size={compact ? 10 : 11} aria-hidden />}
      compact={compact}
    />
  );
}

function inferDeskConsoleChannel(channel: string, kind: OpsKind): DeskConsoleChannel {
  const key = channel.trim().toLowerCase();
  if (key === "console" || key === "terminal") return "console";
  if (key === "runner") return "runner";
  if (key === "task") return "task";
  if (key === "ops") return "ops";
  return kind;
}

function HistoryStatusIcon({ ok }: { ok: boolean }) {
  return ok ? (
    <CheckCircle2 size={ICON_SM} className="text-emerald-400/90" aria-hidden />
  ) : (
    <XCircle size={ICON_SM} className="text-red-400/90" aria-hidden />
  );
}

/** Design lock V5 — hub-ui HubConsoleCrtLine SSOT. */
function DeskConsoleCrtLine({ line }: { line: string }) {
  return <HubConsoleCrtLine line={line} />;
}

function DeskOpsConsolePanel({
  kind,
  targetId,
  targetLabel,
  tabActive,
}: {
  kind: OpsKind;
  targetId: string | null;
  targetLabel?: string;
  tabActive: boolean;
}) {
  const [lines, setLines] = useState<string[]>([]);
  const streamRef = useRef<EventSource | null>(null);
  const bodyRef = useRef<HTMLPreElement>(null);

  const clear = useCallback(() => setLines([]), []);

  useEffect(() => {
    streamRef.current?.close();
    streamRef.current = null;
    setLines([]);

    if (!tabActive || !targetId) return;

    let cancelled = false;

    void (async () => {
      try {
        const boot = await deskApi.opsLogs(targetId, kind);
        if (!cancelled) setLines(boot.lines ?? boot.entries.map((e) => e.message));
      } catch {
        if (!cancelled) setLines([]);
      }
    })();

    const url = deskApi.opsTerminalStreamUrl(targetId, kind);
    if (!url) return;

    const source = new EventSource(url);
    streamRef.current = source;

    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(String(event.data || "{}")) as { lines?: string[] };
        const chunk = Array.isArray(payload.lines) ? payload.lines : [];
        if (!chunk.length) return;
        setLines((prev) => [...prev, ...chunk].slice(-RENDER_LIMIT * 2));
      } catch {
        /* ignore malformed SSE */
      }
    };

    return () => {
      cancelled = true;
      source.close();
      if (streamRef.current === source) streamRef.current = null;
    };
  }, [kind, tabActive, targetId]);

  useEffect(() => {
    bodyRef.current?.scrollTo?.(0, bodyRef.current.scrollHeight);
  }, [lines]);

  const emptyHint = targetId
    ? "$ waiting for process output…"
    : "$ select a runner or task row";

  const displayLines =
    lines.length > 0 ? lines : !targetId ? [...DESK_CONSOLE_PREVIEW_LINES] : [];

  return (
    <HubPanel
      title="Console"
      titleIcon={<Terminal size={compactIconSize(14)} className="text-cyan-300/90" aria-hidden />}
      className="desk-runtime-console stealth-runtime-console min-h-0 overflow-hidden"
      actions={
        <button type="button" className="hub-btn hub-btn--ghost text-xs" onClick={clear} disabled={!lines.length}>
          Clear
        </button>
      }
    >
      <div className="hub-console-crt-wrap">
        <pre
          ref={bodyRef}
          className="hub-runtime-console-code hub-console-crt hub-scrollbar m-0 min-h-0 flex-1 overflow-auto p-3"
        >
          {displayLines.length === 0 ? (
            <span className="hub-console-crt__empty">{emptyHint}</span>
          ) : (
            <span className={lines.length === 0 ? "hub-console-crt__preview" : undefined}>
              {displayLines.map((line, i) => (
                <DeskConsoleCrtLine key={`${i}-${line.slice(0, 24)}`} line={line} />
              ))}
            </span>
          )}
        </pre>
      </div>
    </HubPanel>
  );
}

function DeskOpsHistoryPanel({
  kind,
  targetId,
  tabActive,
}: {
  kind: OpsKind;
  targetId: string | null;
  tabActive: boolean;
}) {
  const [entries, setEntries] = useState<OpsHistoryEntry[]>([]);

  const refresh = useCallback(async () => {
    if (!targetId) {
      setEntries([]);
      return;
    }
    try {
      const data = await deskApi.opsHistory(targetId);
      setEntries(data.entries.filter((e) => e.kind === kind));
    } catch {
      setEntries([]);
    }
  }, [kind, targetId]);

  useEffect(() => {
    if (!tabActive) return;
    void refresh();
    const timer = window.setInterval(() => void refresh(), HISTORY_POLL_MS);
    return () => window.clearInterval(timer);
  }, [refresh, tabActive]);

  const rows = useMemo(
    () =>
      entries.map((entry) => ({
        id: entry.id,
        leading: <HistoryStatusIcon ok={entry.ok} />,
        primaryRow: (
          <span className="hub-runtime-history-list__line">
            <span className="hub-runtime-history-profile-chip">{entry.action}</span>
            <span className="hub-runtime-history-list__task truncate">{entry.message}</span>
            <span className="hub-runtime-history-list__meta-inline">
              <HubActivityTimestampLabel at={entry.at} title={formatHubTimestampFull(entry.at) || undefined} fallback="—" />
            </span>
          </span>
        ),
      })),
    [entries],
  );

  return (
    <HubPanel
      title="History"
      titleIcon={<History size={compactIconSize(14)} className="text-indigo-300/90" aria-hidden />}
      className="desk-runtime-history stealth-runtime-history h-full min-h-0 overflow-hidden"
    >
      <HubRuntimeHistoryList
        rows={rows}
        emptyMessage={targetId ? "No actions yet for this target." : "Select a row to view history."}
        className="hub-runtime-history-list--chip-lanes desk-runtime-history__body"
      />
    </HubPanel>
  );
}

function DeskOpsLogPanel({ kind, tabActive }: { kind: OpsKind; tabActive: boolean }) {
  const [rows, setRows] = useState<OpsConsoleEntry[]>(() => readDeskOpsLogs());

  useEffect(() => {
    if (!tabActive) return;
    return subscribeDeskOpsLogs(() => setRows(readDeskOpsLogs()));
  }, [tabActive]);

  return (
    <HubPanel
      title="Log"
      titleIcon={<ScrollText size={compactIconSize(14)} className="text-sky-300/90" aria-hidden />}
      className="desk-runtime-log stealth-runtime-console h-full min-h-0 overflow-hidden"
      actions={
        <button type="button" className="hub-btn hub-btn--ghost text-xs" onClick={() => clearDeskOpsLogs()}>
          Clear
        </button>
      }
    >
      <HubRuntimeConsoleTerm className="desk-runtime-log__body stealth-console-log hub-runtime-rail-surface">
        {rows.length === 0 ? (
          <div className="text-hub-muted">System output will appear here…</div>
        ) : (
          rows.map((row) => (
            <HubRuntimeConsoleLine
              key={row.id}
              level={row.level}
              time={row.at}
              channelBadge={<DeskConsoleChannelBadge channel={inferDeskConsoleChannel(row.channel, kind)} compact />}
              source=""
              message={row.message}
            />
          ))
        )}
      </HubRuntimeConsoleTerm>
    </HubPanel>
  );
}

/** P0003 ProfilesWorkflowRail parity — Console · History · Log (4:3:3 rail grid). */
export function DeskOpsRuntimeRail({
  kind,
  targetId,
  targetLabel,
  tabActive = true,
}: {
  kind: OpsKind;
  targetId: string | null;
  targetLabel?: string;
  tabActive?: boolean;
}) {
  return (
    <>
      <DeskOpsConsolePanel kind={kind} targetId={targetId} targetLabel={targetLabel} tabActive={tabActive} />
      <DeskOpsHistoryPanel kind={kind} targetId={targetId} tabActive={tabActive} />
      <DeskOpsLogPanel kind={kind} tabActive={tabActive} />
    </>
  );
}

export { appendDeskOpsLog };
