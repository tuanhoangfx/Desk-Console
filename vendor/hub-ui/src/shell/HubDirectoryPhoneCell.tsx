import type { ReactNode } from "react";
import { HubDirectoryContactCell } from "./HubDirectoryContactCell";

export type HubDirectoryPhoneCellProps = {
  value: string;
  display?: ReactNode;
  children?: ReactNode;
  copyToastLabel?: string;
  className?: string;
  wrapClassName?: string;
};

/** Directory Phone — click text → copy toast; call icon only (no Copy glyph). */
export function HubDirectoryPhoneCell({
  value,
  display,
  children,
  copyToastLabel = "Phone copied",
  className = "",
  wrapClassName = "",
}: HubDirectoryPhoneCellProps) {
  return (
    <HubDirectoryContactCell
      channel="phone"
      value={value}
      display={display}
      copyToastLabel={copyToastLabel}
      className={className}
      wrapClassName={wrapClassName}
    >
      {children}
    </HubDirectoryContactCell>
  );
}
