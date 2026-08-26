import { useLayoutEffect, useRef, type ReactNode } from "react";
import type { KpiTileData } from "../shell/KpiStrip";

export type DirectoryBandHandlers = {
  setDirectoryKpis: (kpis: KpiTileData[] | undefined) => void;
  setDirectoryCharts: (charts: ReactNode | null) => void;
  setSectionRuleLabel: (label: string | undefined) => void;
};

export type DirectoryBandSyncSnapshot = {
  kpis?: KpiTileData[];
  charts?: ReactNode | null;
  sectionRuleLabel?: string;
  /** Stable fingerprint — e.g. kpiTilesSignature(kpis). */
  kpiKey?: string;
  /** Stable fingerprint — e.g. chartKeysSignature + series data. */
  chartsKey?: string;
  /**
   * Vault / directory identity. Changing it clears an empty band immediately
   * (Mail → Meta must not keep the previous screen's KPI for ~2s).
   * Same-scope empty push still stale-while-revalidate.
   */
  scopeKey?: string;
  /**
   * Destination vault already restored a band (P0020 session/memory cache).
   * Scope change + empty push must not wipe that restore.
   */
  keepRestoredBand?: boolean;
};

/**
 * Lift KPI/charts into WorkspaceDirectoryScreen before paint (P0004 Hub parity).
 * useLayoutEffect keeps chrome frame stable on vault/tab switch.
 *
 * Stale-while-revalidate SSOT: empty/undefined KPI/charts must **not** clear the last
 * good band — otherwise `reserveAnalyticsBand` shows a 1–3s blank hole while O(n)
 * facet/KPI memos recompute (P0020 large vault). Exception: `scopeKey` change
 * without `keepRestoredBand` (first visit to a vault this session).
 */
export function useDirectoryBandSync(
  snapshot: DirectoryBandSyncSnapshot,
  handlers: DirectoryBandHandlers,
  enabled = true,
) {
  const {
    kpis,
    charts,
    sectionRuleLabel,
    kpiKey = "",
    chartsKey = "",
    scopeKey,
    keepRestoredBand = false,
  } = snapshot;
  const prevScopeRef = useRef<string | undefined>(scopeKey);

  useLayoutEffect(() => {
    const scopeChanged =
      scopeKey !== undefined && prevScopeRef.current !== undefined && prevScopeRef.current !== scopeKey;
    prevScopeRef.current = scopeKey;

    if (scopeChanged) {
      if (kpis?.length) handlers.setDirectoryKpis(kpis);
      else if (!keepRestoredBand) handlers.setDirectoryKpis(undefined);
      if (charts != null) handlers.setDirectoryCharts(charts);
      else if (!keepRestoredBand) handlers.setDirectoryCharts(null);
      if (sectionRuleLabel !== undefined) handlers.setSectionRuleLabel(sectionRuleLabel);
      return;
    }

    if (!enabled) {
      return;
    }
    if (kpis?.length) handlers.setDirectoryKpis(kpis);
    if (charts != null) handlers.setDirectoryCharts(charts);
    if (sectionRuleLabel !== undefined) handlers.setSectionRuleLabel(sectionRuleLabel);
    // kpiKey/chartsKey are stable fingerprints; kpis/charts omitted from deps to avoid ReactNode identity loops.
  }, [enabled, kpiKey, chartsKey, scopeKey, keepRestoredBand, sectionRuleLabel, handlers.setDirectoryCharts, handlers.setDirectoryKpis, handlers.setSectionRuleLabel]);
}
