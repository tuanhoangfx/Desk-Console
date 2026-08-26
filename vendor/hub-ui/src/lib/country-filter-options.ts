import type { FilterOption } from "../shell/FilterBar";
import { HUB_COUNTRY_CATALOG } from "./country-catalog";
import { flagsApiUrl } from "./locale-flag";

export function buildHubCountryFilterOptions(extraValues: readonly string[] = []): FilterOption[] {
  const seen = new Set<string>();
  const options: FilterOption[] = [];

  for (const entry of HUB_COUNTRY_CATALOG) {
    if (seen.has(entry.code)) continue;
    seen.add(entry.code);
    options.push({
      value: entry.code,
      label: entry.name,
      iconSrc: flagsApiUrl(entry.code, "flat", 24),
    });
  }

  for (const raw of extraValues) {
    const trimmed = raw.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    options.push({
      value: trimmed,
      label: trimmed,
    });
  }

  return options;
}

export function hubCountryFilterOption(code: string): FilterOption | null {
  const entry = HUB_COUNTRY_CATALOG.find((row) => row.code === code);
  if (!entry) return null;
  return {
    value: entry.code,
    label: entry.name,
    iconSrc: flagsApiUrl(entry.code, "flat", 24),
  };
}
