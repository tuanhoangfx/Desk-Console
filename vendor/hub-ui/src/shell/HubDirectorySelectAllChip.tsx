import { SquareCheckBig, SquareX } from "lucide-react";
import { HubBulkActionButton } from "./HubBulkActionButton";

export type HubDirectorySelectAllChipProps = {
  visibleCount: number;
  selectedCount: number;
  allVisibleSelected: boolean;
  onToggleSelectAll: () => void;
  /** Plural noun — screens, tools, users */
  noun?: string;
  /** When true, chip title refers to filtered set (modal tables), not paginated page. */
  filteredScope?: boolean;
  /**
   * `select-unselect` — **default SSOT** — fixed-width **Select** / **Unselect** (table + card row2).
   * `select-all` — legacy card “Select all (n)” / “Clear selection”.
   */
  labelMode?: "select-all" | "select-unselect";
};

/** Fixed label host — reserves the wider of the two labels so the button never jumps. */
function StableBulkLabel({ text, reserveA, reserveB }: { text: string; reserveA: string; reserveB: string }) {
  const reserve = reserveA.length >= reserveB.length ? reserveA : reserveB;
  return (
    <span className="relative inline-grid place-items-center justify-items-center">
      <span className="invisible col-start-1 row-start-1 whitespace-nowrap" aria-hidden>
        {reserve}
      </span>
      <span className="col-start-1 row-start-1 whitespace-nowrap">{text}</span>
    </span>
  );
}

/**
 * Directory select-all CTA — filter row 2.
 * Place immediately before `HubDirectoryBulkMoreMenu` (last two actions at the rail end).
 */
export function HubDirectorySelectAllChip({
  visibleCount,
  selectedCount,
  allVisibleSelected,
  onToggleSelectAll,
  noun = "items",
  filteredScope = false,
  labelMode = "select-unselect",
}: HubDirectorySelectAllChipProps) {
  if (visibleCount === 0 && labelMode === "select-all") return null;

  const selectUnselect = labelMode === "select-unselect";
  const idleLabel = selectUnselect ? "Select" : `Select all (${visibleCount})`;
  const activeLabel = selectUnselect ? "Unselect" : "Clear selection";
  const label = allVisibleSelected ? activeLabel : idleLabel;
  const title = allVisibleSelected
    ? selectUnselect
      ? `Unselect all ${visibleCount} visible ${noun}`
      : `Clear ${selectedCount} selected ${noun}`
    : filteredScope
      ? `Select all ${visibleCount} filtered ${noun}`
      : selectUnselect
        ? `Select all ${visibleCount} visible ${noun}`
        : `Select all ${visibleCount} visible ${noun} on this page`;
  const active = allVisibleSelected || selectedCount > 0;

  return (
    <HubBulkActionButton
      icon={
        allVisibleSelected ? (
          <SquareX size={14} aria-hidden />
        ) : (
          <SquareCheckBig size={14} aria-hidden />
        )
      }
      label={label}
      labelNode={<StableBulkLabel text={label} reserveA={idleLabel} reserveB={activeLabel} />}
      title={title}
      tone={active ? "indigo" : "neutral"}
      selectedCount={selectUnselect ? undefined : selectedCount > 0 ? selectedCount : undefined}
      disabled={visibleCount === 0}
      onClick={onToggleSelectAll}
    />
  );
}
