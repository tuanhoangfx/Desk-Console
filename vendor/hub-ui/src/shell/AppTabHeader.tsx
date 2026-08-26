import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Clock } from "lucide-react";
import { HubChromeActivityAge } from "./HubChromeActivityAge";
import { usePageSessionSeconds } from "../hooks/usePageSessionSeconds";
import { compactIconSize, HUB_CHROME_ICON_PX } from "../ui-scale";
import type { HubBrandIconId } from "../lib/resolve-hub-brand-icon";
import type { HubGlyphComponent } from "../types/filter-badge";
import {
  HubDirectoryColumnHint,
  type HubDirectoryColumnHintContent,
  type HubDirectoryColumnHintGlyph,
} from "../table/HubDirectoryColumnHint";
import { HubSemanticGlyph } from "./HubSemanticGlyph";
import { HubTabTitleIcon } from "./HubTabTitleIcon";
import "./app-tab-header.css";

export type TabTitleMenuItem = {
  id: string;
  label: string;
  icon?: HubGlyphComponent;
};

/** Meta `activityAt` accepts epoch ms or ISO; release-notes/age consumers want an ISO string. */
export function hubMetaActivityAtString(at: string | number | null | undefined): string | null {
  if (at == null) return null;
  if (typeof at === "number") return Number.isFinite(at) ? new Date(at).toISOString() : null;
  return at.trim() || null;
}

export type TabHeaderMetaItem = {
  icon: HubGlyphComponent;
  /** Native tooltip on the meta chip — not rendered as visible label text. */
  title?: string;
  value: string;
  live?: boolean;
  /** ISO or epoch — activity dot + relative/stale label after version. */
  activityAt?: string | number | null;
  /** Optional control after version/activity (e.g. HubVersionUpdateStatusIcon). */
  after?: ReactNode;
};

export type TabHeaderStatItem = {
  key: string;
  icon?: HubGlyphComponent;
  /** Sheet-parity emoji sticker — takes precedence over `iconSrc` / `icon` when set. */
  emojiGlyph?: string;
  /** Custom SVG/raster stat mark — after emoji, before Lucide/brand. */
  iconSrc?: string;
  brandIcon?: HubBrandIconId;
  dotClass?: string;
  label: string;
  value: number | string;
  toneClass: string;
  /** `money` — amber tabular text (hub-order-price-text SSOT). */
  valueKind?: "number" | "money";
  /** Optional — interactive header stat (P0020 Todo preview popover). */
  onClick?: () => void;
  active?: boolean;
  /** Popover hint for stat label (hover). */
  labelHint?: HubDirectoryColumnHintContent;
  /** Optional wrapper class on the center-stat chip (e.g. fade-out). */
  className?: string;
};

type AppTabHeaderProps = {
  ariaLabel: string;
  titleIcon: HubGlyphComponent;
  titleIconClass?: string;
  titleBrandIcon?: HubBrandIconId;
  /** Custom SVG/raster tab mark — takes precedence over Lucide/brand when set. */
  titleIconSrc?: string;
  /** Sheet-parity emoji sticker — takes precedence over `titleIconSrc` / Lucide when set. */
  titleEmojiGlyph?: string;
  title: string;
  titleMenu?: TabTitleMenuItem[];
  activeTitleMenuId?: string;
  onTitleMenuSelect?: (id: string) => void;
  metaItems: TabHeaderMetaItem[];
  /** Optional — defaults to `[]`; the header renders the center rail only when non-empty. */
  centerStats?: TabHeaderStatItem[];
  /** Custom center rail (live tickers, tool-specific KPI). Takes precedence over `centerStats`. */
  centerContent?: ReactNode;
  /**
   * Sparse status before center stats (e.g. vault Syncing… / N pending).
   * Idle tools pass null — no layout tax when hidden.
   */
  statusSlot?: ReactNode;
  pinSticky?: boolean;
  dividerBelow?: boolean;
  embedded?: boolean;
  actions?: ReactNode;
};

function TitleWithMenu({
  title,
  titleIcon,
  titleIconClass,
  titleBrandIcon,
  titleIconSrc,
  titleEmojiGlyph,
  titleMenu,
  activeTitleMenuId,
  onTitleMenuSelect,
}: {
  title: string;
  titleIcon: HubGlyphComponent;
  titleIconClass: string;
  titleBrandIcon?: HubBrandIconId;
  titleIconSrc?: string;
  titleEmojiGlyph?: string;
  titleMenu: TabTitleMenuItem[];
  activeTitleMenuId?: string;
  onTitleMenuSelect?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = titleMenu.find((m) => m.id === activeTitleMenuId);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex max-w-full items-center gap-1 rounded-lg py-0.5 pr-1 text-left transition-colors hover:bg-white/[.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400/50"
      >
        <HubTabTitleIcon
          titleIcon={titleIcon}
          titleIconClass={titleIconClass}
          titleBrandIcon={titleBrandIcon}
          titleIconSrc={titleIconSrc}
          titleEmojiGlyph={titleEmojiGlyph}
        />
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="app-tab-header__chrome-text tracking-tight text-[var(--text)]">{title}</span>
          {active ? (
            <span className="truncate text-[10px] font-medium text-indigo-300/90">{active.label}</span>
          ) : null}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-[var(--muted)] transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-1 min-w-[11rem] overflow-hidden rounded-xl border border-white/10 bg-[var(--panel)] py-1 shadow-xl shadow-black/40"
        >
          {titleMenu.map(({ id, label, icon: Icon }) => {
            const isActive = id === activeTitleMenuId;
            return (
              <button
                key={id}
                type="button"
                role="menuitem"
                onClick={() => {
                  onTitleMenuSelect?.(id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                  isActive
                    ? "bg-indigo-500/15 text-indigo-100"
                    : "text-[var(--muted)] hover:bg-white/[.05] hover:text-[var(--text)]"
                }`}
              >
                {Icon ? <Icon size={14} className={isActive ? "text-indigo-300" : ""} /> : null}
                {label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function Rule({ visibleFrom = "sm" }: { visibleFrom?: "sm" | "md" | "lg" }) {
  const vis =
    visibleFrom === "lg" ? "hidden lg:block" : visibleFrom === "md" ? "hidden md:block" : "hidden sm:block";
  return <span className={`h-3.5 w-px shrink-0 self-center bg-white/10 ${vis}`} aria-hidden />;
}

function MetaLine({ icon: Icon, title, value, live, activityAt, after }: TabHeaderMetaItem) {
  const showActivity = activityAt != null && activityAt !== "";
  const showLiveDot = live !== undefined && !showActivity;

  return (
    <div
      className="app-tab-header__chrome-text inline-flex max-w-full min-w-0 items-center gap-1.5 text-[var(--muted)]"
      title={title}
    >
      <Icon size={14} className="shrink-0 text-indigo-400/90" aria-hidden />
      {showLiveDot ? (
        <span
          className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${live ? "bg-emerald-400" : "bg-amber-400"}`}
          aria-hidden
        />
      ) : null}
      <span className="truncate tabular-nums text-[var(--text)]/90">{value}</span>
      {showActivity ? <HubChromeActivityAge at={activityAt!} /> : null}
      {after ? <span className="inline-flex shrink-0 items-center">{after}</span> : null}
    </div>
  );
}

function headerStatLabelGlyph({
  emojiGlyph,
  iconSrc,
  icon: Icon,
  brandIcon,
  toneClass,
}: {
  emojiGlyph?: string;
  iconSrc?: string;
  icon?: HubGlyphComponent;
  brandIcon?: HubBrandIconId;
  toneClass: string;
}): HubDirectoryColumnHintGlyph | undefined {
  if (emojiGlyph) return { emoji: emojiGlyph };
  if (iconSrc) return { imageSrc: iconSrc };
  if (Icon) return { icon: Icon, toneClass };
  if (brandIcon) return { brandIcon, toneClass };
  return undefined;
}

function StatLabel({
  label,
  labelHint,
  titleGlyph,
}: {
  label: string;
  labelHint?: HubDirectoryColumnHintContent;
  titleGlyph?: HubDirectoryColumnHintGlyph;
}) {
  const labelNode = <span className="shrink-0 text-[var(--muted)]/80">{label}</span>;
  if (!labelHint) return labelNode;
  return (
    <HubDirectoryColumnHint content={labelHint} titleGlyph={titleGlyph}>
      {labelNode}
    </HubDirectoryColumnHint>
  );
}

function StatLine({
  icon: Icon,
  emojiGlyph,
  iconSrc,
  brandIcon,
  dotClass,
  value,
  label,
  toneClass,
  valueKind = "number",
  onClick,
  active,
  labelHint,
}: Omit<TabHeaderStatItem, "key">) {
  const valueClassName = [
    "app-tab-header-stat-value tabular-nums",
    valueKind === "money"
      ? "hub-order-price-text hub-order-price-text--amber"
      : "text-[var(--text)]/90",
  ].join(" ");

  const content = (
    <>
      {dotClass ? (
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} aria-hidden />
      ) : emojiGlyph ? (
        <span className="app-tab-header-stat-emoji shrink-0" aria-hidden>
          {emojiGlyph}
        </span>
      ) : iconSrc ? (
        <img
          src={iconSrc}
          alt=""
          width={13}
          height={13}
          className={`shrink-0 ${toneClass}`}
          draggable={false}
          aria-hidden
        />
      ) : Icon || brandIcon ? (
        <HubSemanticGlyph icon={Icon} brandIcon={brandIcon} size={13} className={`shrink-0 ${toneClass}`} />
      ) : null}
      <span className={valueClassName}>{value}</span>
      <StatLabel
        label={label}
        labelHint={labelHint}
        titleGlyph={headerStatLabelGlyph({ emojiGlyph, iconSrc, icon: Icon, brandIcon, toneClass })}
      />
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={labelHint ? undefined : label}
        className={`app-tab-header-stat-line app-tab-header__chrome-text inline-flex min-w-0 max-w-full items-center gap-1 rounded-md px-1 py-0.5 transition-colors ${
          active ? "bg-white/10 text-[var(--text)]" : "text-[var(--muted)] hover:bg-white/5"
        }`}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className="app-tab-header-stat-line app-tab-header__chrome-text inline-flex min-w-0 max-w-full items-center gap-1 text-[var(--muted)]"
      title={labelHint ? undefined : label}
    >
      {content}
    </div>
  );
}

function SessionLine({ sessionMmSs }: { sessionMmSs: string }) {
  return (
    <div
      className="app-tab-header__session app-tab-header__chrome-text inline-flex items-center gap-1.5 text-[var(--muted)]"
      title={`Page session timer — ${sessionMmSs} since this tab opened`}
    >
      <Clock size={14} className="shrink-0 text-indigo-400/90" aria-hidden />
      <span className="hidden xl:inline">Session</span>
      <span className="tabular-nums text-[var(--text)]/90">{sessionMmSs}</span>
    </div>
  );
}

export function AppTabHeader({
  ariaLabel,
  titleIcon: TitleIcon,
  titleIconClass = "text-indigo-400",
  titleBrandIcon,
  titleIconSrc,
  titleEmojiGlyph,
  title,
  titleMenu,
  activeTitleMenuId,
  onTitleMenuSelect,
  metaItems,
  centerStats = [],
  centerContent,
  statusSlot = null,
  pinSticky = true,
  dividerBelow = true,
  embedded = false,
  actions,
}: AppTabHeaderProps) {
  const sessionMmSs = usePageSessionSeconds();
  const positionClass = embedded ? "relative z-0" : pinSticky ? "sticky top-0 z-40" : "relative z-0";
  const chromeClass = embedded
    ? "app-tab-header app-tab-header--embedded box-border grid items-center gap-x-3 bg-[var(--bg)]"
    : `app-tab-header ${positionClass} -mx-6 mb-2 box-border grid items-center gap-x-3 bg-[var(--bg)] px-6${
        dividerBelow ? " border-b border-white/5" : ""
      }`;
  const hasCenterStats = Boolean(centerContent) || centerStats.length > 0;

  return (
    <header className={chromeClass} aria-label={ariaLabel}>
      <div className="app-tab-header__start flex min-w-0 items-center justify-self-start gap-x-2.5 overflow-hidden">
        {titleMenu?.length ? (
          <TitleWithMenu
            title={title}
            titleIcon={TitleIcon}
            titleIconClass={titleIconClass}
            titleBrandIcon={titleBrandIcon}
            titleIconSrc={titleIconSrc}
            titleEmojiGlyph={titleEmojiGlyph}
            titleMenu={titleMenu}
            activeTitleMenuId={activeTitleMenuId}
            onTitleMenuSelect={onTitleMenuSelect}
          />
        ) : (
          <>
            <HubTabTitleIcon
              titleIcon={TitleIcon}
              titleIconClass={titleIconClass}
              titleBrandIcon={titleBrandIcon}
              titleIconSrc={titleIconSrc}
              titleEmojiGlyph={titleEmojiGlyph}
            />
            <h1
              className="app-tab-header__chrome-text min-w-0 truncate tracking-tight text-[var(--text)]"
              title={`${title} — ${ariaLabel}`}
            >
              {title}
            </h1>
          </>
        )}
        <span className="inline-flex items-center gap-x-2.5">
          <Rule visibleFrom="sm" />
          <SessionLine sessionMmSs={sessionMmSs} />
        </span>
        {metaItems.map((item, index) => (
          <span
            key={`${item.title ?? "meta"}-${index}`}
            className="app-tab-header-meta inline-flex items-center gap-x-2.5"
          >
            <Rule visibleFrom={index === 0 ? "md" : "lg"} />
            <MetaLine {...item} />
          </span>
        ))}
      </div>

      <div
        className="app-tab-header-center-stats flex min-w-0 items-center justify-center justify-self-center gap-x-2.5 overflow-x-auto text-[13px]"
        role="status"
        aria-label={`${title} summary`}
      >
        {statusSlot ? <span className="inline-flex shrink-0 items-center">{statusSlot}</span> : null}
        {statusSlot && hasCenterStats ? <Rule /> : null}
        {centerContent ??
          centerStats.map((stat, index) => {
            const { key, className: statClassName, ...statProps } = stat;
            return (
              <span
                key={key}
                className={`inline-flex min-w-0 shrink items-center gap-x-2.5${statClassName ? ` ${statClassName}` : ""}`}
              >
                {index > 0 ? <Rule /> : null}
                <StatLine {...statProps} />
              </span>
            );
          })}
      </div>

      <div className="app-tab-header__end app-tab-header__chrome-text flex shrink-0 items-center justify-self-end gap-2 text-[var(--muted)]">
        {actions}
      </div>
    </header>
  );
}
