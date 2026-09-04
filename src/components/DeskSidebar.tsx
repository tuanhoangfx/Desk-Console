import { ClipboardList, PlayCircle, CalendarClock, Settings2 } from "lucide-react";
import {
  HubLogButton,
  HubSidebarBrandIcon,
  HubSidebarNavScreenButton,
  HubSidebarShell,
  HubUiZoomControl,
  HubWorkspaceUserShell,
  type NavIconTone,
} from "@tool-workspace/hub-ui";
import { DESK_BRAND_ICON, DESK_PRODUCT } from "../lib/app-release";
import type { AppScreen } from "../lib/app-screen";
import { DeskSettings } from "./DeskSettings";

type NavItem = { screen: AppScreen; label: string; icon: typeof ClipboardList; iconTone: NavIconTone };

const NAV: NavItem[] = [
  { screen: "clips", label: "Clips", icon: ClipboardList, iconTone: "emerald" },
  { screen: "runners", label: "Runners", icon: PlayCircle, iconTone: "amber" },
  { screen: "tasks", label: "Tasks", icon: CalendarClock, iconTone: "violet" },
  { screen: "system", label: "System", icon: Settings2, iconTone: "cyan" },
];

type Props = { screen: AppScreen; onNavigate: (s: AppScreen) => void };

export function DeskSidebar({ screen, onNavigate }: Props) {
  return (
    <HubSidebarShell
      brandLeading={<HubSidebarBrandIcon src={DESK_BRAND_ICON} alt={DESK_PRODUCT.name} />}
      brandTitle={DESK_PRODUCT.name}
      nav={
        <>
          {NAV.map((item) => (
            <HubSidebarNavScreenButton
              key={item.screen}
              label={item.label}
              icon={item.icon}
              iconTone={item.iconTone}
              active={screen === item.screen}
              onClick={() => onNavigate(item.screen)}
            />
          ))}
        </>
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
          <HubUiZoomControl />
        </>
      }
    />
  );
}
