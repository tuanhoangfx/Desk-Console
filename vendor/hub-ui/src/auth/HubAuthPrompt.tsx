import type { ReactNode } from "react";
import { LogIn } from "lucide-react";
import { compactIconSize } from "../ui-scale";
import { HubModalCloseButton } from "../shell/HubModalCloseButton";

export type HubAuthPromptProps = {
  title: string;
  sub?: string;
  loginLabel?: string;
  headerLeading?: ReactNode;
  onSignIn: () => void;
  onDismiss?: () => void;
  secondaryAction?: ReactNode;
  className?: string;
};

/**
 * @deprecated V1 — removed from golden auth flow. Use `HubAuthGate` / `HubAuthGateModal` only.
 */
export function HubAuthPrompt({
  title,
  sub,
  loginLabel = "Sign in",
  headerLeading,
  onSignIn,
  onDismiss,
  secondaryAction,
  className = "",
}: HubAuthPromptProps) {
  return (
    <div
      className={`auth-gate-panel auth-gate-panel--prompt hub-modal-frame ${className}`.trim()}
    >
      {onDismiss ? (
        <HubModalCloseButton onClose={onDismiss} aria-label="Close sign-in prompt" />
      ) : null}
      {headerLeading ? <div className="auth-gate-brand">{headerLeading}</div> : null}
      <div className="auth-inline-title">{title}</div>
      {sub ? <div className="auth-inline-sub">{sub}</div> : null}
      <div className="auth-inline-actions">
        <button type="button" className="auth-inline-btn" onClick={onSignIn}>
          <LogIn size={compactIconSize(14)} aria-hidden />
          <span>{loginLabel}</span>
        </button>
        {secondaryAction}
      </div>
    </div>
  );
}
