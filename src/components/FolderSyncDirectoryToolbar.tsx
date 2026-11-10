import {
  DirectorySearchToolbar,
  type HubDirectoryLifecycleMode,
  type HubViewMode,
} from "@tool-workspace/hub-ui";
import { FolderSyncDisplayBand } from "./FolderSyncDisplayBand";

type Screen = "jobs" | "drives";

type Props = {
  screen: Screen;
  viewMode: HubViewMode;
  onViewModeChange: (mode: HubViewMode) => void;
  lifecycleMode?: HubDirectoryLifecycleMode;
  onLifecycleModeChange?: (mode: HubDirectoryLifecycleMode) => void;
  shown: number;
  total: number;
  countLabel: string;
};

/** Row 1 — Table/Cards, Live/Trash, All period, Display. Same contract as P0005 Orders. */
export function FolderSyncDirectoryToolbar({
  screen,
  viewMode,
  onViewModeChange,
  lifecycleMode,
  onLifecycleModeChange,
  shown,
  total,
  countLabel,
}: Props) {
  return (
    <DirectorySearchToolbar
      workspacePeriod={{ scope: screen, defaultRange: "all", inactiveKeys: ["all"] }}
      showTimeRange={false}
      viewMode={viewMode}
      onViewModeChange={onViewModeChange}
      {...(lifecycleMode != null && onLifecycleModeChange ? { lifecycleMode, onLifecycleModeChange } : {})}
      shown={shown}
      total={total}
      countLabel={countLabel}
      displayBand={<FolderSyncDisplayBand screen={screen} />}
    />
  );
}
