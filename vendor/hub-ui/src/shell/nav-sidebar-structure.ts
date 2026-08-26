import type { LucideIcon } from "lucide-react";
import type { HubBrandIconId } from "../lib/resolve-hub-brand-icon";
import type { NavIconTone } from "./sidebar-nav-tones";

/** Shared child row — screen route or URL sub-view. */
export type NavGroupChildBase = {
  label: string;
  icon: LucideIcon;
  iconTone: NavIconTone;
  /** Optional SVG/raster — overrides Lucide in subnav when set. */
  iconSrc?: string;
  /** Optional numeric badge (e.g. unread count). */
  badge?: number;
};

/** Subnav item navigates via AppScreen (or tool screen id). */
export type NavScreenGroupChild<TScreen extends string = string> = NavGroupChildBase & {
  screen: TScreen;
};

/** Subnav item navigates via URL sub-view (e.g. `/fanpages/uploader`). */
export type NavViewGroupChild<TView extends string = string> = NavGroupChildBase & {
  view: TView;
};

export type NavGroupBase = {
  label: string;
  icon: LucideIcon;
  iconTone: NavIconTone;
  /** When set, sidebar renders shared Hub brand mark instead of Lucide `icon`. */
  brandIcon?: HubBrandIconId;
};

/** Expandable sidebar group — children are top-level screens. */
export type NavScreenGroupConfig<
  TId extends string = string,
  TScreen extends string = string,
> = NavGroupBase & {
  kind: "group";
  navMode: "screen";
  id: TId;
  defaultScreen: TScreen;
  children: NavScreenGroupChild<TScreen>[];
};

/** Expandable sidebar group — children are URL sub-views under one parent screen. */
export type NavViewGroupConfig<
  TId extends string = string,
  TScreen extends string = string,
  TView extends string = string,
> = NavGroupBase & {
  kind: "group";
  navMode: "view";
  id: TId;
  screen: TScreen;
  defaultView: TView;
  children: NavViewGroupChild<TView>[];
};

export type NavScreenNavItem<TScreen extends string = string> = {
  kind: "screen";
  screen: TScreen;
  label: string;
  icon: LucideIcon;
  iconTone: NavIconTone;
  brandIcon?: HubBrandIconId;
};

export type NavGroupConfig<
  TId extends string = string,
  TScreen extends string = string,
  TView extends string = string,
> = NavScreenGroupConfig<TId, TScreen> | NavViewGroupConfig<TId, TScreen, TView>;

export type NavStructureEntry<
  TScreen extends string = string,
  TId extends string = string,
  TView extends string = string,
> = NavScreenNavItem<TScreen> | NavGroupConfig<TId, TScreen, TView>;

export function isNavScreenGroup<TScreen extends string>(
  entry: NavStructureEntry<TScreen, string, string>,
): entry is NavScreenGroupConfig<string, TScreen> {
  return entry.kind === "group" && entry.navMode === "screen";
}

export function isNavViewGroup<TScreen extends string, TView extends string>(
  entry: NavStructureEntry<TScreen, string, TView>,
): entry is NavViewGroupConfig<string, TScreen, TView> {
  return entry.kind === "group" && entry.navMode === "view";
}

export function isNavGroupActive<TScreen extends string>(
  entry: NavGroupConfig<string, TScreen, string>,
  screen: TScreen,
): boolean {
  if (entry.navMode === "view") return screen === entry.screen;
  return entry.children.some((c) => c.screen === screen);
}

/** SessionStorage key for expandable group open state (`{prefix}:{id}-subnav-open`). */
export function navGroupSubnavOpenKey(prefix: string, id: string): string {
  return `${prefix}:${id}-subnav-open`;
}

/** Flatten nav tree → top-level screen rows (for tab headers / prefetch). */
export function flatMapNavScreenItems<TScreen extends string>(
  structure: readonly NavStructureEntry<TScreen>[],
): NavScreenNavItem<TScreen>[] {
  return structure.flatMap((entry) => {
    if (entry.kind === "screen") return [entry];
    if (entry.navMode === "view") {
      return [
        {
          kind: "screen" as const,
          screen: entry.screen,
          label: entry.label,
          icon: entry.icon,
          iconTone: entry.iconTone,
          brandIcon: entry.brandIcon,
        },
      ];
    }
    return entry.children.map((c) => ({
      kind: "screen" as const,
      screen: c.screen,
      label: c.label,
      icon: c.icon,
      iconTone: c.iconTone,
    }));
  });
}

/** Map group children → NavGroupSubNav items (screen mode). */
export function navScreenGroupSubNavItems<TScreen extends string>(
  children: NavScreenGroupChild<TScreen>[],
) {
  return children.map((c) => ({
    id: c.screen,
    label: c.label,
    icon: c.icon,
    iconTone: c.iconTone,
    badge: c.badge,
  }));
}

/** Map group children → NavGroupSubNav items (view mode). */
export function navViewGroupSubNavItems<TView extends string>(children: NavViewGroupChild<TView>[]) {
  return children.map((c) => ({
    id: c.view,
    label: c.label,
    icon: c.icon,
    iconTone: c.iconTone,
    iconSrc: c.iconSrc,
  }));
}
