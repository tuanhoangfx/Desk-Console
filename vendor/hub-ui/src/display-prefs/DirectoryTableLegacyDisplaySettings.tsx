import { useEffect, useState } from "react";
import {
  DirectoryDefaultSortHint,
  type DirectoryDefaultSortRow,
} from "./DirectoryDefaultSortHint";
import { DirectoryTableDisplaySettingsShell } from "./DirectoryTableDisplaySettingsShell";
import { HubDirectoryManualSortToggle } from "./HubDirectoryManualSortToggle";
import { ToggleRow } from "./primitives";
import {
  createDirectoryManualSortPrefs,
  useDirectoryManualSortEnabled,
  type DirectoryManualSortPrefs,
} from "../prefs/directory-manual-sort-prefs";
import {
  DirectoryTableColumnsSettings,
  type DirectoryTableColumnsSettingsProps,
} from "../prefs/DirectoryTableColumnsSettings";
import { mergeDirectoryTableColumnOrder } from "../prefs/directory-table-column-prefs";
import type { DirectoryTableColumnItem, DirectoryTableColumnPrefs } from "../prefs/directory-table-column-prefs";
import { directoryTableColumnStatesEqual } from "../prefs/directory-table-column-presets";

export type DirectoryTableLegacyDisplaySettingsProps<K extends string> = {
  /** Stable id — storage key `directory-manual-sort:{id}:v1`. */
  id: string;
  items: readonly DirectoryTableColumnItem<K>[];
  prefs: DirectoryTableColumnPrefs<K>;
  primaryDefault: { sortKey: string; sortDir: "asc" | "desc" };
  sortRows: readonly DirectoryDefaultSortRow[];
  defaultVisible?: ReadonlySet<K>;
  compactKeys?: readonly K[];
  showReset?: boolean;
  columnsHeader?: DirectoryTableColumnsSettingsProps<K>["header"];
  className?: string;
};

const manualSortCache = new Map<string, DirectoryManualSortPrefs>();

function manualSortPrefsFor(id: string): DirectoryManualSortPrefs {
  const hit = manualSortCache.get(id);
  if (hit) return hit;
  const prefs = createDirectoryManualSortPrefs({
    storageKey: `directory-manual-sort:${id}:v1`,
    changeEvent: `directory-manual-sort-${id}-change`,
  });
  manualSortCache.set(id, prefs);
  return prefs;
}

/**
 * Columns-only → shell SSOT upgrade (Wave 3 legacy tables).
 * MS default OFF + Fixed default order + optional FDL + Columns.
 */
export function DirectoryTableLegacyDisplaySettings<K extends string>({
  id,
  items,
  prefs,
  primaryDefault,
  sortRows,
  defaultVisible,
  compactKeys,
  showReset,
  columnsHeader,
  className,
}: DirectoryTableLegacyDisplaySettingsProps<K>) {
  const manualSortPrefs = manualSortPrefsFor(id);
  const manualSort = useDirectoryManualSortEnabled(manualSortPrefs);
  const itemKeys = items.map((item) => item.key);
  const resolvedDefault =
    defaultVisible ??
    new Set(items.map((item) => item.key));
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const sync = () => setTick((n) => n + 1);
    window.addEventListener(prefs.changeEvent, sync);
    window.addEventListener(manualSortPrefs.changeEvent, sync);
    return () => {
      window.removeEventListener(prefs.changeEvent, sync);
      window.removeEventListener(manualSortPrefs.changeEvent, sync);
    };
  }, [prefs.changeEvent, manualSortPrefs.changeEvent]);

  void tick;
  const visible = prefs.read();
  const order = prefs.readOrder();
  const compactOn =
    compactKeys != null &&
    directoryTableColumnStatesEqual(
      { visible, order },
      {
        visible: new Set(compactKeys) as ReadonlySet<K>,
        order: mergeDirectoryTableColumnOrder(itemKeys, [...compactKeys]),
      },
      itemKeys,
    );

  return (
    <DirectoryTableDisplaySettingsShell
      className={className}
      toggles={
        <>
          {compactKeys ? (
            <ToggleRow
              label="Field Display Limit"
              on={Boolean(compactOn)}
              onChange={() => {
                if (compactOn) {
                  prefs.write(
                    new Set(resolvedDefault) as Set<K>,
                    mergeDirectoryTableColumnOrder(itemKeys, [...resolvedDefault]),
                  );
                } else {
                  prefs.write(
                    new Set(compactKeys) as Set<K>,
                    mergeDirectoryTableColumnOrder(itemKeys, [...compactKeys]),
                  );
                }
              }}
            />
          ) : null}
          <HubDirectoryManualSortToggle prefs={manualSortPrefs} />
        </>
      }
      sortLabel="Fixed default order"
      sort={
        <DirectoryDefaultSortHint
          rows={sortRows}
          primaryDefault={primaryDefault}
          footnote={
            manualSort
              ? "Click a column header to override when headers are sortable."
              : "Manual column sort is off — directory stays on Fixed default order."
          }
        />
      }
      columns={
        <DirectoryTableColumnsSettings
          items={items}
          prefs={prefs}
          showReset={showReset}
          header={columnsHeader}
        />
      }
    />
  );
}
