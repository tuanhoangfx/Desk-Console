import { useCallback, useEffect, useMemo, useState } from "react";
import {
  patchWorkspacePeriod,
  readWorkspacePeriod,
  subscribeHubListPrefs,
  type WorkspacePeriodKey,
  type WorkspacePeriodPrefs,
  type WorkspacePeriodScope,
} from "../lib/hub-workspace-period";

/**
 * URL-synced workspace period — one scope per Hub tab.
 *
 * Returns a referentially-stable object: the value only changes identity when the
 * persisted period actually changes. This is load-bearing — directory pipelines key
 * O(n) filter/haystack/sort memos off this value (e.g. `useTabFrozenRows([rows, period])`),
 * so a fresh object every render would re-run the whole pipeline on unrelated re-renders
 * (checkbox toggle, hover), causing input lag. Setters are stable via useCallback.
 */
export function useWorkspacePeriod(
  scope: WorkspacePeriodScope,
  defaultRange: WorkspacePeriodKey = "all",
) {
  const [period, setPeriod] = useState<WorkspacePeriodPrefs>(() => readWorkspacePeriod(scope, defaultRange));

  useEffect(() => {
    return subscribeHubListPrefs(() => setPeriod(readWorkspacePeriod(scope, defaultRange)));
  }, [scope, defaultRange]);

  const setRange = useCallback(
    (range: WorkspacePeriodKey) => patchWorkspacePeriod(scope, { range }, defaultRange),
    [scope, defaultRange],
  );
  const setCustomMonth = useCallback(
    (customMonth: string) => patchWorkspacePeriod(scope, { customMonth, range: "customMonth" }, defaultRange),
    [scope, defaultRange],
  );
  const setCustomStartDate = useCallback(
    (customStartDate: string) => patchWorkspacePeriod(scope, { customStartDate }, defaultRange),
    [scope, defaultRange],
  );
  const setCustomEndDate = useCallback(
    (customEndDate: string) => patchWorkspacePeriod(scope, { customEndDate }, defaultRange),
    [scope, defaultRange],
  );
  const patch = useCallback(
    (patch: Partial<WorkspacePeriodPrefs>) => patchWorkspacePeriod(scope, patch, defaultRange),
    [scope, defaultRange],
  );

  return useMemo(
    () => ({ ...period, setRange, setCustomMonth, setCustomStartDate, setCustomEndDate, patch }),
    [period, setRange, setCustomMonth, setCustomStartDate, setCustomEndDate, patch],
  );
}
