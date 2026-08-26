import { useSyncExternalStore } from "react";
import {
  HUB_ORDER_PRICE_DEFAULT_VND_USD_RATE,
  type HubOrderPriceFormat,
} from "./format-order-price";

/** Persisted price-format preference — a single tool-wide display format. */
export type HubPriceFormatSettings = {
  format: HubOrderPriceFormat;
};

/** {@link HubPriceFormatSettings} plus the resolved VND→USD rate for `usd` formatting. */
export type HubResolvedPriceFormat = HubPriceFormatSettings & { vndUsdRate: number };

export type HubPriceFormatStoreConfig = {
  /** localStorage key for the persisted `{ format }` bag (per tool). */
  storageKey: string;
  /** window event name broadcast on any format/rate change so live views re-render. */
  event: string;
  /** Default format when nothing is stored yet. Defaults to `full`. */
  defaultFormat?: HubOrderPriceFormat;
  /** Resolve the current VND→USD rate (e.g. from a tool's store-bridge settings). */
  readVndUsdRate?: () => number;
};

/** Reusable price-format store API — persistence, live event, and a React hook. */
export type HubPriceFormatStore = {
  DEFAULT: HubPriceFormatSettings;
  DEFAULT_RESOLVED: HubResolvedPriceFormat;
  event: string;
  read(): HubPriceFormatSettings;
  write(next: HubPriceFormatSettings): void;
  emit(): void;
  readResolved(): HubResolvedPriceFormat;
  useFormat(): HubResolvedPriceFormat;
};

const VALID_FORMATS: readonly HubOrderPriceFormat[] = ["full", "k", "usd"];

/** Narrow an unknown value to a valid {@link HubOrderPriceFormat}, else `fallback`. */
export function coerceHubOrderPriceFormat(
  value: unknown,
  fallback: HubOrderPriceFormat | null = null,
): HubOrderPriceFormat | null {
  return typeof value === "string" && (VALID_FORMATS as readonly string[]).includes(value)
    ? (value as HubOrderPriceFormat)
    : fallback;
}

function safeRate(rate: number): number {
  return Number.isFinite(rate) && rate > 0 ? rate : HUB_ORDER_PRICE_DEFAULT_VND_USD_RATE;
}

/**
 * Build a reusable, tool-scoped price-format store (persistence + live event + React hook).
 *
 * One source of truth per tool: a single `format` (`full` / `k` / `usd`) drives tables, KPIs,
 * headers, sample messages and inputs. Legacy split settings (`tableFormat` / `sampleFormat`)
 * auto-migrate on read so older localStorage rows keep working.
 *
 * @example
 * const store = createHubPriceFormatStore({
 *   storageKey: "p0005-crm:price-format-settings",
 *   event: "p0005-crm:price-format-changed",
 *   defaultFormat: "k",
 *   readVndUsdRate: () => readStoreBridgeSettings().vndUsdRate,
 * });
 */
export function createHubPriceFormatStore(config: HubPriceFormatStoreConfig): HubPriceFormatStore {
  const { storageKey, event } = config;
  const defaultFormat: HubOrderPriceFormat = config.defaultFormat ?? "full";
  const readVndUsdRate = config.readVndUsdRate ?? (() => HUB_ORDER_PRICE_DEFAULT_VND_USD_RATE);

  const DEFAULT: HubPriceFormatSettings = { format: defaultFormat };
  const DEFAULT_RESOLVED: HubResolvedPriceFormat = {
    format: defaultFormat,
    vndUsdRate: HUB_ORDER_PRICE_DEFAULT_VND_USD_RATE,
  };

  function read(): HubPriceFormatSettings {
    try {
      const raw = typeof localStorage !== "undefined" ? localStorage.getItem(storageKey) : null;
      if (!raw) return { format: defaultFormat };
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      // Migrate legacy split settings (tableFormat/sampleFormat) → single format.
      const format =
        coerceHubOrderPriceFormat(parsed.format) ??
        coerceHubOrderPriceFormat(parsed.sampleFormat) ??
        coerceHubOrderPriceFormat(parsed.tableFormat) ??
        defaultFormat;
      return { format };
    } catch {
      return { format: defaultFormat };
    }
  }

  function emit(): void {
    if (typeof window !== "undefined") window.dispatchEvent(new Event(event));
  }

  function write(next: HubPriceFormatSettings): void {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(storageKey, JSON.stringify({ format: next.format }));
      }
    } catch {
      /* storage unavailable — still emit so live subscribers update */
    }
    emit();
  }

  function readResolved(): HubResolvedPriceFormat {
    return { ...read(), vndUsdRate: safeRate(readVndUsdRate()) };
  }

  function subscribe(onChange: () => void): () => void {
    if (typeof window === "undefined") return () => {};
    window.addEventListener(event, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(event, onChange);
      window.removeEventListener("storage", onChange);
    };
  }

  let cache: HubResolvedPriceFormat = DEFAULT_RESOLVED;
  let cacheKey = "";
  function getSnapshot(): HubResolvedPriceFormat {
    const next = readResolved();
    const key = `${next.format}|${next.vndUsdRate}`;
    if (key !== cacheKey) {
      cache = next;
      cacheKey = key;
    }
    return cache;
  }

  function getServerSnapshot(): HubResolvedPriceFormat {
    return DEFAULT_RESOLVED;
  }

  function useFormat(): HubResolvedPriceFormat {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  }

  return { DEFAULT, DEFAULT_RESOLVED, event, read, write, emit, readResolved, useFormat };
}
