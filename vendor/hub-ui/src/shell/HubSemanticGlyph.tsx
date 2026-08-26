import type { HubGlyphComponent } from "../types/filter-badge";
import type { HubBrandIconId } from "../lib/resolve-hub-brand-icon";
import { compactIconSize } from "../ui-scale";
import { HubBrandIcon } from "./HubBrandIcon";

type Props = {
  icon?: HubGlyphComponent;
  className?: string;
  size?: number;
  brandIcon?: HubBrandIconId;
  /** KPI tiles keep the 20px sticker; compact is header/TOC only. */
  compact?: boolean;
};

/** Lucide glyph or shared Hub brand mark — KPI tiles, header stats, TOC. */
export function HubSemanticGlyph({
  icon: Icon,
  className = "",
  size = 14,
  brandIcon,
  compact = true,
}: Props) {
  const px = compact ? compactIconSize(size) : size;
  const lucide = Icon ? <Icon size={px} className={className} aria-hidden /> : null;
  if (brandIcon) {
    // Prefer the brand logo; degrade to the Lucide glyph when the image is missing/fails
    // (e.g. cached 404) so channel fields like Zalo/Telegram never render icon-less.
    return <HubBrandIcon brandId={brandIcon} size={size} className={className} fallback={lucide} />;
  }
  return lucide;
}
