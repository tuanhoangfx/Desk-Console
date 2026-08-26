import type { ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export type HubDriftBannerAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  spinning?: boolean;
};

export type HubDriftBannerProps = {
  children: ReactNode;
  action?: HubDriftBannerAction;
};

/** Compact inline banner for cloud/local drift or stale bundle warnings. */
export function HubDriftBanner({ children, action }: HubDriftBannerProps) {
  return (
    <div className="mb-1 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/8 px-3 py-1.5 text-xs text-amber-200/90">
      <AlertTriangle size={13} className="shrink-0 text-amber-400/80" aria-hidden />
      <span className="min-w-0 flex-1">{children}</span>
      {action ? (
        <button
          type="button"
          disabled={action.disabled}
          onClick={action.onClick}
          className="ml-auto inline-flex shrink-0 items-center gap-1 rounded border border-amber-500/30 px-1.5 py-0.5 text-[10px] text-amber-200 hover:bg-amber-500/15 disabled:opacity-50"
        >
          <RefreshCw size={10} className={action.spinning ? "animate-spin" : ""} aria-hidden />
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
