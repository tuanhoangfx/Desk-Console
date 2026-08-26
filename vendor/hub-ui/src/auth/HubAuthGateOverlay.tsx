import type { ReactNode } from "react";
import { createPortal } from "react-dom";

export type HubAuthGateOverlayProps = {
  children: ReactNode;
  /** Click dimmed backdrop (e.g. offline / dismiss prompt). */
  onBackdropClick?: () => void;
  /** Below login modal (2000). */
  zIndex?: number;
  ariaLabel?: string;
};

/**
 * @deprecated V1 — prompt overlay removed. Use `HubAuthGateModal` backdrop only.
 */
export function HubAuthGateOverlay({
  children,
  onBackdropClick,
  zIndex = 1990,
  ariaLabel = "Sign in required",
}: HubAuthGateOverlayProps) {
  return createPortal(
    <div
      className="auth-gate-overlay"
      style={{ zIndex }}
      role="region"
      aria-label={ariaLabel}
    >
      <div
        className="auth-gate-overlay__backdrop"
        aria-hidden="true"
        onClick={onBackdropClick}
      />
      <div className="auth-gate-overlay__stage">{children}</div>
    </div>,
    document.body,
  );
}
