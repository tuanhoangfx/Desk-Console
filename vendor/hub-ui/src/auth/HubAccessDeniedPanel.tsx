import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { LogOut, RefreshCw } from "lucide-react";
import { compactIconSize } from "../ui-scale";
import { formatHubAuthToolInfo, type HubAuthToolInfo } from "./hub-auth-tool-info";

export type HubAccessDeniedPanelProps = {
  title: string;
  message: ReactNode;
  signedInAs?: string;
  onSignOut: () => void;
  signOutLabel?: string;
  /** Re-run tool grant check without signing out (admin may have granted since). */
  onRecheck?: () => void;
  recheckLabel?: string;
  recheckBusy?: boolean;
  /** Live user — queue Hub Admin review for this tool (fail-open when RPC migrate misses). */
  onRequestAccess?: () => void;
  requestAccessLabel?: string;
  requestAccessBusy?: boolean;
  requestAccessDone?: boolean;
  headerLeading?: ReactNode;
  toolInfo?: HubAuthToolInfo;
  /** Portal to document.body with auth-gate backdrop (default true). */
  portal?: boolean;
};

/** Access denied — golden auth-gate panel shell (P0016 / workspace tools). */
export function HubAccessDeniedPanel({
  title,
  message,
  signedInAs,
  onSignOut,
  signOutLabel = "Sign out",
  onRecheck,
  recheckLabel = "Check access again",
  recheckBusy = false,
  onRequestAccess,
  requestAccessLabel = "Request access",
  requestAccessBusy = false,
  requestAccessDone = false,
  headerLeading,
  toolInfo,
  portal = true,
}: HubAccessDeniedPanelProps) {
  const toolLine = toolInfo ? formatHubAuthToolInfo(toolInfo) : "";

  const panel = (
    <div className="auth-gate-panel auth-gate-panel--modal auth-gate-panel--denied hub-modal-frame">
      {headerLeading ? <div className="auth-gate-brand">{headerLeading}</div> : null}
      <h2 className="auth-gate-title auth-gate-title--denied">{title}</h2>
      {toolLine ? <p className="auth-gate-tool-info">{toolLine}</p> : null}
      <div className="auth-gate-denied__body">
        {signedInAs ? (
          <p className="auth-gate-denied__signed-in">
            Signed in as <strong>{signedInAs}</strong>
          </p>
        ) : null}
        <p className="auth-gate-denied__message">{message}</p>
      </div>
      <div className="auth-gate-denied__actions">
        {onRequestAccess ? (
          <button
            type="button"
            className="auth-gate-submit auth-gate-submit--recheck"
            onClick={onRequestAccess}
            disabled={requestAccessBusy || requestAccessDone}
          >
            <span>{requestAccessBusy ? "Sending…" : requestAccessDone ? "Request sent" : requestAccessLabel}</span>
          </button>
        ) : null}
        {onRecheck ? (
          <button
            type="button"
            className="auth-gate-submit auth-gate-submit--recheck"
            onClick={onRecheck}
            disabled={recheckBusy}
          >
            <RefreshCw size={compactIconSize(16)} aria-hidden className={recheckBusy ? "animate-spin" : undefined} />
            <span>{recheckBusy ? "Checking…" : recheckLabel}</span>
          </button>
        ) : null}
        <button type="button" className="auth-gate-submit auth-gate-submit--denied" onClick={onSignOut}>
          <LogOut size={compactIconSize(16)} aria-hidden />
          <span>{signOutLabel}</span>
        </button>
      </div>
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
    <div
      className="auth-gate-root auth-gate-root--denied"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="auth-denied-title"
    >
      <div className="auth-gate-backdrop" aria-hidden="true" />
      <div id="auth-denied-title" className="sr-only">
        {title}
      </div>
      {panel}
    </div>,
    document.body,
  );
}
