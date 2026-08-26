import { useEffect, useMemo, useState } from "react";
import {
  DirectoryTableColumnsSettings,
  HubDisplayPrefs,
  asDirectoryTableColumnPresetManagerProp,
  patchHubListPrefs,
  readHubListPrefsCore,
} from "@tool-workspace/hub-ui";
import { readAppScreen } from "../lib/app-screen";
import { SCREEN_DISPLAY_PREFS } from "../lib/display-prefs-registry";
import { DeskHotkeysSettings } from "./DeskHotkeysSettings";
import { DESK_COL_ITEMS, deskColumnPresets, deskTablePrefs } from "../features/desk/desk-table-prefs";

type Props = { sidebarRow?: boolean };

export function DeskSettings({ sidebarRow = false }: Props) {
  const [screen, setScreen] = useState(() => readAppScreen());
  const [columnTick, setColumnTick] = useState(0);

  useEffect(() => {
    const sync = () => setScreen(readAppScreen());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  useEffect(() => {
    const sync = () => setColumnTick((n) => n + 1);
    window.addEventListener(deskTablePrefs.changeEvent, sync);
    return () => window.removeEventListener(deskTablePrefs.changeEvent, sync);
  }, []);

  const cfg = SCREEN_DISPLAY_PREFS[screen];
  const tableActiveCount = useMemo(() => {
    void columnTick;
    return deskTablePrefs.read().size;
  }, [columnTick]);

  return (
    <HubDisplayPrefs
      title="Settings"
      scope="tab"
      sidebarRow={sidebarRow}
      showRange={false}
      showLimit={false}
      kpis={cfg?.kpis}
      charts={cfg?.charts}
      filters={cfg?.filters}
      headerStats={cfg?.headerStats}
      defaultKpiKeys={cfg ? new Set(cfg.defaultKpiKeys) : undefined}
      defaultChartKeys={cfg ? new Set(cfg.defaultChartKeys) : undefined}
      defaultFilterKeys={cfg?.defaultFilterKeys ? new Set(cfg.defaultFilterKeys) : undefined}
      defaultHeaderStatKeys={cfg?.defaultHeaderStatKeys ? new Set(cfg.defaultHeaderStatKeys) : undefined}
      showPageSize
      hideSearchPinOnSystem={screen === "system"}
      readPrefs={readHubListPrefsCore}
      patchPrefs={patchHubListPrefs}
      getScreen={() => screen}
      tableActiveCount={tableActiveCount}
      tableColumnPresets={asDirectoryTableColumnPresetManagerProp(deskColumnPresets)}
      tablePanel={<DirectoryTableColumnsSettings items={DESK_COL_ITEMS} prefs={deskTablePrefs} showReset />}
      toolSections={[
        {
          id: "desk-hotkeys",
          label: "Desk",
          body: <DeskHotkeysSettings />,
        },
      ]}
    />
  );
}
