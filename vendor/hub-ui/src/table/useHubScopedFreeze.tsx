import type { ReactNode } from "react";
import { useDirectoryFreezeCount, type DirectoryFreezePrefs } from "../prefs/directory-freeze-prefs";
import {
  useHubDirectoryStickyColumns,
  type HubDirectoryStickyColumn,
  type UseHubDirectoryStickyColumnsResult,
} from "./useHubDirectoryStickyColumns";
import type { StickyLeftMode } from "./directory-sticky-columns";

/** Wrap class that enables horizontal scroll for freeze-capable directory tables. */
export const HUB_DIRECTORY_FREEZE_SCROLL_WRAP_CLASS =
  "hub-scrollbar min-w-0 overflow-x-auto";

export type UseHubScopedFreezeOptions = {
  /** Freeze prefs for this table/scope (from `createDirectoryFreezePrefs` or scoped factory). */
  prefs: DirectoryFreezePrefs;
  /** Ordered visible columns — same array passed to the directory shell. */
  columns: readonly HubDirectoryStickyColumn[];
  /** Unique marker class on the `<table>` — scopes the generated sticky CSS. */
  scopeClass: string;
  /**
   * When false, freeze is forced off (no sticky CSS, scroll wrap hint empty). Use to gate
   * scopes that do not horizontal-scroll (e.g. quota view, services that fit). Default true.
   */
  enabled?: boolean;
  leftMode?: StickyLeftMode;
  includeSelect?: boolean;
  selectWidth?: string;
};

export type UseHubScopedFreezeResult = UseHubDirectoryStickyColumnsResult & {
  /** Effective freeze count (0 when disabled). */
  freezeCount: number;
  /**
   * Suggested `wrapClassName` for `HubDirectoryTableShell` when `enabled` — empty when
   * disabled so callers keep their existing clip/fit wrap.
   */
  scrollWrapClassName: string;
  /** Same as `scopeClass` — convenient for appending to `tableClassName` when enabled. */
  stickyScopeClass: string;
};

/**
 * Table-side freeze glue — one call replaces `useDirectoryFreezeCount` +
 * `useHubDirectoryStickyColumns`. Pair with `HubDirectoryFreezeColumnsSetting` in Display
 * prefs (pass the same `prefs`). Returns wrapper ref, sticky `<style>`, and the scroll wrap
 * class to apply when the table is freeze-capable.
 */
export function useHubScopedFreeze({
  prefs,
  columns,
  scopeClass,
  enabled = true,
  leftMode = "css",
  includeSelect,
  selectWidth,
}: UseHubScopedFreezeOptions): UseHubScopedFreezeResult {
  const freezeCountRaw = useDirectoryFreezeCount(prefs);
  const freezeCount = enabled ? freezeCountRaw : 0;
  const sticky = useHubDirectoryStickyColumns({
    columns,
    freezeCount,
    scopeClass,
    leftMode,
    includeSelect,
    selectWidth,
  });

  return {
    ...sticky,
    freezeCount,
    scrollWrapClassName: enabled ? HUB_DIRECTORY_FREEZE_SCROLL_WRAP_CLASS : "",
    stickyScopeClass: scopeClass,
  };
}

/** Convenience re-export so callers can render `{stickyStyle}` without an extra import. */
export type HubScopedFreezeStickyStyle = ReactNode;
