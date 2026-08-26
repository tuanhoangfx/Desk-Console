import type { ReactNode } from "react";
import type { HubCopyFeedback } from "./HubCopyBadge";
import { HubTwofaCopyControl } from "./HubTwofaCopyControl";
import { HubDirectoryEmptyCell, isDirectoryEmptyLabel } from "../lib/directory-empty-label";

export type HubDirectoryCopyTextProps = {
  value: string;
  /** Visible cell content — defaults to trimmed `value`. */
  display?: ReactNode;
  /** Alias for `display` — directory cells with icons / truncate wrapper. */
  children?: ReactNode;
  copyToastLabel?: string;
  className?: string;
  wrapClassName?: string;
  /** `account` — ID / email / login (P0020 Mail·Service). `password` — masked-capable secret fields. */
  variant?: "account" | "password";
  copyFeedback?: HubCopyFeedback;
  onCopied?: () => void;
};

function variantClass(variant: "account" | "password", masked?: boolean): string {
  if (variant === "password") {
    return `twofa-copy-control--password${masked ? " twofa-copy-control--password-masked" : ""}`;
  }
  return "twofa-copy-control--account hub-users-name-title";
}

/** Directory click-to-copy — P0020 Mail / Service / Account (value click + toast; no trailing icon). */
export function HubDirectoryCopyText({
  value,
  display,
  children,
  copyToastLabel = "Copied",
  className = "",
  wrapClassName = "",
  variant = "account",
  copyFeedback = "auto",
  onCopied,
}: HubDirectoryCopyTextProps) {
  const text = String(value ?? "").trim();
  if (isDirectoryEmptyLabel(text)) {
    return <HubDirectoryEmptyCell className="hub-users-directory-body-text hub-users-cell-muted" />;
  }

  const resolvedDisplay = children ?? display ?? text;
  const masked =
    variant === "password" &&
    typeof resolvedDisplay === "string" &&
    resolvedDisplay.includes("•") &&
    resolvedDisplay !== text;

  return (
    <HubTwofaCopyControl
      value={text}
      display={resolvedDisplay}
      className={`${variantClass(variant, masked)} ${className}`.trim()}
      wrapClassName={variant === "password" ? `twofa-copy-control-wrap--value ${wrapClassName}`.trim() : wrapClassName}
      copyToastLabel={copyToastLabel}
      copyFeedback={copyFeedback}
      onCopied={onCopied}
    />
  );
}
