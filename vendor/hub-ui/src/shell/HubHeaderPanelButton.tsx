import type { LucideIcon } from "lucide-react";
import { useCompactIconSize } from "../ui-scale";

export type HubHeaderPanelButtonProps = {
  icon: LucideIcon;
  iconClassName?: string;
  label: string;
  title?: string;
  badge?: number;
  /** Sidebar footer row (full width). */
  sidebarRow?: boolean;
  /** Header compact — icon + label on sm+. */
  compact?: boolean;
  onClick: () => void;
};

/** Golden header/sidebar trigger — borderless; matches app-tab-header.css hub-header-panel-btn. */
export const HUB_HEADER_PANEL_BTN_CLASS =
  "hub-header-panel-btn relative inline-flex h-[var(--hub-control-h)] shrink-0 items-center gap-1.5 rounded-lg px-2.5";

/** Golden header/sidebar trigger — Log · Settings · same chrome as tool-detail modals. */
export function HubHeaderPanelButton({
  icon: Icon,
  iconClassName = "text-[var(--muted)]",
  label,
  title,
  badge = 0,
  sidebarRow = false,
  compact = false,
  onClick,
}: HubHeaderPanelButtonProps) {
  const iconPx = useCompactIconSize(sidebarRow ? 15 : 14);
  const triggerClass = sidebarRow
    ? "relative flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-[var(--muted)] transition-colors hover:bg-white/5 hover:text-[var(--text)]"
    : HUB_HEADER_PANEL_BTN_CLASS;

  return (
    <button
      type="button"
      onClick={onClick}
      className={triggerClass}
      title={title ?? label}
      aria-label={title ?? label}
    >
      <Icon size={iconPx} className={`shrink-0 ${iconClassName}`} aria-hidden suppressHydrationWarning />
      {sidebarRow || !compact ? (
        <span className={sidebarRow ? "flex-1 text-left" : "hidden sm:inline"}>{label}</span>
      ) : null}
      {badge > 0 ? (
        <span
          className={
            sidebarRow
              ? "ml-auto shrink-0 rounded-full bg-indigo-500/30 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-indigo-200"
              : "absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white"
          }
          aria-hidden
        >
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
    </button>
  );
}
