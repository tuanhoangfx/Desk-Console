import {
  HUB_ORDER_PRICE_DEFAULT_VND_USD_RATE,
  formatHubOrderPriceLabel,
  type HubOrderPriceFormat,
} from "../lib/format-order-price";
import type { FilterOption } from "../shell/FilterBar";
import { HubAdmClickFilterField } from "./HubAdmClickEditField";
import { HubDetailFieldRow, HubDetailFieldsGroup } from "./HubDetailFieldsScope";
import {
  HUB_ORDER_PRICE_TEXT_CLASS,
  HUB_ORDER_PRICE_TEXT_DEFAULT_TONE,
} from "./hub-order-price-badge";

/** Sample amount used for option preview labels (1.250.000 ₫). */
export const HUB_PRICE_FORMAT_PREVIEW_AMOUNT_CENTS = 125_000_000;

const FORMAT_OPTIONS: readonly { value: HubOrderPriceFormat; name: string }[] = [
  { value: "k", name: "Compact" },
  { value: "full", name: "Full" },
  { value: "usd", name: "USD" },
];

export type HubPriceFormatFieldProps = {
  value: HubOrderPriceFormat;
  onChange: (format: HubOrderPriceFormat) => void;
  /** VND per 1 USD — used for the USD option preview. Default 26.000. */
  vndUsdRate?: number;
  /** Unique filter-panel key (per tool). Default `hub-price-format`. */
  filterKey?: string;
  fieldLabel?: string;
  /**
   * When true (default), wrap in Layout 3 {@link HubDetailFieldsGroup} so the field
   * matches Customer Detail Tier (HubAdm click-filter). Pass `false` when already
   * inside a detail form row / group.
   */
  standalone?: boolean;
  /** Hub-cents preview amount for option labels. Default 1.250.000 ₫. */
  previewAmountCents?: number;
};

/**
 * Compact / Full / USD price-format control — Modal Layout 3 HubAdm SSOT
 * (same kit as Order Detail click-filter: emoji + label + value on one Layout 3 slot).
 * Default field label `Style` (section badge is `Format` — avoids duplicate title).
 */
export function HubPriceFormatField({
  value,
  onChange,
  vndUsdRate = HUB_ORDER_PRICE_DEFAULT_VND_USD_RATE,
  filterKey = "hub-price-format",
  fieldLabel = "Style",
  standalone = true,
  previewAmountCents = HUB_PRICE_FORMAT_PREVIEW_AMOUNT_CENTS,
}: HubPriceFormatFieldProps) {
  const options: FilterOption[] = FORMAT_OPTIONS.map((opt) => ({
    value: opt.value,
    label: `${opt.name} — ${formatHubOrderPriceLabel(previewAmountCents, "VND", {
      format: opt.value,
      vndUsdRate,
    })}`,
  }));

  const field = (
    <HubAdmClickFilterField
      header={{ label: fieldLabel, headerEmoji: "💰" }}
      filterKey={filterKey}
      fieldLabel={fieldLabel}
      options={options}
      value={value}
      onChange={(next) => onChange(next as HubOrderPriceFormat)}
      allowClear={false}
      renderValue={(_value, displayLabel) => {
        const sep = " — ";
        const idx = displayLabel.indexOf(sep);
        if (idx < 0) return displayLabel;
        const name = displayLabel.slice(0, idx + sep.length);
        const price = displayLabel.slice(idx + sep.length);
        return (
          <>
            <span>{name}</span>
            <span
              className={`${HUB_ORDER_PRICE_TEXT_CLASS} ${HUB_ORDER_PRICE_TEXT_CLASS}--${HUB_ORDER_PRICE_TEXT_DEFAULT_TONE}`}
            >
              {price}
            </span>
          </>
        );
      }}
    />
  );

  if (!standalone) return field;

  /* Mail Modal Layout 3 scope — one-line HubAdm row (Settings Format frame body). */
  return (
    <HubDetailFieldsGroup>
      <HubDetailFieldRow>{field}</HubDetailFieldRow>
    </HubDetailFieldsGroup>
  );
}
