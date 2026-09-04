import { useEffect, useState } from "react";
import { HUB_USER_ZOOM_DEFAULT } from "./hub-user-zoom";

/** Pre-zoom hub density; zoom default is 90% via `--hub-user-zoom-pct`. */
export const HUB_COMPACT_SCALE = 0.9;

/** Golden Lucide glyph — sidebar, tab header, directory card leading tile. */
export const HUB_CHROME_ICON_PX = 14;

/** Directory table header + filter facet glyph when panel mirrors table (P0020 twofa). */
export const HUB_DIRECTORY_HEADER_GLYPH_PX = 13;

function readZoomScale(): number {
  if (typeof document === "undefined") return HUB_USER_ZOOM_DEFAULT / 100;
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--hub-user-zoom-pct").trim();
  const pct = raw ? Number(raw) : HUB_USER_ZOOM_DEFAULT;
  return Number.isFinite(pct) ? pct / 100 : HUB_USER_ZOOM_DEFAULT / 100;
}

export function compactIconSize(px: number): number {
  return Math.max(1, Math.round(px * readZoomScale()));
}

/** SSR-safe icon size — hydrates with golden default, then syncs to live zoom. */
export function useCompactIconSize(px: number): number {
  const ssrPx = Math.max(1, Math.round((px * HUB_USER_ZOOM_DEFAULT) / 100));
  const [size, setSize] = useState(ssrPx);
  useEffect(() => {
    setSize(compactIconSize(px));
  }, [px]);
  return size;
}
