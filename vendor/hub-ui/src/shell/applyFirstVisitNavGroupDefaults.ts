import { isNavGroupActive, type NavGroupConfig, type NavStructureEntry } from "./nav-sidebar-structure";

export const HUB_NAV_DENSITY_INIT_SUFFIX = "nav-density-v1";

export type NavGroupDensityContext<TScreen extends string, TView extends string = string> = {
  activeScreen: TScreen;
  activeView?: TView | null;
};

export type ApplyFirstVisitNavGroupDefaultsOptions<
  TScreen extends string,
  TGroupId extends string,
  TView extends string = string,
> = {
  prefix: string;
  structure: readonly NavStructureEntry<TScreen, TGroupId, TView>[];
  activeScreen: TScreen;
  activeView?: TView | null;
  setGroupSubnavOpen: (id: TGroupId, open: boolean) => void;
  initKeySuffix?: string;
  isGroupRelevant?: (
    entry: NavGroupConfig<TGroupId, TScreen, TView>,
    ctx: NavGroupDensityContext<TScreen, TView>,
  ) => boolean;
};

function defaultIsGroupRelevant<TScreen extends string, TGroupId extends string, TView extends string>(
  entry: NavGroupConfig<TGroupId, TScreen, TView>,
  ctx: NavGroupDensityContext<TScreen, TView>,
): boolean {
  if (isNavGroupActive(entry, ctx.activeScreen)) return true;

  if (entry.navMode === "view" && ctx.activeScreen === entry.screen) {
    const view = ctx.activeView;
    if (view == null) return true;
    return view === entry.defaultView || entry.children.some((c) => c.view === view);
  }

  return false;
}

/** Collapse inactive sidebar groups once per session — P0020 nav density SSOT. */
export function applyFirstVisitNavGroupDefaults<
  TScreen extends string,
  TGroupId extends string,
  TView extends string = string,
>(options: ApplyFirstVisitNavGroupDefaultsOptions<TScreen, TGroupId, TView>): void {
  if (typeof window === "undefined") return;

  const {
    prefix,
    structure,
    activeScreen,
    activeView,
    setGroupSubnavOpen,
    initKeySuffix = HUB_NAV_DENSITY_INIT_SUFFIX,
    isGroupRelevant = defaultIsGroupRelevant,
  } = options;

  const initKey = `${prefix}:${initKeySuffix}`;
  if (window.sessionStorage.getItem(initKey) === "1") return;

  const ctx: NavGroupDensityContext<TScreen, TView> = { activeScreen, activeView };
  for (const entry of structure) {
    if (entry.kind !== "group") continue;
    setGroupSubnavOpen(entry.id, isGroupRelevant(entry, ctx));
  }

  window.sessionStorage.setItem(initKey, "1");
}
