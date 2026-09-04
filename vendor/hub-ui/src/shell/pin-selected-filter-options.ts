import { parseHubFilterDateValue } from "../lib/hub-filter-date-value";

/** Minimal option shape — FilterBar + ClickFilter share this pin contract. */
export type PinableFilterOption = {
  value: string;
  dateInput?: boolean;
};

export function isFilterOptionSelected(
  option: PinableFilterOption,
  selected: readonly string[],
): boolean {
  if (selected.includes(option.value)) return true;
  return Boolean(option.dateInput && selected.some((value) => parseHubFilterDateValue(value)));
}

/**
 * Stable-partition: checked options first (catalog order), then the rest.
 * Sticky default is not a user tick — do not lift it.
 */
export function pinSelectedFilterOptions<T extends PinableFilterOption>(
  options: readonly T[],
  selected: readonly string[],
  opts?: { stickyDefault?: string },
): T[] {
  const active =
    opts?.stickyDefault && selected.length === 1 && selected[0] === opts.stickyDefault
      ? []
      : selected;
  if (active.length === 0) return options.slice();
  const pinned: T[] = [];
  const rest: T[] = [];
  for (const option of options) {
    if (isFilterOptionSelected(option, active)) pinned.push(option);
    else rest.push(option);
  }
  return pinned.length === 0 ? options.slice() : [...pinned, ...rest];
}

/**
 * Keep ticked values visible when the catalog is empty or stale
 * (Teams window facets omit Plan Package → "6 selected" + "No matches").
 */
export function appendMissingSelectedFilterOptions<T extends PinableFilterOption & { label?: string }>(
  options: readonly T[],
  selected: readonly string[],
): T[] {
  if (!selected.length) return options.slice();
  const have = new Set(options.map((option) => option.value));
  const extra: T[] = [];
  for (const raw of selected) {
    const value = raw.trim();
    if (!value || have.has(value)) continue;
    have.add(value);
    extra.push({ value, label: value } as T);
  }
  return extra.length ? [...extra, ...options] : options.slice();
}
