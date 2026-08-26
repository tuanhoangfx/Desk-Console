import type { ReactNode } from "react";
import { HubChromeBoundary } from "../loading/HubLazyScreenBoundary";
import { HubLogButton, type HubLogButtonProps } from "./HubLogButton";
import { HubNotifyPanel, type HubNotifyPanelProps } from "./HubNotifyPanel";

export type HubHeaderOpsPanelsProps = {
  /** Pass `false` to hide Log. Default: tab log. */
  log?: HubLogButtonProps | false;
  /** Omit or null to hide Notify. */
  notify?: HubNotifyPanelProps | null;
  /** Settings, worker chip, etc. */
  trailing?: ReactNode;
  className?: string;
};

/** Golden header ops row — Notify · Log · trailing (Settings). */
export function HubHeaderOpsPanels({ log, notify, trailing, className }: HubHeaderOpsPanelsProps) {
  const showLog = log !== false;
  const logProps = log === false ? undefined : log;

  return (
    <HubChromeBoundary label="Header">
      <div className={`hub-header-ops flex shrink-0 items-center gap-1.5${className ? ` ${className}` : ""}`}>
        {notify ? <HubNotifyPanel {...notify} /> : null}
        {showLog ? <HubLogButton variant="tab" {...logProps} /> : null}
        {trailing}
      </div>
    </HubChromeBoundary>
  );
}
