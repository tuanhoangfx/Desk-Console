import type { ReactNode } from "react";
import type { HubTableColumnHeaderProps } from "../content/HubTableColumnHeader";
import type { HubDirectoryColumnHintContent } from "../table/HubDirectoryColumnHint";
import type { HubTableColumnRole } from "../table/hub-table-column-meta";
import { HubAdmSectionLabel } from "./HubAdmSectionLabel";
import { hubAdmSectionBlockClass, hubAdmSectionHeader, type HubAdmSectionKey } from "./hubAdmSectionHeaders";

export type HubAdmSectionBlockProps = {
  id: string;
  children: ReactNode;
  className?: string;
  /** Extra class on inner `.hub-adm-section-block` wrapper (e.g. quota-detail-metrics). */
  blockClassName?: string;
  sectionKey?: HubAdmSectionKey;
  header?: HubTableColumnHeaderProps;
  label?: string;
  emoji?: string;
  role?: HubTableColumnRole;
  /** Directory-style hover hint on the section pill (P0020 ADM SSOT). */
  labelHint?: HubDirectoryColumnHintContent;
};

function resolveSectionHeader({
  sectionKey,
  header,
  label,
  emoji,
  role = "name",
}: Pick<HubAdmSectionBlockProps, "sectionKey" | "header" | "label" | "emoji" | "role">): HubTableColumnHeaderProps {
  if (header) return header;
  if (sectionKey) return hubAdmSectionHeader(sectionKey);
  if (emoji && label) return { label, headerEmoji: emoji };
  return { label: label ?? "Section", role };
}

/** Account-detail subsection — pill label + rows (P0020 Mail SSOT). */
export function HubAdmSectionBlock({
  id,
  children,
  className = "",
  blockClassName = "",
  sectionKey,
  header,
  label,
  emoji,
  role,
  labelHint,
}: HubAdmSectionBlockProps) {
  const resolvedHeader = resolveSectionHeader({ sectionKey, header, label, emoji, role });
  const blockClass = [
    sectionKey ? hubAdmSectionBlockClass(sectionKey) : "hub-adm-section-block",
    blockClassName,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <section id={id} className={`hub-adm-section scroll-mt-4${className ? ` ${className}` : ""}`}>
      <div className={blockClass}>
        <HubAdmSectionLabel header={resolvedHeader} labelHint={labelHint} />
        <div className="hub-adm-section-block__rows">{children}</div>
      </div>
    </section>
  );
}
