import { LayoutGrid, Settings2, Users, type LucideIcon } from "lucide-react";
import { navBadgeIconClass, navBadgeVariantClass, type NavIconTone } from "../shell/sidebar-nav-tones";
import type { BadgeSpec } from "../types/filter-badge";

export type HubAppTabGroup = "hub" | "users" | "system";

export type HubAppTabGroupMeta = {
  id: HubAppTabGroup;
  label: string;
  icon: LucideIcon;
  /** Sidebar-aligned tone — badge colors derive from NAV_ICON_TONES.badge */
  iconTone: NavIconTone;
};

export const HUB_APP_TAB_GROUP_META: Record<HubAppTabGroup, HubAppTabGroupMeta> = {
  hub: {
    id: "hub",
    label: "Hub",
    icon: LayoutGrid,
    iconTone: "indigo",
  },
  users: {
    id: "users",
    label: "Users",
    icon: Users,
    iconTone: "emerald",
  },
  system: {
    id: "system",
    label: "System",
    icon: Settings2,
    iconTone: "amber",
  },
};

export function resolveHubAppTabGroupBadge(group: string): BadgeSpec {
  const meta = HUB_APP_TAB_GROUP_META[group as HubAppTabGroup];
  if (!meta) {
    return {
      label: group || "—",
      iconMeta: { icon: LayoutGrid, className: "text-slate-300" },
      variantClass: "border-white/10 bg-white/[0.03] text-[var(--muted)]",
    };
  }
  return {
    label: meta.label,
    iconMeta: { icon: meta.icon, className: navBadgeIconClass(meta.iconTone) },
    variantClass: navBadgeVariantClass(meta.iconTone),
  };
}
