import { DirectorySearchToolbar, type HubDirectoryLifecycleMode, type HubViewMode } from "@tool-workspace/hub-ui";
import type { LucideIcon } from "lucide-react";
import type { AppScreen } from "../lib/app-screen";
import { DeskDisplayBandToolbar } from "./DeskDisplayBandToolbar";

type Props = {
  screen: AppScreen;
  viewMode: HubViewMode;
  onViewModeChange: (mode: HubViewMode) => void;
  countIcon: LucideIcon;
  shown: number;
  total: number;
  countLabel: string;
  showResultCount?: boolean;
  /** Creation-date period — hide when the tab has no createdAt (runners / tasks). */
  showPeriod?: boolean;
  lifecycleMode?: HubDirectoryLifecycleMode;
  onLifecycleModeChange?: (mode: HubDirectoryLifecycleMode) => void;
};

/** Golden FilterBar row-1 — ViewToggle · Period · Display (P0005 Orders / P0020 Services). */
export function DeskDirectorySearchToolbar({
  screen,
  viewMode,
  onViewModeChange,
  countIcon,
  shown,
  total,
  countLabel,
  showResultCount,
  showPeriod = true,
  lifecycleMode,
  onLifecycleModeChange,
}: Props) {
  return (
    <DirectorySearchToolbar
      workspacePeriod={showPeriod ? { scope: screen, defaultRange: "all", inactiveKeys: ["all"] } : undefined}
      showTimeRange={false}
      viewMode={viewMode}
      onViewModeChange={onViewModeChange}
      lifecycleMode={lifecycleMode}
      onLifecycleModeChange={onLifecycleModeChange}
      countIcon={countIcon}
      shown={shown}
      total={total}
      countLabel={countLabel}
      showResultCount={showResultCount}
      displayBand={<DeskDisplayBandToolbar screen={screen} />}
    />
  );
}
