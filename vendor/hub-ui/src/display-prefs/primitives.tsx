import { Check } from "lucide-react";
import type { ReactNode } from "react";
import type { HubBrandIconId } from "../lib/resolve-hub-brand-icon";
import { compactIconSize } from "../ui-scale";
import type { HubGlyphComponent } from "../types/filter-badge";
import { HubBrandIcon } from "../shell/HubBrandIcon";
import {
  HubDirectoryColumnHint,
  type HubDirectoryColumnHintContent,
  type HubDirectoryColumnHintGlyph,
} from "../table/HubDirectoryColumnHint";
import { hubTableLabelTextForGlyph } from "../content/hub-table-header-label";

export function TabButton({
  active,
  onClick,
  icon,
  children,
  scrollable = false,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
  /** When true, tabs sit in a horizontal scroller instead of equal-width columns. */
  scrollable?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
        scrollable ? "shrink-0" : "flex-1"
      } ${
        active
          ? "bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-500/30"
          : "text-[var(--muted)]"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

export function SectionIcon({
  icon: Icon,
  className,
}: {
  icon: React.ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean }>;
  className: string;
}) {
  return <Icon size={compactIconSize(12)} className={className} aria-hidden />;
}

function SettingsSubsectionLabel({
  label,
  labelHint,
}: {
  label: string;
  labelHint?: HubDirectoryColumnHintContent;
}) {
  const labelNode = <span className="truncate">{label}</span>;
  if (!labelHint) return labelNode;
  return <HubDirectoryColumnHint content={labelHint}>{labelNode}</HubDirectoryColumnHint>;
}

export function Section({
  label,
  icon,
  labelHint,
  children,
}: {
  label: string;
  icon?: ReactNode;
  labelHint?: HubDirectoryColumnHintContent;
  children: ReactNode;
}) {
  return (
    <div className="hub-settings-subsection mb-3 last:mb-0">
      <div className="hub-settings-subsection__label mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[var(--muted)]">
        {icon}
        <SettingsSubsectionLabel label={label} labelHint={labelHint} />
      </div>
      {children}
    </div>
  );
}

/** Nested settings row inside a top-level TOC group (Header, KPI, App mode, …). */
export function SettingsSubsection({
  label,
  icon,
  labelHint,
  headerActions,
  children,
  className = "",
}: {
  label: string;
  icon?: ReactNode;
  labelHint?: HubDirectoryColumnHintContent;
  headerActions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`hub-settings-subsection mb-3 last:mb-0${className ? ` ${className}` : ""}`}>
      <div className="hub-settings-subsection__header mb-1.5 flex items-center justify-between gap-2">
        <div className="hub-settings-subsection__label flex min-w-0 items-center gap-1.5 text-xs font-medium text-[var(--muted)]">
          {icon}
          <SettingsSubsectionLabel label={label} labelHint={labelHint} />
        </div>
        {headerActions ? <div className="hub-settings-subsection__actions shrink-0">{headerActions}</div> : null}
      </div>
      {children ? <div className="hub-settings-subsection__body">{children}</div> : null}
    </div>
  );
}

function resolveToggleLabelGlyph({
  icon,
  iconClassName,
  emoji,
  brandIcon,
  imageSrc,
}: {
  icon?: HubGlyphComponent;
  iconClassName?: string;
  emoji?: string;
  brandIcon?: HubBrandIconId;
  imageSrc?: string;
}): HubDirectoryColumnHintGlyph | undefined {
  if (emoji) return { emoji };
  if (imageSrc) return { imageSrc };
  if (brandIcon) return { brandIcon };
  if (icon) return { icon, toneClass: iconClassName };
  return undefined;
}

function PrefToggleGlyph({
  icon: Icon,
  iconClassName = "text-indigo-300/90",
  emoji,
  brandIcon,
  imageSrc,
}: {
  icon?: HubGlyphComponent;
  iconClassName?: string;
  emoji?: string;
  brandIcon?: HubBrandIconId;
  imageSrc?: string;
}) {
  const size = compactIconSize(11);
  if (emoji) {
    return (
      <span className="hub-users-th-emoji shrink-0 leading-none" aria-hidden>
        {emoji}
      </span>
    );
  }
  if (imageSrc) {
    return (
      <img
        src={imageSrc}
        alt=""
        width={size}
        height={size}
        className="hub-users-th-icon hub-users-th-icon--image shrink-0"
        draggable={false}
        aria-hidden
      />
    );
  }
  if (brandIcon) {
    return <HubBrandIcon brandId={brandIcon} size={size} className="shrink-0" />;
  }
  if (Icon) {
    return <Icon size={size} className={`shrink-0 ${iconClassName}`} aria-hidden />;
  }
  return null;
}

function ToggleRowLabel({
  label,
  on,
  labelHint,
  icon,
  iconClassName,
  emoji,
  brandIcon,
  imageSrc,
}: {
  label: string;
  on: boolean;
  labelHint?: HubDirectoryColumnHintContent;
  icon?: HubGlyphComponent;
  iconClassName?: string;
  emoji?: string;
  brandIcon?: HubBrandIconId;
  imageSrc?: string;
}) {
  const hasGlyph = Boolean(emoji || brandIcon || imageSrc || icon);
  const visibleLabel = hasGlyph ? hubTableLabelTextForGlyph(label) : label;
  const labelNode = <span className={on ? "text-[var(--text)]" : "text-[var(--muted)]"}>{visibleLabel}</span>;
  if (!labelHint) return labelNode;
  return (
    <HubDirectoryColumnHint
      content={labelHint}
      titleGlyph={resolveToggleLabelGlyph({ icon, iconClassName, emoji, brandIcon, imageSrc })}
    >
      {labelNode}
    </HubDirectoryColumnHint>
  );
}

export function ToggleRow({
  label,
  icon: Icon,
  iconClassName = "text-indigo-300/90",
  emoji,
  brandIcon,
  imageSrc,
  labelHint,
  on,
  onChange,
  disabled = false,
  onDisabledClick,
}: {
  label: string;
  icon?: HubGlyphComponent;
  iconClassName?: string;
  emoji?: string;
  brandIcon?: HubBrandIconId;
  imageSrc?: string;
  /** Rich label hint — hover label text (same SSOT as directory column headers). */
  labelHint?: HubDirectoryColumnHintContent;
  on: boolean;
  onChange: () => void;
  /** Gray out when cap reached (e.g. KPI max visible). */
  disabled?: boolean;
  /** Fires when user clicks a disabled row (e.g. show cap message in app log). */
  onDisabledClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        if (disabled) {
          onDisabledClick?.();
          return;
        }
        onChange();
      }}
      disabled={disabled && !onDisabledClick}
      aria-disabled={disabled || undefined}
      className={`hub-settings-toggle flex w-full items-center gap-2 rounded-md px-2 py-0.5 text-left text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400/45 focus-visible:outline-offset-1${
        disabled ? " hub-settings-toggle--disabled cursor-not-allowed opacity-40" : ""
      }`}
    >
      <span className={`hub-check-indicator${on ? " is-on" : ""}`} aria-hidden>
        {on ? <Check size={compactIconSize(9)} strokeWidth={2.75} /> : null}
      </span>
      <PrefToggleGlyph
        icon={Icon}
        iconClassName={iconClassName}
        emoji={emoji}
        brandIcon={brandIcon}
        imageSrc={imageSrc}
      />
      <ToggleRowLabel
        label={label}
        on={on}
        labelHint={labelHint}
        icon={Icon}
        iconClassName={iconClassName}
        emoji={emoji}
        brandIcon={brandIcon}
        imageSrc={imageSrc}
      />
    </button>
  );
}
