import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

export type HubSortDir = "asc" | "desc";

/** Sort arrow in hub-users-table column headers — use inside `.hub-users-th-label`. */
export function HubSortIndicator({ active, dir }: { active: boolean; dir: HubSortDir }) {
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return <Icon size={13} className={`hub-users-sort${active ? " is-active" : ""}`} aria-hidden />;
}
