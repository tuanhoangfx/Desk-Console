import { DirectoryEmptyDash } from "../lib/directory-empty-label";
import { formatVaultIdForDisplay } from "../lib/vault-id-from-key";
import { HubCopyBadge } from "./HubCopyBadge";
import { HubAdmSearchHighlightText } from "./HubAdmSearchHighlightText";

/** Vault / record ID — modal header search highlight (P0020 TwofaAccountDetailModal). */
export function HubCrmDetailVaultIdBadge({
  id,
  title = "Copy record ID",
}: {
  id: string;
  title?: string;
}) {
  const displayId = formatVaultIdForDisplay(id);
  if (!displayId) {
    return <DirectoryEmptyDash className="hub-users-cell-muted" />;
  }
  return (
    <HubCopyBadge
      value={displayId}
      title={title}
      labelContent={<HubAdmSearchHighlightText text={displayId} />}
    />
  );
}

/** @deprecated Use HubCrmDetailVaultIdBadge */
export const CrmDetailVaultIdBadge = HubCrmDetailVaultIdBadge;
