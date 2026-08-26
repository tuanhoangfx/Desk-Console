import { useEffect, useRef, useState, type HTMLAttributes, type ReactNode, type RefObject } from "react";
import { HubAdmSearchHighlightText } from "./HubAdmSearchHighlightText";
import { ChevronDown } from "lucide-react";
import type { HubTableColumnHeaderProps } from "../content/HubTableColumnHeader";
import { HubTableColumnHeader } from "../content/HubTableColumnHeader";
import { resolveHubTableColumnMeta } from "../table/hub-table-column-meta";
import {
  HubDirectoryColumnHint,
  type HubDirectoryColumnHintContent,
  type HubDirectoryColumnHintGlyph,
} from "../table/HubDirectoryColumnHint";
import { HubDirectoryValuePopover } from "../table/HubDirectoryValuePopover";
import { compactIconSize } from "../ui-scale";
import { HUB_NO_SPELLCHECK_PROPS } from "../lib/no-spellcheck";
import { HubSingleFilterDropdown, type FilterOption, type HubSingleFilterDropdownProps } from "./FilterBar";
import { HUB_DIRECTORY_TABLE_BRAND_ICON_PX } from "./HubDirectoryBrandNameCell";
import { hubDirectoryTableBrandImgClass, hubFilterOptionEmojiClass } from "./filter-dropdown-primitives";
import { resolveWorkspaceRoleIcon } from "../auth/hub-workspace-role-icon";
import {
  buildHubAdmDetailCopyTrailingAction,
  mergeHubAdmTrailingActions,
} from "./hub-adm-detail-copy-action";
import "./hub-adm-detail-copy-action.css";

function HubAdmFilterValueGlyph({
  opt,
  glyphPx,
  slotStyle,
}: {
  opt: FilterOption | undefined;
  glyphPx: number;
  slotStyle: { width: number; height: number };
}) {
  if (!opt) return null;
  if (opt.iconSrc) {
    return (
      <span className="inline-flex shrink-0 items-center justify-center overflow-hidden" style={slotStyle} aria-hidden>
        <img
          src={opt.iconSrc}
          alt=""
          width={glyphPx}
          height={glyphPx}
          className={hubDirectoryTableBrandImgClass(opt.iconShell ?? "bare")}
          decoding="async"
          draggable={false}
        />
      </span>
    );
  }
  if (opt.emoji) {
    return (
      <span className="inline-flex shrink-0 items-center justify-center leading-none" style={slotStyle} aria-hidden>
        <span className={hubFilterOptionEmojiClass()}>{opt.emoji}</span>
      </span>
    );
  }
  if (opt.roleKey) {
    const roleMeta = resolveWorkspaceRoleIcon(opt.roleKey);
    const RoleIcon = roleMeta.icon;
    const rolePx = compactIconSize(Math.max(10, Math.round(glyphPx * 0.72)));
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-full border border-white/25 bg-indigo-500/15"
        style={slotStyle}
        aria-hidden
      >
        <RoleIcon size={rolePx} className={roleMeta.className} />
      </span>
    );
  }
  return null;
}

export type HubAdmClickEditRenderCtx = {
  value: string;
  onChange: (value: string) => void;
  onDone: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
  className: string;
};

export type HubAdmClickEditFieldProps = {
  header: HubTableColumnHeaderProps;
  /** Accessible name — usually the field label text. */
  fieldLabel: string;
  /** Hub directory column hint — hover label popover. */
  labelHint?: HubDirectoryColumnHintContent;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Override read-only display text (e.g. masked password). */
  displayValue?: string;
  className?: string;
  inputClassName?: string;
  controlClassName?: string;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
  formatValue?: (raw: string) => string;
  renderEdit?: (ctx: HubAdmClickEditRenderCtx) => ReactNode;
  renderDisplay?: (value: string) => ReactNode;
  /** When false, omit native `title` on readonly value (popover fields). Default true. */
  readonlyHoverTitle?: boolean;
  /** Lock field — no click-to-edit (bulk apply busy, read-only preview). */
  disabled?: boolean;
  /** Clipboard text; defaults to display value when non-empty. */
  copyValue?: string;
  copyToastLabel?: string;
  /** Default false — copy icon only on ClickFilter dropdowns; opt in for special readonly edit rows. */
  showCopyAction?: boolean;
  /** Optional control after the value (e.g. Browse) — ClickFilter trailing SSOT. */
  trailingAction?: ReactNode;
};

const DEFAULT_CONTROL_CLASS = "field auth-gate-field hub-adm-click-edit__input";

function resolveAdmLabelHintGlyph(header: HubTableColumnHeaderProps): HubDirectoryColumnHintGlyph | undefined {
  if (header.headerEmoji) return { emoji: header.headerEmoji };
  const roleMeta = header.role ? resolveHubTableColumnMeta(header.role) : undefined;
  if (header.icon || header.brandIcon || roleMeta) {
    return {
      icon: header.icon ?? roleMeta?.icon,
      brandIcon: header.brandIcon,
      toneClass: header.iconClassName ?? roleMeta?.iconClassName,
    };
  }
  return undefined;
}

/** Account-detail field label — optional directory-style hover hint popover. */
export function HubAdmInlineFieldLabel({
  header,
  labelHint,
}: {
  header: HubTableColumnHeaderProps;
  labelHint?: HubDirectoryColumnHintContent;
}) {
  const label = (
    <span className="hub-adm-inline-field__label hub-users-th-label hub-users-th-label--start hub-inline-gap-name">
      <HubTableColumnHeader {...header} enableFit={false} />
    </span>
  );
  if (!labelHint) return label;
  return (
    <HubDirectoryColumnHint content={labelHint} titleGlyph={resolveAdmLabelHintGlyph(header)}>
      {label}
    </HubDirectoryColumnHint>
  );
}

function AdmInlineFieldShell({
  header,
  labelHint,
  children,
  className = "",
  valueClassName,
}: {
  header: HubTableColumnHeaderProps;
  labelHint?: HubDirectoryColumnHintContent;
  children: ReactNode;
  className?: string;
  valueClassName: string;
}) {
  return (
    <div className={`hub-adm-inline-field min-w-0${className ? ` ${className}` : ""}`}>
      <HubAdmInlineFieldLabel header={header} labelHint={labelHint} />
      <div className={valueClassName}>{children}</div>
    </div>
  );
}

/** Account-detail modal — plain label value; click value to edit (no pencil affordance). */
export function HubAdmClickEditField({
  header,
  fieldLabel,
  labelHint,
  value,
  onChange,
  placeholder,
  displayValue,
  className = "",
  inputClassName = "",
  controlClassName = DEFAULT_CONTROL_CLASS,
  inputMode,
  maxLength,
  formatValue,
  renderEdit,
  renderDisplay,
  readonlyHoverTitle = true,
  disabled = false,
  copyValue,
  copyToastLabel,
  showCopyAction,
  trailingAction,
}: HubAdmClickEditFieldProps) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const editShellRef = useRef<HTMLDivElement>(null);
  const trimmed = value.trim();
  const shown = displayValue ?? trimmed;
  const empty = !shown;
  const resolvedCopy = (copyValue ?? shown).trim();
  const autoCopy =
    showCopyAction === true && resolvedCopy && !disabled && !empty
      ? buildHubAdmDetailCopyTrailingAction({
          copyText: resolvedCopy,
          title: `Copy ${fieldLabel}`,
          copyToastLabel: copyToastLabel ?? `${fieldLabel} copied`,
        })
      : null;
  const mergedTrailing = mergeHubAdmTrailingActions(autoCopy, trailingAction);
  const inputClass = `${controlClassName}${inputClassName ? ` ${inputClassName}` : ""}`;
  const valueClassEditing = `hub-adm-inline-field__value hub-adm-inline-field__value--editing${
    mergedTrailing ? " hub-adm-inline-field__value--has-trailing" : ""
  }`;
  const valueClassReadonly = `hub-adm-inline-field__value${
    mergedTrailing ? " hub-adm-inline-field__value--has-trailing" : ""
  }`;
  const trailing = mergedTrailing ? (
    <span className="hub-adm-click-filter__trailing inline-flex shrink-0 items-center">{mergedTrailing}</span>
  ) : null;

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    if (disabled && editing) setEditing(false);
  }, [disabled, editing]);

  const finishEdit = () => setEditing(false);

  const handleBlur = (event: React.FocusEvent) => {
    const next = event.relatedTarget as Node | null;
    if (next && editShellRef.current?.contains(next)) return;
    finishEdit();
  };

  const startEdit = () => {
    if (disabled) return;
    setEditing(true);
  };

  const readonlyBody = (
    <HubDirectoryValuePopover
      value={shown}
      title={fieldLabel}
      enabled={readonlyHoverTitle && !empty}
    >
      <span
        className={`hub-adm-click-edit__text hub-adm-detail-value-text${empty ? " hub-adm-click-edit__text--empty" : ""}`}
      >
        {renderDisplay ? (
          renderDisplay(value)
        ) : empty ? (
          placeholder || "—"
        ) : (
          <HubAdmSearchHighlightText text={shown} />
        )}
      </span>
    </HubDirectoryValuePopover>
  );

  if (editing && !disabled) {
    const editCtx: HubAdmClickEditRenderCtx = {
      value,
      onChange: (next) => onChange(formatValue ? formatValue(next) : next),
      onDone: finishEdit,
      inputRef,
      className: inputClass,
    };

    return (
      <AdmInlineFieldShell
        header={header}
        labelHint={labelHint}
        className={className}
        valueClassName={valueClassEditing}
      >
        <div
          ref={editShellRef}
          className="hub-adm-click-edit hub-adm-click-edit--editing"
          onBlur={handleBlur}
        >
          {renderEdit ? (
            renderEdit(editCtx)
          ) : (
            <input
              ref={inputRef}
              className={inputClass}
              name={`hub-adm-edit-${fieldLabel.replace(/\s+/g, "-").toLowerCase()}`}
              autoComplete="off"
              {...HUB_NO_SPELLCHECK_PROPS}
              inputMode={inputMode}
              maxLength={maxLength}
              placeholder={placeholder}
              value={value}
              onChange={(e) => onChange(formatValue ? formatValue(e.target.value) : e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") finishEdit();
                if (e.key === "Enter") finishEdit();
              }}
            />
          )}
        </div>
        {trailing}
      </AdmInlineFieldShell>
    );
  }

  return (
    <AdmInlineFieldShell
      header={header}
      labelHint={labelHint}
      className={`hub-adm-inline-field--readonly hub-adm-inline-field--click-edit${disabled ? " hub-adm-inline-field--disabled" : ""}${className ? ` ${className}` : ""}`}
      valueClassName={valueClassReadonly}
    >
      {disabled ? (
        <span className="hub-adm-click-edit hub-adm-click-edit--disabled" aria-disabled="true">
          {readonlyBody}
        </span>
      ) : (
        <button
          type="button"
          className="hub-adm-click-edit"
          aria-label={`Edit ${fieldLabel}`}
          title={`Edit ${fieldLabel}`}
          onClick={startEdit}
        >
          {readonlyBody}
        </button>
      )}
      {trailing}
    </AdmInlineFieldShell>
  );
}

export type HubAdmClickMultilineEditFieldProps = HubAdmClickEditFieldProps & {
  lines?: 1 | 2 | 3;
  /** Hover popover with full value when not editing. Default true. */
  showHoverPopover?: boolean;
};

/** Account-detail modal — multiline click-edit; Enter newline · blur/Escape exits (Note rail parity). */
export function HubAdmClickMultilineEditField({
  lines = 3,
  showHoverPopover = true,
  fieldLabel,
  placeholder,
  controlClassName = DEFAULT_CONTROL_CLASS,
  className = "",
  value,
  onChange,
  displayValue,
  renderDisplay,
  ...rest
}: HubAdmClickMultilineEditFieldProps) {
  const lineClass = `hub-adm-inline-field--multiline-${lines}`;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <HubAdmClickEditField
      {...rest}
      fieldLabel={fieldLabel}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      displayValue={displayValue}
      readonlyHoverTitle={false}
      controlClassName={`${controlClassName} hub-adm-click-edit__textarea`}
      className={`hub-adm-inline-field--multiline ${lineClass}${className ? ` ${className}` : ""}`}
      renderEdit={({ value: editValue, onChange: onEditChange, onDone, className: inputClass }) => (
        <textarea
          ref={textareaRef}
          className={inputClass}
          rows={lines}
          autoFocus
          {...HUB_NO_SPELLCHECK_PROPS}
          value={editValue}
          placeholder={placeholder}
          onChange={(e) => onEditChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onDone();
          }}
        />
      )}
      renderDisplay={(displayVal) => {
        const text = (displayValue ?? displayVal).trim();
        if (!text) {
          return <span className="hub-adm-click-edit__text hub-adm-click-edit__text--empty">{placeholder || "—"}</span>;
        }
        const body = renderDisplay ? (
          renderDisplay(displayVal)
        ) : (
          <span className="hub-adm-click-edit__text hub-adm-click-edit__text--multiline">
            <HubAdmSearchHighlightText text={text} />
          </span>
        );
        if (!showHoverPopover) return body;
        return (
          <HubDirectoryValuePopover value={text} title={fieldLabel}>
            {body}
          </HubDirectoryValuePopover>
        );
      }}
    />
  );
}

export type HubAdmClickFilterFieldProps = {
  header: HubTableColumnHeaderProps;
  filterKey: string;
  fieldLabel: string;
  labelHint?: HubDirectoryColumnHintContent;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  panelSearchAsync?: HubSingleFilterDropdownProps["panelSearchAsync"];
  /** Reset selection to empty — Clear beside panel search (true blank, not a fake “None” option). Default on. */
  allowClear?: boolean;
  clearLabel?: string;
  /** Panel header “+” — sits beside Clear (e.g. Plan Package → Add Material). */
  onPanelCreate?: () => void;
  panelCreateAriaLabel?: string;
  /** Allow creating a brand-new value from the panel search (free-text combobox). */
  allowCustom?: boolean;
  customOptionLabel?: (query: string) => string;
  /** Rename the selected catalog value to the panel search text. */
  allowRename?: boolean;
  onRename?: (from: string, to: string) => void;
  renameOptionLabel?: (from: string, to: string) => string;
  /** Optional control rendered after the value (e.g. copy icon). Does not shrink. */
  trailingAction?: ReactNode;
  /** Custom value body (e.g. On/Off status dot). Chevron still appended. */
  renderValue?: (value: string, displayLabel: string) => ReactNode;
  /** Clipboard text; defaults to option label when value set. */
  copyValue?: string;
  copyToastLabel?: string;
  /** Default true — append copy icon when resolved copy value is non-empty (dropdown SSOT). */
  showCopyAction?: boolean;
};

/** Account-detail modal — plain label + emoji/value; chevron always visible; opens filter panel. */
export function HubAdmClickFilterField({
  header,
  filterKey,
  fieldLabel,
  labelHint,
  options,
  value,
  onChange,
  className = "",
  disabled = false,
  panelSearchAsync,
  allowClear = true,
  clearLabel,
  onPanelCreate,
  panelCreateAriaLabel,
  allowCustom = false,
  customOptionLabel,
  allowRename = false,
  onRename,
  renameOptionLabel,
  trailingAction,
  renderValue,
  copyValue,
  copyToastLabel,
  showCopyAction,
}: HubAdmClickFilterFieldProps) {
  const opt = options.find((o) => o.value === value);
  /** Parity with directory table brand glyphs (`HubDirectoryBrandNameCell` 16px). */
  const glyphPx = compactIconSize(HUB_DIRECTORY_TABLE_BRAND_ICON_PX);
  const slotStyle = { width: glyphPx, height: glyphPx };
  const empty = !value.trim();
  const displayLabel = opt?.label ?? (value.trim() || fieldLabel);
  const valueTextClass = `hub-adm-click-edit__text inline-flex min-w-0 items-center gap-1.5 truncate${empty ? " hub-adm-click-edit__text--empty" : ""}`;
  const tipText = (opt?.tip || opt?.detail || "").trim();
  const valueHint: HubDirectoryColumnHintContent | undefined = tipText
    ? {
        title: displayLabel,
        titleGlyph: opt?.emoji ? { emoji: opt.emoji } : undefined,
        description: tipText,
        lines: [],
      }
    : undefined;

  const resolvedCopy = (copyValue ?? (value.trim() ? displayLabel : "")).trim();
  const autoCopy =
    showCopyAction !== false && resolvedCopy && !disabled
      ? buildHubAdmDetailCopyTrailingAction({
          copyText: resolvedCopy,
          title: `Copy ${fieldLabel}`,
          copyToastLabel: copyToastLabel ?? `${fieldLabel} copied`,
        })
      : null;
  const mergedTrailing = mergeHubAdmTrailingActions(autoCopy, trailingAction);

  return (
    <AdmInlineFieldShell
      header={header}
      labelHint={labelHint}
      className={`hub-adm-inline-field--readonly hub-adm-inline-field--click-filter${className ? ` ${className}` : ""}`}
      valueClassName={`hub-adm-inline-field__value${mergedTrailing ? " hub-adm-inline-field__value--has-trailing" : ""}`}
    >
      <HubSingleFilterDropdown
        filterKey={filterKey}
        label={fieldLabel}
        options={options}
        value={value}
        onChange={onChange}
        disabled={disabled}
        triggerFormat="value"
        className="hub-adm-click-filter w-full min-w-0"
        triggerClassName="hub-adm-click-filter__trigger"
        /** Mail Modal / Layout 3 SSOT — ADM CSS owns type; strip FilterBar `text-sm font-medium`. */
        triggerTypoClass=""
        ariaLabel={fieldLabel}
        panelSearchAsync={panelSearchAsync}
        allowClear={allowClear}
        clearLabel={clearLabel}
        onPanelCreate={onPanelCreate}
        panelCreateAriaLabel={panelCreateAriaLabel}
        allowCustom={allowCustom}
        customOptionLabel={customOptionLabel}
        allowRename={allowRename}
        onRename={onRename}
        renameOptionLabel={renameOptionLabel}
        triggerContent={
          <>
            {valueHint ? (
              <HubDirectoryColumnHint
                content={valueHint}
                titleGlyph={valueHint.titleGlyph}
              >
                <span
                  className={valueTextClass}
                  data-testid="hub-adm-filter-value-tip"
                >
                  {renderValue ? (
                    renderValue(value, displayLabel)
                  ) : (
                    <>
                      <HubAdmFilterValueGlyph opt={opt} glyphPx={glyphPx} slotStyle={slotStyle} />
                      <HubAdmSearchHighlightText text={displayLabel} />
                    </>
                  )}
                </span>
              </HubDirectoryColumnHint>
            ) : (
              <span
                className={valueTextClass}
                title={empty ? undefined : displayLabel}
              >
                {renderValue ? (
                  renderValue(value, displayLabel)
                ) : (
                  <>
                    <HubAdmFilterValueGlyph opt={opt} glyphPx={glyphPx} slotStyle={slotStyle} />
                    <HubAdmSearchHighlightText text={displayLabel} />
                  </>
                )}
              </span>
            )}
            <ChevronDown size={compactIconSize(10)} className="hub-adm-click-filter__chevron shrink-0" aria-hidden />
          </>
        }
        triggerHideChevron
      />
      {mergedTrailing ? (
        <span className="hub-adm-click-filter__trailing inline-flex shrink-0 items-center">{mergedTrailing}</span>
      ) : null}
    </AdmInlineFieldShell>
  );
}

export type HubAdmReadonlyFieldProps = {
  header: HubTableColumnHeaderProps;
  labelHint?: HubDirectoryColumnHintContent;
  children: ReactNode;
  className?: string;
  empty?: boolean;
  /** `inline` — badges, toggles, copy chips (full value width, centered row). */
  valueLayout?: "text" | "inline";
  /** Optional control after the value (e.g. copy icon). Does not shrink. */
  trailingAction?: ReactNode;
};

/** Account-detail modal — label + read-only value (no edit affordance). */
export function HubAdmReadonlyField({
  header,
  labelHint,
  children,
  className = "",
  empty = false,
  valueLayout = "text",
  trailingAction,
}: HubAdmReadonlyFieldProps) {
  return (
    <AdmInlineFieldShell
      header={header}
      labelHint={labelHint}
      className={`hub-adm-inline-field--readonly${className ? ` ${className}` : ""}`}
      valueClassName={`hub-adm-inline-field__value${trailingAction ? " hub-adm-inline-field__value--has-trailing" : ""}`}
    >
      <span
        className={`hub-adm-readonly-value min-w-0 flex-1${
          empty ? " hub-adm-readonly-value--empty" : ""
        }${
          valueLayout === "inline"
            ? " hub-adm-readonly-value--inline"
            : " hub-adm-readonly-value--static"
        }`}
      >
        {children}
      </span>
      {trailingAction ? (
        <span className="hub-adm-click-filter__trailing inline-flex shrink-0 items-center">{trailingAction}</span>
      ) : null}
    </AdmInlineFieldShell>
  );
}
