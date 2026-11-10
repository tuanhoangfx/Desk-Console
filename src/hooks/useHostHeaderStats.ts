import { useMemo } from "react";
import { useHeaderWide, type TabHeaderStatItem } from "@tool-workspace/hub-ui";
import { buildHostHeaderStats } from "../lib/host-header-metrics";
import { useHostMetrics } from "./useHostMetrics";

export { useHeaderWide };

/** CPU / RAM header chips — P0003 Profiles centerStats SSOT. */
export function useHostHeaderStats(): TabHeaderStatItem[] {
  const metrics = useHostMetrics();
  const wide = useHeaderWide();
  return useMemo(() => buildHostHeaderStats(metrics, { wide }), [metrics, wide]);
}
