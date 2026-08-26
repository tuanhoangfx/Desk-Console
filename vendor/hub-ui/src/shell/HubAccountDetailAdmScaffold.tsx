import type { ReactNode } from "react";
import { HubAccountDetailModalFrame } from "./HubAccountDetailModalFrame";
import { HubToolDetailPanel } from "./HubToolDetailSplitLayout";
import {
  HUB_ACCOUNT_DETAIL_CONTENT_ROOT_CLASS,
  HUB_ACCOUNT_DETAIL_MAIN_SCROLL_CLASS,
} from "./hubAccountDetailModal";
import { HUB_ACCOUNT_DETAIL_ADM_FRAME_CLASS } from "./HubAccountDetailAdmBody";
import { hubAdmSectionHeader, type HubAdmSectionKey } from "./hubAdmSectionHeaders";
import {
  hubAccountDetailSectionIcon,
  hubAccountDetailSectionIconClass,
  type HubAccountDetailSectionKind,
} from "./hubAccountDetailSectionIcons";
import { hubToolDetailTitleWithEmoji } from "./hubToolDetailTitleWithEmoji";

export type HubAccountDetailAdmScaffoldProps = {
  panelId: string;
  panelTitle?: string;
  /** Panel header emoji — sheet sticker parity (📡 Profile directory, 📜 Order Details). */
  panelTitleEmoji?: string;
  /** ADM subsection Lucide header — overrides `panelSectionKey` icon when set. */
  panelAdmSectionKey?: HubAdmSectionKey;
  /** Panel header icon tone — defaults to credentials (P0020 Mail golden). */
  panelSectionKey?: HubAccountDetailSectionKind;
  main: ReactNode;
  rail?: ReactNode;
  frameClassName?: string;
  panelClassName?: string;
  panelBodyClassName?: string;
};

/**
 * Golden account-detail main column — `HubToolDetailPanel` inside `HubAccountDetailModalFrame`.
 * Layout tokens only from `hub-account-detail-modal.css` (no tool sizing overrides).
 */
export function HubAccountDetailAdmScaffold({
  panelId,
  panelTitle = "Credentials",
  panelTitleEmoji,
  panelAdmSectionKey,
  panelSectionKey = "credentials",
  main,
  rail,
  frameClassName = "",
  panelClassName = "",
  panelBodyClassName = "",
}: HubAccountDetailAdmScaffoldProps) {
  const admHeader = panelAdmSectionKey ? hubAdmSectionHeader(panelAdmSectionKey) : null;
  const PanelIcon = panelTitleEmoji
    ? undefined
    : admHeader?.icon ?? hubAccountDetailSectionIcon(panelSectionKey);
  const panelIconClassName = panelTitleEmoji
    ? undefined
    : admHeader?.iconClassName ?? hubAccountDetailSectionIconClass(panelSectionKey);
  const panelTitleNode = panelTitleEmoji ? hubToolDetailTitleWithEmoji(panelTitle, panelTitleEmoji) : panelTitle;
  const frameClass = [
    HUB_ACCOUNT_DETAIL_CONTENT_ROOT_CLASS,
    HUB_ACCOUNT_DETAIL_ADM_FRAME_CLASS,
    frameClassName,
  ]
    .filter(Boolean)
    .join(" ");
  const bodyClass = [
    HUB_ACCOUNT_DETAIL_MAIN_SCROLL_CLASS,
    "hub-split-scroll",
    "hub-split-scroll--panel",
    panelBodyClassName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <HubAccountDetailModalFrame
      className={frameClass}
      main={
        <HubToolDetailPanel
          id={panelId}
          title={panelTitleNode}
          icon={PanelIcon ?? undefined}
          iconClassName={panelIconClassName}
          className={`hub-tool-detail-panel--grow${panelClassName ? ` ${panelClassName}` : ""}`}
          bodyClassName={bodyClass}
          ariaLabel={panelTitle}
        >
          {main}
        </HubToolDetailPanel>
      }
      rail={rail}
    />
  );
}
