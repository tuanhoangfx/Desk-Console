import { useMemo } from "react";
import { PlayCircle } from "lucide-react";
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
import type { RunnerRow } from "../../lib/api";
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

const RUNNER_DETAIL_TOC = [
  { id: "desk-runner-status", label: "Status", emoji: "🚦" },
  { id: "desk-runner-identity", label: "Identity", emoji: "📛" },
] as const;

type Props = {
  row: RunnerRow;
  onClose: () => void;
};

export function RunnerDetailModal({ row, onClose }: Props) {
  const sectionIds = useMemo(() => RUNNER_DETAIL_TOC.map((item) => item.id), []);
  const title = row.kind === "worker" ? `${row.code} · host API` : `${row.code} · UI`;
  const probedAt = row.probedAt ?? new Date().toISOString();

  return (
    <HubAccountDetailSearchProvider>
      <HubToolDetailModal
        open
        onClose={onClose}
        title={title}
        titleId="desk-runner-detail-title"
        headerIcon={PlayCircle}
        headerIconClassName="text-amber-300"
        headerCenter={<HubAccountDetailHeaderSearch />}
        shellClassName={`${DESK_DETAIL_MODAL_SHELL_CLASS} runner-detail-modal`}
        data-main-scroll={HUB_ACCOUNT_DETAIL_MAIN_SCROLL_CLASS}
        sectionIds={sectionIds}
        scrollRootSelector={HUB_ACCOUNT_DETAIL_MAIN_SCROLL_ROOT}
        toc={<DeskDetailTocNav items={[...RUNNER_DETAIL_TOC]} />}
        footer={<HubToolDetailModalAccountFooter onClose={onClose} />}
        ariaLabelledBy="desk-runner-detail-title"
      >
        <HubAccountDetailAdmScaffold
          panelId="desk-runner-detail"
          panelTitle="Runner"
          panelTitleEmoji="▶️"
          {...DESK_DETAIL_SCAFFOLD_PROPS}
          main={
            <>
              <HubAdmRecordMetaRow
                vaultId={<HubCrmDetailVaultIdBadge id={row.id} title="Copy runner ID" />}
                created={<HubAdmPlainRelativeTime at={probedAt} />}
                updated={<HubAdmPlainRelativeTime at={probedAt} />}
                createdLabel="Created"
                updatedLabel="Update"
              />
              <div className={DESK_DETAIL_FORM_STACK_CLASS}>
                <HubAdmSectionBlock {...deskDetailSectionProps({ id: "desk-runner-status", label: "Status", emoji: "🚦", sectionKey: "status" })}>
                  <div className={DESK_DETAIL_FORM_ROW_ALIGNED_3}>
                    <DeskDetailReadonlyField label="Status" headerEmoji="🚦">
                      <HubUsersStatusLabel label={row.up ? "Up" : "Down"} tone={row.up ? "online" : "off"} />
                    </DeskDetailReadonlyField>
                    <DeskDetailReadonlyField label="Port" value={String(row.port)} headerEmoji="🔌" />
                    <DeskDetailReadonlyField label="Kind" value={row.kind} headerEmoji="🧩" />
                  </div>
                </HubAdmSectionBlock>
                <HubAdmSectionBlock {...deskDetailSectionProps({ id: "desk-runner-identity", label: "Identity", emoji: "📛", sectionKey: "name" })}>
                  <div className={DESK_DETAIL_FORM_ROW_ALIGNED_3}>
                    <DeskDetailReadonlyField label="Code" headerEmoji="🏷️">
                      <HubDirectoryReadonlyCopyText value={row.code} />
                    </DeskDetailReadonlyField>
                    <DeskDetailReadonlyField label="Name" value={row.name} headerEmoji="📛" />
                    <DeskDetailReadonlyField label="Stack" value={row.stack || "—"} headerEmoji="🗂️" />
                    <DeskDetailReadonlyField label="Tool root" headerEmoji="📂">
                      <HubDirectoryReadonlyCopyText value={row.toolRoot || "—"} />
                    </DeskDetailReadonlyField>
                    <DeskDetailReadonlyField label="Probe path" value={row.probePath || "/"} headerEmoji="🎯" />
                    <DeskDetailReadonlyField label="Open path" value={row.openPath || "—"} headerEmoji="🔗" />
                    <DeskDetailReadonlyField label="URL" headerEmoji="🌐">
                      <HubDirectoryReadonlyCopyText value={row.url} />
                    </DeskDetailReadonlyField>
                  </div>
                </HubAdmSectionBlock>
              </div>
            </>
          }
          rail={<DeskDetailNoteLogRails targetId={row.id} note={`Runner ${row.code} on :${row.port}`} />}
        />
      </HubToolDetailModal>
    </HubAccountDetailSearchProvider>
  );
}
