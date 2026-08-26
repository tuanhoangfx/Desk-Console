import type { LucideIcon } from "lucide-react";

import { directorySortMatchesPrimaryDefault } from "../lib/directory-sort-contract";

import {

  HubDirectoryColumnHint,

  type HubDirectoryColumnHintContent,

  type HubDirectoryColumnHintGlyph,

} from "../table/HubDirectoryColumnHint";

import { compactIconSize } from "../ui-scale";
import { hubTableLabelTextForGlyph } from "../content/hub-table-header-label";

export type DirectoryDefaultSortRow = {
  id: string;
  label: string;
  directionHint: string;
  /** Rich label hint — hover label text (same SSOT as directory column headers). */
  labelHint?: HubDirectoryColumnHintContent;
  icon?: LucideIcon;
  iconClassName?: string;
  emoji?: string;
};



export type DirectoryDefaultSortHintProps = {

  rows: readonly DirectoryDefaultSortRow[];

  /** Shown when table sort differs from the documented primary default. */

  activeSort?: DirectoryDefaultSortRow | null;

  /** When set with `primaryDefault`, active block is derived automatically. */

  currentSort?: { sortKey: string; sortDir: "asc" | "desc" } | null;

  primaryDefault?: { sortKey: string; sortDir: "asc" | "desc" } | null;

  resolveActiveSortRow?: (sort: { sortKey: string; sortDir: "asc" | "desc" }) => DirectoryDefaultSortRow | null;

  footnote?: string;

};



function resolveRowTitleGlyph(row: DirectoryDefaultSortRow): HubDirectoryColumnHintGlyph | undefined {

  if (row.emoji) return { emoji: row.emoji };

  if (row.icon) return { icon: row.icon, toneClass: row.iconClassName };

  return undefined;

}



function DirectorySortRow({

  row,

  index,

  emphasize = false,

}: {

  row: DirectoryDefaultSortRow;

  index?: number;

  emphasize?: boolean;

}) {

  const Icon = row.icon;
  const labelClass = emphasize ? "text-[var(--text)]" : "text-[var(--muted)]";
  const visibleLabel =
    row.emoji || row.icon ? hubTableLabelTextForGlyph(row.label) : row.label;
  const labelNode = <span className={labelClass}>{visibleLabel}</span>;



  return (

    <li className="flex min-w-0 items-center gap-1.5 text-xs leading-relaxed">

      {index != null ? (

        <span className="w-3.5 shrink-0 tabular-nums text-[var(--muted)]" aria-hidden>

          {index}.

        </span>

      ) : null}

      {Icon ? (

        <Icon size={compactIconSize(11)} className={`shrink-0 ${row.iconClassName ?? "text-indigo-300/90"}`} aria-hidden />

      ) : row.emoji ? (

        <span className="hub-users-th-emoji shrink-0 text-xs leading-none" aria-hidden>

          {row.emoji}

        </span>

      ) : null}

      <span className="min-w-0 truncate">

        <span className="inline-flex min-w-0 items-center gap-1 align-middle">

          {row.labelHint ? (

            <HubDirectoryColumnHint content={row.labelHint} titleGlyph={resolveRowTitleGlyph(row)}>

              {labelNode}

            </HubDirectoryColumnHint>

          ) : (

            labelNode

          )}

        </span>

        <span className="text-[var(--muted)]"> — {row.directionHint}</span>

      </span>

    </li>

  );

}



/** Display panel — numbered default sort rules with column icon + label (golden ToggleRow styling). */

export function DirectoryDefaultSortHint({

  rows,

  activeSort: activeSortProp,

  currentSort,

  primaryDefault,

  resolveActiveSortRow,

  footnote,

}: DirectoryDefaultSortHintProps) {

  const overridden =

    currentSort != null &&

    primaryDefault != null &&

    !directorySortMatchesPrimaryDefault(currentSort, primaryDefault);

  const activeSort =

    activeSortProp ??

    (overridden && currentSort && resolveActiveSortRow

      ? resolveActiveSortRow(currentSort)

      : null);



  return (

    <div className="space-y-2">

      {activeSort ? (

        <div>

          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">Active sort</p>

          <ul className="list-none">

            <DirectorySortRow row={activeSort} emphasize />

          </ul>

        </div>

      ) : null}

      {rows.length > 0 ? (

        <div>

          {activeSort ? (

            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">Default sort</p>

          ) : null}

          <ol className="list-none space-y-0.5">

            {rows.map((row, index) => (

              <DirectorySortRow key={row.id} row={row} index={index + 1} />

            ))}

          </ol>

        </div>

      ) : null}

      {footnote ? <p className="text-xs leading-relaxed text-[var(--muted)]">{footnote}</p> : null}

    </div>

  );

}

