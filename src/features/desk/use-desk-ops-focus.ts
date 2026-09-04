import { useEffect, useState } from "react";

/** Keep a focused ops row for the Log/Terminal rail (P0003 profile parity). */
export function useDeskOpsFocus(rows: { id: string }[], tabActive: boolean) {
  const [focusedId, setFocusedId] = useState<string | null>(null);

  useEffect(() => {
    if (!tabActive) return;
    if (focusedId && rows.some((row) => row.id === focusedId)) return;
    setFocusedId(rows[0]?.id ?? null);
  }, [focusedId, rows, tabActive]);

  return { focusedId, setFocusedId };
}
