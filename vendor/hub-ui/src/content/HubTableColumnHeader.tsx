import { useRef } from "react";
import type { LucideIcon } from "lucide-react";
import type { HubGlyphComponent } from "../types/filter-badge";
import type { HubBrandIconId } from "../lib/resolve-hub-brand-icon";
import { compactIconSize, HUB_DIRECTORY_HEADER_GLYPH_PX } from "../ui-scale";
import { HubSemanticGlyph } from "../shell/HubSemanticGlyph";
import {
  type HubTableColumnRole,
  resolveHubTableColumnMeta,
} from "../table/hub-table-column-meta";
import { hubTableLabelTextForGlyph, parseHubTableHeaderLabel } from "./hub-table-header-label";
import { useHubTableColumnHeaderFit } from "./useHubTableColumnHeaderFit";

export type HubTableColumnHeaderProps = {
  label: string;
  /** Native emoji glyph — replaces Lucide/brand header icon when set. */
  headerEmoji?: string;
  /** Extension or brand PNG (data URI or asset URL). */
  headerImageSrc?: string;
  /** Semantic role — preferred; pulls icon + color from shared registry. */
  role?: HubTableColumnRole;
  /** Widened to HubGlyphComponent — column meta headerIcon may be a React 19 memo/forwardRef object. */
  icon?: HubGlyphComponent;
  iconClassName?: string;
  brandIcon?: HubBrandIconId;
  /**
   * Table headers: measure + icon-only collapse when the th is too narrow.
   * Adm detail/section labels: set false — no measure clone (avoids `AccountAccount` textContent).
   */
  enableFit?: boolean;
};

/** Table header icon + label — wrap with `.hub-users-th-label` in sortable headers. */
export function HubTableColumnHeader({
  label,
  headerEmoji,
  headerImageSrc,
  role,
  icon: IconProp,
  iconClassName,
  brandIcon,
  enableFit = true,
}: HubTableColumnHeaderProps) {
  const headingRef = useRef<HTMLSpanElement>(null);
  const glyphRef = useRef<HTMLSpanElement>(null);
  const textMeasureRef = useRef<HTMLSpanElement>(null);

  const safeLabel = label ?? "";
  const parsed = parseHubTableHeaderLabel(safeLabel);
  /** Sheet sticker wins over Lucide `role` — label-embedded emoji is the fallback SSOT. */
  const resolvedEmoji = headerEmoji || parsed.embeddedGlyph;
  const hasSeparateGlyph = Boolean(resolvedEmoji || headerImageSrc || role || IconProp || brandIcon);
  const embeddedGlyph = !resolvedEmoji && !headerImageSrc && !role && !IconProp && !brandIcon
    ? parsed.embeddedGlyph
    : null;
  // Separate sticker + "🦸‍♂️Own" used to double-render; always strip leading emoji when a glyph shows.
  const displayText =
    hasSeparateGlyph || embeddedGlyph ? hubTableLabelTextForGlyph(safeLabel) : safeLabel;
  const showGlyph = Boolean(resolvedEmoji || headerImageSrc || role || IconProp || brandIcon || embeddedGlyph);
  /** Flex gap can collapse; leading NBSP on the label is the glyph↔text space SSOT. */
  const spacedDisplayText =
    showGlyph && displayText.trim() ? `\u00A0${displayText}` : displayText;

  const iconOnly = useHubTableColumnHeaderFit(
    { headingRef, glyphRef, textMeasureRef },
    displayText,
    enableFit && showGlyph && Boolean(displayText.trim()),
  );

  const showText = Boolean(displayText.trim()) && !iconOnly;

  const text = (
    <span className="hub-users-th-text" title={label} aria-hidden={iconOnly || undefined}>
      {spacedDisplayText}
    </span>
  );

  const measureText = enableFit ? (
    <span
      ref={textMeasureRef}
      className="hub-users-th-text hub-users-th-text--measure"
      aria-hidden
    >
      {spacedDisplayText}
    </span>
  ) : null;

  if (resolvedEmoji) {
    return (
      <span
        ref={headingRef}
        className={`hub-users-th-heading${iconOnly ? " hub-users-th-heading--icon-only" : ""}`}
        title={label}
        aria-label={label}
      >
        <span ref={glyphRef} className="hub-users-th-emoji" aria-hidden>
          {resolvedEmoji}
        </span>
        {showText ? text : null}
        {measureText}
      </span>
    );
  }

  if (headerImageSrc) {
    return (
      <span
        ref={headingRef}
        className={`hub-users-th-heading${iconOnly ? " hub-users-th-heading--icon-only" : ""}`}
        title={label}
        aria-label={label}
      >
        <span ref={glyphRef} className="inline-flex shrink-0">
          <img
            src={headerImageSrc}
            alt=""
            width={compactIconSize(HUB_DIRECTORY_HEADER_GLYPH_PX)}
            height={compactIconSize(HUB_DIRECTORY_HEADER_GLYPH_PX)}
            className="hub-users-th-icon hub-users-th-icon--image shrink-0"
            draggable={false}
            aria-hidden
          />
        </span>
        {showText ? text : null}
        {measureText}
      </span>
    );
  }

  const meta = role ? resolveHubTableColumnMeta(role) : null;
  const Icon = meta?.icon ?? IconProp;
  const iconClass = meta?.iconClassName ?? iconClassName ?? "hub-users-th-icon--name";

  if (embeddedGlyph) {
    return (
      <span
        ref={headingRef}
        className={`hub-users-th-heading${iconOnly ? " hub-users-th-heading--icon-only" : ""}`}
        title={label}
        aria-label={label}
      >
        <span ref={glyphRef} className="hub-users-th-emoji" aria-hidden>
          {embeddedGlyph}
        </span>
        {showText ? text : null}
        {measureText}
      </span>
    );
  }

  if (!Icon && !brandIcon) {
    return (
      <span className="hub-users-th-text" title={label}>
        {label}
      </span>
    );
  }

  return (
    <span
      ref={headingRef}
      className={`hub-users-th-heading${iconOnly ? " hub-users-th-heading--icon-only" : ""}`}
      title={label}
      aria-label={label}
    >
      <span ref={glyphRef} className="inline-flex shrink-0">
        <HubSemanticGlyph
          icon={Icon}
          brandIcon={brandIcon}
          size={compactIconSize(HUB_DIRECTORY_HEADER_GLYPH_PX)}
          className={`hub-users-th-icon ${iconClass}`}
        />
      </span>
      {showText ? text : null}
      {measureText}
    </span>
  );
}
