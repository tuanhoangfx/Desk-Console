import { useMemo } from "react";
import { HubTocSectionNav, type HubTocNavItem } from "./HubTocSectionNav";
import { HUB_TOOL_DETAIL_SCROLL_ROOT } from "./hubToolDetailModalChrome";

import type { ReactNode } from "react";

export type HubAddModalTabItem = {
  id: string;
  label: string;
  emoji?: string;
  icon?: ReactNode;
};

export type HubAddModalTocNavProps<TTab extends string = string> = {
  tabs: readonly HubAddModalTabItem[];
  activeTab: TTab;
  onTabChange: (tab: TTab) => void;
  /** Sub-TOC items shown when `activeTab === singleTabId`. */
  singleSectionItems?: readonly HubTocNavItem[];
  singleTabId?: string;
  /** Sub-TOC items shown when `activeTab === bulkTabId`. */
  bulkSectionItems?: readonly HubTocNavItem[];
  bulkTabId?: string;
  sectionIdPrefix?: string;
  scrollRootSelector?: string;
  className?: string;
  sectionsSlotClassName?: string;
};

/** Single · Bulk tab rail + optional bulk sub-TOC (P0020 2FA Add · P0004 User Add). */
export function HubAddModalTocNav<TTab extends string = string>({
  tabs,
  activeTab,
  onTabChange,
  singleSectionItems = [],
  singleTabId = "single",
  bulkSectionItems = [],
  bulkTabId = "bulk",
  sectionIdPrefix = "",
  scrollRootSelector = HUB_TOOL_DETAIL_SCROLL_ROOT,
  className = "",
  sectionsSlotClassName = "hub-add-modal__toc-sections",
}: HubAddModalTocNavProps<TTab>) {
  const bulkNavItems = useMemo(() => bulkSectionItems, [bulkSectionItems]);
  const singleNavItems = useMemo(() => singleSectionItems, [singleSectionItems]);
  const sectionNavItems =
    activeTab === singleTabId ? singleNavItems : activeTab === bulkTabId ? bulkNavItems : [];
  const showSectionNav = sectionNavItems.length > 0;

  return (
    <nav className={`hub-toc-nav hub-add-modal__toc${className ? ` ${className}` : ""}`} aria-label="Add mode">
      <ul className="hub-toc-nav__list space-y-0.5" role="tablist">
        {tabs.map((item) => {
          const active = activeTab === item.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                role="tab"
                aria-selected={active}
                className={`hub-toc-nav__item group relative z-[1] min-h-[var(--overview-toc-row-h,2rem)] w-full cursor-pointer text-left text-[13px] transition-colors${
                  active ? " is-active" : ""
                }`}
                onClick={() => onTabChange(item.id as TTab)}
              >
                <span className="hub-toc-nav__label flex min-w-0 items-center gap-1.5 truncate rounded-lg px-2 py-1 font-medium text-[var(--muted)] transition-all duration-200 group-hover:text-[var(--text)]">
                  {item.icon ? (
                    <span className="shrink-0 inline-flex items-center" aria-hidden>
                      {item.icon}
                    </span>
                  ) : item.emoji ? (
                    <span className="shrink-0 text-[12px] leading-none opacity-90" aria-hidden>
                      {item.emoji}
                    </span>
                  ) : null}
                  <span className="truncate">{item.label}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {showSectionNav ? (
        <div className={`${sectionsSlotClassName} mt-3 border-t border-white/5 pt-3`}>
          <HubTocSectionNav
            items={sectionNavItems}
            sectionIdPrefix={sectionIdPrefix}
            scrollRootSelector={scrollRootSelector}
          />
        </div>
      ) : (
        <div className={`${sectionsSlotClassName} mt-3 border-t border-white/5 pt-3`} aria-hidden />
      )}
    </nav>
  );
}
