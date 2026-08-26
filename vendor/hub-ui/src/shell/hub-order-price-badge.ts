/** SSOT class — directory Price text color (no chip). */
export const HUB_ORDER_PRICE_TEXT_CLASS = "hub-order-price-text";

/** @deprecated use HUB_ORDER_PRICE_TEXT_CLASS */
export const HUB_ORDER_PRICE_BADGE_CLASS = HUB_ORDER_PRICE_TEXT_CLASS;

/** Locked design token id — sync with P0005 design-registry ORDER_PRICE_DESIGN_LOCK.
 *  C3-amber-soft (2026-07-17): softened gold #e6c069 (was neon #fcd34d) + no letter-spacing,
 *  so money text reads as an accent without over-popping vs neutral body columns. */
export const HUB_ORDER_PRICE_BADGE_DESIGN_LOCK = "C3-amber-soft" as const;

export type HubOrderPriceTextTone = "neutral" | "emerald" | "amber" | "indigo" | "sky";

/** @deprecated use HubOrderPriceTextTone */
export type HubOrderPriceBadgeTone = HubOrderPriceTextTone;

export const HUB_ORDER_PRICE_TEXT_DEFAULT_TONE: HubOrderPriceTextTone = "amber";

/** @deprecated use HUB_ORDER_PRICE_TEXT_DEFAULT_TONE */
export const HUB_ORDER_PRICE_BADGE_DEFAULT_TONE = HUB_ORDER_PRICE_TEXT_DEFAULT_TONE;
