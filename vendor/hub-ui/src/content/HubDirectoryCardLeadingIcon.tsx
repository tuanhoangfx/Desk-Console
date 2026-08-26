import type { LucideIcon } from "lucide-react";
import { navIconClass, type NavIconTone } from "../shell/sidebar-nav-tones";
import { HUB_CHROME_ICON_PX } from "../ui-scale";
import { HubDirectoryCardLeadingTile } from "./HubDirectoryCardLeadingTile";

/** Golden directory card header icon box — aligns with MetricBadge `h-[22px]`. */
export const HUB_DIRECTORY_CARD_ICON_BOX_PX = 22;
export const HUB_DIRECTORY_CARD_ICON_GLYPH_PX = HUB_CHROME_ICON_PX;

export type HubDirectoryCardLeadingIconProps = {
  icon: LucideIcon;
  tone?: NavIconTone;
  statusColor?: string;
  statusTitle?: string;
  className?: string;
};

/** Bordered nav-tone icon tile + optional status dot for directory card headers. */
export function HubDirectoryCardLeadingIcon({
  icon: Icon,
  tone = "indigo",
  statusColor,
  statusTitle,
  className = "",
}: HubDirectoryCardLeadingIconProps) {
  return (
    <HubDirectoryCardLeadingTile
      statusColor={statusColor}
      statusTitle={statusTitle}
      className={className}
      tileClassName="hub-directory-card-leading-tile--muted"
    >
      <Icon
        className={`hub-directory-card-leading-glyph ${navIconClass(tone, true)}`}
        strokeWidth={2}
        aria-hidden
      />
    </HubDirectoryCardLeadingTile>
  );
}
