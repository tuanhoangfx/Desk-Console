import type { HubGlyphComponent } from "../types/filter-badge";
import type { HubBrandIconId } from "../lib/resolve-hub-brand-icon";
import { compactIconSize, HUB_CHROME_ICON_PX } from "../ui-scale";
import { HubBrandIcon } from "./HubBrandIcon";

type Props = {
  titleIcon: HubGlyphComponent;
  titleIconClass?: string;
  titleBrandIcon?: HubBrandIconId;
  /** Custom SVG/raster tab mark — takes precedence over Lucide/brand when set. */
  titleIconSrc?: string;
  /** Sheet-parity emoji — takes precedence over `titleIconSrc` / Lucide when set. */
  titleEmojiGlyph?: string;
};

/** Tab header title glyph — emoji sticker, custom SVG, Lucide tone icon, or shared Hub brand mark. */
export function HubTabTitleIcon({
  titleIcon: TitleIcon,
  titleIconClass = "",
  titleBrandIcon,
  titleIconSrc,
  titleEmojiGlyph,
}: Props) {
  if (titleEmojiGlyph) {
    return (
      <span className="hub-users-th-emoji shrink-0 leading-none" style={{ fontSize: HUB_CHROME_ICON_PX }} aria-hidden>
        {titleEmojiGlyph}
      </span>
    );
  }

  if (titleIconSrc) {
    return (
      <img
        src={titleIconSrc}
        alt=""
        width={HUB_CHROME_ICON_PX}
        height={HUB_CHROME_ICON_PX}
        className={`shrink-0 ${titleIconClass}`}
        aria-hidden
      />
    );
  }

  if (titleBrandIcon) {
    return <HubBrandIcon brandId={titleBrandIcon} size={HUB_CHROME_ICON_PX} />;
  }

  return (
    <TitleIcon
      size={compactIconSize(HUB_CHROME_ICON_PX)}
      className={`shrink-0 ${titleIconClass}`}
      aria-hidden
    />
  );
}
