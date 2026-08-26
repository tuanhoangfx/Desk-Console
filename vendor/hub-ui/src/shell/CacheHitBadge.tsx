/** Small indicator when API response was served from worker cache. */
export function CacheHitBadge() {
  return (
    <span
      className="inline-flex h-[var(--hub-control-h)] shrink-0 items-center rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-2 text-[10px] font-medium text-cyan-200"
      title="Served from server cache — refresh for live data"
    >
      Cached
    </span>
  );
}
