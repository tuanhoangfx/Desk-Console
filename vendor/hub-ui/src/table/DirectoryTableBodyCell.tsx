import type { MouseEvent, ReactNode } from "react";

export type DirectoryTableBodyCellProps = {
  colClass: string;
  /** Optional typography helper e.g. hub-users-cell-num, hub-users-cell-muted */
  typographyClass?: string;
  children: ReactNode;
  onClick?: (e: MouseEvent<HTMLTableCellElement>) => void;
};

/** Golden directory body cell — td class must match colgroup colClass (P0004 Users parity). No native title tooltip. */
export function DirectoryTableBodyCell({
  colClass,
  typographyClass,
  children,
  onClick,
}: DirectoryTableBodyCellProps) {
  const className = [colClass, typographyClass].filter(Boolean).join(" ");
  return (
    <td className={className} onClick={onClick}>
      {children}
    </td>
  );
}
