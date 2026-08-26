import { ToggleRow } from "./primitives";
import type { HubDirectoryColumnHintContent } from "../table/HubDirectoryColumnHint";
import {
  useDirectoryManualSortEnabled,
  type DirectoryManualSortPrefs,
} from "../prefs/directory-manual-sort-prefs";

export type HubDirectoryManualSortToggleProps = {
  prefs: DirectoryManualSortPrefs;
  /** When false, render nothing (e.g. vault not in opt-in set). */
  visible?: boolean;
  labelHint?: HubDirectoryColumnHintContent;
  label?: string;
};

/**
 * Display → Table — "Allow manual column sort" (default OFF).
 * Pair with Fixed default order / DirectoryDefaultSortHint.
 */
export function HubDirectoryManualSortToggle({
  prefs,
  visible = true,
  labelHint,
  label = "Allow manual column sort",
}: HubDirectoryManualSortToggleProps) {
  const enabled = useDirectoryManualSortEnabled(prefs);
  if (!visible) return null;

  return (
    <ToggleRow
      label={label}
      labelHint={labelHint}
      on={enabled}
      onChange={() => prefs.write(!enabled)}
    />
  );
}
