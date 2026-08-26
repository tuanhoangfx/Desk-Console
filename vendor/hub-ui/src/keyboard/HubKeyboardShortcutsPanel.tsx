import { Eraser, Keyboard, Plus, Search, XCircle } from "lucide-react";
import type { HubShortcutId } from "./hub-keyboard-shortcuts";
import { HUB_SHORTCUT_LEGEND } from "./hub-keyboard-shortcuts";
import { compactIconSize } from "../ui-scale";

/** Settings tab legend — excludes **S** (opens panel) and **E** (context-only). */
const SETTINGS_TAB_IDS: HubShortcutId[] = ["search", "clear", "new", "dismiss"];

const SHORTCUT_ICONS: Record<HubShortcutId, typeof Search> = {
  search: Search,
  clear: Eraser,
  new: Plus,
  edit: Keyboard,
  settings: Keyboard,
  dismiss: XCircle,
};

const SHORTCUT_TONES: Record<HubShortcutId, string> = {
  search: "text-sky-300",
  clear: "text-amber-300",
  new: "text-emerald-300",
  edit: "text-indigo-300",
  settings: "text-amber-300",
  dismiss: "text-rose-300",
};

/** Full shortcut list for Settings → Shortcuts tab. */
export function HubKeyboardShortcutsPanel({ className = "" }: { className?: string }) {
  const rows = HUB_SHORTCUT_LEGEND.filter((s) => SETTINGS_TAB_IDS.includes(s.id));

  return (
    <div className={className} aria-label="Keyboard shortcuts">
      <p className="mb-3 text-xs leading-snug text-[var(--muted)]">
        Hub standard keys for the active tab. N applies when the screen supports add/create.
      </p>
      <div className="space-y-1">
        {rows.map((s) => {
          const Icon = SHORTCUT_ICONS[s.id];
          const tone = SHORTCUT_TONES[s.id];
          return (
            <div
              key={s.id}
              className="flex items-center gap-2.5 rounded-lg border border-white/[.04] bg-white/[.02] px-2.5 py-2"
            >
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-md border border-white/10 bg-white/[.03] ${tone}`}
                aria-hidden
              >
                <Icon size={compactIconSize(13)} />
              </span>
              <span className="min-w-0 flex-1 text-xs text-[var(--text)]">{s.label}</span>
              <kbd className="shrink-0 rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-indigo-200/90">
                {s.keys}
              </kbd>
            </div>
          );
        })}
      </div>
    </div>
  );
}
