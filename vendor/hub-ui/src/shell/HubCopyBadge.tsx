import { useEffect, useState, type ReactNode } from "react";
import { Check, Copy, Fingerprint } from "lucide-react";
import { copyTextWithFallback } from "../lib/copy-text-with-fallback";
import { copyToastLabelFromTitle } from "../toast/copy-toast";
import { useHubToast } from "../toast/HubToastContext";
import { compactIconSize } from "../ui-scale";

export type HubCopyFeedback = "toast" | "inline" | "auto";

/** `full` — fingerprint + label + copy. `chip` — compact mono label (rail / tight directory). */
export type HubCopyBadgeDisplay = "full" | "chip";

export type HubCopyBadgeProps = {
  value: string;
  /** Shown label; defaults to truncated value */
  label?: string;
  title?: string;
  className?: string;
  onCopied?: () => void;
  /** `toast` = P0020 parity (no inline ✓). `auto` = toast when HubToastProvider mounted. */
  copyFeedback?: HubCopyFeedback;
  /** Toast label override; defaults to label derived from `title`. */
  copyToastLabel?: string;
  display?: HubCopyBadgeDisplay;
  /** Optional label override (e.g. search highlight). */
  labelContent?: ReactNode;
  /**
   * Trailing Copy glyph — default on for ID chips.
   * Full Info SSOT: fingerprint leading only (not dropdown-style Copy).
   */
  showTrailingCopy?: boolean;
  /**
   * Native `title=` — short 1-line action only.
   * Off when wrapped in `HubDirectoryValuePopover` (Sample / ADM) so OS tip
   * does not stack on the portal and hide the real message.
   */
  nativeTitle?: boolean;
};

export function hubCopyBadgeDisplayLabel(value: string, label?: string): string {
  return label ?? (value.length > 10 ? `${value.slice(0, 8)}…` : value);
}

/**
 * Hub copy badge — ID / mono value chip (P0004 Users table).
 * Default: toast feedback when HubToastProvider is mounted (no inline ✓ tick).
 */
export function HubCopyBadge({
  value,
  label,
  title,
  className = "",
  onCopied,
  copyFeedback = "auto",
  copyToastLabel,
  display = "full",
  labelContent,
  showTrailingCopy = true,
  nativeTitle = true,
}: HubCopyBadgeProps) {
  const toast = useHubToast();
  const [copied, setCopied] = useState(false);
  const displayLabel = hubCopyBadgeDisplayLabel(value, label);
  const copyActionTitle = title ?? `Copy ${value}`;
  const chip = display === "chip";

  const useToast =
    copyFeedback === "toast" || (copyFeedback === "auto" && toast != null);
  const useInlineTick = copyFeedback === "inline" || (copyFeedback === "auto" && toast == null);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1400);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copy(e: React.MouseEvent) {
    e.stopPropagation();
    await copyTextWithFallback(value);
    if (useToast) {
      toast?.pushCopyToast(value, copyToastLabel ?? copyToastLabelFromTitle(copyActionTitle));
    } else if (useInlineTick) {
      setCopied(true);
    }
    onCopied?.();
  }

  return (
    <button
      type="button"
      onClick={(e) => void copy(e)}
      className={`hub-copy-badge inline-flex h-[var(--hub-metric-badge-h)] max-w-full items-center rounded-md border border-white/10 bg-white/[0.04] text-[var(--muted)] transition-colors hover:border-indigo-400/30 hover:bg-indigo-500/10 hover:text-indigo-200 ${
        chip
          ? "hub-copy-badge--chip gap-0 px-1"
          : "hub-copy-badge--full gap-1 px-1.5 font-mono font-medium leading-none"
      } ${className}`}
      title={nativeTitle ? copyActionTitle : undefined}
      aria-label={copyActionTitle}
      data-hub-copy-value={value}
    >
      {!chip ? (
        <Fingerprint size={compactIconSize(10)} className="shrink-0 text-indigo-300/80" aria-hidden />
      ) : null}
      <span className="truncate">{labelContent ?? displayLabel}</span>
      {!chip && showTrailingCopy ? (
        <Copy size={compactIconSize(10)} className="shrink-0 opacity-60" aria-hidden />
      ) : null}
      {!chip && useInlineTick && copied ? (
        <Check size={compactIconSize(10)} className="shrink-0 text-emerald-400" aria-hidden />
      ) : null}
    </button>
  );
}
