import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import {
  buildDirectoryStickyColumnsCss,
  directoryStickyLeadExceedsViewport,
  measureDirectoryStickyLeadWidthPx,
  DIRECTORY_STICKY_LEFT_VAR_PREFIX,
  DIRECTORY_STICKY_VIEWPORT_WARN_PX,
  type StickyLeftMode,
} from "./directory-sticky-columns";
import { HUB_DIRECTORY_SELECT_COL_WIDTH } from "./hub-directory-table-meta";

/** useLayoutEffect on the client, useEffect during SSR (avoids the hydration warning). */
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const warnedScopes = new Set<string>();

function warnIfFreezeBlockTooWide(
  scopeClass: string,
  freezeCount: number,
  entries: readonly { colClass: string; width: string }[],
): void {
  // Dev-only advisory: a frozen block wider than the viewport leaves no room to scroll the rest.
  const isDev =
    typeof import.meta !== "undefined" && (import.meta as { env?: { DEV?: boolean } }).env?.DEV;
  if (!isDev) return;
  if (!directoryStickyLeadExceedsViewport(entries)) return;
  const key = `${scopeClass}:${freezeCount}`;
  if (warnedScopes.has(key)) return;
  warnedScopes.add(key);
  const px = Math.round(measureDirectoryStickyLeadWidthPx(entries));
  console.warn(
    `[hub-directory-sticky] "${scopeClass}" freezes ${freezeCount} columns (~${px}px) which exceeds ` +
      `${DIRECTORY_STICKY_VIEWPORT_WARN_PX}px — the frozen block may eat a small viewport. Lower the default freeze count.`,
  );
}

export type HubDirectoryStickyColumn = { colClass: string; width: string };

export type UseHubDirectoryStickyColumnsOptions = {
  /** Ordered, visible columns (leftmost first) — usually the same array passed to the shell. */
  columns: readonly HubDirectoryStickyColumn[];
  /** Number of leading data columns to freeze. 0 = feature off (no sticky, no UI change). */
  freezeCount: number;
  /** Unique marker class added to the table — scopes the generated CSS (one per screen). */
  scopeClass: string;
  /** Table renders a select checkbox column (frozen first). Default true. */
  includeSelect?: boolean;
  /** Select column width. Default HUB_DIRECTORY_SELECT_COL_WIDTH (36px). */
  selectWidth?: string;
  /**
   * How `left` offsets are resolved. Default "css" (columns have fixed px/rem widths — P0005).
   * Use "measured" for tables whose lead columns are fluid `%` or zoom-dependent (P0016/P0020):
   * offsets are read from the real rendered widths at runtime, so the `width` field is ignored.
   */
  leftMode?: StickyLeftMode;
};

export type UseHubDirectoryStickyColumnsResult = {
  /** Attach to a wrapper `<div>` around the directory table shell. */
  rootRef: React.RefObject<HTMLDivElement | null>;
  /** Render inside the wrapper: `{stickyStyle}`. Null when freeze is off. */
  stickyStyle: ReactNode;
  /** Whether any column is frozen (freezeCount > 0 and columns present). */
  active: boolean;
};

/**
 * Freeze the first `freezeCount` leading columns (plus select) during horizontal scroll —
 * shared SSOT for every directory table. Returns a wrapper ref + a `<style>` node to render.
 * The right-edge shadow is toggled only while scrolled (no resting UI change).
 */
export function useHubDirectoryStickyColumns({
  columns,
  freezeCount,
  scopeClass,
  includeSelect = true,
  selectWidth = HUB_DIRECTORY_SELECT_COL_WIDTH,
  leftMode = "css",
}: UseHubDirectoryStickyColumnsOptions): UseHubDirectoryStickyColumnsResult {
  const rootRef = useRef<HTMLDivElement>(null);

  /** Frozen colClasses in left-to-right order (select first) — drives measured offsets. */
  const frozenColClasses = useMemo(() => {
    const n = Math.max(0, Math.floor(freezeCount));
    if (n <= 0 || columns.length === 0) return [] as string[];
    const lead = columns.slice(0, n).map((col) => col.colClass);
    return includeSelect ? ["hub-users-col--select", ...lead] : lead;
  }, [columns, freezeCount, includeSelect]);

  const css = useMemo(() => {
    const n = Math.max(0, Math.floor(freezeCount));
    if (n <= 0 || columns.length === 0) return "";
    const lead = columns.slice(0, n).map((col) => ({ colClass: col.colClass, width: col.width }));
    const entries = includeSelect
      ? [{ colClass: "hub-users-col--select", width: selectWidth }, ...lead]
      : lead;
    // Static width guard only applies to fixed (css) widths; measured mode has no static width.
    if (leftMode === "css") warnIfFreezeBlockTooWide(scopeClass, n, entries);
    return buildDirectoryStickyColumnsCss({ scopeSelector: `.${scopeClass}`, entries, leftMode });
  }, [columns, freezeCount, scopeClass, includeSelect, selectWidth, leftMode]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !css) return;
    const wrap = root.querySelector<HTMLElement>(".hub-users-table-wrap");
    const table = root.querySelector<HTMLElement>(`table.${scopeClass}`);
    if (!wrap || !table) return;
    const sync = () => {
      table.setAttribute("data-sticky-scrolled", wrap.scrollLeft > 0 ? "1" : "0");
    };
    sync();
    wrap.addEventListener("scroll", sync, { passive: true });
    return () => wrap.removeEventListener("scroll", sync);
  }, [css, scopeClass]);

  // Measured mode: set `--hub-sticky-left-{i}` from real column widths, re-measuring on any
  // layout change (responsive reflow, zoom, column resize/reorder). Runs before paint to avoid
  // a first-frame flash where every frozen column would stack at left:0.
  useIsomorphicLayoutEffect(() => {
    if (leftMode !== "measured" || !css) return;
    const root = rootRef.current;
    if (!root) return;
    const table = root.querySelector<HTMLElement>(`table.${scopeClass}`);
    if (!table) return;

    const measure = () => {
      let acc = 0;
      frozenColClasses.forEach((cc, i) => {
        table.style.setProperty(`${DIRECTORY_STICKY_LEFT_VAR_PREFIX}${i}`, `${acc}px`);
        const th = table.querySelector<HTMLElement>(`thead th.${cc}`);
        acc += th ? th.getBoundingClientRect().width : 0;
      });
    };
    measure();

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(table);
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
      frozenColClasses.forEach((_, i) =>
        table.style.removeProperty(`${DIRECTORY_STICKY_LEFT_VAR_PREFIX}${i}`),
      );
    };
  }, [css, scopeClass, leftMode, frozenColClasses]);

  return {
    rootRef,
    stickyStyle: css ? <style>{css}</style> : null,
    active: css.length > 0,
  };
}
