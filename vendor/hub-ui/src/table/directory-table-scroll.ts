/** Golden directory table scroll wrap — pairs with `.hub-directory-table-scroll` in hub-split-scroll.css */
export const HUB_DIRECTORY_TABLE_SCROLL_CLASS = "min-w-0 hub-directory-table-scroll";

/** Standalone directory (P0004 Hub/Users, P0020 2FA/Cookie) — no inner scrollbar; page scrolls on `.hub-main`. */
export const HUB_DIRECTORY_TABLE_INLINE_WRAP_CLASS = "overflow-hidden min-w-0";

/**
 * HubSplitDirectoryPane flex fill — **same paint as P0004 inline** (`overflow-hidden min-w-0` only).
 * Do not add `hub-directory-table-scroll` on the wrap (scrollbar track causes thead color seam).
 */
export const HUB_DIRECTORY_TABLE_PANE_WRAP_CLASS = `${HUB_DIRECTORY_TABLE_INLINE_WRAP_CLASS} min-h-0 flex-1`;

/** @deprecated Use `HUB_DIRECTORY_TABLE_PANE_WRAP_CLASS` — scroll class caused gutter paint mismatch. */
export const HUB_DIRECTORY_TABLE_PANE_INLINE_SCROLL_CLASS = HUB_DIRECTORY_TABLE_PANE_WRAP_CLASS;

/** Split-pane flex fill — split head/body shell; scroll on .hub-directory-table-body-scroll only. */
export const HUB_DIRECTORY_TABLE_SCROLL_FLEX_CLASS =
  "min-h-0 min-w-0 flex-1 hub-directory-table-scroll hub-directory-table-scroll--flex-pane";

/** Split wrap inside HubSplitDirectoryPane — golden border/radius (Sheet grid, legacy split flex-pane). */
export const HUB_DIRECTORY_TABLE_PANE_CHROME_SPLIT_CLASS = "hub-directory-table-wrap--pane-chrome";

/** Directory action button — larger click target; icon size unchanged (Run/Stop/Cancel). */
export const HUB_DIRECTORY_ICON_CELL_HIT_EXPAND_CLASS = "hub-directory-icon-cell--hit-expand";
