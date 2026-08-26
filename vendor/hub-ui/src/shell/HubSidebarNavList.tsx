import type { ReactNode } from "react";
import { HubSidebarNavGroup } from "./HubSidebarNavGroup";
import { HubSidebarNavScreenButton } from "./HubSidebarNavScreenButton";
import { NavGroupSubNav } from "./HubSidebarNavGroup";
import { HubSystemTabSubNav } from "./HubSystemTabSubNav";
import {
  isNavGroupActive,
  isNavScreenGroup,
  isNavViewGroup,
  navScreenGroupSubNavItems,
  navViewGroupSubNavItems,
  type NavGroupConfig,
  type NavStructureEntry,
} from "./nav-sidebar-structure";

export type HubSidebarNavListProps<TScreen extends string, TView extends string = string> = {
  structure: readonly NavStructureEntry<TScreen, string, TView>[];
  activeScreen: TScreen;
  /** Active sub-view when parent screen uses navMode "view". */
  activeView?: TView | null;
  groupOpen: Record<string, boolean>;
  setGroupSubnavOpen: (id: string, open: boolean | ((v: boolean) => boolean)) => void;
  showToggleIcon?: boolean;
  onNavigateScreen: (screen: TScreen) => void;
  onSelectView: (view: TView, parentScreen: TScreen) => void;
  onPrefetchScreen?: (screen: TScreen) => void;
  onPrefetchView?: (view: TView) => void;
  /** Screen id → badge count merged into screen-group subnav items. */
  navBadges?: Partial<Record<TScreen, number>>;
  /** Optional slot for groups that need custom subnav (e.g. P0004 System tabs). */
  renderGroupSubnav?: (entry: NavGroupConfig<string, TScreen, TView>, groupActive: boolean) => ReactNode;
};

export function HubSidebarNavList<TScreen extends string, TView extends string = string>({
  structure,
  activeScreen,
  activeView = null,
  groupOpen,
  setGroupSubnavOpen,
  showToggleIcon = true,
  onNavigateScreen,
  onSelectView,
  onPrefetchScreen,
  onPrefetchView,
  navBadges,
  renderGroupSubnav,
}: HubSidebarNavListProps<TScreen, TView>) {
  return (
    <>
      {structure.map((entry) => {
        if (entry.kind === "screen") {
          const active = activeScreen === entry.screen;
          const badge = navBadges?.[entry.screen];
          return (
            <HubSidebarNavScreenButton
              key={entry.screen}
              label={entry.label}
              icon={entry.icon}
              iconTone={entry.iconTone}
              brandIcon={entry.brandIcon}
              active={active}
              badge={badge}
              onClick={() => onNavigateScreen(entry.screen)}
              onMouseEnter={() => onPrefetchScreen?.(entry.screen)}
              onFocus={() => onPrefetchScreen?.(entry.screen)}
            />
          );
        }

        const { id, label, icon, iconTone, brandIcon } = entry;
        const groupActive = isNavGroupActive(entry, activeScreen);
        const subnavOpen = groupOpen[id] ?? true;

        const onGroupClick = () => {
          if (groupActive) {
            setGroupSubnavOpen(id, (v) => !v);
            return;
          }
          if (isNavViewGroup(entry)) {
            onNavigateScreen(entry.screen);
            if (activeView !== entry.defaultView) onSelectView(entry.defaultView, entry.screen);
          } else if (isNavScreenGroup(entry)) {
            onNavigateScreen(entry.defaultScreen);
          }
          setGroupSubnavOpen(id, true);
        };

        const onPrefetch = () => {
          if (isNavViewGroup(entry)) onPrefetchView?.(entry.defaultView);
          else if (isNavScreenGroup(entry)) onPrefetchScreen?.(entry.defaultScreen);
        };

        const defaultSubnav = isNavViewGroup(entry) ? (
          <HubSystemTabSubNav
            activeId={groupActive ? activeView : null}
            items={navViewGroupSubNavItems(entry.children)}
            onSelect={(view) => {
              if (activeScreen !== entry.screen) onNavigateScreen(entry.screen);
              onSelectView(view, entry.screen);
            }}
            onPrefetch={onPrefetchView}
          />
        ) : isNavScreenGroup(entry) ? (
          <NavGroupSubNav
            activeId={groupActive && entry.children.some((c) => c.screen === activeScreen) ? activeScreen : null}
            items={navScreenGroupSubNavItems(entry.children).map((item) => ({
              ...item,
              badge: item.badge ?? navBadges?.[item.id as TScreen],
            }))}
            onSelect={onNavigateScreen}
            onPrefetch={onPrefetchScreen}
          />
        ) : null;

        return (
          <HubSidebarNavGroup
            key={id}
            label={label}
            icon={icon}
            iconTone={iconTone}
            brandIcon={brandIcon}
            active={groupActive}
            subnavOpen={subnavOpen}
            showToggleIcon={showToggleIcon}
            onClick={onGroupClick}
            onMouseEnter={onPrefetch}
            onFocus={onPrefetch}
            subnav={renderGroupSubnav?.(entry, groupActive) ?? defaultSubnav}
          />
        );
      })}
    </>
  );
}
