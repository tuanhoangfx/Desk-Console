export type HubOrderPriceCurrency = string;

export type HubOrderPriceParts = {
  amount: string;
  currency: string;
  symbol: string;
  major: number;
  isUsd: boolean;
};

export function formatHubOrderPriceParts(
  amountCents: number | null | undefined,
  currency: HubOrderPriceCurrency = "VND",
): HubOrderPriceParts | null {
  if (amountCents == null) return null;
  const cur = (currency || "VND").toUpperCase();
  const major = amountCents / 100;
  const isUsd = cur === "USD";
  const amount = isUsd
    ? major.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : major.toLocaleString("vi-VN", { maximumFractionDigits: 0 });
  const symbol = isUsd ? "$" : "₫";
  return { amount, currency: cur, symbol, major, isUsd };
}

/** V2 pill label — VND `1.250.000 ₫`, USD `$20.00`. */
export function formatHubOrderPricePillLabel(
  amountCents: number | null | undefined,
  currency: HubOrderPriceCurrency = "VND",
): string {
  const parts = formatHubOrderPriceParts(amountCents, currency);
  if (!parts) return "";
  return parts.isUsd ? `${parts.symbol}${parts.amount}` : `${parts.amount} ₫`;
}

/** Selectable price display format. `full` keeps the locked pill label; `k`/`usd` are opt-in. */
export type HubOrderPriceFormat = "full" | "k" | "usd";

export type HubOrderPriceLabelOptions = {
  format?: HubOrderPriceFormat;
  /** VND per 1 USD — used only when converting a VND amount to the `usd` format. Default 26.000. */
  vndUsdRate?: number;
};

/** Default VND→USD conversion rate when the caller does not supply one. */
export const HUB_ORDER_PRICE_DEFAULT_VND_USD_RATE = 26_000;

/**
 * Price label with a selectable display format:
 * - `full` (default): `1.250.000 ₫` / `$19.99` — identical to {@link formatHubOrderPricePillLabel}.
 * - `k`: VND thousands notation `1.250K` (non-VND currencies fall back to `full`).
 * - `usd`: convert a VND amount to USD at `vndUsdRate` → `$48.08` (already-USD amounts pass through).
 */
export function formatHubOrderPriceLabel(
  amountCents: number | null | undefined,
  currency: HubOrderPriceCurrency = "VND",
  options: HubOrderPriceLabelOptions = {},
): string {
  const parts = formatHubOrderPriceParts(amountCents, currency);
  if (!parts) return "";
  const format = options.format ?? "full";

  if (format === "usd") {
    const rate =
      options.vndUsdRate && options.vndUsdRate > 0
        ? options.vndUsdRate
        : HUB_ORDER_PRICE_DEFAULT_VND_USD_RATE;
    const usdMajor = parts.isUsd ? parts.major : parts.major / rate;
    return `$${usdMajor.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  if (format === "k" && !parts.isUsd) {
    const thousands = Math.round(parts.major / 1000);
    return `${thousands.toLocaleString("vi-VN", { maximumFractionDigits: 0 })}K`;
  }

  return parts.isUsd ? `${parts.symbol}${parts.amount}` : `${parts.amount} ₫`;
}
