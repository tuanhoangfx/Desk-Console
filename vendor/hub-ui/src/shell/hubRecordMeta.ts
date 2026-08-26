import type { HubTableColumnHeaderProps } from "../content/HubTableColumnHeader";

/** Fixed record metadata labels — any entity detail modal (vault row, CRM row, …). */
export const HUB_RECORD_META_LABELS = {
  vaultId: "Vault ID",
  created: "Created",
  updated: "Update",
} as const;

export const HUB_RECORD_META_FIELD_HEADERS: Record<
  keyof typeof HUB_RECORD_META_LABELS,
  HubTableColumnHeaderProps
> = {
  vaultId: { label: HUB_RECORD_META_LABELS.vaultId, role: "vault" },
  /** ADM labels use emoji — Lucide Clock/History is directory-table header only. */
  created: { label: HUB_RECORD_META_LABELS.created, headerEmoji: "📅" },
  updated: { label: HUB_RECORD_META_LABELS.updated, headerEmoji: "🔄" },
};
