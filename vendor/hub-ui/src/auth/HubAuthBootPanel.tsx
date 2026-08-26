import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { formatHubAuthToolInfo, type HubAuthToolInfo } from "./hub-auth-tool-info";
import { HubAuthSysProgress } from "./HubAuthSysProgress";

export type HubAuthBootPanelProps = {
  status?: string;
  title?: string;
  toolInfo?: HubAuthToolInfo;
  headerLeading?: ReactNode;
  /** Portal with backdrop (default false — inline in AuthShell main). */
  portal?: boolean;
};

/** Auth session boot — mini auth-gate skeleton shell (P0016 AuthBootScreen). */
export function HubAuthBootPanel({
  status = "Checking workspace session…",
  title = "Welcome",
  toolInfo,
  headerLeading,
  portal = false,
}: HubAuthBootPanelProps) {
  const toolLine = toolInfo ? formatHubAuthToolInfo(toolInfo) : "";

  const panel = (
    <div
      className="auth-gate-panel auth-gate-panel--modal auth-gate-panel--boot hub-modal-frame"
      aria-busy="true"
      aria-live="polite"
    >
      {headerLeading ? (
        <div className="auth-gate-brand">{headerLeading}</div>
      ) : (
        <div className="auth-gate-brand">
          <div className="auth-gate-boot__avatar" aria-hidden="true" />
        </div>
      )}
      <h2 className="auth-gate-title">{title}</h2>
      {toolLine ? <p className="auth-gate-tool-info">{toolLine}</p> : <div className="auth-gate-boot__subtitle" aria-hidden="true" />}
      <div className="auth-gate-boot__tabs" aria-hidden="true">
        <span className="auth-gate-boot__tab auth-gate-boot__tab--active" />
        <span className="auth-gate-boot__tab" />
      </div>
      <div className="auth-gate-boot__fields" aria-hidden="true">
        <span className="auth-gate-boot__field" />
        <span className="auth-gate-boot__field" />
        <span className="auth-gate-boot__submit" />
      </div>
      <HubAuthSysProgress label={status} className="auth-gate-boot__status-row" />
    </div>
  );

  if (!portal) {
    return (
      <div className="auth-gate-root auth-gate-root--inline anim-fade w-full max-w-[30rem]">
        {panel}
      </div>
    );
  }

  return createPortal(
    <div className="auth-gate-root auth-gate-root--boot" role="status" aria-label={status}>
      <div className="auth-gate-backdrop" aria-hidden="true" />
      {panel}
    </div>,
    document.body,
  );
}
