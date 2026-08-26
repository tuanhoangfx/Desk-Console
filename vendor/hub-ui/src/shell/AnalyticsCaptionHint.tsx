import type { CSSProperties } from "react";
import type { FilterIconMeta } from "../types/filter-badge";
import type { HubBrandIconShell } from "./filter-dropdown-primitives";
import {
  HubDirectoryColumnHint,
  type HubDirectoryColumnHintContent,
  type HubDirectoryColumnHintGlyph,
} from "../table/HubDirectoryColumnHint";
import { ChartLegendLabelContent } from "../lib/chart-legend-label-content";
import { hubFilterOptionEmojiClass } from "./filter-dropdown-primitives";
import { compactIconSize } from "../ui-scale";
import { HUB_ANALYTICS_CAPTION_TYPO_CLASS } from "./hub-typography";

export function resolveAnalyticsLabelGlyph(props: {
  emojiGlyph?: string;
  iconMeta?: FilterIconMeta | null;
}): HubDirectoryColumnHintGlyph | undefined {
  if (props.emojiGlyph) return { emoji: props.emojiGlyph };
  if (props.iconMeta?.icon) {
    return { icon: props.iconMeta.icon, toneClass: props.iconMeta.className };
  }
  return undefined;
}

/** KPI tile label or chart panel title — optional section emoji + popover hint. */
export function AnalyticsCaptionLabel({
  label,
  emojiGlyph,
  iconMeta,
  labelHint,
  className = "",
}: {
  label: string;
  emojiGlyph?: string;
  iconMeta?: FilterIconMeta | null;
  labelHint?: HubDirectoryColumnHintContent;
  className?: string;
}) {
  const Icon = iconMeta?.icon;
  const body = (
    <span
      className={`inline-flex min-w-0 max-w-full items-center gap-[var(--hub-inline-gap-name,8px)] truncate ${HUB_ANALYTICS_CAPTION_TYPO_CLASS} ${className}`.trim()}
    >
      {emojiGlyph ? (
        <span className={hubFilterOptionEmojiClass()} aria-hidden>
          {emojiGlyph}
        </span>
      ) : Icon ? (
        <Icon size={compactIconSize(11)} className={`shrink-0 ${iconMeta!.className ?? ""}`} aria-hidden />
      ) : null}
      <span className="truncate">{label}</span>
    </span>
  );

  if (!labelHint) return body;

  return (
    <HubDirectoryColumnHint
      content={labelHint}
      titleGlyph={resolveAnalyticsLabelGlyph({ emojiGlyph, iconMeta })}
    >
      {body}
    </HubDirectoryColumnHint>
  );
}

/** Chart legend row — SSOT icons + optional bucket hint popover. */
export function ChartLegendRowLabel({
  label,
  iconSrc,
  iconSrcs,
  iconShell,
  iconMeta,
  emojiGlyph,
  colorDot,
  labelHint,
  className = "",
  style,
}: {
  label: string;
  iconSrc?: string;
  iconSrcs?: string[];
  iconShell?: HubBrandIconShell;
  iconMeta?: FilterIconMeta | null;
  emojiGlyph?: string;
  colorDot?: string;
  labelHint?: HubDirectoryColumnHintContent;
  className?: string;
  style?: CSSProperties;
}) {
  const body = (
    <span className={`hub-chart-legend-label min-w-0 ${className}`.trim()} style={style}>
      <ChartLegendLabelContent
        label={label}
        iconSrc={iconSrc}
        iconSrcs={iconSrcs}
        iconShell={iconShell}
        iconMeta={iconMeta}
        emojiGlyph={emojiGlyph}
        colorDot={colorDot}
      />
    </span>
  );

  if (!labelHint) return body;

  return (
    <HubDirectoryColumnHint
      content={labelHint}
      titleGlyph={resolveAnalyticsLabelGlyph({ emojiGlyph, iconMeta })}
    >
      {body}
    </HubDirectoryColumnHint>
  );
}
