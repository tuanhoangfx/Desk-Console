import type { ReactNode } from "react";
import type { HubDirectoryColumnHintContent } from "../table/HubDirectoryColumnHint";
import { HubDirectoryColumnHint } from "../table/HubDirectoryColumnHint";
import { scrollToHubTocSection } from "./hub-toc-scroll";
import { useHubTocNavActive, useHubTocNavHighlight } from "./HubTocSectionHighlight";
import { HUB_TOOL_DETAIL_SCROLL_ROOT } from "./HubToolDetailModal";

export type HubTocNavItem = {
  /** DOM id on `HubToolDetailSection` (or prefixed id when `sectionIdPrefix` is set). */
  id: string;
  label: string;
  icon?: ReactNode;
  emoji?: string;
  /** Directory-style hover hint (P0020 ADM Navigate SSOT). */
  labelHint?: HubDirectoryColumnHintContent;
};

type Props = {
  items: readonly HubTocNavItem[];
  /** Prepended to each item id for scroll target (Cookie download FAB uses `ext-dl-`). */
  sectionIdPrefix?: string;
  scrollRootSelector?: string;
  className?: string;
  /** Plain Lucide glyphs — no bordered icon tile (tool-detail modals). */
  plainIcons?: boolean;
  /** ADM account-detail modal — inherit `--hub-adm-type-nav-*` (12px semibold) from shell CSS. */
  admNav?: boolean;
};

function HubTocSectionNavItem({
  item,
  sectionId,
  scrollRootSelector,
  plainIcons = false,
  admNav = false,
}: {
  item: HubTocNavItem;
  sectionId: string;
  scrollRootSelector?: string;
  plainIcons?: boolean;
  admNav?: boolean;
}) {
  const isHighlighted = useHubTocNavHighlight(sectionId);
  const isActive = useHubTocNavActive(sectionId);

  const labelText = <span className="truncate">{item.label}</span>;
  const labelWithHint = item.labelHint ? (
    <HubDirectoryColumnHint
      content={item.labelHint}
      titleGlyph={item.emoji ? { emoji: item.emoji } : undefined}
    >
      {labelText}
    </HubDirectoryColumnHint>
  ) : (
    labelText
  );

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        scrollToHubTocSection(sectionId, scrollRootSelector);
      }}
      className={`hub-toc-nav__item group relative z-[1] min-h-[var(--overview-toc-row-h,2rem)] w-full cursor-pointer text-left transition-colors${
        admNav ? "" : " text-[13px]"
      }${isHighlighted ? " is-highlighted" : isActive ? " is-active" : ""}`}
    >
      <span
        className={`hub-toc-nav__label flex min-w-0 items-center gap-1.5 truncate rounded-lg px-2 py-1 transition-all duration-200${
          admNav
            ? ""
            : " font-medium text-[var(--muted)] group-hover:text-[var(--text)]"
        }`}
      >
        {item.emoji ? (
          <span className="shrink-0 text-[12px] leading-none opacity-90" aria-hidden>
            {item.emoji}
          </span>
        ) : item.icon ? (
          <span
            className={
              plainIcons
                ? "hub-toc-nav__icon hub-toc-nav__icon--plain shrink-0 text-[var(--muted)] group-hover:text-indigo-200"
                : "grid h-5 w-5 shrink-0 place-items-center rounded-md border border-white/10 bg-white/[.03] text-[var(--muted)] group-hover:text-indigo-200 [&>svg]:size-[11px]"
            }
            aria-hidden
          >
            {item.icon}
          </span>
        ) : null}
        {labelWithHint}
      </span>
    </button>
  );
}

/** Left TOC rail — scroll-to-section + pointer highlight (Cookie download FAB golden). */
export function HubTocSectionNav({
  items,
  sectionIdPrefix = "",
  scrollRootSelector = HUB_TOOL_DETAIL_SCROLL_ROOT,
  className = "",
  plainIcons = false,
  admNav = false,
}: Props) {
  if (!items.length) return null;

  return (
    <nav className={`hub-toc-nav__list space-y-0.5${className ? ` ${className}` : ""}`} aria-label="On this page">
      {items.map((item) => {
        const sectionId = `${sectionIdPrefix}${item.id}`;
        return (
          <HubTocSectionNavItem
            key={sectionId}
            item={item}
            sectionId={sectionId}
            scrollRootSelector={scrollRootSelector}
            plainIcons={plainIcons}
            admNav={admNav}
          />
        );
      })}
    </nav>
  );
}
