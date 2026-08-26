import { buildSemanticTocIcon } from "../lib/semantic-icon-registry";
import type { HubTocNavItem } from "../shell/HubTocSectionNav";
import type { SemanticIconKey } from "../types/semantic-icon";

/** @deprecated Email/Password change sub-modals removed — Full account modal edits inline. */
export type HubUserChangeTocEntry = {
  id: string;
  label: string;
  semanticKey: SemanticIconKey;
};

/** @deprecated Inline email edit in HubFullUserAccountModal. */
export const HUB_CHANGE_EMAIL_TOC: HubUserChangeTocEntry[] = [];

/** @deprecated Inline password edit in HubFullUserAccountModal (no OTP). */
export const HUB_CHANGE_PASSWORD_TOC: HubUserChangeTocEntry[] = [];

/** @deprecated Inline username edit in HubFullUserAccountModal. */
export const HUB_CHANGE_USERNAME_TOC: HubUserChangeTocEntry[] = [];

export function hubUserChangeTocItems(entries: readonly HubUserChangeTocEntry[]): HubTocNavItem[] {
  return entries.map(({ id, label, semanticKey }) => ({
    id,
    label,
    icon: buildSemanticTocIcon(semanticKey),
  }));
}

export function hubUserChangeSectionIcon(entries: readonly HubUserChangeTocEntry[], id: string) {
  const entry = entries.find((item) => item.id === id);
  return entry ? buildSemanticTocIcon(entry.semanticKey) : undefined;
}
