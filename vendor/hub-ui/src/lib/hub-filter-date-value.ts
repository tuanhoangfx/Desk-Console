/** FilterBar date-input values — `date:YYYY-MM-DD` (HubFilterDatePicker contract). */
export const HUB_FILTER_DATE_VALUE_PREFIX = "date:";

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export function hubFilterDateValue(isoDate: string): string {
  return `${HUB_FILTER_DATE_VALUE_PREFIX}${isoDate.trim()}`;
}

export function parseHubFilterDateValue(value: string | null | undefined): string | null {
  const raw = String(value ?? "").trim();
  if (!raw.startsWith(HUB_FILTER_DATE_VALUE_PREFIX)) return null;
  const iso = raw.slice(HUB_FILTER_DATE_VALUE_PREFIX.length);
  return ISO_DAY.test(iso) ? iso : null;
}

export function isHubFilterDateValue(value: string | null | undefined): boolean {
  return parseHubFilterDateValue(value) != null;
}
