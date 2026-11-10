import { useMemo } from "react";
import {
  HubLogButton,
  HubSidebarBrandIcon,
  HubSidebarNavList,
  HubSidebarShell,
  HubWorkspaceUserShell,
  useNavGroupOpenState,
} from "@tool-workspace/hub-ui";
import { DESK_BRAND_ICON, DESK_PRODUCT } from "../lib/app-release";
import type { AppScreen } from "../lib/app-screen";
import { NAV_GROUP_IDS, NAV_STRUCTURE, NAV_SUBNAV_PREFIX } from "../lib/nav-structure";
import { DeskSettings } from "./DeskSettings";

type Props = {
  screen: AppScreen;
  onNavigate: (s: AppScreen) => void;
  runnersLocked?: boolean;
};

export function DeskSidebar({ screen, onNavigate, runnersLocked = false }: Props) {
  const { groupOpen, setGroupSubnavOpen } = useNavGroupOpenState(NAV_SUBNAV_PREFIX, NAV_GROUP_IDS);
  const structure = useMemo(
    () =>
      NAV_STRUCTURE.map((entry) => {
        if (entry.kind === "screen" && entry.screen === "runners" && runnersLocked) {
          return {
            ...entry,
            locked: true,
            title: "Runners requires Developer Workspace (E:\\Dev)",
          };
        }
        return entry;
      }),
    [runnersLocked],
  );

  return (
    <HubSidebarShell
      brandLeading={<HubSidebarBrandIcon src={DESK_BRAND_ICON} alt={DESK_PRODUCT.name} />}
      brandTitle={DESK_PRODUCT.name}
      nav={
        <HubSidebarNavList
          structure={structure}
          activeScreen={screen}
          groupOpen={groupOpen}
          setGroupSubnavOpen={setGroupSubnavOpen}
          onNavigateScreen={onNavigate}
        />
      }
      footer={
        <>
          <HubWorkspaceUserShell
            session={null}
            anonymous
            anonymousFooterLabel="Local"
            profileRoleClient={null}
          />
          <HubLogButton variant="global" />
          <DeskSettings sidebarRow />
        </>
      }
    />
  );
}
