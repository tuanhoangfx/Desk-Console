import { useMemo } from "react";
import { HubMultiFilterDropdown, type FilterOption } from "../shell/FilterBar";
import { defaultsForPrefItems, isHubPrefVisible } from "./hub-display-visibility";
import type { PrefItem } from "./types";

export type HubDisplayVisibilityMenuProps = {
  label: string;
  iconKey: "settings.kpi" | "settings.charts" | "settings.headerStats";
  items: PrefItem[];
  visibleSet: Set<string> | null;
  defaultKeys?: Set<string>;
  maxVisible?: number;
  onToggle: (key: string) => void;
  onCapReached?: () => void;
};

/** Display visibility — same FilterBar multi panel as every Hub dropdown (search + pin). */
export function HubDisplayVisibilityMenu({
  label,
  items,
  visibleSet,
  defaultKeys,
  maxVisible,
  onToggle,
  onCapReached,
}: HubDisplayVisibilityMenuProps) {
  const defaults = defaultsForPrefItems(items, defaultKeys);
  const selected = useMemo(
    () => items.filter((item) => isHubPrefVisible(visibleSet, defaults, item.key)).map((item) => item.key),
    [defaults, items, visibleSet],
  );
  const visibleCount = selected.length;
  const options = useMemo<FilterOption[]>(
    () =>
      items.map((item) => ({
        value: item.key,
        label: item.label,
        emoji: item.emoji,
        labelHint: item.labelHint,
      })),
    [items],
  );

  if (items.length === 0) return null;

  return (
    <HubMultiFilterDropdown
      filter={{ key: `hub-display-vis-${label}`, label, options }}
      selected={selected}
      onChange={(next) => {
        let keys = next;
        if (maxVisible != null && keys.length > maxVisible) {
          onCapReached?.();
          keys = keys.slice(0, maxVisible);
        }
        const want = new Set(keys);
        const have = new Set(selected);
        for (const item of items) {
          if (want.has(item.key) !== have.has(item.key)) onToggle(item.key);
        }
      }}
      triggerLabel={`${label} ${visibleCount}/${maxVisible ?? items.length}`}
      triggerTitle={`${label} visibility`}
    />
  );
}
