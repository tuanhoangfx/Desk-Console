/** English relative time for hub directory tables (UI copy). */
export function formatHubRelativeTime(ts?: number | null, now = Date.now()): string {
  if (!ts) return "—";
  const d = new Date(ts);
  if (!Number.isFinite(d.getTime())) return "—";

  const diff = now - ts;
  if (diff < 45_000) return "Just now";

  const min = Math.floor(diff / 60_000);
  if (min < 60) return `${min}m ago`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;

  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;

  const week = Math.floor(day / 7);
  if (week < 5) return `${week}w ago`;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  }).format(d);
}
