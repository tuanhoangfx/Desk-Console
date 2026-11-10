import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  HubModalDirectoryFilterBar,
  HubModalDirectorySection,
  HubResultCount,
  KpiStrip,
  type FilterDef,
  type FilterValues,
  type KpiTileData,
} from "@tool-workspace/hub-ui";

type Props = {
  banner?: ReactNode;
  error?: ReactNode;
  empty?: ReactNode;
  kpis: KpiTileData[];
  shortcutScope: string;
  placeholder: string;
  filters?: FilterDef[];
  query: string;
  onQueryChange: (value: string) => void;
  values?: FilterValues;
  onValuesChange?: (values: FilterValues) => void;
  row2Actions?: ReactNode;
  shown: number;
  total: number;
  countLabel: string;
  countIcon: LucideIcon;
  tree: ReactNode;
};

/** One modal directory: filter, KPI, then the folder tree. Job Files and Drive Files share this. */
export function SyncTreeSection({
  banner,
  error,
  empty,
  kpis,
  shortcutScope,
  placeholder,
  filters = [],
  query,
  onQueryChange,
  values,
  onValuesChange,
  row2Actions,
  shown,
  total,
  countLabel,
  countIcon,
  tree,
}: Props) {
  return (
    <HubModalDirectorySection
      banner={banner}
      error={error}
      empty={empty}
      filterBar={
        <>
          <HubModalDirectoryFilterBar
            shortcutScope={shortcutScope}
            placeholder={placeholder}
            filters={filters}
            query={query}
            onQueryChange={onQueryChange}
            values={values || {}}
            onValuesChange={onValuesChange || (() => undefined)}
            row2Actions={row2Actions}
            toolbar={<HubResultCount icon={countIcon} shown={shown} total={total} label={countLabel} />}
          />
          <KpiStrip items={kpis} />
        </>
      }
      table={tree}
    />
  );
}
