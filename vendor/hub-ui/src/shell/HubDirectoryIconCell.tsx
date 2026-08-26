import type { HubBrandIconId } from "../lib/resolve-hub-brand-icon";
import { resolveHubBrandIcon } from "../lib/resolve-hub-brand-icon";
import { compactIconSize } from "../ui-scale";
import { useHubBrandImageGate } from "../lib/use-hub-brand-image-gate";
import type { HubBrandIconShell } from "./filter-dropdown-primitives";
import type { HubGlyphComponent } from "../types/filter-badge";

export type HubDirectoryIconCellProps = {
  icon?: HubGlyphComponent;
  brandId?: HubBrandIconId;
  imageSrc?: string;
  imageShell?: HubBrandIconShell;
  imageAlt?: string;
  label: string;
  iconClassName?: string;
  /** @deprecated Body cells use no hover tooltip — header hints only. */
  title?: string;
};

/** Directory table imgs — plain contain; no filter-dropdown tile/circle chrome. */
function directoryBrandImgClass(shell: HubBrandIconShell): string {
  if (shell === "tile") return "hub-directory-icon-cell__img hub-directory-brand-icon--tile";
  return "hub-directory-icon-cell__img";
}

function DirectoryBrandImg({
  src,
  shell,
  alt,
  fallbackIcon: Fallback,
}: {
  src: string;
  shell: HubBrandIconShell;
  alt: string;
  fallbackIcon?: HubGlyphComponent;
}) {
  const { failed, imgSrc, onError } = useHubBrandImageGate(src);
  if (failed || !imgSrc) {
    return Fallback ? <Fallback size={compactIconSize(14)} strokeWidth={2.25} /> : null;
  }
  return (
    <img
      src={imgSrc}
      alt={alt}
      className={directoryBrandImgClass(shell)}
      loading="lazy"
      decoding="async"
      draggable={false}
      referrerPolicy="no-referrer"
      onError={onError}
    />
  );
}

/** Directory table icon + label — platform/proxy/status parity (Scripts platform cell SSOT). */
export function HubDirectoryIconCell({
  icon: Icon,
  brandId,
  imageSrc,
  imageShell = "bare",
  imageAlt = "",
  label,
  iconClassName = "text-indigo-300",
}: HubDirectoryIconCellProps) {
  const brand = brandId ? resolveHubBrandIcon(brandId) : null;
  const resolvedSrc = brand?.src ?? imageSrc;
  const resolvedShell = brand?.shell ?? imageShell;

  return (
    <span className="hub-directory-icon-cell">
      <span className={`hub-directory-icon-cell__icon ${iconClassName}`} aria-hidden>
        {resolvedSrc ? (
          <DirectoryBrandImg
            src={resolvedSrc}
            shell={resolvedShell}
            alt={imageAlt}
            fallbackIcon={Icon}
          />
        ) : Icon ? (
          <Icon size={compactIconSize(14)} strokeWidth={2.25} />
        ) : null}
      </span>
      <span className="hub-directory-icon-cell__label">{label}</span>
    </span>
  );
}
