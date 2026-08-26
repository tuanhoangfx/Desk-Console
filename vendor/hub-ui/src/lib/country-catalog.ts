/** ISO 3166-1 alpha-2 catalog — canonical English names for country pickers. */
export type HubCountryEntry = {
  code: string;
  name: string;
};

/** Sorted by English name — covers flagsapi.com supported codes used in Account Vault sheets. */
export const HUB_COUNTRY_CATALOG: readonly HubCountryEntry[] = [
  { code: "AD", name: "Andorra" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "AF", name: "Afghanistan" },
  { code: "AL", name: "Albania" },
  { code: "AM", name: "Armenia" },
  { code: "AR", name: "Argentina" },
  { code: "AT", name: "Austria" },
  { code: "AU", name: "Australia" },
  { code: "AZ", name: "Azerbaijan" },
  { code: "BA", name: "Bosnia and Herzegovina" },
  { code: "BD", name: "Bangladesh" },
  { code: "BE", name: "Belgium" },
  { code: "BG", name: "Bulgaria" },
  { code: "BH", name: "Bahrain" },
  { code: "BN", name: "Brunei" },
  { code: "BO", name: "Bolivia" },
  { code: "BR", name: "Brazil" },
  { code: "BY", name: "Belarus" },
  { code: "CA", name: "Canada" },
  { code: "CH", name: "Switzerland" },
  { code: "CL", name: "Chile" },
  { code: "CN", name: "China" },
  { code: "CO", name: "Colombia" },
  { code: "CR", name: "Costa Rica" },
  { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czech Republic" },
  { code: "DE", name: "Germany" },
  { code: "DK", name: "Denmark" },
  { code: "DO", name: "Dominican Republic" },
  { code: "DZ", name: "Algeria" },
  { code: "EC", name: "Ecuador" },
  { code: "EE", name: "Estonia" },
  { code: "EG", name: "Egypt" },
  { code: "ES", name: "Spain" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "GB", name: "United Kingdom" },
  { code: "GE", name: "Georgia" },
  { code: "GH", name: "Ghana" },
  { code: "GR", name: "Greece" },
  { code: "GT", name: "Guatemala" },
  { code: "HK", name: "Hong Kong" },
  { code: "HN", name: "Honduras" },
  { code: "HR", name: "Croatia" },
  { code: "HU", name: "Hungary" },
  { code: "ID", name: "Indonesia" },
  { code: "IE", name: "Ireland" },
  { code: "IL", name: "Israel" },
  { code: "IN", name: "India" },
  { code: "IQ", name: "Iraq" },
  { code: "IR", name: "Iran" },
  { code: "IS", name: "Iceland" },
  { code: "IT", name: "Italy" },
  { code: "JM", name: "Jamaica" },
  { code: "JO", name: "Jordan" },
  { code: "JP", name: "Japan" },
  { code: "KE", name: "Kenya" },
  { code: "KH", name: "Cambodia" },
  { code: "KR", name: "South Korea" },
  { code: "KW", name: "Kuwait" },
  { code: "KZ", name: "Kazakhstan" },
  { code: "LA", name: "Laos" },
  { code: "LB", name: "Lebanon" },
  { code: "LK", name: "Sri Lanka" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "LV", name: "Latvia" },
  { code: "MA", name: "Morocco" },
  { code: "MD", name: "Moldova" },
  { code: "ME", name: "Montenegro" },
  { code: "MK", name: "North Macedonia" },
  { code: "MM", name: "Myanmar" },
  { code: "MN", name: "Mongolia" },
  { code: "MO", name: "Macao" },
  { code: "MT", name: "Malta" },
  { code: "MX", name: "Mexico" },
  { code: "MY", name: "Malaysia" },
  { code: "NG", name: "Nigeria" },
  { code: "NL", name: "Netherlands" },
  { code: "NO", name: "Norway" },
  { code: "NP", name: "Nepal" },
  { code: "NZ", name: "New Zealand" },
  { code: "OM", name: "Oman" },
  { code: "PA", name: "Panama" },
  { code: "PE", name: "Peru" },
  { code: "PH", name: "Philippines" },
  { code: "PK", name: "Pakistan" },
  { code: "PL", name: "Poland" },
  { code: "PR", name: "Puerto Rico" },
  { code: "PT", name: "Portugal" },
  { code: "PY", name: "Paraguay" },
  { code: "QA", name: "Qatar" },
  { code: "RO", name: "Romania" },
  { code: "RS", name: "Serbia" },
  { code: "RU", name: "Russia" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "SE", name: "Sweden" },
  { code: "SG", name: "Singapore" },
  { code: "SI", name: "Slovenia" },
  { code: "SK", name: "Slovakia" },
  { code: "SV", name: "El Salvador" },
  { code: "TH", name: "Thailand" },
  { code: "TN", name: "Tunisia" },
  { code: "TR", name: "Turkey" },
  { code: "TW", name: "Taiwan" },
  { code: "UA", name: "Ukraine" },
  { code: "US", name: "United States" },
  { code: "UY", name: "Uruguay" },
  { code: "UZ", name: "Uzbekistan" },
  { code: "VE", name: "Venezuela" },
  { code: "VN", name: "Vietnam" },
  { code: "ZA", name: "South Africa" },
] as const;

export const HUB_COUNTRY_BY_CODE: Readonly<Record<string, HubCountryEntry>> = Object.fromEntries(
  HUB_COUNTRY_CATALOG.map((entry) => [entry.code, entry]),
);

function aliasKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Synonyms from Google Sheet / legacy free-text → ISO alpha-2. */
const HUB_COUNTRY_ALIASES: Record<string, string> = {
  us: "US",
  usa: "US",
  "u s": "US",
  "u s a": "US",
  "united states": "US",
  "united states of america": "US",
  america: "US",
  uk: "GB",
  gb: "GB",
  gbp: "GB",
  england: "GB",
  "great britain": "GB",
  "united kingdom": "GB",
  vn: "VN",
  vi: "VN",
  vietnam: "VN",
  "viet nam": "VN",
  "republic of korea": "KR",
  "south korea": "KR",
  korea: "KR",
  kr: "KR",
  "north macedonia": "MK",
  macedonia: "MK",
  "czechia": "CZ",
  "czech republic": "CZ",
  uae: "AE",
  "united arab emirates": "AE",
  "hong kong": "HK",
  "macao": "MO",
  "macau": "MO",
  russia: "RU",
  "russian federation": "RU",
};

for (const entry of HUB_COUNTRY_CATALOG) {
  HUB_COUNTRY_ALIASES[aliasKey(entry.name)] = entry.code;
  HUB_COUNTRY_ALIASES[aliasKey(entry.code)] = entry.code;
}

export function normalizeHubCountryCode(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  if (/^[a-zA-Z]{2}$/.test(trimmed)) {
    const code = trimmed.toUpperCase();
    const alias = HUB_COUNTRY_ALIASES[aliasKey(code)];
    if (alias) return alias;
    return HUB_COUNTRY_BY_CODE[code] ? code : null;
  }
  const hit = HUB_COUNTRY_ALIASES[aliasKey(trimmed)];
  return hit ?? null;
}

export function resolveHubCountry(raw: string | null | undefined): {
  code: string | null;
  label: string;
  raw: string;
} {
  const text = raw?.trim() ?? "";
  if (!text) return { code: null, label: "", raw: "" };
  const code = normalizeHubCountryCode(text);
  if (code) {
    return { code, label: HUB_COUNTRY_BY_CODE[code]?.name ?? code, raw: text };
  }
  return { code: null, label: text, raw: text };
}
