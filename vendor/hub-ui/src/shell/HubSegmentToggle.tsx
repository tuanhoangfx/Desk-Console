import type { ReactNode } from "react";
import { compactIconSize } from "../ui-scale";
import "../styles/hub-segment-toggle.css";

/** Active chip fill — default indigo (ViewToggle). Per-option override for Code/Image etc. */
export type HubSegmentActiveTone = "indigo" | "sky" | "orange" | "emerald" | "amber" | "rose";

export type HubSegmentToggleOption<T extends string = string> = {
  value: T;
  label: string;
  icon?: ReactNode;
  /** Active background/text tone. Default `indigo`. */
  activeTone?: HubSegmentActiveTone;
};

export type HubSegmentToggleProps<T extends string = string> = {
  value: T;
  onChange: (value: T) => void;
  options: HubSegmentToggleOption<T>[];
  className?: string;
};

const ACTIVE_TONE_CLASS: Record<HubSegmentActiveTone, string> = {
  indigo: "bg-indigo-500/20 text-indigo-200",
  sky: "bg-sky-500/20 text-sky-200",
  orange: "bg-orange-500/20 text-orange-200",
  emerald: "bg-emerald-500/20 text-emerald-200",
  amber: "bg-amber-500/20 text-amber-200",
  rose: "bg-rose-500/20 text-rose-200",
};

export function hubSegmentActiveToneClass(tone: HubSegmentActiveTone = "indigo"): string {
  return ACTIVE_TONE_CLASS[tone] ?? ACTIVE_TONE_CLASS.indigo;
}

/** Icon size for segment toggle buttons — scales with hub UI zoom. */
export function hubSegmentIconSize(): number {
  return compactIconSize(14);
}

/** Generic 2+ option segment control — golden ViewToggle pattern (P0004 / P0020 Todo board|calendar). */
export function HubSegmentToggle<T extends string>({
  value,
  onChange,
  options,
  className = "",
}: HubSegmentToggleProps<T>) {
  return (
    <div
      className={`hub-segment-toggle inline-flex h-[var(--hub-control-h)] items-center rounded-lg border border-white/10 bg-[var(--panel)] p-0.5 ${className}`.trim()}
      role="group"
    >
      {options.map((opt) => {
        const active = value === opt.value;
        const activeClass = hubSegmentActiveToneClass(opt.activeTone ?? "indigo");
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            title={opt.label}
            aria-label={opt.label}
            aria-pressed={active}
            className={`flex h-full items-center gap-1.5 rounded-md px-2.5 text-xs transition-colors ${
              active ? activeClass : "text-[var(--muted)] hover:text-[var(--text)]"
            }`}
            data-active-tone={active ? (opt.activeTone ?? "indigo") : undefined}
          >
            {opt.icon}
            <span className="hub-segment-toggle__label">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
