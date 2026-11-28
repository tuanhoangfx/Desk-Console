import { useEffect, useState } from "react";
import {
  buildSemanticTocIcon,
  DirectoryDefaultSortHint,
  DirectoryTableColumnsSettings,
  DirectoryTableDisplaySettingsShell,
  directoryTableColumnStatesEqual,
  HubDirectoryFreezeColumnsSetting,
  HubDirectoryManualSortToggle,
  mergeDirectoryTableColumnOrder,
  ToggleRow,
  useDirectoryManualSortEnabled,
} from "@tool-workspace/hub-ui";
import { deskDefaultSortRowsFor, deskPrimaryDefaultSort } from "./desk-display-sort";
import { deskManualSortPrefsFor } from "./desk-manual-sort-prefs";
import {
  deskColItemsFor,
  deskCompactColsFor,
  deskDefaultColsFor,
  deskFreezePrefsFor,
  deskTablePrefsFor,
  type DeskCol,
  type DeskDirectoryScreen,
} from "./desk-table-prefs";

export function DeskTableDisplaySettings({ screen }: { screen: DeskDirectoryScreen }) {
  const manualSortPrefs = deskManualSortPrefsFor(screen);
  const manualSort = useDirectoryManualSortEnabled(manualSortPrefs);
  const tablePrefs = deskTablePrefsFor(screen);
  const freezePrefs = deskFreezePrefsFor(screen);
  const items = deskColItemsFor(screen);
  const itemKeys = items.map((item) => item.key);
  const compactCols = deskCompactColsFor(screen);
  const defaultCols = deskDefaultColsFor(screen);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const sync = () => setTick((n) => n + 1);
    window.addEventListener(tablePrefs.changeEvent, sync);
    window.addEventListener(manualSortPrefs.changeEvent, sync);
    return () => {
      window.removeEventListener(tablePrefs.changeEvent, sync);
      window.removeEventListener(manualSortPrefs.changeEvent, sync);
    };
  }, [manualSortPrefs.changeEvent, tablePrefs.changeEvent]);

  void tick;
  const visible = tablePrefs.read();
  const order = tablePrefs.readOrder();
  const compactOn = directoryTableColumnStatesEqual(
    { visible, order },
    {
      visible: new Set(compactCols) as ReadonlySet<DeskCol>,
      order: mergeDirectoryTableColumnOrder(itemKeys, [...compactCols]),
    },
    itemKeys,
  );

  return (
    <DirectoryTableDisplaySettingsShell
      toggles={
        <>
          <ToggleRow
            label="Field Display Limit"
            on={compactOn}
            onChange={() => {
              if (compactOn) {
                tablePrefs.write(
                  new Set(defaultCols),
                  mergeDirectoryTableColumnOrder(itemKeys, [...defaultCols]),
                );
              } else {
                tablePrefs.write(
                  new Set(compactCols),
                  mergeDirectoryTableColumnOrder(itemKeys, [...compactCols]),
                );
              }
            }}
          />
          <HubDirectoryManualSortToggle prefs={manualSortPrefs} />
        </>
      }
      sortLabel="Fixed default order"
      sort={
        <DirectoryDefaultSortHint
          rows={deskDefaultSortRowsFor(screen)}
          primaryDefault={deskPrimaryDefaultSort(screen)}
          footnote={
            manualSort
              ? "Click a column header to override when headers are sortable."
              : "Manual column sort is off — directory stays on Fixed default order."
          }
        />
      }
      columnsIcon={buildSemanticTocIcon("settings.table")}
      columns={
        <div className="space-y-3">
          <HubDirectoryFreezeColumnsSetting
            prefs={freezePrefs}
            max={Math.min(visible.size, 6)}
          />
          <DirectoryTableColumnsSettings items={items} prefs={tablePrefs} />
        </div>
      }
    />
  );
}
