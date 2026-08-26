import type { PrefItem } from "./types";

export function defaultsForPrefItems(allItems: PrefItem[], defaults?: Set<string> | readonly string[]) {
  if (defaults == null) return new Set(allItems.map((item) => item.key));
  return defaults instanceof Set ? defaults : new Set(defaults);
}

export function isHubPrefVisible(set: Set<string> | null, defaults: Set<string>, key: string) {
  return set === null ? defaults.has(key) : set.has(key);
}

export function countVisiblePrefs(items: PrefItem[], set: Set<string> | null, defaults: Set<string>) {
  return items.filter((item) => isHubPrefVisible(set, defaults, item.key)).length;
}

export function toggleHubPrefSet(
  cur: Set<string> | null,
  defaults: Set<string>,
  key: string,
): { next: Set<string>; allDefault: boolean } {
  let next: Set<string>;
  if (cur === null) {
    next = new Set(defaults);
    if (next.has(key)) next.delete(key);
    else next.add(key);
  } else {
    next = new Set(cur);
    if (next.has(key)) next.delete(key);
    else next.add(key);
  }
  const allDefault = next.size === defaults.size && [...next].every((k) => defaults.has(k));
  return { next, allDefault };
}
