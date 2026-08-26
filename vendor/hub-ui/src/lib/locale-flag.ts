/** Country flags via [flagsapi.com](https://flagsapi.com/) — SSOT for hub-ui pickers and badges. */

const FLAGSAPI = "https://flagsapi.com";
const FLAGCDN = "https://flagcdn.com";

export type FlagsApiStyle = "flat" | "shiny";
export type FlagsApiSize = 16 | 24 | 32 | 48 | 64;

export function flagsApiUrl(
  countryCode: string,
  style: FlagsApiStyle = "flat",
  size: FlagsApiSize = 24,
): string {
  const code = countryCode.trim().toUpperCase();
  if (!code || !/^[A-Z]{2}$/.test(code)) return "";
  return `${FLAGSAPI}/${code}/${style}/${size}.png`;
}

/** @deprecated Prefer flagsApiUrl — kept for legacy callers (maps to flagsapi flat PNG). */
export function flagCdnUrl(countryCode: string, width = 16, _height = 12): string {
  const size: FlagsApiSize = width >= 48 ? 48 : width >= 32 ? 32 : width >= 24 ? 24 : 16;
  const url = flagsApiUrl(countryCode, "flat", size);
  if (url) return url;
  const code = countryCode.trim().toLowerCase();
  if (!code || !/^[a-z]{2}$/.test(code)) return `${FLAGCDN}/${size}x${Math.round(size * 0.75)}/un.png`;
  return `${FLAGCDN}/${size}x${Math.round(size * 0.75)}/${code}.png`;
}

/** Map BCP-47 locale (or short region code) to ISO 3166-1 alpha-2 for flagcdn. */
export function countryCodeForLocale(locale: string): string {
  const normalized = locale.trim();
  if (!normalized) return "un";

  if (normalized === "VI" || normalized === "vi") return "vn";

  const region = normalized.includes("-") ? normalized.split("-")[1]! : normalized;
  const map: Record<string, string> = {
    US: "us",
    GB: "gb",
    AU: "au",
    CA: "ca",
    IN: "in",
    IE: "ie",
    NZ: "nz",
    ZA: "za",
    HK: "hk",
    SG: "sg",
    PH: "ph",
    JA: "jp",
    JP: "jp",
    KO: "kr",
    KR: "kr",
    ZH: "cn",
    CN: "cn",
    TH: "th",
    ID: "id",
    VN: "vn",
    DE: "de",
    FR: "fr",
  };

  const hit = map[region.toUpperCase()];
  if (hit) return hit;

  const lower = region.toLowerCase();
  if (/^[a-z]{2}$/.test(lower)) return lower;
  return "un";
}

export function localeFlagIconSrc(locale: string): string {
  return flagCdnUrl(countryCodeForLocale(locale));
}
