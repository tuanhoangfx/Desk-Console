import { Bell } from "lucide-react";
import { compactIconSize } from "../ui-scale";

export type HubNotifyButtonProps = {
  unreadCount?: number;
  onClick: () => void;
  title?: string;
  disabled?: boolean;
};

/** Golden header Notify trigger — bell + optional unread badge (P0020 Todo, inbox tabs). */
export function HubNotifyButton({
  unreadCount = 0,
  onClick,
  title = "Notifications",
  disabled = false,
}: HubNotifyButtonProps) {
  const badge = unreadCount > 0 ? (unreadCount > 9 ? "9+" : unreadCount) : null;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="hub-header-panel-btn relative inline-flex h-[var(--hub-control-h)] shrink-0 items-center gap-1.5 rounded-lg px-2.5 disabled:cursor-not-allowed disabled:opacity-50"
      title={title}
      aria-label={badge ? `${title} (${unreadCount} unread)` : title}
    >
      <Bell size={compactIconSize(14)} className="shrink-0 text-amber-300" aria-hidden />
      <span className="hidden sm:inline">Notify</span>
      {badge ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
          {badge}
        </span>
      ) : null}
    </button>
  );
}
