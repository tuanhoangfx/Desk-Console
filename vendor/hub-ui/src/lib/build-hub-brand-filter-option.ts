import type { FilterOption } from "../shell/FilterBar";
import type { HubBrandIconShell } from "../shell/filter-dropdown-primitives";
import {
  HUB_DIRECTORY_BRAND_EMPTY_GLYPH,
  resolveHubBrandFallbackGlyph,
  resolveHubBrandFamilyHits,
  resolveHubBrandIcon,
  resolveHubBrandIconByMatch,
  type HubBrandIconId,
  type HubBrandIconMeta,
} from "./resolve-hub-brand-icon";

export type HubBrandFilterIcon = {
  src: string;
  /** Dedicated + hyphen-family fallbacks for FilterBrandImg 404 walk. */
  srcs?: string[];
  shell?: HubBrandIconShell;
  /** Optional display override — omit for product/service facets (label = value). */
  label?: string;
};

/**
 * Icon-only brand payload for directory filters — **no** company `label`.
 * Use with `buildHubBrandFilterOption(value, undefined, hubBrandFilterIcon(hit))`
 * so facet text stays the storage/product key (ChatGPT), not registry company (OpenAI).
 */
export function hubBrandFilterIcon(
  brand: { src: string; srcs?: string[]; shell?: HubBrandIconShell } | null | undefined,
): HubBrandFilterIcon | null {
  if (!brand?.src) return null;
  const srcs = [...new Set((brand.srcs?.length ? brand.srcs : [brand.src]).filter(Boolean))];
  return { src: brand.src, srcs, shell: brand.shell ?? "bare" };
}

/** Dedicated match plus hyphen-family siblings (`google-one` → `google`). */
export function hubBrandFilterIconFromHits(
  hits: ReadonlyArray<{ src: string; shell?: HubBrandIconShell } | null | undefined>,
): HubBrandFilterIcon | null {
  const valid = hits.filter((hit): hit is { src: string; shell?: HubBrandIconShell } => Boolean(hit?.src));
  if (!valid[0]) return null;
  return hubBrandFilterIcon({
    src: valid[0].src,
    srcs: valid.map((hit) => hit.src),
    shell: valid[0].shell,
  });
}

/** Filter glyph fields from a product/service label — family fallback before ⭕. */
export function hubBrandFilterGlyphFields(
  label: string,
): Pick<FilterOption, "iconSrc" | "iconSrcs" | "iconShell" | "emoji"> {
  const brand = hubBrandFilterIconFromHits(resolveHubBrandFamilyHits(resolveHubBrandIconByMatch(label)));
  if (!brand) return { emoji: resolveHubBrandFallbackGlyph(label) };
  return { iconSrc: brand.src, iconSrcs: brand.srcs, iconShell: brand.shell };
}

/** Chart / KPI brand fields — same family walk as filter dropdowns. */
export function hubBrandIconSrcFields(
  hit: HubBrandIconMeta | null | undefined,
): { iconSrc: string; iconSrcs: string[]; iconShell: HubBrandIconShell } | null {
  const brand = hubBrandFilterIconFromHits(resolveHubBrandFamilyHits(hit ?? null));
  if (!brand?.src) return null;
  return { iconSrc: brand.src, iconSrcs: brand.srcs ?? [brand.src], iconShell: brand.shell ?? "bare" };
}

export function hubBrandIconSrcFieldsById(id: HubBrandIconId) {
  return hubBrandIconSrcFields(resolveHubBrandIcon(id));
}

export function hubBrandIconSrcFieldsByLabel(label: string) {
  return hubBrandIconSrcFields(resolveHubBrandIconByMatch(label));
}

/**
 * Filter dropdown row — brand icon (directory 16px / filter 13px) + label (P0020 Services SSOT).
 *
 * **Facet label contract:** pass `hubBrandFilterIcon(hit)` (or `{ src, shell }` only) for
 * product/service facets so `label` defaults to `value`. Do **not** pass hub registry
 * `brand.label` (company name) — e.g. ChatGPT rows must show "ChatGPT", not "OpenAI".
 * Pass `label` only when the display string is intentionally different from `value`
 * (formatted platform id, i18n, etc.).
 */
export function buildHubBrandFilterOption(
  value: string,
  _count?: number,
  brand?: HubBrandFilterIcon | null,
  resolveSrc: (src: string) => string = (s) => s,
): FilterOption {
  return {
    value,
    label: brand?.label ?? value,
    ...(brand?.src
      ? {
          iconSrc: resolveSrc(brand.src),
          iconSrcs: (brand.srcs ?? [brand.src]).map(resolveSrc),
          iconShell: brand.shell ?? "bare",
        }
      : { emoji: HUB_DIRECTORY_BRAND_EMPTY_GLYPH }),
  };
}
