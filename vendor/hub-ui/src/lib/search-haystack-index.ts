export type SearchRowKey = string | number;

/** Normalize search text once for index/query comparisons. */
export function normalizeSearchText(text: string | null | undefined): string {
  return String(text ?? "").trim().toLowerCase();
}

/** Build a lowercase haystack index keyed by row id (avoid rebuilding per keystroke). */
export function buildSearchHaystackIndex<Row>(
  rows: readonly Row[],
  keyOf: (row: Row) => SearchRowKey,
  haystackOf: (row: Row) => string | null | undefined,
): Map<SearchRowKey, string> {
  const index = new Map<SearchRowKey, string>();
  for (const row of rows) {
    index.set(keyOf(row), normalizeSearchText(haystackOf(row)));
  }
  return index;
}
