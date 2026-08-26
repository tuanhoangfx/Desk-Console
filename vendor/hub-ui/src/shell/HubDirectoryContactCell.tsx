import type { ReactNode } from "react";
import type { HubContactChannel } from "../lib/hub-contact-channel-href";
import { HubDirectoryEmptyCell, isDirectoryEmptyLabel } from "../lib/directory-empty-label";
import { HubContactOpenAction } from "./HubContactOpenAction";
import { HubDirectoryCopyText } from "./HubDirectoryCopyText";
import "./hub-directory-copy-control.css";

export type HubDirectoryContactCellProps = {
  channel: HubContactChannel;
  value: string;
  /** Visible label — search highlight, formatting, etc. */
  display?: ReactNode;
  children?: ReactNode;
  /** Toast label after click-copy (Hub toast SSOT — no Copy glyph beside text). */
  copyToastLabel?: string;
  className?: string;
  wrapClassName?: string;
  /** When false, omit open/call affordance. Default true. */
  showOpenAction?: boolean;
};

const DEFAULT_TOAST: Record<HubContactChannel, string> = {
  phone: "Phone copied",
  zalo: "Zalo copied",
  telegram: "Tele copied",
  meta: "Meta copied",
};

/**
 * Directory contact channel — plain account text (click → copy toast) + optional open/call icon.
 * No trailing Copy glyph; toast via HubToastProvider (HubDirectoryCopyText / HubTwofaCopyControl SSOT).
 */
export function HubDirectoryContactCell({
  channel,
  value,
  display,
  children,
  copyToastLabel,
  className = "",
  wrapClassName = "",
  showOpenAction = true,
}: HubDirectoryContactCellProps) {
  const text = String(value ?? "").trim();
  if (!text || isDirectoryEmptyLabel(text)) {
    return <HubDirectoryEmptyCell className="hub-users-directory-body-text hub-users-cell-muted" />;
  }

  return (
    <span
      className={`hub-directory-contact-cell hub-directory-phone-cell inline-flex max-w-full min-w-0 items-center gap-0.5 ${wrapClassName}`.trim()}
    >
      <HubDirectoryCopyText
        value={text}
        display={children ?? display ?? text}
        copyToastLabel={copyToastLabel ?? DEFAULT_TOAST[channel]}
        className={className}
        variant="account"
        copyFeedback="toast"
      />
      {showOpenAction ? <HubContactOpenAction channel={channel} value={text} variant="directory" /> : null}
    </span>
  );
}
