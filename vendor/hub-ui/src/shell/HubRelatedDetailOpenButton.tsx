import { Fingerprint, type LucideIcon } from "lucide-react";
import type { MouseEvent } from "react";

/** SSOT glyph — open a related entity's detail modal on the current screen (not an external URL). */
export const HUB_RELATED_DETAIL_OPEN_ICON: LucideIcon = Fingerprint;
/** @deprecated Use `HUB_RELATED_DETAIL_OPEN_ICON` — Partner is no longer a special case. */
export const HUB_RELATED_PARTNER_DETAIL_OPEN_ICON: LucideIcon = Fingerprint;
export const HUB_RELATED_DETAIL_OPEN_ICON_SIZE = 12;

export type HubRelatedDetailOpenButtonProps = {
  /** English label — `title` + `aria-label` (e.g. View Customer Detail). */
  label: string;
  onOpen: () => void;
  className?: string;
  /** Visible but inert — e.g. Teams Manual Source (no Service/Mail vault). */
  disabled?: boolean;
  /** Override default Fingerprint only when a distinct create/entity glyph is required. */
  icon?: LucideIcon;
};

/**
 * Trailing directory/ADM control: jump from this row/field to another entity's detail modal.
 * Style: `.hub-directory-row-open`. Do not use for http(s) / Zalo / Telegram (HubContactOpenAction).
 */
export function HubRelatedDetailOpenButton({
  label,
  onOpen,
  className,
  disabled = false,
  icon: Icon = HUB_RELATED_DETAIL_OPEN_ICON,
}: HubRelatedDetailOpenButtonProps) {
  return (
    <button
      type="button"
      className={["hub-directory-row-open", className].filter(Boolean).join(" ")}
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        if (disabled) return;
        onOpen();
      }}
    >
      <Icon size={HUB_RELATED_DETAIL_OPEN_ICON_SIZE} aria-hidden />
    </button>
  );
}
