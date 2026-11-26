import { useMemo } from "react";
import { hubSessionLabels } from "@tool-workspace/hub-identity";
import {
  HubLogButton,
  HubSidebarBrandIcon,
  HubSidebarNavList,
  HubSidebarShell,
  HubWorkspaceUserShell,
  useNavGroupOpenState,
  useWorkspaceRoleKey,
} from "@tool-workspace/hub-ui";
import { useDeskAuth } from "../features/auth/DeskAuthGate";
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
  const { session, getHubClient, signOut } = useDeskAuth();
  const labels = hubSessionLabels(session);
  const { roleKey } = useWorkspaceRoleKey(session);
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
            session={session}
            labels={labels}
            roleKey={roleKey}
            getHubClient={() => getHubClient() as never}
            profileRoleClient={getHubClient() as never}
            profileRoleUserId={session?.user?.id ?? null}
            profileRoleEmail={session?.user?.email ?? null}
            footerTitle="Workspace Account"
            onSignOut={() => void signOut()}
          />
          <HubLogButton variant="global" />
          <DeskSettings sidebarRow />
        </>
      }
    />
  );
}
