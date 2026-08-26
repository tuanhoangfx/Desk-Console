import type { ReactNode } from "react";
import { HubDirectoryToolbarSelection, type HubDirectoryToolbarSelectionProps } from "./HubDirectoryToolbarSelection";

/** Golden modal directory filter row — selection chip beside search (Users table parity). */
export function hubModalDirectoryFilterSelection(
  props: HubDirectoryToolbarSelectionProps | null | undefined,
): { searchTrailing?: ReactNode } {
  if (!props || props.visibleCount <= 0) return {};
  return {
    searchTrailing: <HubDirectoryToolbarSelection {...props} />,
  };
}
