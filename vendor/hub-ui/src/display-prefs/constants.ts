export type TimeRange = "all" | "today" | "yesterday" | "7d" | "30d" | "90d" | "1y";

export const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "1y", label: "1 year" },
  { value: "all", label: "All" },
];

export const LIMIT_OPTIONS = [25, 50, 100, 200, 500] as const;

/** Table/card pager row counts (URL `tpage`) — subset of LIMIT_OPTIONS. */
export const TABLE_PAGE_SIZE_OPTIONS = [20, 25, 50, 100] as const;
