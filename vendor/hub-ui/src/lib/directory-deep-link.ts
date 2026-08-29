/** Share / notify URL: `?id=<row uuid>` on the current directory path. */
export function readDirectoryDeepLinkId(
  search = typeof window === "undefined" ? "" : window.location.search,
  param = "id",
): string {
  return new URLSearchParams(search).get(param)?.trim() || "";
}

export function findDirectoryDeepLinkRow<T>(
  rows: readonly T[],
  id: string,
  idOf: (row: T) => string,
): T | null {
  const key = String(id || "").trim();
  if (!key) return null;
  return rows.find((row) => idOf(row) === key) ?? null;
}
