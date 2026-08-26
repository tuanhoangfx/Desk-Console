import type { CSSProperties, ReactNode } from "react";
import { hubAdmGridSlotPadClass } from "./hubAccountDetailModal";

/**
 * Detail-modal field scope for Settings surfaces — Layout 3 HubAdm SSOT.
 *
 * The `HubAdm*` field kit only styles correctly inside a `.hub-add-modal` scope that
 * declares Layout 3 tokens (`--hub-adm-label-w`, value height, `--hub-adm-type-*`) plus an
 * aligned form row. **Mail Modal / Order Detail** is the golden reference —
 * Settings uses the same kit; only the form-row slot count differs (Layout 2/3 grid).
 */

/** Layout 3 token defaults — mirrors Mail Modal `.hub-account-detail-modal` / `.hub-add-modal`. */
const LAYOUT3_SCOPE_STYLE = {
  "--hub-adm-label-w": "6.5rem",
  "--hub-adm-field-gap": "0.7rem",
  "--hub-adm-value-h": "26px",
  "--hub-control-h": "26px",
  "--hub-table-header-size": "12px",
  "--hub-table-body-size": "12px",
  "--hub-table-body-line-height": "1.45",
  "--hub-adm-type-size": "12px",
  "--hub-adm-type-line": "1.45",
  "--hub-adm-type-label-weight": "500",
  "--hub-adm-type-value-weight": "400",
  "--hub-adm-type-label-color": "rgb(148 163 184)",
  "--hub-adm-type-value-color": "rgb(203 213 225)",
  "--hub-adm-type-muted-color": "rgb(100 116 139)",
} as CSSProperties;

/** Wraps one or more `HubDetailFieldRow`s in the `.hub-add-modal` field scope. */
export function HubDetailFieldsGroup({
  children,
  className = "",
  /** Override label column width (default Layout 3 = 6.5rem). */
  labelWidth,
}: {
  children: ReactNode;
  className?: string;
  labelWidth?: string;
}) {
  const style = labelWidth
    ? ({ ...LAYOUT3_SCOPE_STYLE, "--hub-adm-label-w": labelWidth } as CSSProperties)
    : LAYOUT3_SCOPE_STYLE;
  return (
    <div className={`hub-add-modal space-y-1 ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}

/**
 * One Layout 3 aligned form row (Order Detail SSOT).
 * - `slots=1` (default): one field + spacer — occupies first Layout 3 slot (not full row).
 * - `slots=2`: two fields + tail spacer.
 * - `slots=3`: three fields, no spacer.
 * - `slots="full"`: one field full-width (Settings / narrow rail — no 3-col squeeze).
 */
export function HubDetailFieldRow({
  children,
  slots = 1,
}: {
  children: ReactNode;
  slots?: 1 | 2 | 3 | "full";
}) {
  const full = slots === "full";
  const padClass = !full && slots !== 3 ? hubAdmGridSlotPadClass(slots) : null;
  return (
    <div
      className={`hub-adm-form-row hub-adm-form-row--aligned${
        full ? " hub-adm-form-row--single" : ""
      }`}
    >
      {children}
      {padClass ? <span className={padClass} aria-hidden /> : null}
    </div>
  );
}
