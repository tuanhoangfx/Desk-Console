import { NavGroupSubNav, type NavGroupSubNavProps } from "./HubSidebarNavGroup";

/** Golden class for P0004 System tree subnav (rail + dot). */
export const HUB_SYSTEM_TAB_SUBNAV_CLASS = "system-tab-subnav ml-3 mt-1.5 space-y-0.5";

/** Shared System / view-group tree subnav — P0004 `SystemTabSubNav` SSOT. */
export function HubSystemTabSubNav<TId extends string>({
  className = HUB_SYSTEM_TAB_SUBNAV_CLASS,
  ...props
}: NavGroupSubNavProps<TId>) {
  return <NavGroupSubNav className={className} {...props} />;
}
