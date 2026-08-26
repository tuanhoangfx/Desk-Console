import type { LucideIcon } from "lucide-react";
import { compactIconSize, HUB_CHROME_ICON_PX } from "../ui-scale";
import type { HubBrandIconId } from "../lib/resolve-hub-brand-icon";
import { HubBrandIcon } from "./HubBrandIcon";
import { navIconClass, type NavIconTone } from "./sidebar-nav-tones";

export type HubNavIconProps = {
  icon: LucideIcon;
  iconTone: NavIconTone;
  active: boolean;
  brandIcon?: HubBrandIconId;
  /** Raster/SVG mark — overrides Lucide + brand when set. */
  iconSrc?: string;
};

/** Sidebar nav glyph — Lucide tone icon, shared brand mark, or custom SVG. */
export function HubNavIcon({ icon: Icon, iconTone, active, brandIcon, iconSrc }: HubNavIconProps) {
  const px = compactIconSize(HUB_CHROME_ICON_PX);

  if (iconSrc) {
    return (
      <img
        src={iconSrc}
        alt=""
        width={px}
        height={px}
        className={`shrink-0 ${navIconClass(iconTone, active)}`}
        aria-hidden
      />
    );
  }

  if (brandIcon) {
    return <HubBrandIcon brandId={brandIcon} size={px} />;
  }

  return <Icon size={px} className={`shrink-0 ${navIconClass(iconTone, active)}`} aria-hidden />;
}
