import { HubUsageLogPanel, type HubLogEntry, type HubLogQuickAction } from "./HubUsageLogPanel";
import { useHubAppLog } from "./HubAppLogProvider";
import {
  HUB_LOG_EMPTY_MESSAGE,
  HUB_LOG_SUBTITLE_GLOBAL,
  HUB_LOG_SUBTITLE_TAB,
  HUB_LOG_TITLE,
} from "./hub-chrome-messages";

export type { HubLogQuickAction, HubLogExtraSection } from "./HubUsageLogPanel";

export type HubLogButtonVariant = "tab" | "global";

export type HubLogButtonProps = {
  /** `tab` — header (current tab only, label visible). `global` — sidebar footer (all tabs). */
  variant?: HubLogButtonVariant;
  emptyMessage?: string;
  title?: string;
  subtitle?: string;
  quickActions?: HubLogQuickAction[];
  extraSections?: import("./HubUsageLogPanel").HubLogExtraSection[];
  scopeKey?: string;
  showUnreadChrome?: boolean;
  trackUnread?: boolean;
  onLogOpenDetail?: (log: HubLogEntry) => void;
};

/** Golden Log trigger — pairs with `HubAppLogProvider` (header tab log + footer session log). */
export function HubLogButton({
  variant = "tab",
  emptyMessage = HUB_LOG_EMPTY_MESSAGE,
  title,
  subtitle,
  quickActions,
  extraSections,
  scopeKey,
  showUnreadChrome,
  trackUnread,
  onLogOpenDetail,
}: HubLogButtonProps) {
  const { tabLogs, allLogs } = useHubAppLog();
  const logs = variant === "global" ? allLogs : tabLogs;
  const isGlobal = variant === "global";

  return (
    <HubUsageLogPanel
      logs={logs}
      compact={false}
      sidebarRow={isGlobal}
      title={title ?? HUB_LOG_TITLE}
      subtitle={subtitle ?? (isGlobal ? HUB_LOG_SUBTITLE_GLOBAL : HUB_LOG_SUBTITLE_TAB)}
      emptyMessage={emptyMessage}
      quickActions={quickActions}
      extraSections={extraSections}
      scopeKey={scopeKey}
      showUnreadChrome={showUnreadChrome}
      trackUnread={trackUnread}
      onLogOpenDetail={onLogOpenDetail}
    />
  );
}
