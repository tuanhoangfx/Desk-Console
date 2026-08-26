/**
 * Shared collators.
 *
 * `String.prototype.localeCompare(other, undefined, { … })` re-parses that options object on
 * every call — roughly 100× slower than a reused `Intl.Collator`, and a comparator runs
 * n·log(n) times. The Browser pivot sorted its rows that way and froze the renderer for tens of
 * seconds on a 20k-row vault.
 *
 * Use these instead of passing options inline. Enforced by the `no-inline-locale-compare-options`
 * rule in verify-hub-perf-contract, which found the same trap in four tools at once.
 */

/** Numbers inside strings compare numerically: "0002" before "0010", "Profile 9" before "Profile 10". */
export const HUB_NUMERIC_COLLATOR = new Intl.Collator(undefined, { numeric: true });

/** Case- and accent-insensitive ordering for user-facing labels. */
export const HUB_LABEL_COLLATOR = new Intl.Collator(undefined, { sensitivity: "base" });

/** Both at once — labels that embed numbers (plan names, package codes). */
export const HUB_LABEL_NUMERIC_COLLATOR = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});
