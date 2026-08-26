import type { ReactNode } from "react";
import { Minus, Plus } from "lucide-react";
import type { HubBrandIconId } from "../lib/resolve-hub-brand-icon";
import { compactIconSize, HUB_CHROME_ICON_PX } from "../ui-scale";
import { HubNavIcon } from "./HubNavIcon";
import {
  navActiveBarClass,
  navActiveBgClass,
  navActiveTextClass,
  navDotClass,
  navIconClass,
  navRailClass,
  type NavIconTone,
} from "./sidebar-nav-tones";
import { HUB_SIDEBAR_NAV_LABEL_CLASS } from "./hub-typography";
import type { LucideIcon } from "lucide-react";

export type NavGroupSubNavItem<TId extends string = string> = {
  id: TId;
  label: string;
  icon: LucideIcon;
  iconTone: NavIconTone;
  iconSrc?: string;
  badge?: number;
};

export type HubSidebarNavGroupHeaderProps = {
  label: string;
  icon: LucideIcon;
  iconTone: NavIconTone;
  brandIcon?: HubBrandIconId;
  active: boolean;
  subnavOpen: boolean;
  showToggleIcon?: boolean;
  onClick: () => void;
  onMouseEnter?: () => void;
  onFocus?: () => void;
};

/** Expandable sidebar group row — golden pattern (P0004 System, P0016 Zalo/Facebook). */
export function HubSidebarNavGroupHeader({
  label,
  icon,
  iconTone,
  brandIcon,
  active,
  subnavOpen,
  showToggleIcon = true,
  onClick,
  onMouseEnter,
  onFocus,
}: HubSidebarNavGroupHeaderProps) {
  const ToggleIcon = subnavOpen ? Minus : Plus;

  return (
    <button
      type="button"
      aria-expanded={subnavOpen}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onFocus={onFocus}
      className={`group relative flex w-full items-center gap-2.5 rounded-xl px-3 py-2 ${HUB_SIDEBAR_NAV_LABEL_CLASS} transition-all ${
        active
          ? `${navActiveBgClass(iconTone)} ${navActiveTextClass(iconTone)}`
          : "text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)]"
      }`}
    >
      {active ? (
        <span
          className={`absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r ${navActiveBarClass(iconTone)}`}
        />
      ) : null}
      <HubNavIcon icon={icon} iconTone={iconTone} active={active} brandIcon={brandIcon} />
      <span className={`flex-1 text-left ${active ? "font-semibold" : "font-medium"}`}>{label}</span>
      {showToggleIcon ? (
        <ToggleIcon
          size={compactIconSize(13)}
          strokeWidth={2.3}
          className={`shrink-0 ${navIconClass(iconTone, subnavOpen)}`}
        />
      ) : null}
    </button>
  );
}

export type NavGroupSubNavProps<TId extends string = string> = {
  activeId: TId | null;
  items: NavGroupSubNavItem<TId>[];
  onSelect: (id: TId) => void;
  onPrefetch?: (id: TId) => void;
  className?: string;
};

/** Dot + rail subnav list — golden pattern (P0004 SystemTabSubNav). */
export function NavGroupSubNav<TId extends string>({
  activeId,
  items,
  onSelect,
  onPrefetch,
  className = "hub-nav-group-subnav ml-3 mt-1.5 space-y-0.5",
}: NavGroupSubNavProps<TId>) {
  return (
    <div className={className}>
      {items.map(({ id, label, icon: Icon, iconTone, iconSrc, badge }) => {
        const isActive = activeId === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            onMouseEnter={() => onPrefetch?.(id)}
            onFocus={() => onPrefetch?.(id)}
            className={`hub-sidebar-subnav-button group grid h-8 w-full grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-2 text-left ${HUB_SIDEBAR_NAV_LABEL_CLASS}`}
          >
            <span className="relative flex h-full items-center justify-center" aria-hidden>
              <span className={`absolute inset-y-0 left-1/2 w-px -translate-x-1/2 ${navRailClass(iconTone)}`} />
              <span className={`relative h-1.5 w-1.5 rounded-full transition-all ${navDotClass(iconTone, isActive)}`} />
            </span>
            <span
              className={`flex h-8 min-w-0 items-center gap-2 rounded-xl px-2 ${HUB_SIDEBAR_NAV_LABEL_CLASS} transition-colors ${
                isActive
                  ? `${navActiveBgClass(iconTone)} ${navActiveTextClass(iconTone)}`
                  : "text-[var(--muted)] group-hover:bg-white/[.04] group-hover:text-[var(--text)]"
              }`}
            >
              {iconSrc ? (
                <img
                  src={iconSrc}
                  alt=""
                  width={compactIconSize(HUB_CHROME_ICON_PX)}
                  height={compactIconSize(HUB_CHROME_ICON_PX)}
                  className={`shrink-0 ${navIconClass(iconTone, isActive)}`}
                  aria-hidden
                />
              ) : (
                <Icon size={compactIconSize(HUB_CHROME_ICON_PX)} className={`shrink-0 ${navIconClass(iconTone, isActive)}`} aria-hidden />
              )}
              <span className="min-w-0 flex-1 truncate text-left">{label}</span>
              {badge != null && badge > 0 ? (
                <span className="shrink-0 rounded-full bg-amber-500/25 px-1.5 py-0.5 text-[9px] font-semibold tabular-nums text-amber-200">
                  {badge > 99 ? "99+" : badge}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export type HubSidebarNavGroupProps = HubSidebarNavGroupHeaderProps & {
  subnav: ReactNode;
};

/** Sidebar expandable group — header + optional subnav slot. */
export function HubSidebarNavGroup({ subnav, ...headerProps }: HubSidebarNavGroupProps) {
  return (
    <div>
      <HubSidebarNavGroupHeader {...headerProps} />
      {headerProps.subnavOpen ? subnav : null}
    </div>
  );
}
