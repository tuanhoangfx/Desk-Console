import { buildSemanticTocIcon } from "../lib/semantic-icon-registry";
import type { HubTocNavItem } from "../shell/HubTocSectionNav";
import type { SemanticIconKey } from "../types/semantic-icon";

export type HubUserAccountTocEntry = {
  id: string;
  label: string;
  semanticKey: SemanticIconKey;
};

/** Matches `HubUserAccountSections` anchors — P0020 ADM grouping. */
export const HUB_WORKSPACE_USER_ACCOUNT_TOC: HubUserAccountTocEntry[] = [
  { id: "hub-user-credentials", label: "Credentials", semanticKey: "user.security" },
  { id: "hub-user-identity", label: "Identity", semanticKey: "user.account" },
  { id: "hub-user-status", label: "Status", semanticKey: "user.session" },
];

export const HUB_FULL_USER_ACCOUNT_TOC: HubUserAccountTocEntry[] = [
  ...HUB_WORKSPACE_USER_ACCOUNT_TOC,
  { id: "hub-user-note", label: "Note", semanticKey: "filter.note" },
  { id: "hub-user-log", label: "Log", semanticKey: "log.panel" },
];

export function hubUserAccountTocItems(entries: readonly HubUserAccountTocEntry[]): HubTocNavItem[] {
  return entries.map(({ id, label, semanticKey }) => ({
    id,
    label,
    icon: buildSemanticTocIcon(semanticKey),
  }));
}

export function hubUserAccountSectionIcon(entries: readonly HubUserAccountTocEntry[], id: string) {
  const entry = entries.find((item) => item.id === id);
  return entry ? buildSemanticTocIcon(entry.semanticKey) : undefined;
}
