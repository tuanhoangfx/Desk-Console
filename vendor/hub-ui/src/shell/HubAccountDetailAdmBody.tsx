import type { ReactNode } from "react";
import { HubAccountDetailModalFrame } from "./HubAccountDetailModalFrame";
import {
  HUB_ACCOUNT_DETAIL_CONTENT_ROOT_CLASS,
  HUB_ACCOUNT_DETAIL_MAIN_SCROLL_ROOT,
} from "./hubAccountDetailModal";
import { HubTocHighlightContent, HubTocSectionHighlightProvider } from "./HubTocSectionHighlight";
import { HubToolDetailModalTocLayout } from "./HubToolDetailModal";

export const HUB_ACCOUNT_DETAIL_ADM_FRAME_CLASS = "twofa-account-detail-modal__frame";

type HubAccountDetailAdmBodyBase = {
  toc: ReactNode;
  sectionIds: readonly string[];
  scrollRootSelector?: string;
  /** Passed to `HubTocHighlightContent` (modal bodyClassName). */
  highlightClassName?: string;
  frameClassName?: string;
  /** Wrap in `hub-tool-detail-modal__body` — `HubToolDetailModal` sets true. */
  wrapBody?: boolean;
};

export type HubAccountDetailAdmBodyProps = HubAccountDetailAdmBodyBase &
  (
    | { main: ReactNode; rail?: ReactNode; content?: never }
    | { content: ReactNode; main?: never; rail?: never }
  );

/**
 * Golden ADM body — TOC · scroll · `HubAccountDetailModalFrame` (P0020 Mail SSOT).
 * Used by `HubToolDetailModal` (content = frame) and page embed (`main` + `rail`).
 */
export function HubAccountDetailAdmBody({
  toc,
  sectionIds,
  scrollRootSelector = HUB_ACCOUNT_DETAIL_MAIN_SCROLL_ROOT,
  highlightClassName = "",
  frameClassName = `${HUB_ACCOUNT_DETAIL_CONTENT_ROOT_CLASS} ${HUB_ACCOUNT_DETAIL_ADM_FRAME_CLASS}`,
  wrapBody = false,
  main,
  rail,
  content,
}: HubAccountDetailAdmBodyProps) {
  const frame =
    content ??
    (main ? <HubAccountDetailModalFrame className={frameClassName} main={main} rail={rail} /> : null);

  if (!frame) return null;

  const layout = (
    <HubToolDetailModalTocLayout toc={toc}>
      {sectionIds.length ? (
        <HubTocHighlightContent className={highlightClassName || undefined}>{frame}</HubTocHighlightContent>
      ) : (
        frame
      )}
    </HubToolDetailModalTocLayout>
  );

  const inner =
    sectionIds.length > 0 ? (
      <HubTocSectionHighlightProvider sectionIds={[...sectionIds]} scrollRootSelector={scrollRootSelector}>
        {layout}
      </HubTocSectionHighlightProvider>
    ) : (
      layout
    );

  return wrapBody ? <div className="hub-tool-detail-modal__body">{inner}</div> : inner;
}
