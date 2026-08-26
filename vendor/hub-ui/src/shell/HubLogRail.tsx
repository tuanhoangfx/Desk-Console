import { useMemo } from "react";
import { FileText } from "lucide-react";
import { HUB_DIRECTORY_TOOLBAR_TYPO_CLASS } from "./hub-typography";
import { HubActivityFeedRows } from "./HubActivityFeed";
import { HUB_LOG_EMPTY_MESSAGE, HUB_LOG_TITLE } from "./hub-chrome-messages";
import { useHubAppLog } from "./HubAppLogProvider";
import { hubLogEntryToFeedItem, type HubLogEntry } from "./HubUsageLogPanel";

export type HubLogRailProps = {
  /** `tab` — current screen (My Shift). `global` — all tabs. */
  variant?: "tab" | "global";
  logs?: HubLogEntry[];
  title?: string;
  emptyMessage?: string;
  className?: string;
  /** Denser timeline for a 20% column. */
  compact?: boolean;
};

/**
 * Inline session Log rail — same feed as header Log modal, compact beside a chart (8:2).
 * Newest first so the 20% column shows the latest line without scrolling the modal.
 */
export function HubLogRail({
  variant = "tab",
  logs: logsProp,
  title = HUB_LOG_TITLE,
  emptyMessage = HUB_LOG_EMPTY_MESSAGE,
  className = "",
  compact = false,
}: HubLogRailProps) {
  const { tabLogs, allLogs } = useHubAppLog();
  const logs = logsProp ?? (variant === "global" ? allLogs : tabLogs);
  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    [],
  );
  const items = useMemo(
    () => [...logs].slice().reverse().map(hubLogEntryToFeedItem),
    [logs],
  );

  return (
    <aside
      data-hub-log-rail=""
      data-compact={compact ? "" : undefined}
      aria-label={title}
      className={`hub-chart-card hub-chart-card--hero flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-white/5 bg-[var(--panel)]${compact ? " hub-log-rail--compact" : ""}${className ? ` ${className}` : ""}`}
    >
      <div
        className={`flex shrink-0 items-center gap-1.5 border-b border-white/5 px-3 py-2 text-[var(--text)] ${HUB_DIRECTORY_TOOLBAR_TYPO_CLASS}`}
      >
        <FileText size={14} className="shrink-0 text-cyan-300" aria-hidden />
        {title}
      </div>
      <div className="hub-scrollbar min-h-0 flex-1 overflow-y-auto px-2 py-2">
        <HubActivityFeedRows
          items={items}
          emptyMessage={emptyMessage}
          formatTime={(at) => formatter.format(at)}
        />
      </div>
    </aside>
  );
}
