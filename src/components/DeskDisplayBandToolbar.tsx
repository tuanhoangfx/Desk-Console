import { HubDirectoryDisplayPanel } from "@tool-workspace/hub-ui";
import type { AppScreen } from "../lib/app-screen";
import { useDeskDisplayPanelConfig } from "../features/desk/desk-display-panel-config";

/** Search-bar Display band — KPI · filters · table columns (P0005 / P0020 parity). */
export function DeskDisplayBandToolbar({ screen }: { screen: AppScreen }) {
  const config = useDeskDisplayPanelConfig(screen);
  if (!config) return null;
  return <HubDirectoryDisplayPanel key={`display-${screen}`} {...config} />;
}
