import type { ReactNode } from "react";
import type { HubTableColumnHeaderProps } from "../content/HubTableColumnHeader";
import type { HubDirectoryColumnHintContent } from "../table/HubDirectoryColumnHint";
import { HubAdmReadonlyField } from "./HubAdmClickEditField";
import { hubAdmSectionBlockClass } from "./hubAdmSectionHeaders";
import { HUB_RECORD_META_FIELD_HEADERS } from "./hubRecordMeta";

export type HubAdmRecordMetaRowProps = {
  vaultId: ReactNode;
  created: ReactNode;
  updated: ReactNode;
  className?: string;
  vaultIdHint?: HubDirectoryColumnHintContent;
  createdHint?: HubDirectoryColumnHintContent;
  updatedHint?: HubDirectoryColumnHintContent;
  /** Entity-specific wording (e.g. account modal: “User ID”, “Last sign in”) — icon/role stay SSOT. */
  vaultIdLabel?: string;
  createdLabel?: string;
  updatedLabel?: string;
};

function metaHeader(
  key: keyof typeof HUB_RECORD_META_FIELD_HEADERS,
  label?: string,
): HubTableColumnHeaderProps {
  const header = HUB_RECORD_META_FIELD_HEADERS[key];
  return label ? { ...header, label } : header;
}

/**
 * Fixed record metadata row — Created · Update · Vault ID (standalone frame).
 * Place above domain sections (Order / Customer SSOT); no section heading.
 */
export function HubAdmRecordMetaRow({
  vaultId,
  created,
  updated,
  className = "",
  vaultIdHint,
  createdHint,
  updatedHint,
  vaultIdLabel,
  createdLabel,
  updatedLabel,
}: HubAdmRecordMetaRowProps) {
  return (
    <div className={`${hubAdmSectionBlockClass("record")} hub-adm-record-meta-row${className ? ` ${className}` : ""}`}>
      <div className="hub-adm-section-block__rows">
        <div className="hub-adm-form-row hub-adm-form-row--3 hub-adm-form-row--aligned hub-adm-meta-row">
          <HubAdmReadonlyField
            header={metaHeader("created", createdLabel)}
            labelHint={createdHint}
            valueLayout="inline"
          >
            {created}
          </HubAdmReadonlyField>
          <HubAdmReadonlyField
            header={metaHeader("updated", updatedLabel)}
            labelHint={updatedHint}
            valueLayout="inline"
          >
            {updated}
          </HubAdmReadonlyField>
          <HubAdmReadonlyField
            header={metaHeader("vaultId", vaultIdLabel)}
            labelHint={vaultIdHint}
            valueLayout="inline"
          >
            {vaultId}
          </HubAdmReadonlyField>
        </div>
      </div>
    </div>
  );
}
