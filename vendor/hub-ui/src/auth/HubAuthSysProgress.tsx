/** Shared SYS progress capsule — HubAuthGateModal busy + boot wait surfaces. */
export type HubAuthSysProgressProps = {
  label: string;
  className?: string;
};

export function HubAuthSysProgress({ label, className }: HubAuthSysProgressProps) {
  const rootClass = className ? `auth-gate-progress ${className}` : "auth-gate-progress";
  return (
    <p className={rootClass} role="status" aria-live="polite">
      <span className="auth-gate-progress__prefix">SYS</span>
      <span className="auth-gate-progress__dot" aria-hidden />
      <span className="auth-gate-progress__label">{label}</span>
    </p>
  );
}
