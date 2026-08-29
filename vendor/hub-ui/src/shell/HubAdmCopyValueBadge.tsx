import type { ReactNode } from "react";
import { HubCopyBadge } from "./HubCopyBadge";
import { HubDirectoryValuePopover } from "../table/HubDirectoryValuePopover";
import { HubDirectoryEmptyCell } from "../lib/directory-empty-label";

/**
 * Semantic chip tones — status-driven colour SSOT (P0005 Order Sample columns):
 * `warn` amber (pending/plan) · `info` sky (processing) · `muted` slate (cancel) ·
 * `success` emerald (completed/appeal/…) · `orange` (guarantee update) ·
 * `danger` rose (due / last day) · `violet` (expired / past due).
 */
export type HubAdmCopyValueBadgeTone =
  | "default"
  | "warn"
  | "info"
  | "muted"
  | "success"
  | "orange"
  | "danger"
  | "violet";

export type HubAdmCopyValueBadgeProps = {
  /** Full text copied + shown in hover popover (P0020 Full Info golden). */
  value: string;
  /** Popover title + copy action title base. */
  title: string;
  copyToastLabel?: string;
  /** Optional chip label; defaults to truncated `value` (HubCopyBadge SSOT). */
  label?: string;
  /** Semantic tone — see {@link HubAdmCopyValueBadgeTone}. */
  tone?: HubAdmCopyValueBadgeTone;
  className?: string;
  emptyFallback?: ReactNode;
  /** Full Info: fingerprint nhãn only — hide trailing Copy (dropdown parity). */
  showTrailingCopy?: boolean;
};

/** Colours live in `styles/hub-adm-copy-value-badge.css` (compound selector beats base utilities). */
const HUB_ADM_COPY_VALUE_BADGE_TONE_CLASS: Record<HubAdmCopyValueBadgeTone, string> = {
  default: "",
  warn: "hub-adm-copy-value-badge--warn",
  info: "hub-adm-copy-value-badge--info",
  muted: "hub-adm-copy-value-badge--muted",
  success: "hub-adm-copy-value-badge--success",
  orange: "hub-adm-copy-value-badge--orange",
  danger: "hub-adm-copy-value-badge--danger",
  violet: "hub-adm-copy-value-badge--violet",
};

/**
 * Account-detail read-only copy chip + dark hover popover — P0020 Mail/Service Full Info SSOT.
 *
 * Use inside `HubAdmReadonlyField` with `valueLayout="inline"`.
 */
export function HubAdmCopyValueBadge({
  value,
  title,
  copyToastLabel,
  label,
  tone = "default",
  className = "",
  emptyFallback,
  showTrailingCopy = true,
}: HubAdmCopyValueBadgeProps) {
  const text = String(value ?? "").trim();
  if (!text) {
    return emptyFallback ?? <HubDirectoryEmptyCell className="hub-users-cell-muted" />;
  }

  const toneClass = HUB_ADM_COPY_VALUE_BADGE_TONE_CLASS[tone] ?? "";

  return (
    <div
      className={`min-w-0 max-w-full${className ? ` ${className}` : ""}`}
      onClick={(e) => e.stopPropagation()}
    >
      <HubDirectoryValuePopover value={text} title={title} className="block min-w-0 max-w-full">
        <HubCopyBadge
          value={text}
          label={label}
          title={`Copy ${title}`}
          copyToastLabel={copyToastLabel}
          showTrailingCopy={showTrailingCopy}
          nativeTitle={false}
          className={`hub-adm-type-mono max-w-full${toneClass ? ` ${toneClass}` : ""}`}
        />
      </HubDirectoryValuePopover>
    </div>
  );
}
