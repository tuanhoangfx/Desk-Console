/**
 * Normalize a display phone into a `tel:` href for one-tap call.
 * Keeps a leading `+` when present; strips other non-digits.
 */
export function hubPhoneDigits(value: string): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const hasPlus = raw.startsWith("+");
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return hasPlus ? `+${digits}` : digits;
}

/** `tel:+8490…` when the value looks dialable; otherwise null. */
export function hubPhoneTelHref(value: string): string | null {
  const normalized = hubPhoneDigits(value);
  if (!normalized) return null;
  const digitCount = normalized.replace(/\D/g, "").length;
  // Local short codes are not directory phones; require a real number.
  if (digitCount < 8 || digitCount > 15) return null;
  return `tel:${normalized}`;
}
