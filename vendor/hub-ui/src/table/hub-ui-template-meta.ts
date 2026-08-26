import {
  BookOpen,
  Gauge,
  Inbox,
  LayoutGrid,
  LayoutTemplate,
  PanelLeft,
  Settings2,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { navBadgeIconClass, navBadgeVariantClass, type NavIconTone } from "../shell/sidebar-nav-tones";
import type { BadgeSpec } from "../types/filter-badge";
import type { HubUiTemplate } from "../ui-template-types";

export type HubUiTemplateMeta = {
  id: HubUiTemplate;
  /** Agent / ui-patterns.catalog display name */
  label: string;
  icon: LucideIcon;
  iconTone: NavIconTone;
};

/** Hub UI screen templates — icons aligned with Agent tab pattern rows. */
export const HUB_UI_TEMPLATE_META: Record<HubUiTemplate, HubUiTemplateMeta> = {
  directory: {
    id: "directory",
    label: "Directory",
    icon: LayoutGrid,
    iconTone: "emerald",
  },
  "document-toc": {
    id: "document-toc",
    label: "Document TOC",
    icon: BookOpen,
    iconTone: "amber",
  },
  dashboard: {
    id: "dashboard",
    label: "Dashboard",
    icon: Gauge,
    iconTone: "sky",
  },
  "system-panels": {
    id: "system-panels",
    label: "System panels",
    icon: Settings2,
    iconTone: "amber",
  },
  "workspace-composer": {
    id: "workspace-composer",
    label: "Workspace composer",
    icon: PanelLeft,
    iconTone: "cyan",
  },
  "inbox-split": {
    id: "inbox-split",
    label: "Inbox split",
    icon: Inbox,
    iconTone: "sky",
  },
  "auth-gate": {
    id: "auth-gate",
    label: "Auth gate",
    icon: ShieldCheck,
    iconTone: "rose",
  },
};

const FALLBACK_META: HubUiTemplateMeta = {
  id: "directory",
  label: "Pattern",
  icon: LayoutTemplate,
  iconTone: "violet",
};

export function resolveHubUiTemplateMeta(template: string): HubUiTemplateMeta {
  const key = template as HubUiTemplate;
  return HUB_UI_TEMPLATE_META[key] ?? { ...FALLBACK_META, label: template || "—" };
}

export function resolveHubUiTemplateBadge(template: string): BadgeSpec {
  const meta = resolveHubUiTemplateMeta(template);
  return {
    label: meta.label,
    iconMeta: { icon: meta.icon, className: navBadgeIconClass(meta.iconTone) },
    variantClass: navBadgeVariantClass(meta.iconTone),
  };
}
