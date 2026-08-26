import type { ReactNode } from "react";

export type HubRuntimeChannelBadgeProps = {
  /** CSS modifier — `hub-runtime-channel-badge--{variant}` (e.g. profile, worker). */
  variant: string;
  label: string;
  icon: ReactNode;
  compact?: boolean;
  title?: string;
};

/**
 * Workflow-rail Console channel pill — icon + Title Case label.
 * Parity P0020 TodoHubBadge priority pills; SSOT for P0003 + P0027.
 */
export function HubRuntimeChannelBadge({
  variant,
  label,
  icon,
  compact = false,
  title,
}: HubRuntimeChannelBadgeProps) {
  return (
    <span
      className={`hub-runtime-channel-badge hub-runtime-channel-badge--${variant}${
        compact ? " hub-runtime-channel-badge--compact" : ""
      }`}
      title={title ?? label}
    >
      <span className="hub-runtime-channel-badge__icon" aria-hidden>
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </span>
  );
}
