import type { ReactNode } from "react";
import { compactIconSize } from "../ui-scale";

export type HubFilterRowTone = "cyan" | "emerald" | "indigo" | "rose" | "violet" | "amber";

const TONE_CLASS: Record<HubFilterRowTone, string> = {
  cyan: "border-cyan-400/30 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/16",
  emerald: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/16",
  indigo: "border-indigo-400/30 bg-indigo-400/12 text-indigo-100 hover:bg-indigo-400/18",
  rose: "border-rose-400/30 bg-rose-400/10 text-rose-100 hover:bg-rose-400/16",
  violet: "border-violet-400/30 bg-violet-400/10 text-violet-100 hover:bg-violet-400/16",
  amber: "border-amber-400/30 bg-amber-400/10 text-amber-100 hover:bg-amber-400/16",
};

export type HubFilterRowButtonProps = {
  icon: ReactNode;
  label: string;
  tone?: HubFilterRowTone;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

/** Filter row 2 trailing CTA — golden Notes "New" · Todo "New task" pattern. */
export function HubFilterRowButton({
  icon,
  label,
  tone = "indigo",
  active = false,
  disabled = false,
  onClick,
}: HubFilterRowButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex h-[var(--hub-control-h)] items-center gap-1 rounded-lg border px-2.5 text-[10px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${TONE_CLASS[tone]} ${
        active ? "ring-1 ring-current/30" : ""
      }`}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      <span className="grid shrink-0 place-items-center [&_svg]:size-[var(--hub-compact-icon-12,12px)]">{icon}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
