import type { LucideIcon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useCompactIconSize } from "../ui-scale";

export const HUB_SIDEBAR_FOOTER_BTN_CLASS =
  "hub-sidebar-chrome-type flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 transition-colors text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-60";

export type HubSidebarFooterButtonProps = {
  icon: LucideIcon;
  label: string;
  iconClass?: string;
  /** When set, show photo instead of Lucide role icon (broken URL → role icon). */
  iconSrc?: string | null;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  title?: string;
  trailing?: ReactNode;
  iconSize?: number;
  /** Fade role icon in after profiles.role resolves (sidebar user row). */
  iconFadeIn?: boolean;
  /** Stable hook for the sidebar self-account entry point. */
  dataHubSidebarUser?: boolean;
};

/** Sidebar footer action row — shared across Hub workspace sidebars. */
export function HubSidebarFooterButton({
  icon: Icon,
  label,
  iconClass = "",
  iconSrc = null,
  onClick,
  disabled,
  loading,
  title,
  trailing,
  iconSize = 15,
  iconFadeIn = false,
  dataHubSidebarUser = false,
}: HubSidebarFooterButtonProps) {
  const px = useCompactIconSize(iconSize);
  const iconMotion = iconFadeIn ? "transition-opacity duration-150" : "";
  const trimmedSrc = iconSrc?.trim() || "";
  const [imgBroken, setImgBroken] = useState(false);

  useEffect(() => {
    setImgBroken(false);
  }, [trimmedSrc]);

  const showPhoto = Boolean(trimmedSrc) && !imgBroken;

  return (
    <button
      type="button"
      className={HUB_SIDEBAR_FOOTER_BTN_CLASS}
      onClick={onClick}
      disabled={disabled}
      title={title}
      data-hub-sidebar-user={dataHubSidebarUser || undefined}
    >
      {showPhoto ? (
        <img
          src={trimmedSrc}
          alt=""
          width={px}
          height={px}
          className={`hub-filter-avatar-icon shrink-0 ${iconMotion}`}
          style={{ width: px, height: px }}
          onError={() => setImgBroken(true)}
        />
      ) : (
        <Icon
          size={px}
          aria-hidden
          suppressHydrationWarning
          className={`shrink-0 ${iconMotion} ${iconClass} ${loading ? "anim-spin" : ""}`}
        />
      )}
      <span className="flex-1 text-left">{label}</span>
      {trailing}
    </button>
  );
}
