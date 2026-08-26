/**
 * Zalo often uses the same mobile number as Phone.
 * When Zalo is empty, reuse Phone for display / open / persist.
 */
export function hubZaloValueFromPhone(zalo: string | null | undefined, phone: string | null | undefined): string {
  const z = String(zalo ?? "").trim();
  if (z) return z;
  return String(phone ?? "").trim();
}
