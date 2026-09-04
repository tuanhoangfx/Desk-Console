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
import { DESK_COL_ITEMS, deskColumnPresetsFor, deskDirectoryScreenOrClips, deskTablePrefsFor } from "../features/desk/desk-table-prefs";

type Props = { sidebarRow?: boolean };

export function DeskSettings({ sidebarRow = false }: Props) {
  const [screen, setScreen] = useState(() => readAppScreen());
  const [columnTick, setColumnTick] = useState(0);

  useEffect(() => {
    const sync = () => setScreen(readAppScreen());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const tableScreen = deskDirectoryScreenOrClips(screen);
  const tablePrefs = deskTablePrefsFor(tableScreen);
  const columnPresets = deskColumnPresetsFor(tableScreen);

  useEffect(() => {
    const sync = () => setColumnTick((n) => n + 1);
    window.addEventListener(tablePrefs.changeEvent, sync);
    return () => window.removeEventListener(tablePrefs.changeEvent, sync);
  }, [tablePrefs.changeEvent]);

  const cfg = SCREEN_DISPLAY_PREFS[screen];
  const tableActiveCount = useMemo(() => {
    void columnTick;
    return tablePrefs.read().size;
  }, [columnTick, tablePrefs]);

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
      tableColumnPresets={asDirectoryTableColumnPresetManagerProp(columnPresets)}
      tablePanel={<DirectoryTableColumnsSettings items={DESK_COL_ITEMS} prefs={tablePrefs} showReset />}
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
