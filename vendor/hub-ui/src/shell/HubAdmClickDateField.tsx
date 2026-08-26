import type { ReactNode } from "react";
import type { HubTableColumnHeaderProps } from "../content/HubTableColumnHeader";
import type { HubDirectoryColumnHintContent } from "../table/HubDirectoryColumnHint";
import { HubAdmInlineFieldLabel } from "./HubAdmClickEditField";
import { HUB_DATE_PICKER_PLACEHOLDER, HubFilterDatePicker } from "./HubFilterDatePicker";
import {
  buildHubAdmDetailCopyTrailingAction,
  mergeHubAdmTrailingActions,
} from "./hub-adm-detail-copy-action";
import "./hub-adm-detail-copy-action.css";

export type HubAdmClickDateFieldProps = {
  header: HubTableColumnHeaderProps;
  fieldLabel: string;
  labelHint?: HubDirectoryColumnHintContent;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  clearLabel?: string;
  triggerEmoji?: string;
  className?: string;
  compactTrigger?: boolean;
  hideTriggerIcon?: boolean;
  disabled?: boolean;
  /** Clipboard text; defaults to picker value when non-empty. */
  copyValue?: string;
  copyToastLabel?: string;
  /** Default false — copy icon on ClickFilter dropdowns only; opt in for date fields. */
  showCopyAction?: boolean;
  /** Optional control after the value (e.g. copy icon). Does not shrink. */
  trailingAction?: ReactNode;
};

/** Account-detail modal — label + Todo calendar picker (click to open month grid). */
export function HubAdmClickDateField({
  header,
  fieldLabel,
  labelHint,
  value,
  onChange,
  placeholder,
  clearLabel = "Clear",
  triggerEmoji,
  className = "",
  compactTrigger = true,
  hideTriggerIcon = true,
  disabled = false,
  copyValue,
  copyToastLabel,
  showCopyAction,
  trailingAction,
}: HubAdmClickDateFieldProps) {
  const emoji = hideTriggerIcon ? undefined : (triggerEmoji ?? header.headerEmoji);
  const resolvedCopy = (copyValue ?? value.trim()).trim();
  const autoCopy =
    showCopyAction === true && resolvedCopy && !disabled
      ? buildHubAdmDetailCopyTrailingAction({
          copyText: resolvedCopy,
          title: `Copy ${fieldLabel}`,
          copyToastLabel: copyToastLabel ?? `${fieldLabel} copied`,
        })
      : null;
  const mergedTrailing = mergeHubAdmTrailingActions(autoCopy, trailingAction);

  return (
    <div
      className={`hub-adm-inline-field hub-adm-inline-field--readonly hub-adm-inline-field--click-date min-w-0${disabled ? " hub-adm-inline-field--disabled" : ""}${className ? ` ${className}` : ""}`}
    >
      <HubAdmInlineFieldLabel header={header} labelHint={labelHint} />
      <div
        className={`hub-adm-inline-field__value${mergedTrailing ? " hub-adm-inline-field__value--has-trailing" : ""}`}
      >
        <HubFilterDatePicker
          value={value}
          onChange={onChange}
          placeholder={placeholder ?? HUB_DATE_PICKER_PLACEHOLDER}
          clearLabel={clearLabel}
          className="hub-adm-click-date w-full min-w-0"
          triggerClassName="hub-adm-click-filter__trigger hub-adm-click-date__trigger w-full"
          triggerEmoji={emoji}
          hideTriggerIcon={hideTriggerIcon}
          compactTrigger={compactTrigger}
          disabled={disabled}
        />
        {mergedTrailing ? (
          <span className="hub-adm-click-filter__trailing inline-flex shrink-0 items-center">{mergedTrailing}</span>
        ) : null}
      </div>
    </div>
  );
}
