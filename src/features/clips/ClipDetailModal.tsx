import { useMemo } from "react";
import { ClipboardList } from "lucide-react";
import {
  HubAccountDetailAdmScaffold,
  HubAccountDetailHeaderSearch,
  HubAccountDetailSearchProvider,
  HubAdmPlainRelativeTime,
  HubAdmRecordMetaRow,
  HubAdmSectionBlock,
  HubCrmDetailVaultIdBadge,
  HubDirectoryReadonlyCopyText,
  HubToolDetailModal,
  HubToolDetailModalAccountFooter,
  HubUsersStatusLabel,
  HUB_ACCOUNT_DETAIL_MAIN_SCROLL_CLASS,
  HUB_ACCOUNT_DETAIL_MAIN_SCROLL_ROOT,
} from "@tool-workspace/hub-ui";
import type { ClipRow } from "../../lib/api";
import { DeskDetailNoteLogRails } from "../desk/DeskDetailNoteLogRails";
import { DeskDetailReadonlyField } from "../desk/desk-detail-fields";
import {
  DESK_DETAIL_FORM_ROW_ALIGNED_3,
  DESK_DETAIL_FORM_STACK_CLASS,
  DESK_DETAIL_MODAL_SHELL_CLASS,
  DESK_DETAIL_SCAFFOLD_PROPS,
  DeskDetailTocNav,
  deskDetailSectionProps,
} from "../desk/desk-detail-modal-shell";

const CLIP_DETAIL_TOC = [
  { id: "desk-clip-status", label: "Status", emoji: "🚦" },
  { id: "desk-clip-identity", label: "Identity", emoji: "📛" },
] as const;

type Props = {
  row: ClipRow;
  onClose: () => void;
};

export function ClipDetailModal({ row, onClose }: Props) {
  const sectionIds = useMemo(() => CLIP_DETAIL_TOC.map((item) => item.id), []);
  const title = row.name?.trim() || row.text.slice(0, 48) || "Clip";
  const sample = row.kind === "sample";

  return (
    <HubAccountDetailSearchProvider>
      <HubToolDetailModal
        open
        onClose={onClose}
        title={title}
        titleId="desk-clip-detail-title"
        headerIcon={ClipboardList}
        headerIconClassName="text-emerald-300"
        headerCenter={<HubAccountDetailHeaderSearch />}
        shellClassName={`${DESK_DETAIL_MODAL_SHELL_CLASS} clip-detail-modal`}
        data-main-scroll={HUB_ACCOUNT_DETAIL_MAIN_SCROLL_CLASS}
        sectionIds={sectionIds}
        scrollRootSelector={HUB_ACCOUNT_DETAIL_MAIN_SCROLL_ROOT}
        toc={<DeskDetailTocNav items={[...CLIP_DETAIL_TOC]} />}
        footer={<HubToolDetailModalAccountFooter onClose={onClose} />}
        ariaLabelledBy="desk-clip-detail-title"
      >
        <HubAccountDetailAdmScaffold
          panelId="desk-clip-detail"
          panelTitle="Clip"
          panelTitleEmoji="📋"
          {...DESK_DETAIL_SCAFFOLD_PROPS}
          main={
            <>
              <HubAdmRecordMetaRow
                vaultId={<HubCrmDetailVaultIdBadge id={row.id} title="Copy clip ID" />}
                created={<HubAdmPlainRelativeTime at={row.createdAt} />}
                updated={<HubAdmPlainRelativeTime at={row.updatedAt || row.createdAt} />}
                createdLabel="Created"
                updatedLabel="Update"
              />
              <div className={DESK_DETAIL_FORM_STACK_CLASS}>
                <HubAdmSectionBlock {...deskDetailSectionProps({ id: "desk-clip-status", label: "Status", emoji: "🚦", sectionKey: "status" })}>
                  <div className={DESK_DETAIL_FORM_ROW_ALIGNED_3}>
                    <DeskDetailReadonlyField label="Status" headerEmoji="🚦">
                      <HubUsersStatusLabel label={sample ? "Sample" : "History"} tone={sample ? "online" : "active"} />
                    </DeskDetailReadonlyField>
                    <DeskDetailReadonlyField label="Pinned" value={row.pinned ? "Yes" : "No"} headerEmoji="📌" />
                    <DeskDetailReadonlyField label="Source" value={row.source || "—"} headerEmoji="🔗" />
                  </div>
                </HubAdmSectionBlock>
                <HubAdmSectionBlock {...deskDetailSectionProps({ id: "desk-clip-identity", label: "Identity", emoji: "📛", sectionKey: "name" })}>
                  <div className={DESK_DETAIL_FORM_ROW_ALIGNED_3}>
                    <DeskDetailReadonlyField label="Name" headerEmoji="🏷️">
                      <HubDirectoryReadonlyCopyText value={row.name || "—"} />
                    </DeskDetailReadonlyField>
                    <DeskDetailReadonlyField label="Text" headerEmoji="📝">
                      <HubDirectoryReadonlyCopyText value={row.text} multilineHover />
                    </DeskDetailReadonlyField>
                    <DeskDetailReadonlyField label="Clip id" headerEmoji="🆔">
                      <HubCrmDetailVaultIdBadge id={row.id} title="Copy clip ID" />
                    </DeskDetailReadonlyField>
                  </div>
                </HubAdmSectionBlock>
              </div>
            </>
          }
          rail={<DeskDetailNoteLogRails targetId={row.id} note={row.text.slice(0, 500)} />}
        />
      </HubToolDetailModal>
    </HubAccountDetailSearchProvider>
  );
}
