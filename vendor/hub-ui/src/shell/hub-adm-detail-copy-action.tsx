import type { ReactNode } from "react";
import { Copy } from "lucide-react";
import { HubInlineCopyControl } from "./HubInlineCopyControl";
import "./hub-adm-detail-copy-action.css";

export type HubAdmDetailCopyTrailingActionProps = {
  value: string;
  title?: string;
  copyToastLabel?: string;
  className?: string;
};

/** Trailing copy icon for ADM detail dropdowns, dates, and edit fields. */
export function HubAdmDetailCopyTrailingAction({
  value,
  title = "Copy",
  copyToastLabel,
  className = "hub-adm-detail-field-copy",
}: HubAdmDetailCopyTrailingActionProps) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return (
    <HubInlineCopyControl
      value={text}
      title={title}
      copyToastLabel={copyToastLabel}
      className={className}
    >
      <Copy size={12} aria-hidden />
    </HubInlineCopyControl>
  );
}

export function mergeHubAdmTrailingActions(
  primary: ReactNode | null,
  secondary: ReactNode | null | undefined,
): ReactNode | null {
  if (!primary && !secondary) return null;
  if (!primary) return secondary ?? null;
  if (!secondary) return primary;
  return (
    <span className="hub-adm-detail-field-trailing-group inline-flex items-center gap-0.5">
      {primary}
      {secondary}
    </span>
  );
}

export function buildHubAdmDetailCopyTrailingAction(opts: {
  copyText: string;
  title?: string;
  copyToastLabel?: string;
  className?: string;
}): ReactNode | null {
  const text = opts.copyText.trim();
  if (!text) return null;
  return (
    <HubAdmDetailCopyTrailingAction
      value={text}
      title={opts.title}
      copyToastLabel={opts.copyToastLabel}
      className={opts.className}
    />
  );
}
