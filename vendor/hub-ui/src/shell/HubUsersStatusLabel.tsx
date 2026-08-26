export type HubUsersStatusTone =
  | "online"
  | "offline"
  | "off"
  | "idle"
  | "active"
  | "age-fresh"
  | "age-recent"
  | "age-aging"
  | "age-days"
  | "age-week"
  | "age-stale";

export type HubUsersStatusLabelProps = {
  label: string;
  tone: HubUsersStatusTone;
  /** @deprecated Body cells use no hover tooltip — header hints only. */
  title?: string;
  capitalize?: boolean;
  /** Detail forms use field typography; directory tables retain the compact default. */
  variant?: "compact" | "detail";
  className?: string;
};

/** Directory table/card status — `hub-users-status` SSOT (Channels, Groups, Personalities). */
export function HubUsersStatusLabel({
  label,
  tone,
  capitalize = true,
  variant = "compact",
  className = "",
}: HubUsersStatusLabelProps) {
  return (
    <span
      className={`hub-users-status${capitalize ? "" : " hub-users-status--plain"}${
        variant === "detail" ? " hub-users-status--detail" : ""
      }${className ? ` ${className}` : ""}`}
    >
      <span className={`hub-users-status-dot hub-users-status-dot--${tone}`} aria-hidden />
      {label}
    </span>
  );
}

/** Boolean On/Off — green On · red Off (directory RAG, toggles, allowlist-style labels). */
export function HubUsersOnOffLabel({ on }: { on: boolean; title?: string }) {
  return (
    <HubUsersStatusLabel
      label={on ? "On" : "Off"}
      tone={on ? "online" : "off"}
    />
  );
}
