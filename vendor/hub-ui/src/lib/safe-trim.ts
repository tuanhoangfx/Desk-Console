/** NULL / undefined / non-string → `""` then trim. Vault columns and filter values. */
export function safeTrim(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}
