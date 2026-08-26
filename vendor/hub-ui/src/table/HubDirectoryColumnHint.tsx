import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ListChecks } from "lucide-react";
import type { HubBrandIconId } from "../lib/resolve-hub-brand-icon";
import { HUB_DIRECTORY_BRAND_EMPTY_GLYPH } from "../lib/resolve-hub-brand-icon";
import type { HubGlyphComponent } from "../types/filter-badge";
import type { HubUsersStatusTone } from "../shell/HubUsersStatusLabel";
import { HubSemanticGlyph } from "../shell/HubSemanticGlyph";
import { measureHubDirectoryPopoverPosition } from "../lib/hub-directory-popover";
import { compactIconSize } from "../ui-scale";
import { hubDirectoryMetricHeatDotClass } from "../lib/directory-metric-tier";
import type { HubBrandIconShell } from "../shell/filter-dropdown-primitives";
import { hubDirectoryTableBrandImgClass } from "../shell/filter-dropdown-primitives";
import { HubDirectoryCopyText } from "../shell/HubDirectoryCopyText";
import "../styles/hub-directory-popover.css";

export type HubDirectoryColumnHintGlyph = {
  icon?: HubGlyphComponent;
  brandIcon?: HubBrandIconId;
  toneClass?: string;
  /** Native emoji — matches sheet-parity column headers (e.g. 🪪 Buyer ID). */
  emoji?: string;
  /** Extension manifest PNG or brand asset. */
  imageSrc?: string;
};

export type HubDirectoryColumnHintLine = {
  label: string;
  detail?: string;
  emoji?: string;
  statusDot?: HubUsersStatusTone;
  dotClassName?: string;
  icon?: HubGlyphComponent;
  brandIcon?: HubBrandIconId;
  toneClass?: string;
  /** Platform PNG / extension icon — same slot as brandIcon (Services name cell). */
  imageSrc?: string;
  imageShell?: HubBrandIconShell;
  /** Heat tier dot count for metric columns. */
  metricHeatCount?: number;
  /** When set with onLineAction, line renders as a button. */
  actionKey?: string;
  /** Leading token — click copies `value` (Usage Order ID SSOT). */
  copyLead?: { label: string; value: string; toastLabel?: string };
  /** After copyLead — per-field spans (Days Left tone). ` • ` joined. */
  tokens?: { text: string; className?: string }[];
};

export type HubDirectoryColumnHintContent = {
  title?: string;
  titleGlyph?: HubDirectoryColumnHintGlyph;
  description?: string;
  optionsLabel?: string;
  /** `null` — no leading glyph (label already has per-column stickers). */
  optionsLabelGlyph?: HubDirectoryColumnHintGlyph | null;
  lines: HubDirectoryColumnHintLine[];
};

type Props = {
  content: HubDirectoryColumnHintContent;
  /** When set, lines with actionKey render as buttons. */
  onLineAction?: (actionKey: string) => void;
  titleGlyph?: HubDirectoryColumnHintGlyph;
  children: ReactNode;
};

const DEFAULT_OPTIONS_GLYPH: HubDirectoryColumnHintGlyph = {
  icon: ListChecks,
  toneClass: "text-[var(--muted)]",
};

function HintSectionHeading({
  glyph,
  text,
  variant,
}: {
  glyph?: HubDirectoryColumnHintGlyph | null;
  text: string;
  variant: "title" | "section";
}) {
  return (
    <p
      className={
        variant === "title"
          ? "hub-directory-popover__heading hub-directory-popover__heading--title"
          : "hub-directory-popover__heading hub-directory-popover__heading--section"
      }
    >
      {glyph ? (
        <span className="hub-directory-popover__icon" aria-hidden>
          {glyph.emoji ? (
            <span className="hub-directory-popover__emoji">{glyph.emoji}</span>
          ) : glyph.imageSrc ? (
            <img
              src={glyph.imageSrc}
              alt=""
              width={compactIconSize(variant === "title" ? 12 : 11)}
              height={compactIconSize(variant === "title" ? 12 : 11)}
              className="hub-directory-popover__image shrink-0"
              draggable={false}
            />
          ) : (
            <HubSemanticGlyph
              icon={glyph.icon}
              brandIcon={glyph.brandIcon}
              size={compactIconSize(variant === "title" ? 12 : 11)}
              className={glyph.toneClass ?? "text-[var(--muted)]"}
            />
          )}
        </span>
      ) : null}
      <span className="hub-directory-popover__heading-text">{text}</span>
    </p>
  );
}

export type HubDirectoryHintLineGlyph =
  | { kind: "image"; src: string; shell: HubBrandIconShell }
  | { kind: "semantic"; brandIcon?: HubBrandIconId; icon?: HubGlyphComponent; toneClass?: string }
  | { kind: "statusDot"; tone: HubUsersStatusTone }
  | { kind: "heatDot"; className: string }
  | { kind: "emoji"; emoji: string };

/**
 * Leading glyph for a popover Option row.
 * Brand / platform image wins over emoji fallback (⭕) — Mail Sub must not paint heat-empty
 * circles in front of service labels.
 */
export function pickHubDirectoryHintLineGlyph(line: HubDirectoryColumnHintLine): HubDirectoryHintLineGlyph {
  const imageSrc = line.imageSrc?.trim();
  if (imageSrc) return { kind: "image", src: imageSrc, shell: line.imageShell ?? "bare" };
  if (line.brandIcon || line.icon) {
    return {
      kind: "semantic",
      brandIcon: line.brandIcon,
      icon: line.icon,
      toneClass: line.toneClass,
    };
  }
  if (line.statusDot) return { kind: "statusDot", tone: line.statusDot };
  if (line.dotClassName) return { kind: "heatDot", className: line.dotClassName };
  return { kind: "emoji", emoji: line.emoji?.trim() || HUB_DIRECTORY_BRAND_EMPTY_GLYPH };
}

function lineHasHintGlyph(line: HubDirectoryColumnHintLine): boolean {
  return Boolean(
    line.imageSrc?.trim() ||
      line.brandIcon ||
      line.icon ||
      line.statusDot ||
      line.dotClassName ||
      line.emoji?.trim() ||
      line.metricHeatCount != null,
  );
}

function HintLineGlyph({ line }: { line: HubDirectoryColumnHintLine }) {
  const glyph = pickHubDirectoryHintLineGlyph(line);
  if (glyph.kind === "statusDot") {
    return <span className={`hub-users-status-dot hub-users-status-dot--${glyph.tone}`} aria-hidden />;
  }
  if (glyph.kind === "heatDot") {
    return <span className={glyph.className} aria-hidden />;
  }
  if (glyph.kind === "emoji") {
    return <span className="hub-directory-popover__emoji">{glyph.emoji}</span>;
  }
  if (glyph.kind === "image") {
    const px = compactIconSize(12);
    return (
      <img
        src={glyph.src}
        alt=""
        width={px}
        height={px}
        className={`hub-directory-popover__image shrink-0 ${hubDirectoryTableBrandImgClass(glyph.shell)}`}
        draggable={false}
      />
    );
  }
  return (
    <HubSemanticGlyph
      icon={glyph.icon}
      brandIcon={glyph.brandIcon}
      size={compactIconSize(12)}
      className={glyph.toneClass ?? "text-[var(--muted)]"}
    />
  );
}

/** Rich multi-line column header hint — hub-directory-popover SSOT (below anchor). */
export function HubDirectoryColumnHint({ content, titleGlyph, children, onLineAction }: Props) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    const next = measureHubDirectoryPopoverPosition(anchorRef.current, popoverRef.current);
    if (next) setPos(next);
  }, []);

  const show = useCallback(() => {
    setOpen(true);
  }, []);

  const hide = useCallback(() => setOpen(false), []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, updatePosition, content]);

  const resolvedTitleGlyph = content.titleGlyph ?? titleGlyph;
  const resolvedOptionsGlyph =
    content.optionsLabelGlyph === undefined ? DEFAULT_OPTIONS_GLYPH : content.optionsLabelGlyph;

  const popover =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={popoverRef}
            className="hub-directory-popover"
            style={{ top: pos.top, left: pos.left }}
            role="tooltip"
            onMouseEnter={show}
            onMouseLeave={hide}
            onMouseDown={(event) => {
              if ((event.target as HTMLElement | null)?.closest(".hub-directory-copy-control")) {
                event.preventDefault();
              }
            }}
          >
            {content.title ? (
              resolvedTitleGlyph ? (
                <HintSectionHeading glyph={resolvedTitleGlyph} text={content.title} variant="title" />
              ) : (
                <p className="hub-directory-popover__title">{content.title}</p>
              )
            ) : null}
            {content.description ? (
              <p className="hub-directory-popover__desc">{content.description}</p>
            ) : null}
            {content.lines.length > 0 ? (
              <HintSectionHeading
                glyph={resolvedOptionsGlyph}
                text={content.optionsLabel ?? "Option"}
                variant="section"
              />
            ) : null}
            <ul className="hub-directory-popover__list">
              {content.lines.map((line, index) => {
                const text = line.detail ? `${line.label} · ${line.detail}` : line.label;
                const lead = line.copyLead;
                const tokens = line.tokens?.filter((token) => token.text);
                const showGlyph = !lead || lineHasHintGlyph(line);
                const tokenSpans = tokens?.length
                  ? tokens.map((token, tokenIndex) => (
                      <span key={`${token.text}-${tokenIndex}`}>
                        {lead || tokenIndex > 0 ? " • " : null}
                        <span className={token.className}>{token.text}</span>
                      </span>
                    ))
                  : null;
                const lineText = lead ? (
                  <span className="hub-directory-popover__line">
                    <HubDirectoryCopyText
                      value={lead.value}
                      copyToastLabel={lead.toastLabel ?? "Order ID copied"}
                    >
                      {lead.label}
                    </HubDirectoryCopyText>
                    {tokenSpans ?? (text ? <span>{` • ${text}`}</span> : null)}
                  </span>
                ) : (
                  <span className="hub-directory-popover__line">{tokenSpans ?? text}</span>
                );
                const rowBody = (
                  <>
                    {showGlyph ? (
                      <span
                        className={
                          line.metricHeatCount != null
                            ? "hub-directory-popover__icon hub-directory-popover__icon--with-heat"
                            : "hub-directory-popover__icon"
                        }
                        aria-hidden
                      >
                        <HintLineGlyph line={line} />
                        {line.metricHeatCount != null ? (
                          <span className={hubDirectoryMetricHeatDotClass(line.metricHeatCount)} aria-hidden />
                        ) : null}
                      </span>
                    ) : null}
                    {lineText}
                  </>
                );
                const key = `${lead?.value ?? line.label}-${index}`;
                if (line.actionKey && onLineAction) {
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        className="hub-directory-popover__row hub-directory-popover__row--action"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={(event) => {
                          event.stopPropagation();
                          onLineAction(line.actionKey!);
                        }}
                      >
                        {rowBody}
                      </button>
                    </li>
                  );
                }
                return (
                  <li key={key} className="hub-directory-popover__row">
                    {rowBody}
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <span
        ref={anchorRef}
        className="hub-directory-popover-anchor"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </span>
      {popover}
    </>
  );
}
