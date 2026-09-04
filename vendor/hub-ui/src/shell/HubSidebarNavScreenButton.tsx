import type { LucideIcon } from "lucide-react";
import type { HubBrandIconId } from "../lib/resolve-hub-brand-icon";
import { HubNavIcon } from "./HubNavIcon";
import { HUB_SIDEBAR_NAV_LABEL_CLASS } from "./hub-typography";
import {
  navActiveBarClass,
  navActiveBgClass,
  navActiveTextClass,
  type NavIconTone,
} from "./sidebar-nav-tones";

export type HubSidebarNavScreenButtonProps = {
  label: string;
  icon: LucideIcon;
  iconTone: NavIconTone;
  brandIcon?: HubBrandIconId;
  /** Sheet-parity emoji — replaces Lucide nav icon when set. */
  emojiGlyph?: string;
  active: boolean;
  badge?: number;
  onClick: () => void;
  onMouseEnter?: () => void;
  onFocus?: () => void;
};

/** Single top-level sidebar screen row (Dashboard, Hub, Logs, …). */
export function HubSidebarNavScreenButton({
  label,
  icon,
  iconTone,
  brandIcon,
  emojiGlyph,
  active,
  badge,
  onClick,
  onMouseEnter,
  onFocus,
}: HubSidebarNavScreenButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onFocus={onFocus}
      className={`group relative flex w-full items-center gap-2.5 rounded-xl px-3 py-2 ${HUB_SIDEBAR_NAV_LABEL_CLASS} transition-all ${
        active
          ? `${navActiveBgClass(iconTone)} ${navActiveTextClass(iconTone)}`
          : "text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)]"
      }`}
    >
      {active ? (
        <span
          className={`absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r ${navActiveBarClass(iconTone)}`}
        />
      ) : null}
      <HubNavIcon icon={icon} iconTone={iconTone} active={active} brandIcon={brandIcon} emojiGlyph={emojiGlyph} />
      <span className="flex-1 text-left">{label}</span>
      {badge != null && badge > 0 ? (
        <span className="min-w-[1.125rem] rounded-full bg-amber-500/25 px-1.5 py-0.5 text-center text-[10px] font-semibold tabular-nums text-amber-200">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </button>
  );
}
