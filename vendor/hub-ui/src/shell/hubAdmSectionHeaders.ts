import {
  Archive,
  BarChart3,
  Blocks,
  CreditCard,
  Fingerprint,
  Gauge,
  Monitor,
  MonitorSmartphone,
  Package,
  Radar,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import type { HubTableColumnHeaderProps } from "../content/HubTableColumnHeader";

/** Account detail modal — subsection headings (icon + label, sentence case). */
export type HubAdmSectionKey =
  | "status"
  | "record"
  | "identity"
  | "profile"
  | "device"
  | "plan"
  | "subscription"
  | "exchange"
  | "service"
  | "probe"
  | "browser"
  | "usage";

/** Section icons are distinct from field column roles inside each block. */
const HUB_ADM_SECTION_HEADERS: Record<HubAdmSectionKey, HubTableColumnHeaderProps> = {
  status: { label: "Status", icon: Gauge, iconClassName: "hub-adm-section-icon--rose" },
  record: { label: "Record", icon: Archive, iconClassName: "hub-adm-section-icon--slate" },
  identity: { label: "Identity", icon: Fingerprint, iconClassName: "hub-adm-section-icon--cyan" },
  profile: { label: "Profile", icon: UserRound, iconClassName: "hub-adm-section-icon--indigo" },
  device: { label: "Device", icon: MonitorSmartphone, iconClassName: "hub-adm-section-icon--teal" },
  plan: { label: "Plan", icon: Package, iconClassName: "hub-adm-section-icon--violet" },
  subscription: { label: "Subscription", icon: CreditCard, iconClassName: "hub-adm-section-icon--indigo" },
  exchange: { label: "Exchange", icon: ShoppingBag, iconClassName: "hub-adm-section-icon--amber" },
  service: { label: "Service", icon: Blocks, iconClassName: "hub-adm-section-icon--sky" },
  probe: { label: "Probe", icon: Radar, iconClassName: "hub-adm-section-icon--sky" },
  browser: { label: "Browser", icon: Monitor, iconClassName: "hub-adm-section-icon--teal" },
  usage: { label: "Quota usage", icon: BarChart3, iconClassName: "hub-adm-section-icon--lime" },
};

export function hubAdmSectionHeader(key: HubAdmSectionKey): HubTableColumnHeaderProps {
  return HUB_ADM_SECTION_HEADERS[key];
}

export function hubAdmSectionBlockClass(key: HubAdmSectionKey): string {
  return `hub-adm-section-block hub-adm-section-block--${key}`;
}
