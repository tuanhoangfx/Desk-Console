import type { ComponentType } from "react";

export type MetricBadgeTone = "ok" | "bad" | "warn" | "neutral";

/** Lucide + hub glyphs — size accepts string|number (Lucide propTypes). */
export type HubGlyphComponent = ComponentType<{
  size?: number | string;
  className?: string;
  strokeWidth?: number | string;
  /** Decorative glyphs are hidden from AT — every call site passes this. */
  "aria-hidden"?: boolean;
}>;

/** Portable filter/badge icon metadata (full registry lives in each app's `lib/badge-registry`). */
export type FilterIconMeta = {
  icon: HubGlyphComponent;
  className: string;
};

export type BadgeSpec = {
  label: string;
  iconMeta: FilterIconMeta;
  tone?: MetricBadgeTone;
  variantClass?: string;
};
