import { Archive, Compass, Package, ScrollText, StickyNote, User, type LucideIcon } from "lucide-react";

/** Account-detail modal section keys — TOC · main panel · note · log rail. */
export type HubAccountDetailSectionKind =
  | "navigate"
  | "record"
  | "credentials"
  | "note"
  | "log"
  | "subscription";

export type HubAccountDetailSectionTone = "indigo" | "emerald" | "amber" | "violet" | "sky";

type HubAccountDetailSectionMeta = {
  Icon: LucideIcon;
  tone: HubAccountDetailSectionTone;
};

/** Golden section icon + tone map (P0020 Account · P0003 profile · P0006 tool-detail). */
export const HUB_ACCOUNT_DETAIL_SECTION_META: Record<
  HubAccountDetailSectionKind,
  HubAccountDetailSectionMeta
> = {
  navigate: { Icon: Compass, tone: "indigo" },
  record: { Icon: Archive, tone: "sky" },
  credentials: { Icon: User, tone: "emerald" },
  note: { Icon: StickyNote, tone: "amber" },
  log: { Icon: ScrollText, tone: "violet" },
  subscription: { Icon: Package, tone: "violet" },
};

export function hubAccountDetailSectionIcon(kind: HubAccountDetailSectionKind): LucideIcon {
  return HUB_ACCOUNT_DETAIL_SECTION_META[kind].Icon;
}

export function hubAccountDetailSectionIconClass(kind: HubAccountDetailSectionKind): string {
  const { tone } = HUB_ACCOUNT_DETAIL_SECTION_META[kind];
  return `hub-account-detail-section-icon hub-account-detail-section-icon--${tone}`;
}
