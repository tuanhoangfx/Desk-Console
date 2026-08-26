import type { ReactNode } from "react";
import { HubDirectoryCopyText } from "./HubDirectoryCopyText";
import { HubDirectoryValuePopover } from "../table/HubDirectoryValuePopover";
import { HubDirectoryEmptyCell, isDirectoryEmptyLabel } from "../lib/directory-empty-label";

export type HubDirectoryReadonlyCopyTextProps = {
  value: string;
  /** @deprecated Hover uses popover when multilineHover — not native title. */
  title?: string;
  copyToastLabel?: string;
  /** Alias for copyToastLabel (CRM detail modals). */
  copiedLabel?: string;
  fallback?: string;
  multilineHover?: boolean;
  popoverTitle?: string;
  className?: string;
  children?: ReactNode;
};

/** Read-only adm/detail copy cell — optional hover popover for multiline values. */
export function HubDirectoryReadonlyCopyText({
  value,
  title,
  copyToastLabel,
  copiedLabel,
  fallback = "",
  multilineHover = false,
  popoverTitle,
  className = "",
  children,
}: HubDirectoryReadonlyCopyTextProps) {
  const text = String(value ?? "").trim() || String(fallback ?? "").trim();
  if (!text || isDirectoryEmptyLabel(text)) {
    return <HubDirectoryEmptyCell className="hub-users-cell-muted" />;
  }

  const toastLabel = copiedLabel ?? copyToastLabel;
  const inner = (
    <HubDirectoryCopyText value={text} copyToastLabel={toastLabel} className={className}>
      {children ?? (
        <span
          className={`hub-users-directory-body-text${multilineHover ? " hub-adm-click-edit__text--multiline" : ""}`}
        >
          {text}
        </span>
      )}
    </HubDirectoryCopyText>
  );

  if (!multilineHover) return inner;

  return (
    <HubDirectoryValuePopover value={text} title={popoverTitle ?? title}>
      {inner}
    </HubDirectoryValuePopover>
  );
}
