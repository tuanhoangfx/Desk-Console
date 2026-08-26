import { type ReactNode } from "react";
import { Check } from "lucide-react";
import { copyTextWithFallback } from "../lib/copy-text-with-fallback";
import { useHubToast } from "../toast/HubToastContext";
import type { HubCopyFeedback } from "./HubCopyBadge";
import { useHubCopyFlash } from "./HubInlineCopyControl";
import "./hub-directory-copy-control.css";

export type HubTwofaCopyControlProps = {
  value: string;
  display: ReactNode;
  className?: string;
  wrapClassName?: string;
  copyToastLabel?: string;
  /** Native hover — e.g. `Task ID #0141` on Notify/Log headline chips. */
  title?: string;
  onCopied?: () => void;
  copyFeedback?: HubCopyFeedback;
};

/**
 * Directory table copy control — click value to copy + toast; no trailing copy glyph.
 * stopPropagation keeps row click → Detail (P0020 Services/Mail SSOT).
 * Modal dropdown copy icons use `HubAdmDetailCopyTrailingAction` instead.
 */
export function HubTwofaCopyControl({
  value,
  display,
  className = "",
  wrapClassName = "",
  copyToastLabel = "Copied",
  title,
  onCopied,
  copyFeedback = "auto",
}: HubTwofaCopyControlProps) {
  const toast = useHubToast();
  const { copied, flash } = useHubCopyFlash();
  const text = String(value ?? "").trim();

  const useToast =
    copyFeedback === "toast" || (copyFeedback === "auto" && toast != null);
  const useInlineTick = copyFeedback === "inline" || (copyFeedback === "auto" && toast == null);

  const runCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    void copyTextWithFallback(text).finally(() => {
      if (useToast) {
        toast?.pushCopyToast(text, copyToastLabel);
      } else if (useInlineTick) {
        flash();
      }
      onCopied?.();
    });
  };

  return (
    <span className={`hub-directory-copy-wrap twofa-copy-control-wrap ${wrapClassName}`.trim()}>
      <button
        type="button"
        className={`hub-directory-copy-control twofa-copy-control ${className}`.trim()}
        aria-label={copyToastLabel}
        title={title}
        onClick={runCopy}
      >
        <span className="hub-directory-copy-control__value twofa-copy-control__value min-w-0">{display}</span>
        {useInlineTick && copied ? (
          <Check size={10} className="twofa-copy-control__tick shrink-0 text-emerald-400" aria-hidden />
        ) : null}
      </button>
    </span>
  );
}
