import type { ReactNode } from "react";
import { HubAdmSectionLabel } from "../shell/HubAdmSectionLabel";

/**
 * Settings Display child frame — Mail Modal `HubAdmSectionLabel` pill (sticker + badge).
 * Sibling pattern: Header · Format under Display.
 */
export function SettingsAdmSection({
  label,
  emoji,
  children,
  className = "",
}: {
  label: string;
  emoji: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`hub-settings-adm-section mb-3 last:mb-0${className ? ` ${className}` : ""}`}>
      <HubAdmSectionLabel header={{ label, headerEmoji: emoji }} />
      {children ? <div className="hub-settings-adm-section__rows">{children}</div> : null}
    </div>
  );
}
