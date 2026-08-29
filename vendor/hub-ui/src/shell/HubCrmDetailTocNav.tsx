import { HubTocSectionNav } from "./HubTocSectionNav";
import { HubToolDetailRail } from "./HubToolDetailSplitLayout";
import { HUB_ACCOUNT_DETAIL_MAIN_SCROLL_ROOT } from "./hubAccountDetailModal";
import { hubAccountDetailSectionIcon, hubAccountDetailSectionIconClass } from "./hubAccountDetailSectionIcons";
import type { HubCrmDetailTocItem } from "./hubCrmDetailChrome";

export function HubCrmDetailTocNav({
  items,
  className = "hub-crm-detail-toc-rail",
}: {
  items: readonly HubCrmDetailTocItem[];
  className?: string;
}) {
  return (
    <HubToolDetailRail
      title="Navigate"
      icon={hubAccountDetailSectionIcon("navigate")}
      iconClassName={hubAccountDetailSectionIconClass("navigate")}
      className={className}
      scroll={false}
      ariaLabel="Sections"
    >
      <HubTocSectionNav
        items={[...items]}
        scrollRootSelector={HUB_ACCOUNT_DETAIL_MAIN_SCROLL_ROOT}
        admNav
      />
    </HubToolDetailRail>
  );
}

/** @deprecated Use HubCrmDetailTocNav */
export const CrmDetailTocNav = HubCrmDetailTocNav;
