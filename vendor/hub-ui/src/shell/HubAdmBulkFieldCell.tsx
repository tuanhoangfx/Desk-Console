import type { ReactNode } from "react";

export type HubAdmBulkFieldCellProps = {
  apply: boolean;
  onApplyChange: (next: boolean) => void;
  clear?: boolean;
  onClearChange?: (next: boolean) => void;
  disabled?: boolean;
  applyLabel?: string;
  clearLabel?: string;
  children: ReactNode;
};

/**
 * Account-detail bulk field controls — shared Apply/Clear toggles + control body.
 * Keep this primitive minimal so P00xx tools can compose with existing ADM inline labels.
 */
export function HubAdmBulkFieldCell({
  apply,
  onApplyChange,
  clear = false,
  onClearChange,
  disabled = false,
  applyLabel = "Apply",
  clearLabel = "Clear",
  children,
}: HubAdmBulkFieldCellProps) {
  const controlDisabled = disabled || !apply;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="hub-checkbox"
            checked={apply}
            disabled={disabled}
            onChange={(e) => onApplyChange(e.target.checked)}
          />
          {applyLabel}
        </label>

        {onClearChange ? (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="hub-checkbox"
              checked={clear}
              disabled={controlDisabled}
              onChange={(e) => onClearChange(e.target.checked)}
            />
            {clearLabel}
          </label>
        ) : null}
      </div>
      <div>{children}</div>
    </div>
  );
}
