import registry from "./hub-brand-icons.registry.json";
import type { HubBrandIconShell } from "../shell/filter-dropdown-primitives";

export type HubBrandIconId = (typeof registry)[number]["id"];

export type HubBrandIconMeta = {
  id: HubBrandIconId;
  label: string;
  match?: string;
  src: string;
  shell: HubBrandIconShell;
  faviconDomain?: string;
  /** Extra hosts for Cookie Bridge / route icons (e.g. Claude.ai + Claude.com). */
  faviconDomains?: string[];
};

const ENTRIES = registry as HubBrandIconMeta[];
const BY_ID = new Map(ENTRIES.map((entry) => [entry.id, entry]));
const MATCHERS = ENTRIES.filter((entry) => entry.match).map((entry) => ({
  entry,
  re: new RegExp(entry.match!, "i"),
}));

const matchCache = new Map<string, HubBrandIconMeta | null>();

function inferShell(entry: HubBrandIconMeta): HubBrandIconShell {
  if (entry.shell) return entry.shell;
  if (entry.src.includes("/icons/github.svg")) return "tile";
  if (entry.src.includes("/icons/vercel.svg")) return "darkInk";
  if (entry.src.includes("/assets/brand-icons/") && /\.(png|ico)$/i.test(entry.src)) return "bare";
  return "bare";
}

function withShell(entry: HubBrandIconMeta): HubBrandIconMeta {
  return { ...entry, shell: inferShell(entry) };
}

/** Resolve shared Hub brand icon by stable id (sidebar, filters, directory cards). */
export function resolveHubBrandIcon(id: HubBrandIconId): HubBrandIconMeta | null {
  const hit = BY_ID.get(id);
  return hit ? withShell(hit) : null;
}

/**
 * Dedicated match plus hyphen-family fallbacks (`google-one` → `google`,
 * `github-copilot` → `github`, `capcut-*` → `capcut`) so a missing PNG
 * can still render a sibling brand before the empty glyph.
 */
export function resolveHubBrandFamilyHits(primary: HubBrandIconMeta | null): HubBrandIconMeta[] {
  const hits: HubBrandIconMeta[] = [];
  const seen = new Set<string>();
  const push = (hit: HubBrandIconMeta | null) => {
    if (!hit?.src || seen.has(hit.src)) return;
    seen.add(hit.src);
    hits.push(hit);
  };
  push(primary);
  const root = primary?.id?.split("-")[0];
  if (root && root !== primary?.id) {
    push(resolveHubBrandIcon(root as HubBrandIconId));
  }
  return hits;
}

/** Resolve brand icon by service/platform label (Account vault, filters). */
export function resolveHubBrandIconByMatch(service: string): HubBrandIconMeta | null {
  const key = service.trim().toLowerCase();
  if (!key) return null;
  const cached = matchCache.get(key);
  if (cached !== undefined) return cached;
  const hit = MATCHERS.find((item) => item.re.test(key))?.entry ?? null;
  const resolved = hit ? withShell(hit) : null;
  matchCache.set(key, resolved);
  return resolved;
}

/**
 * SSOT empty / unknown brand glyph — directory table + filter dropdowns (⭕).
 * Render inside 16px brand icon box for size parity with brand imgs.
 */
export const HUB_DIRECTORY_BRAND_EMPTY_GLYPH = "⭕";

/**
 * Emoji fallback for unknown platform/service labels (no brand icon match).
 * Keeps UI glyph-only parity without Lucide fallback.
 */
export function resolveHubBrandFallbackGlyph(label: string | null | undefined): string {
  const key = String(label ?? "").trim().toLowerCase();
  if (!key) return HUB_DIRECTORY_BRAND_EMPTY_GLYPH;
  if (/(temp\s*mail|tempmail|gmail\s*edu|gmail|outlook|icloud)/.test(key)) return "✉️";
  if (/\bmail\b/.test(key)) return "✉️";
  if (/(facebook|zalo|telegram|tiktok|douyin|weibo|instagram|youtube|whatsapp|discord|twitter|x\\b)/.test(key)) {
    return "🌐";
  }
  if (/(chatgpt|gpt|claude|gemini|cursor|openai|copilot|\bai\b)/.test(key)) return "✨";
  if (/(bank|tpbank|techcom|vietcom|bidv|acb|mbbank|vpbank|seabank)/.test(key)) return "🏦";
  return HUB_DIRECTORY_BRAND_EMPTY_GLYPH;
}

/** All registered brand icon ids — for tests and tooling. */
export function listHubBrandIconIds(): HubBrandIconId[] {
  return ENTRIES.map((entry) => entry.id);
}

/** @internal test helper */
export function clearHubBrandIconMatchCache(): void {
  matchCache.clear();
}
