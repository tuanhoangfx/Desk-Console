import { useMemo } from "react";
import {
  asDirectoryTableColumnPresetManagerProp,
  DirectoryTableColumnsSettings,
  type HubDirectoryDisplayPanelProps,
} from "@tool-workspace/hub-ui";
import type { AppScreen } from "../../lib/app-screen";
import { SCREEN_DISPLAY_PREFS } from "../../lib/display-prefs-registry";
import { DESK_COL_ITEMS, deskColumnPresets, deskTablePrefs } from "./desk-table-prefs";

export function useDeskDisplayPanelConfig(screen: AppScreen): HubDirectoryDisplayPanelProps | null {
  const defs = SCREEN_DISPLAY_PREFS[screen];
  return useMemo(() => {
    if (!defs) return null;
    return {
      kpis: defs.kpis,
      charts: defs.charts,
      filters: defs.filters ?? [],
      defaultKpiKeys: new Set(defs.defaultKpiKeys),
      defaultChartKeys: new Set(defs.defaultChartKeys),
      defaultFilterKeys: new Set(defs.defaultFilterKeys ?? ["status"]),
      filtersFromUrl: true,
      getScreen: () => screen,
      tableColumnPresets: asDirectoryTableColumnPresetManagerProp(deskColumnPresets),
      tablePanel: <DirectoryTableColumnsSettings items={DESK_COL_ITEMS} prefs={deskTablePrefs} showReset />,
    };
  }, [defs, screen]);
}
