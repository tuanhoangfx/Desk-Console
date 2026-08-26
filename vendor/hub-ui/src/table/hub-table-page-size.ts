import { useEffect, useState } from "react";
import { TABLE_PAGE_SIZE_OPTIONS } from "../display-prefs/constants";

export { TABLE_PAGE_SIZE_OPTIONS };

export const HUB_TABLE_PAGE_SIZE_DEFAULT = TABLE_PAGE_SIZE_OPTIONS[0];

export function readHubTablePageSize(): number {
  if (typeof window === "undefined") return HUB_TABLE_PAGE_SIZE_DEFAULT;
  const n = Number(new URLSearchParams(window.location.search).get("tpage"));
  return (TABLE_PAGE_SIZE_OPTIONS as readonly number[]).includes(n) ? n : HUB_TABLE_PAGE_SIZE_DEFAULT;
}

export function patchHubTablePageSizeValue(size: number): string | null {
  return size === HUB_TABLE_PAGE_SIZE_DEFAULT ? null : String(size);
}

/** Re-read `tpage` when URL prefs change (Settings panel, back/forward). */
export function useHubTablePageSize(override?: number): number {
  const [size, setSize] = useState(() => override ?? readHubTablePageSize());
  useEffect(() => {
    if (override !== undefined) {
      setSize(override);
      return;
    }
    const sync = () => setSize(readHubTablePageSize());
    window.addEventListener("popstate", sync);
    window.addEventListener("hub-list-prefs-change", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("hub-list-prefs-change", sync);
    };
  }, [override]);
  return override ?? size;
}
