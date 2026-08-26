import { type ReactNode } from "react";
import { compactIconSize, HUB_CHROME_ICON_PX } from "../ui-scale";
import { resolveHubBrandIcon, type HubBrandIconId } from "../lib/resolve-hub-brand-icon";
import { useHubBrandImageGate } from "../lib/use-hub-brand-image-gate";
import { hubBrandIconImgClass, HUB_BRAND_ICON_BARE_CLASS, type HubBrandIconShell } from "./filter-dropdown-primitives";

export type HubBrandIconProps = {
  brandId: HubBrandIconId;
  size?: number;
  className?: string;
  /** `chrome` — sidebar/tab header (14px). `filter` — dropdown rows (14px + filter classes). */
  context?: "chrome" | "filter";
  title?: string;
  /** Rendered when the brand id is unknown or the image fails to load (e.g. cached 404). */
  fallback?: ReactNode;
};

function chromeImgClass(shell: HubBrandIconShell): string {
  if (shell === "bare") return HUB_BRAND_ICON_BARE_CLASS;
  if (shell === "darkInk") return "hub-chrome-brand-icon hub-chrome-brand-icon--dark-ink";
  return "hub-chrome-brand-icon hub-chrome-brand-icon--tile";
}

/** Shared brand logo — SSOT for Zalo, Facebook, and future platform marks. */
export function HubBrandIcon({
  brandId,
  size = HUB_CHROME_ICON_PX,
  className = "",
  context = "chrome",
  title,
  fallback,
}: HubBrandIconProps) {
  const hit = resolveHubBrandIcon(brandId);
  const { failed: imgFailed, imgSrc, onError } = useHubBrandImageGate(hit?.src);
  const px = compactIconSize(size);

  if (!hit || imgFailed || !imgSrc) return <>{fallback ?? null}</>;

  const imgClass =
    context === "filter" ? hubBrandIconImgClass(hit.shell) : chromeImgClass(hit.shell);

  return (
    <img
      src={imgSrc}
      alt=""
      width={px}
      height={px}
      title={title ?? hit.label}
      className={`shrink-0 object-contain${className ? ` ${className}` : ""} ${imgClass}`}
      loading="lazy"
      decoding="async"
      draggable={false}
      referrerPolicy="no-referrer"
      onError={onError}
    />
  );
}
