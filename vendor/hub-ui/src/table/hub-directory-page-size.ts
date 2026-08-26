/** When a directory has more than this many rows, cap page size for render perf (P0020 parity). */
export const HUB_LARGE_DIRECTORY_PAGE_THRESHOLD = 500;

/** Max rows per page for large directories (table + card pager). */
export const HUB_LARGE_DIRECTORY_MAX_PAGE = 50;

export function resolveLargeDirectoryPageSize(itemCount: number, userPageSize: number): number {
  if (itemCount <= HUB_LARGE_DIRECTORY_PAGE_THRESHOLD) return userPageSize;
  return Math.min(userPageSize, HUB_LARGE_DIRECTORY_MAX_PAGE);
}
