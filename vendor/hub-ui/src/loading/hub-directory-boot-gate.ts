import { useRef } from "react";

/**
 * DirectoryBootGate SSOT — never portal the boot orb over an already-painted directory.
 * Tab hide 1 / 3 / 10 min is the same rule: if this scope already painted rows, stay ready.
 * Cross-scope (Mail → Services) resets sticky so a cold vault can still gate.
 */
export function hubDirectoryHasPaintedRows(rowCounts: readonly number[]): boolean {
  return rowCounts.some((n) => n > 0);
}

export function resolveHubDirectoryBootGateReady(input: {
  vaultBootReady: boolean;
  paintedRowCounts: readonly number[];
  stickyPainted: boolean;
}): boolean {
  return (
    input.vaultBootReady ||
    input.stickyPainted ||
    hubDirectoryHasPaintedRows(input.paintedRowCounts)
  );
}

/** Sticky per `scopeKey` — once a vault painted, returning to the browser tab must not overlay. */
export function useHubDirectoryBootGateReady(
  scopeKey: string,
  vaultBootReady: boolean,
  paintedRowCounts: readonly number[],
): boolean {
  const ref = useRef({
    scope: scopeKey,
    painted: hubDirectoryHasPaintedRows(paintedRowCounts),
  });
  if (ref.current.scope !== scopeKey) {
    ref.current = { scope: scopeKey, painted: hubDirectoryHasPaintedRows(paintedRowCounts) };
  } else if (hubDirectoryHasPaintedRows(paintedRowCounts)) {
    ref.current.painted = true;
  }
  return resolveHubDirectoryBootGateReady({
    vaultBootReady,
    paintedRowCounts,
    stickyPainted: ref.current.painted,
  });
}
