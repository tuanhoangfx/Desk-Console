import type { HubDirectoryColumnHintContent, HubDirectoryColumnHintGlyph } from "../table/HubDirectoryColumnHint";
import { HubDirectoryColumnHint } from "../table/HubDirectoryColumnHint";
import type { HubTableColumnHeaderProps } from "../content/HubTableColumnHeader";
import { HubTableColumnHeader } from "../content/HubTableColumnHeader";

function resolveSectionHintGlyph(header: HubTableColumnHeaderProps): HubDirectoryColumnHintGlyph | undefined {
  if (header.headerEmoji) return { emoji: header.headerEmoji };
  return undefined;
}

/** Subsection label inside account-detail panels — same icon + label pattern as table headers. */
export function HubAdmSectionLabel({
  header,
  labelHint,
}: {
  header: HubTableColumnHeaderProps;
  labelHint?: HubDirectoryColumnHintContent;
}) {
  const label = (
    <div className="hub-adm-section-label">
      <span className="hub-adm-section-label__inner hub-users-th-label hub-users-th-label--start hub-inline-gap-name">
        <HubTableColumnHeader {...header} enableFit={false} />
      </span>
    </div>
  );
  if (!labelHint) return label;
  return (
    <HubDirectoryColumnHint content={labelHint} titleGlyph={resolveSectionHintGlyph(header)}>
      {label}
    </HubDirectoryColumnHint>
  );
}
