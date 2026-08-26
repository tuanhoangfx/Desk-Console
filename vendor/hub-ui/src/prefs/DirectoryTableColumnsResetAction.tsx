import { RotateCcw } from "lucide-react";
import type { DirectoryTableColumnPrefs } from "./directory-table-column-prefs";

export function DirectoryTableColumnsResetAction<K extends string>({
  prefs,
}: {
  prefs: DirectoryTableColumnPrefs<K>;
}) {
  return (
    <button
      type="button"
      onClick={() => prefs.reset()}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)]"
    >
      <RotateCcw size={10} aria-hidden />
      Reset columns
    </button>
  );
}
