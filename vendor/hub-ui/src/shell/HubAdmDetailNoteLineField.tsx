import type { HubTableColumnHeaderProps } from "../content/HubTableColumnHeader";
import type { HubDirectoryColumnHintContent } from "../table/HubDirectoryColumnHint";
import { HubAdmInlineFieldLabel } from "./HubAdmClickEditField";
import { HubAdmNoteEditorField } from "./HubAdmNoteEditorField";

/** Full-width Catalog note line — Order Details / Info / About / Warranty SSOT. */
export const HUB_ADM_DETAIL_NOTE_LINE_CLASS = "hub-adm-detail-note-line";

export const HUB_ADM_DETAIL_NOTE_LINE_CONTROL_CLASS =
  "field auth-gate-field hub-adm-note-textarea hub-adm-detail-note-line__control";

export type HubAdmDetailNoteLineFieldProps = {
  header: HubTableColumnHeaderProps;
  labelHint?: HubDirectoryColumnHintContent;
  value: string;
  onChange: (value: string) => void;
  name?: string;
  placeholder?: string;
  /** Visible rows when not fillHeight — Order Details default 6. */
  rows?: number;
  controlClassName?: string;
  className?: string;
};

/**
 * Always-open multiline note editor on a detail-line row (label | full-width value).
 * Header Search highlights via {@link HubAdmNoteEditorField} + Account Detail search provider.
 */
export function HubAdmDetailNoteLineField({
  header,
  labelHint,
  value,
  onChange,
  name,
  placeholder,
  rows = 6,
  controlClassName = HUB_ADM_DETAIL_NOTE_LINE_CONTROL_CLASS,
  className = "",
}: HubAdmDetailNoteLineFieldProps) {
  const rowCount = Math.max(1, Math.round(rows));
  return (
    <div
      className={`hub-adm-inline-field hub-adm-inline-field--multiline hub-adm-inline-field--multiline-3 ${HUB_ADM_DETAIL_NOTE_LINE_CLASS}${className ? ` ${className}` : ""}`}
      style={{ ["--hub-adm-note-line-rows" as string]: String(rowCount) }}
    >
      <HubAdmInlineFieldLabel header={header} labelHint={labelHint} />
      <div className="hub-adm-inline-field__value hub-adm-inline-field__value--editing">
        <HubAdmNoteEditorField
          value={value}
          onChange={onChange}
          name={name}
          placeholder={placeholder}
          controlClassName={controlClassName}
          rows={rowCount}
          fillHeight={false}
        />
      </div>
    </div>
  );
}
