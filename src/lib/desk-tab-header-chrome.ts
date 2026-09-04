/** Tab header pin/embedded — only stack-embed when a global FilterBar is mounted (P0020 SSOT). */
export function deskTabHeaderChromeProps(
  hasFilterBar: boolean,
  prefs: { headerPin: boolean; searchPin: boolean; stackChrome: boolean },
) {
  const stacked = hasFilterBar && prefs.stackChrome;
  return {
    embedded: stacked,
    pinSticky: stacked ? false : prefs.headerPin,
    dividerBelow: stacked ? false : !prefs.searchPin,
  } as const;
}
