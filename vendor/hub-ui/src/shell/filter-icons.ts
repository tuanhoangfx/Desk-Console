import { defaultFilterAllIcon } from "./filter-default-icons";
import type { FilterIconMeta } from "../types/filter-badge";

export type { FilterIconMeta, HubGlyphComponent } from "../types/filter-badge";
export { defaultFilterAllIcon, DEFAULT_FILTER_ALL_ICONS } from "./filter-default-icons";
export { FILTER_BAR_SEMANTIC_KEY, semanticFilterAllIcon } from "./filter-semantic-keys";

export type FilterIconResolver = {
  resolveOption: (filterKey: string, value: string) => FilterIconMeta | null;
  resolveAll: (filterKey: string) => FilterIconMeta | null;
};

let resolver: FilterIconResolver = {
  resolveOption: () => null,
  resolveAll: () => null,
};

export function configureFilterIcons(next: Partial<FilterIconResolver> = {}) {
  const prev = resolver;
  resolver = {
    resolveOption: next.resolveOption ?? prev.resolveOption ?? (() => null),
    resolveAll: next.resolveAll ?? prev.resolveAll ?? (() => null),
  };
}

/** Extend app resolver without wiping workspace badge-registry icons. */
export function mergeFilterIconResolver(partial: Partial<FilterIconResolver>) {
  const prev = resolver;
  configureFilterIcons({
    resolveAll: (filterKey) => partial.resolveAll?.(filterKey) ?? prev.resolveAll(filterKey),
    resolveOption: (filterKey, value) =>
      partial.resolveOption?.(filterKey, value) ?? prev.resolveOption(filterKey, value),
  });
}

export function resolveFilterOptionIcon(filterKey: string, value: string) {
  return resolver.resolveOption?.(filterKey, value) ?? null;
}

export function resolveFilterAllIcon(filterKey: string) {
  return resolver.resolveAll?.(filterKey) ?? defaultFilterAllIcon(filterKey);
}
