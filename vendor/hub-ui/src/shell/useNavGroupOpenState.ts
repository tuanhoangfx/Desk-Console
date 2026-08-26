import { useCallback, useEffect, useState } from "react";
import { navGroupSubnavOpenKey } from "./nav-sidebar-structure";

function readSubnavOpen(key: string, defaultOpen = true) {
  if (typeof window === "undefined") return defaultOpen;
  return window.sessionStorage.getItem(key) !== "0";
}

/** Session-persisted expand/collapse map for sidebar nav groups. */
export function useNavGroupOpenState(prefix: string, ids: readonly string[]) {
  const [groupOpen, setGroupOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(ids.map((id) => [id, readSubnavOpen(navGroupSubnavOpenKey(prefix, id))])),
  );

  useEffect(() => {
    for (const id of ids) {
      window.sessionStorage.setItem(navGroupSubnavOpenKey(prefix, id), groupOpen[id] ? "1" : "0");
    }
  }, [groupOpen, ids]);

  const setGroupSubnavOpen = useCallback((id: string, open: boolean | ((v: boolean) => boolean)) => {
    setGroupOpen((prev) => ({
      ...prev,
      [id]: typeof open === "function" ? open(prev[id] ?? true) : open,
    }));
  }, []);

  return { groupOpen, setGroupSubnavOpen };
}
