import { useEffect, useState } from "react";

/** Debounce a value — use for expensive derived state (e.g. faceted filter counts). */
export function useDebouncedValue<T>(value: T, delayMs = 100): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}
