import type { ComponentProps } from "react";
import {
  HubAdmClickEditField,
  HubAdmClickFilterField,
  HubAdmClickMultilineEditField,
} from "./HubAdmClickEditField";
import { HubAdmClickDateField } from "./HubAdmClickDateField";
import type { HubTableColumnHeaderProps } from "../content/HubTableColumnHeader";
import type { HubDirectoryColumnHintContent } from "../table/HubDirectoryColumnHint";
import type { FilterOption, HubSingleFilterDropdownProps } from "./FilterBar";
import {
  hubAdmGridSlotPadClass,
} from "./hubAccountDetailModal";

/** HubAdmClick* component names — bulk detail field SSOT contract. */
export const HUB_BULK_DETAIL_FIELD_COMPONENT = {
  filter: "HubAdmClickFilterField",
  date: "HubAdmClickDateField",
  edit: "HubAdmClickEditField",
  multiline: "HubAdmClickMultilineEditField",
} as const;

export type HubBulkDetailFieldControl = keyof typeof HUB_BULK_DETAIL_FIELD_COMPONENT;

export type HubBulkDetailFieldCommon = {
  key: string;
  header: HubTableColumnHeaderProps;
  fieldLabel: string;
  labelHint?: HubDirectoryColumnHintContent;
  /** Break 3-col aligned row — use detail-line layout in consumer. */
  fullWidth?: boolean;
};

export type HubBulkDetailFilterFieldDef = HubBulkDetailFieldCommon & {
  control: "filter";
  filterKey: string;
  options: FilterOption[];
  panelSearchAsync?: HubSingleFilterDropdownProps["panelSearchAsync"];
  allowClear?: boolean;
  clearLabel?: string;
};

export type HubBulkDetailDateFieldDef = HubBulkDetailFieldCommon & {
  control: "date";
  placeholder?: string;
  hideTriggerIcon?: boolean;
};

export type HubBulkDetailEditFieldDef = HubBulkDetailFieldCommon & {
  control: "edit";
  placeholder?: string;
  displayValue?: string;
  className?: string;
  inputClassName?: string;
  controlClassName?: string;
  inputMode?: ComponentProps<typeof HubAdmClickEditField>["inputMode"];
  maxLength?: number;
  formatValue?: (raw: string) => string;
};

export type HubBulkDetailMultilineFieldDef = HubBulkDetailFieldCommon & {
  control: "multiline";
  lines?: 1 | 2 | 3;
  placeholder?: string;
  controlClassName?: string;
  showHoverPopover?: boolean;
};

export type HubBulkDetailFieldDef =
  | HubBulkDetailFilterFieldDef
  | HubBulkDetailDateFieldDef
  | HubBulkDetailEditFieldDef
  | HubBulkDetailMultilineFieldDef;

export function resolveHubBulkDetailFieldComponent(
  def: Pick<HubBulkDetailFieldDef, "control">,
): (typeof HUB_BULK_DETAIL_FIELD_COMPONENT)[HubBulkDetailFieldControl] {
  return HUB_BULK_DETAIL_FIELD_COMPONENT[def.control];
}

export type HubBulkDetailFieldProps = {
  def: HubBulkDetailFieldDef;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

/** Generic bulk detail field — maps fieldDef → HubAdmClick* (account detail modal SSOT). */
export function HubBulkDetailField({ def, value, onChange, disabled = false }: HubBulkDetailFieldProps) {
  const { header, fieldLabel, labelHint } = def;

  switch (def.control) {
    case "filter":
      return (
        <HubAdmClickFilterField
          header={header}
          fieldLabel={fieldLabel}
          labelHint={labelHint}
          filterKey={def.filterKey}
          options={def.options}
          value={value}
          onChange={onChange}
          disabled={disabled}
          panelSearchAsync={def.panelSearchAsync}
          allowClear={def.allowClear !== false}
          clearLabel={def.clearLabel}
        />
      );
    case "date":
      return (
        <HubAdmClickDateField
          header={header}
          fieldLabel={fieldLabel}
          labelHint={labelHint}
          value={value}
          onChange={onChange}
          placeholder={def.placeholder}
          hideTriggerIcon={def.hideTriggerIcon}
          disabled={disabled}
        />
      );
    case "multiline":
      return (
        <HubAdmClickMultilineEditField
          header={header}
          fieldLabel={fieldLabel}
          labelHint={labelHint}
          value={value}
          onChange={onChange}
          placeholder={def.placeholder}
          lines={def.lines}
          controlClassName={def.controlClassName}
          showHoverPopover={def.showHoverPopover}
          disabled={disabled}
        />
      );
    case "edit":
      return (
        <HubAdmClickEditField
          header={header}
          fieldLabel={fieldLabel}
          labelHint={labelHint}
          value={value}
          onChange={onChange}
          placeholder={def.placeholder}
          displayValue={def.displayValue}
          className={def.className}
          inputClassName={def.inputClassName}
          controlClassName={def.controlClassName}
          inputMode={def.inputMode}
          maxLength={def.maxLength}
          formatValue={def.formatValue}
          disabled={disabled}
        />
      );
  }
}

export type HubBulkDetailFieldRowGroup<T extends { key: string; fullWidth?: boolean }> = {
  key: string;
  fields: T[];
  single: boolean;
};

/** Group bulk fields into 3-col rows + full-width detail-line rows. */
export function groupHubBulkDetailFieldsForRows<T extends { key: string; fullWidth?: boolean }>(
  fields: readonly T[],
): HubBulkDetailFieldRowGroup<T>[] {
  const rows: HubBulkDetailFieldRowGroup<T>[] = [];
  let chunk: T[] = [];
  let rowIdx = 0;
  const flushChunk = () => {
    if (!chunk.length) return;
    rows.push({ key: `row-${rowIdx++}`, fields: chunk, single: false });
    chunk = [];
  };
  for (const field of fields) {
    if (field.fullWidth) {
      flushChunk();
      rows.push({ key: `row-${rowIdx++}-${field.key}`, fields: [field], single: true });
      continue;
    }
    chunk.push(field);
    if (chunk.length === 3) flushChunk();
  }
  flushChunk();
  return rows;
}

/** Pad aligned-3 rows — parity with account detail grid spacers.
 * Use ONE spacer only: 1 field → span cols 3–6; 2 fields → span cols 5–6.
 * Never stack both — the first already fills to end-of-row and the second wraps into an empty row. */
export function HubBulkDetailRowSpacers({ fieldCount }: { fieldCount: number }) {
  const cls = hubAdmGridSlotPadClass(fieldCount);
  if (!cls) return null;
  return <span className={cls} aria-hidden />;
}

/** Alias — `filledCount` naming for Catalog / Product Detail call sites. */
export function HubAdmGridSlotPad({ filledCount }: { filledCount: number }) {
  return <HubBulkDetailRowSpacers fieldCount={filledCount} />;
}
