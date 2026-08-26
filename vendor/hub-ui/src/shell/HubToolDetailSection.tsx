import type { ReactNode } from "react";
import { useHubTocSectionHighlightOptional } from "./HubTocSectionHighlight";

export const HUB_TOOL_DETAIL_SECTIONS_CLASS = "hub-tool-detail-modal__sections";
export const HUB_TOOL_DETAIL_FORM_GRID_CLASS = "hub-tool-detail-form-grid";
export const HUB_TOOL_DETAIL_FORM_GRID_2_CLASS = "hub-tool-detail-form-grid hub-tool-detail-form-grid--2";
export const HUB_TOOL_DETAIL_FORM_GRID_3_CLASS = "hub-tool-detail-form-grid hub-tool-detail-form-grid--3";

export type HubToolDetailSectionProps = {
  id: string;
  /** Section title — may include emoji prefix (matches TOC labels). */
  title: string;
  /** Optional icon — same node as TOC row for Settings / detail modals. */
  icon?: ReactNode;
  /** Optional actions aligned to the section header (e.g. Reset columns). */
  headerActions?: ReactNode;
  /** Timeline / custom chrome — section still participates in TOC spy via `id`. */
  hideHeader?: boolean;
  children: ReactNode;
  className?: string;
};

/** Bordered frame for one TOC section inside tool-detail modals. */
export function HubToolDetailSection({
  id,
  title,
  icon,
  headerActions,
  hideHeader = false,
  children,
  className = "",
}: HubToolDetailSectionProps) {
  const highlightCtx = useHubTocSectionHighlightOptional();

  return (
    <section
      id={id}
      className={`hub-tool-detail-section${hideHeader ? " hub-tool-detail-section--flush" : ""}${className ? ` ${className}` : ""}`}
      onMouseEnter={() => highlightCtx?.setHighlightedSectionId(id)}
      onMouseLeave={() => {
        if (highlightCtx?.highlightedSectionId === id) highlightCtx.setHighlightedSectionId(null);
      }}
    >
      {hideHeader ? null : (
        <header className="hub-tool-detail-section__header">
          <h3 className="hub-tool-detail-section__title">
            {icon ? (
              <span className="hub-tool-detail-section__title-icon" aria-hidden>
                {icon}
              </span>
            ) : null}
            <span>{title}</span>
          </h3>
          {headerActions ? (
            <div className="hub-tool-detail-section__header-actions">{headerActions}</div>
          ) : null}
        </header>
      )}
      <div className="hub-tool-detail-section__body">{children}</div>
    </section>
  );
}

/** Flex column gap between detail sections — use on TocHighlightContent or wrap section lists. */
export function HubToolDetailSections({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`${HUB_TOOL_DETAIL_SECTIONS_CLASS}${className ? ` ${className}` : ""}`.trim()}>{children}</div>
  );
}
