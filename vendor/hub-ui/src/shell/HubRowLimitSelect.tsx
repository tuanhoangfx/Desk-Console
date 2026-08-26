import { useEffect, useRef, useState } from "react";
import { ChevronDown, Rows3 } from "lucide-react";
import { LIMIT_OPTIONS } from "../display-prefs/constants";
import { compactIconSize } from "../ui-scale";
import { getHubUrlPrefsDefaults, patchHubListPrefs } from "../lib/hub-url-prefs";

/**
 * @deprecated Directory tables use `HubTablePageSizeSelect` (`tpage`). Keep for P0020 vault row cap only.
 */
export function HubRowLimitSelect({ value }: { value: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { defaultLimit } = getHubUrlPrefsDefaults();
  const label = `${value} rows`;

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function pick(next: number) {
    patchHubListPrefs({ limit: next === defaultLimit ? null : String(next) });
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex h-[var(--hub-control-h)] items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors ${
          value !== defaultLimit
            ? "border-violet-500/35 bg-violet-500/10 text-violet-200"
            : "border-white/10 bg-[var(--panel-2)] text-[var(--text)] hover:bg-white/5"
        }`}
        title="Rows per page"
      >
        <Rows3 size={compactIconSize(13)} className="shrink-0 opacity-80" />
        <span>{label}</span>
        <ChevronDown size={compactIconSize(12)} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="anim-pop absolute right-0 top-full z-30 mt-1 min-w-[7.5rem] rounded-xl border border-white/10 bg-[var(--panel)] p-1 shadow-xl shadow-black/40">
          {LIMIT_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => pick(n)}
              className={`flex w-full rounded-md px-2.5 py-1.5 text-left text-xs tabular-nums transition-colors hover:bg-white/5 ${
                value === n ? "bg-indigo-500/15 font-semibold text-indigo-200" : "text-[var(--text)]"
              }`}
            >
              {n} rows
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
