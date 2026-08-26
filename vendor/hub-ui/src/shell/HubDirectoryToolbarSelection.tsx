import type { CSSProperties } from "react";
import {
  accentForToolbarSelectionPct,
  accentSoftForToolbarSelectionPct,
} from "./hubDirectoryToolbarSelectionAccent";

export type HubDirectoryToolbarSelectionProps = {
  visibleCount: number;
  selectedCount: number;
  /** Plural noun for `title` — profiles, workflows, users */
  noun?: string;
};

/** Toolbar-row selection chip — Design V2 Spectrum Bar: stacked x/y + % hue bar. */
export function HubDirectoryToolbarSelection({
  visibleCount,
  selectedCount,
  noun = "items",
}: HubDirectoryToolbarSelectionProps) {
  const safeVisible = Math.max(visibleCount, 0);
  const safeSelected = Math.max(0, Math.min(selectedCount, safeVisible || selectedCount));
  const denom = safeVisible > 0 ? safeVisible : Math.max(safeSelected, 1);
  const pct = denom > 0 ? Math.round((safeSelected / denom) * 100) : 0;
  const accent = accentForToolbarSelectionPct(pct);
  const accentSoft = accentSoftForToolbarSelectionPct(pct);

  return (
    <span
      role="status"
      className="hub-directory-toolbar-selection"
      style={
        {
          "--hub-toolbar-selection-accent": accent,
          "--hub-toolbar-selection-accent-soft": accentSoft,
        } as CSSProperties
      }
      title={`${safeSelected} of ${denom} ${noun} (${pct}%)`}
      aria-live="polite"
      aria-label={`${safeSelected} of ${denom} selected`}
    >
      <span className="hub-directory-toolbar-selection__nums">
        <span className="hub-directory-toolbar-selection__selected">{safeSelected}</span>
        <span className="hub-directory-toolbar-selection__den">/{denom}</span>
      </span>
      <span className="hub-directory-toolbar-selection__bar" aria-hidden>
        <span className="hub-directory-toolbar-selection__fill" style={{ width: `${pct}%` }} />
      </span>
    </span>
  );
}
