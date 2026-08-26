/**
 * Hub Catalog facet stickers.
 *
 * These labels are shared by the directory chips, filter options, chart legends,
 * and KPI captions. A chart must never replace this semantic glyph with a color dot.
 */
const HUB_CATALOG_STICKER: Record<string, string> = {
  Ready: "✅",
  Active: "⚡",
  Beta: "🧪",
  Draft: "📝",
  Experimental: "🔬",
  Archived: "📦",
  Shelved: "🗄️",
  "Needs review": "🚩",
  "Local only": "💻",
  Web: "🌐",
  Desktop: "🖥️",
  Mobile: "📱",
  Bot: "🤖",
  Infrastructure: "🖥️",
  "App Script": "📜",
  GUI: "🪟",
  Vercel: "▲",
  "GitHub Release": "🚀",
  "GitHub Pages": "🐙",
  "VPS · CloudFly": "🖥️",
  "Cloudflare Pages": "☁️",
  "Lenovo · Home Server": "🖥️",
  "lenovo-static": "🖥️",
  "—": "▫️",
};

const HUB_CATALOG_KPI_STICKER: Record<string, string> = {
  total: "🧰",
  ready: "✅",
  releases: "🚀",
  drift: "⚠️",
  local_only: "💻",
  link_gaps: "🔗",
  draft: "📝",
  hosted: "☁️",
};

/** Directory-equivalent sticker for a Hub Catalog facet value. */
export function hubCatalogStickerEmoji(label: string): string | undefined {
  return HUB_CATALOG_STICKER[label];
}

/** Semantic sticker for a Hub Catalog KPI key. */
export function hubCatalogKpiStickerEmoji(key: string): string | undefined {
  return HUB_CATALOG_KPI_STICKER[key];
}
