import { useEffect, useRef, useState } from "react";
import { ChevronDown, Rows3 } from "lucide-react";
import { TABLE_PAGE_SIZE_OPTIONS } from "../display-prefs/constants";
import { compactIconSize } from "../ui-scale";
import {
  HUB_TABLE_PAGE_SIZE_DEFAULT,
  patchHubTablePageSizeValue,
  useHubTablePageSize,
} from "../table/hub-table-page-size";
import { patchHubListPrefs } from "../lib/hub-url-prefs";
import { HUB_DIRECTORY_TOOLBAR_TYPO_CLASS } from "./hub-typography";

/** Directory table/card pager — URL `tpage` (25 / 50 / 100). */
export function HubTablePageSizeSelect({
  value,
  onChange,
}: {
  value?: number;
  onChange?: (size: number) => void;
}) {
  const pageSize = useHubTablePageSize(value);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const label = `${pageSize} rows`;

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function pick(next: number) {
    patchHubListPrefs({ tpage: patchHubTablePageSizeValue(next) });
    onChange?.(next);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex h-[var(--hub-control-h)] items-center gap-1.5 rounded-lg border px-3 ${HUB_DIRECTORY_TOOLBAR_TYPO_CLASS} transition-colors ${
          pageSize !== HUB_TABLE_PAGE_SIZE_DEFAULT
            ? "border-violet-500/35 bg-violet-500/10 text-violet-200"
            : "border-white/10 bg-[var(--panel-2)] text-[var(--text)] hover:bg-white/5"
        }`}
        title="Rows per page"
      >
        <Rows3 size={compactIconSize(13)} className="shrink-0 opacity-80" />
        <span className="hub-filter-trigger__label">{label}</span>
        <ChevronDown size={compactIconSize(12)} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="anim-pop absolute right-0 top-full z-30 mt-1 min-w-[7.5rem] rounded-xl border border-white/10 bg-[var(--panel)] p-1 shadow-xl shadow-black/40">
          {TABLE_PAGE_SIZE_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => pick(n)}
              className={`flex w-full rounded-md px-2.5 py-1.5 text-left text-xs tabular-nums transition-colors hover:bg-white/5 ${
                pageSize === n ? "bg-indigo-500/15 font-semibold text-indigo-200" : "text-[var(--text)]"
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
