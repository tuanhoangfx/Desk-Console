import type { ComponentProps, ReactNode } from "react";
import { DirectoryEmptyDash } from "../lib/directory-empty-label";
import { colHint, inferDirectoryColumnDescription } from "../lib/directory-column-hint-helpers";
import type { HubDirectoryColumnHintContent } from "../table/HubDirectoryColumnHint";
import type { HubDirectoryColumnMetaInput } from "../table/hub-directory-table-meta";
import type { HubTableColumnHeaderProps } from "../content/HubTableColumnHeader";
import { HubAdmClickDateField } from "./HubAdmClickDateField";
import {
  HubAdmClickEditField,
  HubAdmClickFilterField,
  HubAdmClickMultilineEditField,
  HubAdmReadonlyField,
} from "./HubAdmClickEditField";
import { HubDirectoryReadonlyCopyText } from "./HubDirectoryReadonlyCopyText";
import { hubFilterOptionEmojiClass } from "./filter-dropdown-primitives";
import { CRM_DETAIL_CONTROL_CLASS } from "./hubCrmDetailChrome";

export { CRM_DETAIL_CONTROL_CLASS };

export type HubCrmDetailFieldKitOptions = {
  /**
   * Store-buyer / view-only SSOT — interactive Click* controls render as
   * HubDirectoryReadonlyCopyText (table Order ID parity), not dropdowns/inputs.
   */
  copyOnly?: boolean;
};

export function hubCrmColumnHintContent(key: string, label: string): HubDirectoryColumnHintContent {
  return colHint(label, inferDirectoryColumnDescription(key, label));
}

export function hubCrmColumnHeaderProps(meta: HubDirectoryColumnMetaInput): HubTableColumnHeaderProps {
  if (meta.headerEmoji) {
    return { label: meta.label, headerEmoji: meta.headerEmoji };
  }
  return {
    label: meta.label,
    icon: meta.headerIcon,
    iconClassName: meta.headerIconClassName,
    brandIcon: meta.headerBrandIcon,
  };
}

function fieldLabel(meta: Record<string, HubDirectoryColumnMetaInput>, key: string): string {
  return meta[key]?.label ?? key;
}

type FilterOptions = ComponentProps<typeof HubAdmClickFilterField>["options"];

function optionHit(options: FilterOptions | undefined, value: string) {
  const key = value.trim();
  if (!key) return null;
  return options?.find((opt) => String(opt.value) === key) ?? null;
}

function optionLabelText(options: FilterOptions | undefined, value: string): string {
  const hit = optionHit(options, value);
  if (!hit) return value.trim();
  if (typeof hit.label === "string") return hit.label;
  return value.trim();
}

function optionCopyText(options: FilterOptions | undefined, value: string): string {
  const hit = optionHit(options, value);
  if (!hit) return value.trim();
  const raw = String(hit.value ?? "").trim();
  return raw || value.trim();
}

function optionCopyDisplay(options: FilterOptions | undefined, value: string): ReactNode | undefined {
  const hit = optionHit(options, value);
  if (!hit) return undefined;
  const label = typeof hit.label === "string" ? hit.label : value.trim();
  if (!hit.emoji) return undefined;
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span
        className={`inline-flex shrink-0 items-center justify-center leading-none ${hubFilterOptionEmojiClass()}`}
        aria-hidden
      >
        {hit.emoji}
      </span>
      <span className="hub-users-directory-body-text min-w-0 truncate">{label}</span>
    </span>
  );
}

export function buildHubCrmDetailFieldKit(
  meta: Record<string, HubDirectoryColumnMetaInput>,
  kitOptions: HubCrmDetailFieldKitOptions = {},
) {
  const copyOnly = Boolean(kitOptions.copyOnly);

  function headerFor(key: string): HubTableColumnHeaderProps {
    const def = meta[key];
    if (!def) return { label: key };
    return hubCrmColumnHeaderProps(def);
  }

  function hintFor(key: string): HubDirectoryColumnHintContent {
    const def = meta[key];
    if (def?.headerHint) return def.headerHint;
    return hubCrmColumnHintContent(key, def?.label ?? key);
  }

  function ReadonlyField({
    columnKey,
    header,
    children,
    className = "",
    labelHint,
    empty,
    valueLayout,
  }: {
    columnKey?: string;
    header?: HubTableColumnHeaderProps;
    children: ReactNode;
    className?: string;
    labelHint?: HubDirectoryColumnHintContent;
    empty?: boolean;
    valueLayout?: "text" | "inline";
  }) {
    const resolvedHeader = header ?? headerFor(columnKey ?? "");
    const resolvedHint =
      labelHint ??
      (columnKey ? hintFor(columnKey) : hubCrmColumnHintContent(resolvedHeader.label, resolvedHeader.label));
    return (
      <HubAdmReadonlyField
        header={resolvedHeader}
        labelHint={resolvedHint}
        className={className}
        empty={empty}
        valueLayout={valueLayout}
      >
        {children}
      </HubAdmReadonlyField>
    );
  }

  function CopyLabelField({
    columnKey,
    value,
    className = "",
    labelHint,
    multiline = false,
    copiedLabel,
    display,
  }: {
    columnKey: string;
    value: string;
    className?: string;
    labelHint?: HubDirectoryColumnHintContent;
    multiline?: boolean;
    copiedLabel?: string;
    display?: ReactNode;
  }) {
    const text = value.trim();
    const label = fieldLabel(meta, columnKey);
    return (
      <ReadonlyField columnKey={columnKey} className={className} labelHint={labelHint} empty={!text}>
        {text ? (
          <HubDirectoryReadonlyCopyText
            value={text}
            title={text}
            copiedLabel={copiedLabel ?? `${label} copied`}
            multilineHover={multiline}
          >
            {display}
          </HubDirectoryReadonlyCopyText>
        ) : (
          <DirectoryEmptyDash className="hub-users-cell-muted" />
        )}
      </ReadonlyField>
    );
  }

  function ClickEditField({
    columnKey,
    value,
    onChange,
    className = "",
    labelHint,
    renderDisplay,
    copyValue,
    showCopyAction = false,
    ...rest
  }: {
    columnKey: string;
    value: string;
    onChange: (value: string) => void;
    className?: string;
    labelHint?: HubDirectoryColumnHintContent;
    copyValue?: string;
    showCopyAction?: boolean;
  } & Omit<
    ComponentProps<typeof HubAdmClickEditField>,
    "header" | "fieldLabel" | "labelHint" | "value" | "onChange" | "className" | "showCopyAction"
  >) {
    if (copyOnly) {
      return (
        <CopyLabelField
          columnKey={columnKey}
          value={copyValue ?? value}
          className={className}
          labelHint={labelHint}
        />
      );
    }
    return (
      <HubAdmClickEditField
        header={headerFor(columnKey)}
        fieldLabel={fieldLabel(meta, columnKey)}
        labelHint={labelHint ?? hintFor(columnKey)}
        value={value}
        onChange={onChange}
        controlClassName={CRM_DETAIL_CONTROL_CLASS}
        className={className}
        renderDisplay={renderDisplay}
        showCopyAction={showCopyAction === true}
        {...rest}
      />
    );
  }

  function ClickDateField({
    columnKey,
    value,
    onChange,
    className = "",
    labelHint,
    placeholder,
  }: {
    columnKey: string;
    value: string;
    onChange: (value: string) => void;
    className?: string;
    labelHint?: HubDirectoryColumnHintContent;
    placeholder?: string;
  }) {
    if (copyOnly) {
      return <CopyLabelField columnKey={columnKey} value={value} className={className} labelHint={labelHint} />;
    }
    const def = meta[columnKey];
    return (
      <HubAdmClickDateField
        header={headerFor(columnKey)}
        fieldLabel={fieldLabel(meta, columnKey)}
        labelHint={labelHint ?? hintFor(columnKey)}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        triggerEmoji={def?.headerEmoji}
        className={className}
      />
    );
  }

  function ClickMultilineEditField({
    columnKey,
    value,
    onChange,
    lines = 3,
    className = "",
    labelHint,
    placeholder,
  }: {
    columnKey: string;
    value: string;
    onChange: (value: string) => void;
    lines?: 1 | 2 | 3;
    className?: string;
    labelHint?: HubDirectoryColumnHintContent;
    placeholder?: string;
  }) {
    if (copyOnly) {
      const lineClass = `hub-adm-inline-field--multiline hub-adm-inline-field--multiline-${lines}`;
      return (
        <CopyLabelField
          columnKey={columnKey}
          value={value}
          className={`${lineClass}${className ? ` ${className}` : ""}`}
          labelHint={labelHint}
          multiline
        />
      );
    }
    return (
      <HubAdmClickMultilineEditField
        header={headerFor(columnKey)}
        fieldLabel={fieldLabel(meta, columnKey)}
        labelHint={labelHint ?? hintFor(columnKey)}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        controlClassName={CRM_DETAIL_CONTROL_CLASS}
        lines={lines}
        className={className}
      />
    );
  }

  function ClickFilterField({
    columnKey,
    filterKey,
    options,
    value,
    onChange,
    className = "",
    labelHint,
    disabled,
    panelSearchAsync,
    allowClear,
    clearLabel,
    allowCustom,
    customOptionLabel,
    renderDisplay,
  }: {
    columnKey: string;
    filterKey: string;
    options: ComponentProps<typeof HubAdmClickFilterField>["options"];
    value: string;
    onChange: (value: string) => void;
    className?: string;
    labelHint?: HubDirectoryColumnHintContent;
    disabled?: boolean;
    panelSearchAsync?: ComponentProps<typeof HubAdmClickFilterField>["panelSearchAsync"];
    allowClear?: boolean;
    clearLabel?: string;
    allowCustom?: boolean;
    customOptionLabel?: (query: string) => string;
    renderDisplay?: ComponentProps<typeof HubAdmClickFilterField>["renderValue"];
  }) {
    if (copyOnly) {
      return (
        <CopyLabelField
          columnKey={columnKey}
          value={optionCopyText(options, value)}
          display={renderDisplay ? renderDisplay(value, optionLabelText(options, value)) : optionCopyDisplay(options, value)}
          className={className}
          labelHint={labelHint}
        />
      );
    }
    return (
      <HubAdmClickFilterField
        header={headerFor(columnKey)}
        filterKey={filterKey}
        fieldLabel={fieldLabel(meta, columnKey)}
        labelHint={labelHint ?? hintFor(columnKey)}
        options={options}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={className}
        panelSearchAsync={panelSearchAsync}
        allowClear={allowClear}
        clearLabel={clearLabel}
        allowCustom={allowCustom}
        customOptionLabel={customOptionLabel}
        renderValue={renderDisplay}
      />
    );
  }

  return {
    headerFor,
    hintFor,
    CopyLabelField,
    ClickEditField,
    ClickDateField,
    ClickMultilineEditField,
    ClickFilterField,
    ReadonlyField,
  };
}

/** @deprecated Use buildHubCrmDetailFieldKit */
export const buildCrmDetailFieldKit = buildHubCrmDetailFieldKit;
/** @deprecated Use hubCrmColumnHeaderProps */
export const crmColumnHeaderProps = hubCrmColumnHeaderProps;
