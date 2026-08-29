import { useCallback, useEffect, useRef } from "react";
import { findDirectoryDeepLinkRow, readDirectoryDeepLinkId } from "../lib/directory-deep-link";

export { findDirectoryDeepLinkRow, readDirectoryDeepLinkId };

/**
 * Open directory Detail once when `?id=` matches a loaded row.
 * idOf / onOpen are ref-stabilized — inline fns must not re-open.
 */
export function useHubDirectoryDeepLink<T>(opts: {
  rows: readonly T[];
  idOf: (row: T) => string;
  onOpen: (row: T) => void;
  param?: string;
  enabled?: boolean;
}): void {
  const { rows, idOf, onOpen, param = "id", enabled = true } = opts;
  const idOfRef = useRef(idOf);
  const onOpenRef = useRef(onOpen);
  idOfRef.current = idOf;
  onOpenRef.current = onOpen;
  const openedRef = useRef<string | null>(null);
  const stableIdOf = useCallback((row: T) => idOfRef.current(row), []);

  useEffect(() => {
    if (!enabled) return;
    const id = readDirectoryDeepLinkId(undefined, param);
    if (!id || openedRef.current === id) return;
    const row = findDirectoryDeepLinkRow(rows, id, stableIdOf);
    if (!row) return;
    openedRef.current = id;
    onOpenRef.current(row);
  }, [enabled, param, rows, stableIdOf]);
}

/** Alias for product screens that already call useDirectoryDeepLink. */
export const useDirectoryDeepLink = useHubDirectoryDeepLink;
