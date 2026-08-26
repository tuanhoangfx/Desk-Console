import { HUB_SHORTCUT_LEGEND } from "./hub-keyboard-shortcuts";

/** Compact legend for filter toolbars (Agent tab, Hub lists). */
export function HubKeyboardHints({ className = "" }: { className?: string }) {
  return (
    <div
      className={`inline-flex h-[var(--hub-control-h)] shrink-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 text-[10px] text-[var(--muted)] ${className}`}
      aria-label="Keyboard shortcuts"
    >
      {HUB_SHORTCUT_LEGEND.map((s) => (
        <span key={s.id} className="inline-flex items-center gap-1 whitespace-nowrap">
          <kbd className="rounded border border-white/15 bg-white/5 px-1 py-0.5 font-mono text-[9px] text-indigo-200/90">
            {s.keys}
          </kbd>
          <span>{s.label}</span>
        </span>
      ))}
    </div>
  );
}
