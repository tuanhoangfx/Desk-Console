import type { ReactNode } from "react";
import {
  HubAccountDetailAdmScaffold,
  type HubAccountDetailAdmScaffoldProps,
  HubAdmSectionBlock,
  HubCrmDetailTocNav,
  HUB_ACCOUNT_DETAIL_MODAL_SHELL_CLASS,
  type HubAdmSectionBlockProps,
  type HubAdmSectionKey,
  type HubCrmDetailTocItem,
  type HubTableColumnRole,
} from "@tool-workspace/hub-ui";

export {
  CRM_DETAIL_FORM_STACK_CLASS as DESK_DETAIL_FORM_STACK_CLASS,
  CRM_DETAIL_FORM_ROW_ALIGNED_3 as DESK_DETAIL_FORM_ROW_ALIGNED_3,
} from "@tool-workspace/hub-ui";

export const DESK_DETAIL_LOG_SECTION = "desk-detail-log";

export const DESK_DETAIL_MODAL_SHELL_CLASS = `${HUB_ACCOUNT_DETAIL_MODAL_SHELL_CLASS} desk-ops-detail-modal`;

export const DESK_DETAIL_SCAFFOLD_PROPS = {
  frameClassName: "desk-ops-detail-modal__body",
  panelClassName: "desk-ops-detail-modal__panel",
  panelBodyClassName: "desk-ops-detail-modal__panel-body",
} as const satisfies Pick<
  HubAccountDetailAdmScaffoldProps,
  "frameClassName" | "panelClassName" | "panelBodyClassName"
>;

export const DESK_DETAIL_SECTION_CLASS = "desk-ops-detail-section";

export function DeskDetailTocNav({ items }: { items: readonly HubCrmDetailTocItem[] }) {
  return <HubCrmDetailTocNav items={items} className="desk-ops-detail-toc-rail" />;
}

export function deskDetailSectionProps({
  id,
  label,
  emoji,
  sectionKey,
  role = "email",
  children,
}: {
  id: string;
  label: string;
  emoji?: string;
  sectionKey?: HubAdmSectionKey;
  role?: HubTableColumnRole;
  children: ReactNode;
}): HubAdmSectionBlockProps {
  return {
    id,
    label,
    emoji,
    sectionKey,
    role,
    className: DESK_DETAIL_SECTION_CLASS,
    children,
  };
}
