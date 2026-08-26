export function buildSharedDirectoryWidthMap<K extends string, V>(
  keys: readonly K[],
  value: V,
): Record<K, V> {
  return Object.fromEntries(keys.map((key) => [key, value])) as Record<K, V>;
}
