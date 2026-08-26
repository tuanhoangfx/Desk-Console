import { GripVertical, Lock, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState, type DragEvent, type ReactNode } from "react";
import { ToggleRow } from "../display-prefs/primitives";
import { compactIconSize } from "../ui-scale";
import {
  mergeDirectoryTableColumnOrder,
  type DirectoryTableColumnItem,
  type DirectoryTableColumnPrefs,
} from "./directory-table-column-prefs";

export type DirectoryTableColumnsSettingsProps<K extends string> = {
  items: readonly DirectoryTableColumnItem<K>[];
  prefs: DirectoryTableColumnPrefs<K>;
  /** Optional block above column toggles (e.g. Users password mask). */
  header?: ReactNode;
  /** Show reset columns control below the list. */
  showReset?: boolean;
  /** Allow drag-and-drop reorder in the column list. Default true. */
  reorderable?: boolean;
};

function reorderKeys<K extends string>(keys: readonly K[], from: number, to: number): K[] {
  if (from === to || from < 0 || to < 0 || from >= keys.length || to >= keys.length) return [...keys];
  const next = [...keys];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function DirectoryTableColumnsSettings<K extends string>({
  items,
  prefs,
  header,
  showReset = false,
  reorderable = true,
}: DirectoryTableColumnsSettingsProps<K>) {
  const itemKeys = useMemo(() => items.map((col) => col.key), [items]);
  const [visible, setVisible] = useState<Set<K>>(() => prefs.read());
  const [order, setOrder] = useState<K[]>(() => mergeDirectoryTableColumnOrder(itemKeys, prefs.readOrder()));
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  useEffect(() => {
    const sync = () => {
      setVisible(prefs.read());
      setOrder(mergeDirectoryTableColumnOrder(itemKeys, prefs.readOrder()));
    };
    window.addEventListener(prefs.changeEvent, sync);
    return () => window.removeEventListener(prefs.changeEvent, sync);
  }, [itemKeys, prefs]);

  const orderedItems = useMemo(() => {
    const byKey = new Map(items.map((col) => [col.key, col]));
    return order.map((key) => byKey.get(key)).filter((col): col is DirectoryTableColumnItem<K> => Boolean(col));
  }, [items, order]);

  function toggle(key: K) {
    const item = items.find((c) => c.key === key);
    if (item?.required) return;
    const next = new Set(visible);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    prefs.write(next, order);
    setVisible(next);
  }

  function commitOrder(nextOrder: K[]) {
    const merged = mergeDirectoryTableColumnOrder(itemKeys, nextOrder);
    prefs.writeOrder(merged);
    setOrder(merged);
  }

  function onDragStart(index: number) {
    setDragIndex(index);
    setDropIndex(index);
  }

  function onDragOver(index: number, event: DragEvent) {
    event.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    setDropIndex(index);
  }

  function onDrop(index: number) {
    if (dragIndex === null) return;
    commitOrder(reorderKeys(order, dragIndex, index));
    setDragIndex(null);
    setDropIndex(null);
  }

  function onDragEnd() {
    setDragIndex(null);
    setDropIndex(null);
  }

  return (
    <div className={header ? "space-y-3" : undefined}>
      {header}
      <ul className="space-y-0.5">
        {orderedItems.map((col, index) => {
          const on = visible.has(col.key);
          const dragging = dragIndex === index;
          const dropTarget = dropIndex === index && dragIndex !== null && dragIndex !== index;
          return (
            <li
              key={col.key}
              className={[
                col.required ? "opacity-80" : undefined,
                dragging ? "opacity-50" : undefined,
                dropTarget ? "rounded-md ring-1 ring-indigo-400/40" : undefined,
              ]
                .filter(Boolean)
                .join(" ") || undefined}
              onDragOver={reorderable ? (event) => onDragOver(index, event) : undefined}
              onDrop={reorderable ? () => onDrop(index) : undefined}
            >
              <div className="flex items-center gap-1.5">
                {reorderable ? (
                  <button
                    type="button"
                    draggable
                    aria-label={`Reorder ${col.label}`}
                    className="shrink-0 cursor-grab touch-none rounded p-0.5 text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)] active:cursor-grabbing"
                    onDragStart={() => onDragStart(index)}
                    onDragEnd={onDragEnd}
                  >
                    <GripVertical size={compactIconSize(12)} aria-hidden />
                  </button>
                ) : null}
                <div className={col.required ? "pointer-events-none flex-1" : "flex-1"}>
                  <ToggleRow
                    label={col.label}
                    icon={col.icon}
                    iconClassName={col.iconClassName}
                    emoji={col.emoji}
                    brandIcon={col.brandIcon}
                    imageSrc={col.imageSrc}
                    labelHint={col.labelHint}
                    on={on}
                    onChange={() => toggle(col.key)}
                  />
                </div>
                {col.required ? (
                  <span
                    className="shrink-0 pr-2 text-[var(--muted)]"
                    title="Required"
                    aria-label="Required"
                  >
                    <Lock size={compactIconSize(12)} aria-hidden />
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      {showReset ? (
        <button
          type="button"
          onClick={() => prefs.reset()}
          className="mt-1 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)]"
        >
          <RotateCcw size={compactIconSize(10)} aria-hidden />
          Reset columns
        </button>
      ) : null}
    </div>
  );
}
