import type { LucideIcon } from "lucide-react";
import { Loader2, X } from "lucide-react";

export type HubToolDetailModalPrimaryActionProps = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
  /** Shown instead of `label` while `busy` (default: Please wait…). */
  busyLabel?: string;
  danger?: boolean;
  /** Emerald create CTA — matches directory `New` bulk action. */
  variant?: "default" | "create";
  icon?: LucideIcon;
};

export function HubToolDetailModalPrimaryAction({
  label,
  onClick,
  disabled,
  busy,
  busyLabel = "Please wait…",
  danger,
  variant = "default",
  icon: Icon,
}: HubToolDetailModalPrimaryActionProps) {
  return (
    <button
      type="button"
      className={[
        "hub-tool-detail-modal__confirm",
        danger ? "hub-tool-detail-modal__confirm--danger" : "",
        variant === "create" ? "hub-tool-detail-modal__confirm--create" : "",
        busy ? "hub-tool-detail-modal__confirm--busy" : "",
        disabled && !busy ? "hub-tool-detail-modal__confirm--disabled" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      disabled={disabled || busy}
      onClick={onClick}
      aria-label={busy ? busyLabel : label}
      aria-busy={busy || undefined}
    >
      {busy ? (
        <Loader2 size={16} className="hub-tool-detail-modal__confirm-icon--busy animate-spin" aria-hidden />
      ) : Icon ? (
        <Icon size={16} aria-hidden />
      ) : null}
      <span>{busy ? busyLabel : label}</span>
    </button>
  );
}

/** Accent tone for cross-entity footer nav (View orders / customer / catalog). */
export type HubToolDetailModalSecondaryTone = "emerald" | "sky" | "violet" | "amber" | "rose";

export type HubToolDetailModalSecondaryActionProps = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  /** Required — Layout-3 / form footer SSOT (Close=X, Reset=RotateCcw, …). */
  icon: LucideIcon;
  /** Optional accent — hover brightens border (not neutral gray wash). */
  tone?: HubToolDetailModalSecondaryTone;
  /**
   * Footer Close SSOT — forces `hub-tool-detail-modal__secondary--close` (X rotate on hover).
   * Prefer this over Icon===X — duplicate lucide copies break identity compare.
   */
  close?: boolean;
};

export function HubToolDetailModalSecondaryAction({
  label,
  onClick,
  disabled,
  icon: Icon,
  tone,
  close,
}: HubToolDetailModalSecondaryActionProps) {
  const isClose = Boolean(close) || Icon === X || /^close$/i.test(label.trim());
  return (
    <button
      type="button"
      className={[
        "hub-tool-detail-modal__secondary",
        isClose ? "hub-tool-detail-modal__secondary--close" : "",
        tone ? `hub-tool-detail-modal__secondary--${tone}` : "",
      ]
        .filter(Boolean)
        .join(" ")}
      disabled={disabled}
      onClick={onClick}
      data-hub-footer-close={isClose ? "1" : undefined}
    >
      <Icon size={16} aria-hidden />
      <span>{label}</span>
    </button>
  );
}
