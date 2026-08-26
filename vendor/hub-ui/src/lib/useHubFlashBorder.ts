import { useCallback, useEffect, useRef, useState } from "react";

export const HUB_FLASH_BORDER_MS = 2000;

export const HUB_FLASH_BORDER_ROW_CLASS = "is-flash-border";

export const HUB_FLASH_BORDER_SURFACE_CLASS = "hub-flash-border-surface";

export const HUB_FLASH_BORDER_ACCENT_CLASS = "hub-flash-border-accent";

/** Brief post-edit border flash — directory rows, cards, panels (default 2s). */
export function useHubFlashBorder(durationMs = HUB_FLASH_BORDER_MS) {
  const [flashIds, setFlashIds] = useState<ReadonlySet<string>>(() => new Set());
  const timersRef = useRef<Map<string, number>>(new Map());

  const clearTimer = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const flash = useCallback(
    (ids: string | readonly string[]) => {
      const list = typeof ids === "string" ? [ids] : ids.filter(Boolean);
      if (!list.length) return;

      setFlashIds((prev) => {
        const next = new Set(prev);
        for (const id of list) next.add(id);
        return next;
      });

      for (const id of list) {
        clearTimer(id);
        const timer = window.setTimeout(() => {
          timersRef.current.delete(id);
          setFlashIds((prev) => {
            if (!prev.has(id)) return prev;
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }, durationMs);
        timersRef.current.set(id, timer);
      }
    },
    [clearTimer, durationMs],
  );

  useEffect(
    () => () => {
      for (const timer of timersRef.current.values()) window.clearTimeout(timer);
      timersRef.current.clear();
    },
    [],
  );

  return { flashIds, flash };
}
