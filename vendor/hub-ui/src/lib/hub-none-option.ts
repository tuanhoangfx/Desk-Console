import type { FilterOption } from "../shell/FilterBar";

/**
 * Canonical "None"/empty marker for filter facets and detail dropdowns — 🚫 None.
 * Hub-UI SSOT so every tool renders the empty option identically and cannot drift.
 */
export const HUB_NONE_EMOJI = "🚫";
export const HUB_NONE_LABEL = "None";

/**
 * Build the canonical 🚫 None option. Prefer an empty-string `value` so the
 * shared persist normalization (`"" → null`) applies automatically; pass a
 * distinct sentinel only for a multi-select facet that must tell "None selected"
 * apart from "no filter" (and then guard that sentinel at the persist boundary).
 */
export function hubNoneFilterOption(
  value = "",
  extra?: Partial<Omit<FilterOption, "value" | "label" | "emoji">>,
): FilterOption {
  return { value, label: HUB_NONE_LABEL, emoji: HUB_NONE_EMOJI, ...extra };
}
