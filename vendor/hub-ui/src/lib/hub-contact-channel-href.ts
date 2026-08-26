import { hubPhoneTelHref } from "./hub-phone-tel";

export type HubContactChannel = "phone" | "zalo" | "telegram" | "meta";

/** Open URL for directory / ADM contact channels (call or deep-link). */
export function hubContactChannelHref(channel: HubContactChannel, value: string): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  if (channel === "phone") return hubPhoneTelHref(raw);

  if (channel === "zalo") {
    const phone = raw.replace(/[^\d]/g, "");
    return phone.length >= 9 && phone.length <= 15 ? `https://zalo.me/${phone}` : null;
  }
  if (channel === "telegram") {
    const handle = raw.replace(/^@/, "");
    return /^[a-zA-Z0-9_]{5,}$/.test(handle) ? `https://t.me/${handle}` : null;
  }
  return /^[a-zA-Z0-9._-]{3,}$/.test(raw) ? `https://m.me/${raw}` : null;
}
