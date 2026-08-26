import type { TabHeaderStatItem } from "./AppTabHeader";

/** Header-stat click wiring — tools pass their prefKey map (P0003 Profiles / Extensions). */
export function withPrefKeyHeaderStatClicks<T>(
  stats: TabHeaderStatItem[],
  isActive: (key: string) => boolean,
  apply: (key: string) => T | null,
  onApply: (next: T) => void,
): TabHeaderStatItem[] {
  return stats.map((stat) => ({
    ...stat,
    active: isActive(stat.key),
    onClick: () => {
      const next = apply(stat.key);
      if (next == null) return;
      onApply(next);
    },
  }));
}
