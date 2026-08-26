import { useEffect, useMemo, useState } from "react";
import { HubSingleFilterDropdown, type FilterOption } from "../shell/FilterBar";
import type { DirectoryFreezePrefs } from "../prefs/directory-freeze-prefs";

export type HubDirectoryFreezeColumnsSettingProps = {
  prefs: DirectoryFreezePrefs;
  /** Highest selectable freeze count (usually the visible column count, capped). */
  max: number;
  label?: string;
  onLog?: (message: string) => void;
};

/** Distinct dot color per option (0 = off/muted → warmer as more columns freeze). */
const FREEZE_DOT_COLORS = [
  "#64748b", // 0 Off — slate
  "#818cf8", // 1 — indigo
  "#38bdf8", // 2 — sky
  "#34d399", // 3 — emerald
  "#facc15", // 4 — amber
  "#fb923c", // 5 — orange
  "#f87171", // 6 — red
] as const;

function freezeOptionLabel(n: number): string {
  if (n === 0) return "Off";
  return `${n} column${n > 1 ? "s" : ""}`;
}

/**
 * Display-panel control — standard filter dropdown to pick how many leading columns stay frozen
 * during horizontal scroll. Options 0..max (0 = off) each carry a distinct color dot. Reusable
 * across tools; render inline at the top of the "Table & detail" panel (no separate subsection).
 */
export function HubDirectoryFreezeColumnsSetting({
  prefs,
  max,
  label = "Frozen columns",
  onLog,
}: HubDirectoryFreezeColumnsSettingProps) {
  const [count, setCount] = useState(prefs.read);

  useEffect(() => {
    const sync = () => setCount(prefs.read());
    window.addEventListener(prefs.changeEvent, sync);
    return () => window.removeEventListener(prefs.changeEvent, sync);
  }, [prefs]);

  const cap = Math.max(0, Math.floor(max));
  const options = useMemo<FilterOption[]>(
    () =>
      Array.from({ length: cap + 1 }, (_, n) => ({
        value: String(n),
        label: freezeOptionLabel(n),
        color: FREEZE_DOT_COLORS[Math.min(n, FREEZE_DOT_COLORS.length - 1)],
      })),
    [cap],
  );

  function pick(next: number) {
    prefs.write(next);
    setCount(next);
    onLog?.(next === 0 ? "Frozen columns: off" : `Frozen columns: ${next}`);
  }

  const current = Math.min(count, cap);

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="min-w-0 truncate text-xs font-medium text-[var(--muted)]">{label}</span>
      <HubSingleFilterDropdown
        filterKey="hub-frozen-columns"
        label={label}
        options={options}
        value={String(current)}
        onChange={(v) => pick(Number.parseInt(v, 10) || 0)}
        triggerFormat="value"
        className="shrink-0"
      />
    </div>
  );
}
