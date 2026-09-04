import type { FilterOption } from "../shell/FilterBar";
import { HUB_COUNTRY_CATALOG } from "./country-catalog";
import { countryCodeForLocale, flagsApiUrl } from "./locale-flag";

function hubFlagFilterIcon(countryCode: string): Pick<FilterOption, "iconSrc" | "iconShell"> {
  return {
    iconSrc: flagsApiUrl(countryCode, "flat", 24),
    iconShell: "bare",
  };
}

export function buildHubCountryFilterOptions(extraValues: readonly string[] = []): FilterOption[] {
  const seen = new Set<string>();
  const options: FilterOption[] = [];

  for (const entry of HUB_COUNTRY_CATALOG) {
    if (seen.has(entry.code)) continue;
    seen.add(entry.code);
    options.push({
      value: entry.code,
      label: entry.name,
      ...hubFlagFilterIcon(entry.code),
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
    ...hubFlagFilterIcon(entry.code),
  };
}

/** Locale / region filter row — same `iconSrc` + flagsapi SSOT as P0020 country / P0005 brand filters. */
export function hubLocaleFlagFilterOption(locale: string, label?: string): FilterOption {
  const iso = countryCodeForLocale(locale).toUpperCase();
  const country = HUB_COUNTRY_CATALOG.find((row) => row.code === iso);
  return {
    value: locale,
    label: label ?? country?.name ?? locale,
    ...hubFlagFilterIcon(iso),
  };
}
