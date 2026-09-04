import { useMemo } from "react";
import { CalendarClock } from "lucide-react";
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
import type { TaskRow } from "../../lib/api";
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

const TASK_DETAIL_TOC = [
  { id: "desk-task-status", label: "Status", emoji: "🚦" },
  { id: "desk-task-identity", label: "Identity", emoji: "📛" },
] as const;

type Props = {
  row: TaskRow;
  onClose: () => void;
};

export function TaskDetailModal({ row, onClose }: Props) {
  const sectionIds = useMemo(() => TASK_DETAIL_TOC.map((item) => item.id), []);
  const updatedAt = row.lastRun || row.nextRun || new Date().toISOString();

  return (
    <HubAccountDetailSearchProvider>
      <HubToolDetailModal
        open
        onClose={onClose}
        title={row.name}
        titleId="desk-task-detail-title"
        headerIcon={CalendarClock}
        headerIconClassName="text-sky-300"
        headerCenter={<HubAccountDetailHeaderSearch />}
        shellClassName={`${DESK_DETAIL_MODAL_SHELL_CLASS} task-detail-modal`}
        data-main-scroll={HUB_ACCOUNT_DETAIL_MAIN_SCROLL_CLASS}
        sectionIds={sectionIds}
        scrollRootSelector={HUB_ACCOUNT_DETAIL_MAIN_SCROLL_ROOT}
        toc={<DeskDetailTocNav items={[...TASK_DETAIL_TOC]} />}
        footer={<HubToolDetailModalAccountFooter onClose={onClose} />}
        ariaLabelledBy="desk-task-detail-title"
      >
        <HubAccountDetailAdmScaffold
          panelId="desk-task-detail"
          panelTitle="Task"
          panelTitleEmoji="⏱️"
          {...DESK_DETAIL_SCAFFOLD_PROPS}
          main={
            <>
              <HubAdmRecordMetaRow
                vaultId={<HubCrmDetailVaultIdBadge id={row.id} title="Copy task ID" />}
                created={<HubAdmPlainRelativeTime at={updatedAt} />}
                updated={<HubAdmPlainRelativeTime at={updatedAt} />}
                createdLabel="Created"
                updatedLabel="Update"
              />
              <div className={DESK_DETAIL_FORM_STACK_CLASS}>
                <HubAdmSectionBlock {...deskDetailSectionProps({ id: "desk-task-status", label: "Status", emoji: "🚦", sectionKey: "status" })}>
                  <div className={DESK_DETAIL_FORM_ROW_ALIGNED_3}>
                    <DeskDetailReadonlyField label="Status" headerEmoji="🚦">
                      <HubUsersStatusLabel
                        label={row.status}
                        tone={/ready|running/i.test(row.status) ? "online" : "idle"}
                      />
                    </DeskDetailReadonlyField>
                    <DeskDetailReadonlyField label="Last result" value={row.lastResult || "—"} headerEmoji="📊" />
                    <DeskDetailReadonlyField label="Next run" value={row.nextRun || "—"} headerEmoji="🕒" />
                  </div>
                </HubAdmSectionBlock>
                <HubAdmSectionBlock {...deskDetailSectionProps({ id: "desk-task-identity", label: "Identity", emoji: "📛", sectionKey: "name" })}>
                  <div className={DESK_DETAIL_FORM_ROW_ALIGNED_3}>
                    <DeskDetailReadonlyField label="Task name" headerEmoji="🏷️">
                      <HubDirectoryReadonlyCopyText value={row.name} />
                    </DeskDetailReadonlyField>
                    <DeskDetailReadonlyField label="Task id" headerEmoji="🆔">
                      <HubCrmDetailVaultIdBadge id={row.id} title="Copy task ID" />
                    </DeskDetailReadonlyField>
                    <DeskDetailReadonlyField label="Last run" value={row.lastRun || "—"} headerEmoji="🕒" />
                  </div>
                </HubAdmSectionBlock>
              </div>
            </>
          }
          rail={<DeskDetailNoteLogRails targetId={row.id} note={`Windows task ${row.name}`} />}
        />
      </HubToolDetailModal>
    </HubAccountDetailSearchProvider>
  );
}
