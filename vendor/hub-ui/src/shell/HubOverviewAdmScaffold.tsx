import type { ReactNode } from "react";
import { HubAccountDetailAdmBody } from "./HubAccountDetailAdmBody";
import {
  HUB_ACCOUNT_DETAIL_MAIN_SCROLL_ROOT,
  hubAccountDetailShellClass,
} from "./hubAccountDetailModal";

export const HUB_OVERVIEW_ADM_PAGE_CLASS = "hub-overview-adm-page";
export const HUB_OVERVIEW_ADM_SHELL_CLASS = "hub-overview-adm-scaffold__shell";

export type HubOverviewAdmScaffoldProps = {
  /** Modal-style header above the bordered frame (tool identity, picker, etc.). */
  header?: ReactNode;
  /** Left TOC column — typically HubToolDetailRail + HubTocSectionNav. */
  toc: ReactNode;
  sectionIds: readonly string[];
  scrollRootSelector?: string;
  main: ReactNode;
  log: ReactNode;
  shellClassName?: string;
  pageClassName?: string;
  ariaLabel?: string;
};

/**
 * Page-embedded Account-detail frame — chrome + `HubAccountDetailAdmBody` (P0020 golden).
 */
export function HubOverviewAdmScaffold({
  header,
  toc,
  sectionIds,
  scrollRootSelector = HUB_ACCOUNT_DETAIL_MAIN_SCROLL_ROOT,
  main,
  log,
  shellClassName = "",
  pageClassName = "",
  ariaLabel = "Detail overview",
}: HubOverviewAdmScaffoldProps) {
  return (
    <div
      className={`${HUB_OVERVIEW_ADM_PAGE_CLASS}${pageClassName ? ` ${pageClassName}` : ""}`}
      data-overview-adm
    >
      {header ? <div className="hub-overview-adm-page__header">{header}</div> : null}
      <section
        className={`${HUB_OVERVIEW_ADM_SHELL_CLASS} ${hubAccountDetailShellClass({ glowSubtle: true, extra: shellClassName })}`}
        aria-label={ariaLabel}
      >
        <div className="hub-overview-adm-scaffold__inner hub-tool-detail-modal__body">
          <HubAccountDetailAdmBody
            toc={toc}
            main={main}
            rail={log}
            sectionIds={sectionIds}
            scrollRootSelector={scrollRootSelector}
          />
        </div>
      </section>
    </div>
  );
}
